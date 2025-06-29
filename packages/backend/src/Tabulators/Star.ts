import { candidate, starResults, roundResults, starSummaryData, starCandidate, rawVote, starRoundResults } from "@equal-vote/star-vote-shared/domain_model/ITabulators";
import { getSummaryData, makeAbstentionTest, makeBoundsTest, runBlocTabulator } from "./Util";
import { ElectionSettings } from "@equal-vote/star-vote-shared/domain_model/ElectionSettings";

export function Star(candidates: candidate[], votes: rawVote[], nWinners = 1, electionSettings?:ElectionSettings) {
  const {tallyVotes, summaryData} = getSummaryData<starCandidate, starSummaryData>(
		candidates.map(c => ({...c, score: 0, fiveStarCount: 0})),
		votes,
    'cardinal',
    'score',
		[
			makeBoundsTest(0, 5),
			makeAbstentionTest(true),
		]
	);

  return runBlocTabulator<starCandidate, starSummaryData, starResults>(
    {
      votingMethod: 'STAR',
      elected: [],
      tied: [],
      other: [],
      roundResults: [],
      summaryData: summaryData,
      tieBreakType: 'none',
    } as starResults,
    nWinners,
    singleWinnerStar,
    (candidate: starCandidate, roundResults: roundResults<starCandidate>[]) => {
      let winRound = roundResults.findIndex(round => round.winners[0].id == candidate.id)
      let runnerUpRound = roundResults.findIndex(round => round.winners[0].id == candidate.id)
      return [
        // sort first by winning round
        winRound == -1 ? -Infinity : -winRound,
        // then by runner_up round
        runnerUpRound == -1 ? -Infinity : -runnerUpRound,
        // then by totalScore
        candidate.score
      ]
    }
  )
}

export function singleWinnerStar(remainingCandidates: starCandidate[], summaryData: starSummaryData): starRoundResults {
// Initialize output results data structure
  const roundResults: starRoundResults = {
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
  const finalists: starCandidate[] = []
  findFinalists: while (finalists.length < 2) {
    const nCandidatesNeeded = 2 - finalists.length
    const nonFinalists = remainingCandidates.filter(c => !finalists.includes(c))
    const scoreWinners = nonFinalists.filter(c => c.score == nonFinalists[0].score);

    if (scoreWinners.length <= nCandidatesNeeded) {
      // when scoreWinners is less than candidate needed, but all can advance to runoff
      finalists.push(...scoreWinners)
      roundResults.logs.push(...scoreWinners.map(scoreWinner => ({
        key: 'tabulation_logs.star.score_tiebreak_advance_to_runoff',
        name: scoreWinner.name,
        score: scoreWinner.score,
      })))
      continue findFinalists
    }
    // Multiple candidates have top score, proceed to score tiebreaker
    roundResults.logs.push({
      // TODO: i18n should infer one vs two automatically from count, not sure why it's not working
      key: `tabulation_logs.star.scoring_round_tiebreaker_start_${(finalists.length+1) == 1 ? 'one' : 'two'}`,
      names: scoreWinners.map(c => c.name),
      score: scoreWinners[0].score,
      count: finalists.length+1,
    });

    let tiedCandidates = scoreWinners
    pairwiseLoop: while (tiedCandidates.length > 1) {
      // Get candidates with the most head to head losses
      let {headToHeadLosers, losses} = getHeadToHeadLosers(tiedCandidates)
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
        continue pairwiseLoop
      }
      // All tied candidates have the same number of head to head lossess
      if (nCandidatesNeeded === 2 && tiedCandidates.length === 2) {
        // Tie between two candidates, but both can advance to runoff
        tiedCandidates.forEach(c => {
          roundResults.logs.push({
            key: 'tabulation_logs.star.pairwise_tiebreak_advance_to_runoff',
            names: c.name,
            count: losses,
            n_tied_candidates: tiedCandidates.length
          })
          finalists.push(c)
        })
        continue findFinalists
      }
      // Proceed to five star tiebreaker
      roundResults.logs.push({
        key: 'tabulation_logs.star.pairwise_tiebreak_end',
        names: tiedCandidates.map(c => c.name),
        count: losses,
      })

      // TODO: I could update the sorting in getInitialData in order to support this, it would require multiple sort parameters
      tiedCandidates.sort((a, b) => -(a.fiveStarCount - b.fiveStarCount));
      if (nCandidatesNeeded === 2 && tiedCandidates[1].fiveStarCount > tiedCandidates[2].fiveStarCount) {
        // Two candidates needed and first two have more five star counts than the rest, advance them both to runoff
        tiedCandidates.slice(0, 2).map((c) => 
          roundResults.logs.push({
            key: 'tabulation_logs.star.five_star_tiebreak_advance_to_runoff',
            name: c.name,
            five_star_count: c.fiveStarCount,
          })
        );
        finalists.push(...tiedCandidates.slice(0, 2))
        continue findFinalists
      }
      if (tiedCandidates[0].fiveStarCount > tiedCandidates[1].fiveStarCount ) {
        // First has more five star counts than the rest, advance them to runoff
        roundResults.logs.push({
          key: 'tabulation_logs.star.five_star_tiebreak_advance_to_runoff',
          name: tiedCandidates[0].name,
          five_star_count: tiedCandidates[0].fiveStarCount,
        });
        finalists.push(tiedCandidates[0])
        continue findFinalists
      }

      // (Removing this step since we're about to drastically simplify the tie breaker protocol anyway)
      // No five star winner, try to find five star losers instead
      // let fiveStarLoserCounts = getFiveStarLosers(fiveStarCounts)
      // if (fiveStarLoserCounts.length < tiedCandidates.length) {
      //   // Some candidates have fewer five star votes than others, remove them from the tie breaker pool
      //   fiveStarLoserCounts.forEach(fiveStarCount => 
      //     roundResults.logs.push({
      //       key: 'tabulation_logs.star.five_star_tiebreak_remove_candidate',
      //       name: fiveStarCount.candidate.name,
      //       five_star_count: fiveStarCount.counts,
      //     })
      //   )
      //   tiedCandidates = tiedCandidates.filter(c => !fiveStarLoserCounts.map(f => f.candidate).includes(c))
      //   continue pairwiseLoop
      // }

      // roundResults.logs.push({
      //   key: 'tabulation_logs.star.five_star_tiebreak_end',
      //   names: fiveStarCounts.map(fiveStarCount => fiveStarCount.candidate.name),
      //   five_star_count: fiveStarCounts[0].counts,
      // });

      // True tie. Break tie randomly
      const randomWinner = tiedCandidates.sort((a, b) => -(a.tieBreakOrder - b.tieBreakOrder))[0]
      roundResults.logs.push({
        key: 'tabulation_logs.star.random_tiebreak_advance_to_runoff',
        name: randomWinner.name
      })
      finalists.push(randomWinner)
      continue findFinalists
    }

    // NOTE: we can only get here if the tiedCandidates.length > 1 condition fails
    //       so we know there's exactly one tied candidate
    roundResults.logs.push({
      // TODO: i18n should infer one vs two automatically from count, not sure why it's not working
      key: `tabulation_logs.star.tiebreak_advance_${finalists.length+1 == 1 ? 'one' : 'two'}`,
      count: finalists.length+1,
      name: tiedCandidates[0].name,
    });
    finalists.push(tiedCandidates[0])
  }

  const [left, right] = finalists;

  const leftVotes = left.votesPreferredOver[right.id];
  const rightVotes = right.votesPreferredOver[left.id];
  const equalPrefVotes = summaryData.nTallyVotes - leftVotes - rightVotes;

  roundResults.logs.push({
      key: 'tabulation_logs.star.automatic_runoff_start',
      candidate_a: left.name,
      candidate_b: right.name,
  })

  if(leftVotes != rightVotes){
    let [winner, runnerUp] = left.winsAgainst[right.id] ? [left, right] : [right, left];

    roundResults.winners.push(winner)
    roundResults.runner_up.push(runnerUp)

    roundResults.logs.push({
      key: 'tabulation_logs.star.automatic_runoff_win',
      winner: winner.name,
      loser: runnerUp.name,
      winner_votes: winner.votesPreferredOver[runnerUp.id],
      loser_votes: runnerUp.votesPreferredOver[winner.id],
      equal_votes: equalPrefVotes,
    })

    return roundResults
  }

  roundResults.logs.push({
    key: 'tabulation_logs.star.automatic_runoff_tie',
    names: finalists.map(f => f.name),
    tied_votes: leftVotes, // right or left doesn't matter
    equal_votes: equalPrefVotes,
  })

  roundResults.logs.push({
    key: 'tabulation_logs.star.runoff_round_tiebreaker_start',
    names: finalists.map(f => f.name),
  });

  // Tie, run runoff tiebreaker
  if (left.score != right.score) {
    let [winner, runnerUp] = (left.score > right.score)? [left, right] : [right, left];
    roundResults.winners = [winner]
    roundResults.runner_up = [runnerUp]
    roundResults.logs.push({
      key: 'tabulation_logs.star.score_tiebreak_win_runoff',
      winner: winner.name,
      loser: runnerUp.name,
      winner_score: winner.score,
      loser_score: runnerUp.score,
    })
    roundResults.tieBreakType = 'score';
    return roundResults
  }

  // Tie between scores, other tiebreaker needed to resolve
  roundResults.logs.push({
    key: 'tabulation_logs.star.score_tiebreak_end',
    names: finalists.map(f => f.name),
    score: left.score,
  })

  // Five-star tiebreaker is enabled, look for candidate with most 5 star votes
  if (left.fiveStarCount != right.fiveStarCount){
    let [winner, runnerUp] = (left.fiveStarCount > right.fiveStarCount )? [left, right] : [right, left];
    roundResults.winners = [winner]
    roundResults.runner_up = [runnerUp]
    roundResults.logs.push({
      key: 'tabulation_logs.star.five_star_tiebreak_win_runoff',
      winner: winner.name,
      loser: runnerUp.name,
      winner_five_star_count: winner.fiveStarCount,
      loser_five_star_count: runnerUp.fiveStarCount
    })
    roundResults.tieBreakType = 'five_star';
    return roundResults
  }

  // Could not resolve tie with five-star tiebreaker
  roundResults.logs.push({
    key: 'tabulation_logs.star.five_star_tiebreak_end',
    names: finalists.map(f => f.name),
    five_star_count: left.fiveStarCount, // left or right doesn't matter
  });

  // Break tie randomly
  let [winner, runnerUp] = (left.tieBreakOrder > right.tieBreakOrder)? [left, right] : [right, left];
  roundResults.logs.push({
    key: 'tabulation_logs.star.random_tiebreak_win_runoff',
    winner: winner.name,
    loser: runnerUp.name,
  });
  roundResults.tieBreakType = 'random';
  return roundResults
}

//function getFiveStarLosers(fiveStarCounts: fiveStarCount[]) {
//  let minCount = fiveStarCounts[fiveStarCounts.length - 1].counts
//  let fiveStarLosers = fiveStarCounts.filter(fiveStarCount => fiveStarCount.counts === minCount)
//  return fiveStarLosers;
//}

function getHeadToHeadLosers(tiedCandidates: candidate[]) {
  // Search for candidates with most head to head losses
  let headToHeadLosers: candidate[] = []
  let maxLosses: number = 0
  tiedCandidates.forEach(a => {
    let nLosses = 0
    tiedCandidates.forEach(b => {
      nLosses += b.votesPreferredOver[a.id]
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
