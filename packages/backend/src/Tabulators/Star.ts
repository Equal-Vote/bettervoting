import { ballot, candidate, fiveStarCount, starResults, roundResults, starSummaryData, totalScore } from "@equal-vote/star-vote-shared/domain_model/ITabulators";

import { IparsedData } from './ParseData'
const ParseData = require("./ParseData");
declare namespace Intl {
  class ListFormat {
    constructor(locales?: string | string[], options?: {});
    public format: (items: string[]) => string;
  }
}
// converts list of strings to string with correct grammar ([a,b,c] => 'a, b, and c')
const formatter = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' });

export function Star(candidates: string[], votes: ballot[], nWinners = 1, randomTiebreakOrder:number[] = []) {
  // Determines STAR winners for given election
  // Parameters: 
  // candidates: Array of candidate names
  // votes: Array of votes, size nVoters x Candidates
  // nWiners: Number of winners in election, defaulted to 1
  // randomTiebreakOrder: Array to determine tiebreak order. If empty or not same length as candidates, set to candidate indexes

  // Parse the votes for valid, invalid, and undervotes, and identifies bullet votes
  const parsedData = ParseData(votes)

  // Compress valid votes into data needed to run election including
  // total scores
  // score histograms
  // preference and pairwise matrices
  const summaryData = getSummaryData(candidates, parsedData,randomTiebreakOrder)

  // Initialize output data structure
  const results: starResults = {
    elected: [],
    tied: [],
    other: [],
    roundResults: [],
    summaryData: summaryData,
    tieBreakType: 'none',
  }
  var remainingCandidates = [...summaryData.candidates]
  // Run election rounds until there are no remaining candidates
  // Keep running elections rounds even if all seats have been filled to determine candidate order
  while (remainingCandidates.length > 0) {
    const roundResults = runStarRound(summaryData, remainingCandidates)
    if ((results.elected.length + results.tied.length + roundResults.winners.length) <= nWinners) {
      // There are enough seats available to elect all winners of current round
      results.elected.push(...roundResults.winners)
      results.roundResults.push(roundResults)
    }
    else if (results.tied.length === 0 && results.elected.length < nWinners) {
      // If there are vacant seats but too many winners to fill them, mark those candidates as tied
      results.tied.push(...roundResults.winners)
      results.roundResults.push(roundResults)
    }
    else {
      // All seats have been filled or ties identified, remaining candiates added to other group
      results.other.push(...roundResults.winners)

    }
    remainingCandidates = remainingCandidates.filter(c => !roundResults.winners.includes(c))
  }

  // NOTE: the proper way to handle no preferenceStars is to have a matrix of number[] in the summaryData. 
  //       BUT that's super overkill for the moment since we just need 6 values and we're not running multi-winner elections yet
  //       Also there's a chance we'll move advanced stats like this to an analytics api as some point
  //       So TLDR I think the current approach is good enough for now
  results.summaryData.noPreferenceStars = 
    getNoPreferenceStars(parsedData, results.roundResults[0].winners[0].index, results.roundResults[0].winners.length > 1?
      results.roundResults[0].winners[1].index :
      results.roundResults[0].runner_up[0].index
    );

  // Sort data in order of candidate placements
  results.summaryData = sortData(summaryData, results.elected.concat(results.tied).concat(results.other))
  return results
}

function getNoPreferenceStars(parsedData: IparsedData, cIndexI: number, cIndexJ: number): number[]{
  return parsedData.scores.reduce((stars, vote) => {
    if((vote[cIndexI] ?? 0) != (vote[cIndexJ] ?? 0)) return stars;
    stars[vote[cIndexI] ?? 0]++;
    return stars;
  }, new Array(6).fill(0));
}

function getSummaryData(candidates: string[], parsedData: IparsedData, randomTiebreakOrder: number[]): starSummaryData {
  const nCandidates = candidates.length
  if (randomTiebreakOrder.length < nCandidates) {
    randomTiebreakOrder = candidates.map((c,index) => index)
  }
  // Initialize summary data structures
  // Total scores for each candidate, includes candidate indexes for easier sorting
  const totalScores: totalScore[] = Array(nCandidates)
  for (let i = 0; i < nCandidates; i++) {
    totalScores[i] = { index: i, score: 0 };
  }

  // Score histograms for data analysis and five-star tiebreakers
  const scoreHist: number[][] = Array(nCandidates);
  for (let i = 0; i < nCandidates; i++) {
    scoreHist[i] = Array(6).fill(0);
  }

  // Matrix for voter preferences
  const preferenceMatrix: number[][] = Array(nCandidates);
  const pairwiseMatrix: number[][] = Array(nCandidates);
  for (let i = 0; i < nCandidates; i++) {
    preferenceMatrix[i] = Array(nCandidates).fill(0);
    pairwiseMatrix[i] = Array(nCandidates).fill(0);
  }
  let nBulletVotes = 0

  // Iterate through ballots and populate data structures
  parsedData.scores.forEach((vote) => {
    let nSupported = 0
    for (let i = 0; i < nCandidates; i++) {
      totalScores[i].score += vote[i]
      scoreHist[i][vote[i]] += 1
      for (let j = 0; j < nCandidates; j++) {
        if (i !== j) {
          if (vote[i] > vote[j]) {
            preferenceMatrix[i][j] += 1
          }
        }
      }
      if (vote[i] > 0) {
        nSupported += 1
      }
    }
    if (nSupported === 1) {
      nBulletVotes += 1
    }
  })

  for (let i = 0; i < nCandidates; i++) {
    for (let j = 0; j < nCandidates; j++) {
      if (preferenceMatrix[i][j] > preferenceMatrix[j][i]) {
        pairwiseMatrix[i][j] = 1
      }
      else if (preferenceMatrix[i][j] < preferenceMatrix[j][i]) {
        pairwiseMatrix[j][i] = 1
      }

    }
  }
  const candidatesWithIndexes: candidate[] = candidates.map((candidate, index) => ({ index: index, name: candidate, tieBreakOrder:  randomTiebreakOrder[index]}))
  return {
    candidates: candidatesWithIndexes,
    totalScores,
    scoreHist,
    preferenceMatrix,
    pairwiseMatrix,
    nValidVotes: parsedData.validVotes.length,
    nInvalidVotes: parsedData.invalidVotes.length,
    nUnderVotes: parsedData.underVotes,
    nBulletVotes: nBulletVotes,
    noPreferenceStars: [], // this will be used later
  }
}

function sortData(summaryData: starSummaryData, order: candidate[]): starSummaryData {
  // sorts summary data to be in specified order
  const indexOrder = order.map(c => c.index)
  const candidates = indexOrder.map(ind => (summaryData.candidates[ind]))
  candidates.forEach((c, i) => {
    c.index = i
  })
  const totalScores = indexOrder.map((ind, i) => ({ index: i, score: summaryData.totalScores[ind].score }))
  const scoreHist = indexOrder.map((ind) => summaryData.scoreHist[ind])
  const preferenceMatrix = sortMatrix(summaryData.preferenceMatrix, indexOrder)
  const pairwiseMatrix = sortMatrix(summaryData.pairwiseMatrix, indexOrder)
  return {
    candidates,
    totalScores,
    scoreHist,
    preferenceMatrix,
    pairwiseMatrix,
    nValidVotes: summaryData.nValidVotes,
    nInvalidVotes: summaryData.nInvalidVotes,
    nUnderVotes: summaryData.nUnderVotes,
    nBulletVotes: summaryData.nBulletVotes,
    noPreferenceStars: summaryData.noPreferenceStars,
  }
}

export function runStarRound(summaryData: starSummaryData, remainingCandidates: candidate[]): roundResults {
  // Initialize output results data structure
  const roundResults: roundResults = {
    winners: [],
    runner_up: [],
    tied: [],
    tieBreakType: 'none',
    logs: [],
  }

  // If only one candidate remains, mark as winner
  if (remainingCandidates.length === 1) {
    roundResults.winners.push(...remainingCandidates)
    return roundResults
  }

  // Score round
  // Iterate through remaining candidates looking for two top scoring candidates to advance to runoff round
  // In most elections this is a simple process, but for cases where there are ties we advance one candidate at a time
  // and resolve ties as they occur
  const finalists: candidate[] = []
  scoreLoop: while (finalists.length < 2) {
    const nCandidatesNeeded = 2 - finalists.length
    const eligibleCandidates = remainingCandidates.filter(c => !finalists.includes(c))
    const scoreWinners = getScoreWinners(summaryData, eligibleCandidates) // returns all winners tied for first place

    if (scoreWinners.length <= nCandidatesNeeded) {
      // when scoreWinners is less than candidate needed, but all can advance to runoff
      finalists.push(...scoreWinners.map(sc => summaryData.candidates[sc.index]))
      scoreWinners.forEach(scoreWinner =>
        roundResults.logs.push({
          key: 'tabulation_logs.star.score_tiebreak_advance_to_runoff',
          name: scoreWinner.name,
          score: summaryData.totalScores[scoreWinner.index].score
        })
      )
      continue scoreLoop
    }

    roundResults.logs.push({
      key: 'tabulation_logs.star.scoring_round_tiebreaker_start',
      names: eligibleCandidates.map(e => e.name)
    });

    roundResults.logs.push({
      key: 'tabulation_logs.star.score_tiebreak_end',
      names: scoreWinners.map(scoreWinner => scoreWinner.name),
      score: summaryData.totalScores[scoreWinners[0].index].score,
    });
    // Multiple candidates have top score, proceed to score tiebreaker
    let tiedCandidates = scoreWinners
    tieLoop: while (tiedCandidates.length > 1) {
      if(tiedCandidates.length < scoreWinners.length){ // hack to avoid being redundant with the log above
        roundResults.logs.push({
          key: 'tabulation_logs.star.scoring_round_tiebreaker_start',
          names: tiedCandidates.map(c => c.name),
        });
      }
      // Get candidates with the most head to head losses
      let {headToHeadLosers, losses} = getHeadToHeadLosers(summaryData, tiedCandidates)
      if (headToHeadLosers.length < tiedCandidates.length) {
        // Some candidates have more head to head losses than others, remove them from the tied candidate pool
        headToHeadLosers.forEach(c => 
          roundResults.logs.push({
            key: 'tabulation_logs.star.pairwise_tiebreak_remove_candidate',
            name: c.name,
            count: losses,
            n_tied_candidates: tiedCandidates.length
          })
        )
        tiedCandidates = tiedCandidates.filter(c => !headToHeadLosers.includes(c))
        continue tieLoop
      }
      // All tied candidates have the same number of head to head lossess
      if (nCandidatesNeeded === 2 && tiedCandidates.length === 2) {
        // Tie between two candidates, but both can advance to runoff
        finalists.push(...tiedCandidates)
        tiedCandidates.forEach(c =>
          roundResults.logs.push({
            key: 'tabulation_logs.star.pairwise_tiebreak_advance_to_runoff',
            names: c.name,
            count: losses,
            n_tied_candidates: tiedCandidates.length
          })
        )
        continue scoreLoop
      }
      // Proceed to five star tiebreaker
      roundResults.logs.push({
        key: 'tabulation_logs.star.pairwise_tiebreak_end',
        names: tiedCandidates.map(c => c.name),
        count: losses,
      })

      let fiveStarCounts = getFiveStarCounts(summaryData, tiedCandidates)
      if (nCandidatesNeeded === 2 && fiveStarCounts[1].counts > fiveStarCounts[2].counts) {
        // Two candidates needed and first two have more five star counts than the rest, advance them both to runoff
        fiveStarCounts.slice(0, 2).map((fiveStarCount) => 
          roundResults.logs.push({
            key: 'tabulation_logs.star.five_star_tiebreak_advance_to_runoff',
            name: fiveStarCount.candidate.name,
            five_star_count: fiveStarCount.counts,
          })
        );
        finalists.push(fiveStarCounts[0].candidate)
        finalists.push(fiveStarCounts[1].candidate)
        continue scoreLoop
      }
      if (fiveStarCounts[0].counts > fiveStarCounts[1].counts) {
        // First has more five star counts than the rest, advance them to runoff
        roundResults.logs.push({
          key: 'tabulation_logs.star.five_star_tiebreak_advance_to_runoff',
          name: fiveStarCounts[0].candidate.name,
          five_star_count: fiveStarCounts[0].counts,
        });
        finalists.push(fiveStarCounts[0].candidate)
        continue scoreLoop
      }

      // No five star winner, try to find five star losers instead
      let fiveStarLoserCounts = getFiveStarLosers(fiveStarCounts)
      if (fiveStarLoserCounts.length < tiedCandidates.length) {
        // Some candidates have fewer five star votes than others, remove them from the tie breaker pool
        fiveStarLoserCounts.forEach(fiveStarCount => 
          roundResults.logs.push({
            key: 'tabulation_logs.star.five_star_tiebreak_remove_candidate',
            name: fiveStarCount.candidate.name,
            five_star_count: fiveStarCount.counts,
          })
        )
        tiedCandidates = tiedCandidates.filter(c => !fiveStarLoserCounts.map(f => f.candidate).includes(c))
        continue tieLoop
      }

      roundResults.logs.push({
        key: 'tabulation_logs.star.five_star_tiebreak_end',
        names: fiveStarCounts.map(fiveStarCount => fiveStarCount.candidate.name),
        five_star_count: fiveStarCounts[0].counts,
      });

      // True tie. Break tie randomly
      const randomWinner = sortByTieBreakOrder(tiedCandidates)[0]
      roundResults.logs.push({
        key: 'tabulation_logs.star.random_tiebreak_advance_to_runoff',
        name: randomWinner.name
      })
      finalists.push(randomWinner)
      continue scoreLoop
    }

    // NOTE: I'm pretty sure these 2 lines are unreachable
    //       the above loop will always push to finalists where possible, and then continue to scoreLoop
    roundResults.logs.push(`${tiedCandidates[0].name} wins score tiebreaker and advances to the runoff round.`)
    finalists.push(tiedCandidates[0])
  }

  // votes with preference to 0 over 1
  const leftVotes = summaryData.preferenceMatrix[finalists[0].index][finalists[1].index]
  // votes with preference to 1 over 0
  const rightVotes = summaryData.preferenceMatrix[finalists[1].index][finalists[0].index]
  const noPrefVotes = summaryData.nValidVotes - leftVotes - rightVotes;

  roundResults.logs.push({
      key: 'tabulation_logs.star.automatic_runoff_start',
      candidate_a: finalists[0].name,
      candidate_b: finalists[1].name,
  })

  if (leftVotes > rightVotes){
    // First candidate wins runoff
    roundResults.winners.push(finalists[0])
    roundResults.runner_up.push(finalists[1])
    roundResults.logs.push({
      key: 'tabulation_logs.star.automatic_runoff_win',
      winner: finalists[0].name,
      loser: finalists[1].name,
      winner_votes: leftVotes,
      loser_votes: rightVotes,
      equal_votes: noPrefVotes,
    })
    return roundResults
  }
  if (leftVotes < rightVotes) {
    // Second candidate wins runoff
    roundResults.winners.push(finalists[1])
    roundResults.runner_up.push(finalists[0])
    roundResults.logs.push({
      key: 'tabulation_logs.star.automatic_runoff_win',
      winner: finalists[1].name,
      loser: finalists[0].name,
      winner_votes: rightVotes,
      loser_votes: leftVotes,
      equal_votes: noPrefVotes,
    })
    return roundResults
  }
  roundResults.logs.push({
    key: 'tabulation_logs.star.automatic_runoff_tie',
    names: finalists.map(f => f.name),
    tied_votes: rightVotes, // right or left doesn't matter
    equal_votes: noPrefVotes,
  })

  roundResults.logs.push({
    key: 'tabulation_logs.star.runoff_round_tiebreaker_start',
    names: finalists.map(f => f.name),
  });

  // Tie, run runoff tiebreaker
  const runoffTieWinner = runRunoffTiebreaker(summaryData, finalists)
  if (runoffTieWinner !== null) {
    const winIndex = runoffTieWinner; 
    const loseIndex = 1 - runoffTieWinner;
    roundResults.winners = [finalists[winIndex]]
    roundResults.runner_up = [finalists[loseIndex]]
    roundResults.logs.push({
      key: 'tabulation_logs.star.score_tiebreak_win_runoff',
      winner: finalists[winIndex].name,
      loser: finalists[loseIndex].name,
      winner_score: summaryData.totalScores[finalists[winIndex].index].score,
      loser_score: summaryData.totalScores[finalists[loseIndex].index].score,
    })
    roundResults.tieBreakType = 'score';
    return roundResults
  }
  // Tie between scores, other tiebreaker needed to resolve
  roundResults.logs.push({
    key: 'tabulation_logs.star.score_tiebreak_end',
    names: finalists.map(f => f.name),
    score: summaryData.totalScores[finalists[0].index].score,
  })

  // Five-star tiebreaker is enabled, look for candidate with most 5 star votes
  const fiveStarCounts = getFiveStarCounts(summaryData, finalists)
  if (fiveStarCounts[0].counts != fiveStarCounts[1].counts){
    const winnerIndex = (fiveStarCounts[0].counts > fiveStarCounts[1].counts)? 0 : 1;
    const loserIndex = 1 - winnerIndex;
    roundResults.winners = [fiveStarCounts[winnerIndex].candidate]
    roundResults.runner_up = [fiveStarCounts[loserIndex].candidate]
    roundResults.logs.push({
      key: 'tabulation_logs.star.five_star_tiebreak_win_runoff',
      winner: fiveStarCounts[winnerIndex].candidate.name,
      loser: fiveStarCounts[loserIndex].candidate.name,
      winner_five_star_count: fiveStarCounts[winnerIndex].counts,
      loser_five_star_count: fiveStarCounts[loserIndex].counts,
    })
    roundResults.tieBreakType = 'five_star';
    return roundResults
  }

  // Could not resolve tie with five-star tiebreaker
  roundResults.logs.push({
    key: 'tabulation_logs.star.five_star_tiebreak_end',
    names: finalists.map(f => f.name),
    five_star_count: fiveStarCounts[0].counts // 0 or 1 doesn't matter
  });

  // Break tie randomly
  const sortedCandidates = sortByTieBreakOrder(finalists)
  roundResults.winners = [sortedCandidates[0]]
  roundResults.runner_up = [sortedCandidates[1]]
  roundResults.logs.push({
    key: 'tabulation_logs.star.random_tiebreak_win_runoff',
    winner: sortedCandidates[0].name,
    loser: sortedCandidates[1].name,
  });
  roundResults.tieBreakType = 'random';
  return roundResults
}

function getScoreWinners(summaryData: starSummaryData, eligibleCandidates: candidate[]) {
  // Searches for candidate(s) with highest score

  // Sort candidate total scores 
  const eligibleCandidateScores: totalScore[] = []
  eligibleCandidates.forEach((c) => eligibleCandidateScores.push(summaryData.totalScores[c.index]))
  const sortedScores = eligibleCandidateScores.sort((a: totalScore, b: totalScore) => {
    if (a.score > b.score) return -1
    if (a.score < b.score) return 1
    return 0
  })

  // Return all candidates that tie for top score
  const topScore = sortedScores[0]
  const scoreWinners = [summaryData.candidates[topScore.index]]
  for (let i = 1; i < sortedScores.length; i++) {
    if (sortedScores[i].score === topScore.score) {
      scoreWinners.push(summaryData.candidates[sortedScores[i].index])
    }
  }
  return scoreWinners
}


function runRunoffTiebreaker(summaryData: starSummaryData, runoffCandidates: candidate[]) {
  // Search for candidate with highest score between two runoff candidates
  if (summaryData.totalScores[runoffCandidates[0].index].score > summaryData.totalScores[runoffCandidates[1].index].score) {
    return 0
  }
  if (summaryData.totalScores[runoffCandidates[0].index].score < summaryData.totalScores[runoffCandidates[1].index].score) {
    return 1
  }
  return null
}

export function sortByTieBreakOrder(candidates: candidate[]) {
  return candidates.sort((a,b) => {
    if (a.tieBreakOrder < b.tieBreakOrder) return -1
    else return 1
  })
}

function sortMatrix(matrix: number[][], order: number[]) {
  var newMatrix: number[][] = Array(order.length);
  for (let i = 0; i < order.length; i++) {
    newMatrix[i] = Array(order.length).fill(0);
  }
  order.forEach((i, iInd) => {
    order.forEach((j, jInd) => {
      newMatrix[iInd][jInd] = matrix[i][j];
    });
  });
  return newMatrix
}

function getFiveStarCounts(summaryData: starSummaryData, tiedCandidates: candidate[]) {
  // Returns five star counts of tied candidates, sorted from most to least
  const fiveStarCounts: fiveStarCount[] = []
  tiedCandidates.forEach((candidate) => {
    fiveStarCounts.push(
      {
        candidate: candidate,
        counts: summaryData.scoreHist[candidate.index][5]
      }
    )
  })
  fiveStarCounts.sort((a, b) => b.counts - a.counts)
  return fiveStarCounts
}

function getFiveStarLosers(fiveStarCounts: fiveStarCount[]) {
  let minCount = fiveStarCounts[fiveStarCounts.length - 1].counts
  let fiveStarLosers = fiveStarCounts.filter(fiveStarCount => fiveStarCount.counts === minCount)
  return fiveStarLosers;
}

function getHeadToHeadLosers(summaryData: starSummaryData, tiedCandidates: candidate[]) {
  // Search for candidates with most head to head losses
  let headToHeadLosers: candidate[] = []
  let maxLosses: number = 0
  tiedCandidates.forEach(a => {
    let nLosses = 0
    tiedCandidates.forEach(b => {
      nLosses += summaryData.pairwiseMatrix[b.index][a.index]
    })
    if (nLosses > maxLosses) {
      // Candidate a has the most current losses
      maxLosses = nLosses
      headToHeadLosers = [a]
    }
    else if (nLosses === maxLosses) {
      // Candidate a is tied for most losses
      headToHeadLosers.push(a)
    }

  })
  return {
    headToHeadLosers,
    losses: maxLosses,
  }
}