import { candidate, starResults, roundResults, starSummaryData, starCandidate, rawVote, starRoundResults, tieBreakType } from "@equal-vote/star-vote-shared/domain_model/ITabulators";
import { getSummaryData, makeAbstentionTest, makeBoundsTest, runBlocTabulator, shuffleCandidates, sortCandidates } from "./Util";
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
  );
}

type starCandidatePair = [starCandidate, starCandidate];

const setTieBreak = (roundResults: starRoundResults, tieBreak: tieBreakType): void => {
  // when there's multiple tiebreaks it should be set in favor of the more extreme protocol
  const priority = ['none', 'score', 'head_to_head', 'five_star', 'random']
  if(priority.indexOf(roundResults.tieBreakType) > priority.indexOf(tieBreak)) return;
  roundResults.tieBreakType = tieBreak;
}

export function singleWinnerStar(remainingCandidates: starCandidate[], summaryData: starSummaryData): starRoundResults {
  const getScoringRoundFinalists = (candidates: starCandidate[]): starCandidatePair => {
    function logFinalistsAfterTiebreak(finalists: starCandidatePair){
      roundResults.logs.push({
        key: 'tabulation_logs.star.advance_to_runoff_tiebreak',
        names: finalists.map(f => f.name),
      });
      return finalists;
    }

    sortCandidates(candidates, 'score');

    // HAPPY PATH: there's an obvious top 2 score getters
    if(candidates.length <= 2 || candidates[1].score != candidates[2].score){
      const finalists = candidates.slice(0, 2) as starCandidatePair
      if(finalists[0].score == finalists[1].score){
        roundResults.logs.push({
          key: 'tabulation_logs.star.advance_to_runoff_same_score',
          names: finalists.map(f => f.name),
          star: finalists[0].score,
        })
      }else{
        roundResults.logs.push({
          key: 'tabulation_logs.star.advance_to_runoff_basic',
          names: finalists.map(f => f.name),
          stars: finalists.map(f => '' + f.score),
        })
      }
      return finalists;
    }

    // report initial finalist (if present)
    let finalists: starCandidate[] = [];
    if(candidates[0].score > candidates[1].score){
      roundResults.logs.push({
        key: 'tabulation_logs.star.score_advance_to_runoff',
        name: candidates[0].name,
        score: candidates[0].score,
      })

      finalists = [candidates[0]];
    }

    // setup for tiebreakers
    const tieScore = candidates[1].score;
    let tiedCandidates = candidates.filter(c => c.score == tieScore);
    roundResults.logs.push({
      key: 'tabulation_logs.star.score_tied',
      names: tiedCandidates.map(c => c.name),
      score: tieScore,
    })

    // HEAD-TO-HEAD TIEBREAK: there's a score tie for 2nd & 3rd place
    let [left, right] = tiedCandidates.slice(0, 2);
    if(tiedCandidates.length > 2){
      roundResults.logs.push({
        key: 'tabulation_logs.star.pairwise_too_many_candidates',
      })
    }else if(left.winsAgainst[right.id] == right.winsAgainst[left.id]){
      roundResults.logs.push({
        key: 'tabulation_logs.star.pairwise_tied',
        names: tiedCandidates.map(c => c.name),
        votes: left.votesPreferredOver[right.id],
        equal_votes: summaryData.nTallyVotes - 2*left.votesPreferredOver[right.id],
      })
    }else{
      const [tieWinner, tieRunnerUp] = left.winsAgainst[right.id] ? [left, right] : [right, left];
      setTieBreak(roundResults, 'head_to_head');
      roundResults.logs.push({
        key: 'tabulation_logs.star.pairwise_advance_to_runoff',
        winner: tieWinner.name,
        runner_up: tieRunnerUp.name,
        winner_votes: tieWinner.votesPreferredOver[tieRunnerUp.id],
        runner_up_votes: tieRunnerUp.votesPreferredOver[tieWinner.id],
      })
      return logFinalistsAfterTiebreak([candidates[0], tieWinner]);
    }

    // FIVE-STAR TIEBREAK: the group could have 2+ candidates, and it may or may not include the highest scoring candidate
    sortCandidates(tiedCandidates, 'fiveStarCount');
    while(finalists.length < 2 && tiedCandidates[0].fiveStarCount > tiedCandidates[1].fiveStarCount){
      roundResults.logs.push({
        key: `tabulation_logs.star.five_star_${finalists.length == 0 ? 'first' : 'second'}`,
        name: tiedCandidates[0].name,
        votes: tiedCandidates[0].fiveStarCount,
      })
      setTieBreak(roundResults, 'five_star');
      finalists.push(tiedCandidates.shift() as starCandidate);
    }
    if(finalists.length == 2) return logFinalistsAfterTiebreak(finalists as starCandidatePair);
    tiedCandidates = tiedCandidates.filter(c => c.fiveStarCount == tiedCandidates[0].fiveStarCount);
    roundResults.logs.push({
      key: 'tabulation_logs.star.five_star_tied',
      names: tiedCandidates.map(c => c.name),
      votes: tiedCandidates[0].fiveStarCount,
    })

    // RANDOM TIEBREAK: At a certain some point there's no other way 🤷
    shuffleCandidates(tiedCandidates, summaryData.nTallyVotes);
    while(finalists.length < 2){
      roundResults.logs.push({
        key: `tabulation_logs.star.random_${finalists.length == 0 ? 'first' : 'second'}`,
        name: tiedCandidates[0].name,
      })
      finalists.push(tiedCandidates.shift() as starCandidate);
    }
    setTieBreak(roundResults, 'random');
    return logFinalistsAfterTiebreak(candidates.slice(0, 2) as starCandidatePair);
  }

  function getRunoffResults(left: starCandidate, right: starCandidate): starCandidatePair{
    function logWinnerAfterTiebreak(winner: starCandidate, runnerUp: starCandidate): starCandidatePair{
      roundResults.logs.push({
        key: 'tabulation_logs.star.runoff_tiebreak',
        winner: winner.name,
        runner_up: runnerUp.name,
      });
      return [winner, runnerUp];
    }

    // HAPPY PATH: there's a clear winner
    if(left.winsAgainst[right.id] != right.winsAgainst[left.id]){
      let [winner, runnerUp] = left.winsAgainst[right.id] ? [left, right] : [right, left];
      const winnerVotes = winner.votesPreferredOver[runnerUp.id];
      const runnerUpVotes = runnerUp.votesPreferredOver[winner.id];
      roundResults.logs.push({
        key: 'tabulation_logs.star.runoff_win',
        winner: winner.name,
        runner_up: runnerUp.name,
        winner_votes: winnerVotes,
        runner_up_votes: runnerUpVotes,
        equal_votes: summaryData.nTallyVotes - winnerVotes - runnerUpVotes,
      })
      return [winner, runnerUp];
    }

    // report tied state
    const leftVotes = left.votesPreferredOver[right.id];
    roundResults.logs.push({
      key: 'tabulation_logs.star.runoff_tied',
      names: [left, right].map(c => c.name),
      votes: left.votesPreferredOver[right.id],
      equal_votes: summaryData.nTallyVotes - leftVotes - leftVotes,
    });

    // SCORE TIEBREAK
    if(left.score == right.score){
      roundResults.logs.push({
        key: 'tabulation_logs.star.runoff_score_tie',
        names: [left, right].map(c => c.name),
        stars: left.score,
      });
    }else{
      let [winner, runnerUp] = left.score > right.score ? [left, right] : [right, left];
      roundResults.logs.push({
        key: 'tabulation_logs.star.runoff_score_tiebreak',
        winner: winner.name,
        runner_up: runnerUp.name,
        winner_stars: winner.score,
        runner_up_stars: runnerUp.score,
      });
      setTieBreak(roundResults, 'score');
      return logWinnerAfterTiebreak(winner, runnerUp);
    }

    // FIVE-STAR TIEBREAK
    if(left.fiveStarCount == right.fiveStarCount){
      roundResults.logs.push({
        key: 'tabulation_logs.star.runoff_five_star_tie',
        names: [left, right].map(c => c.name),
        votes: left.fiveStarCount,
      });
    }else{
      let [winner, runnerUp] = left.fiveStarCount > right.fiveStarCount ? [left, right] : [right, left];
      roundResults.logs.push({
        key: 'tabulation_logs.star.runoff_five_star_tiebreak',
        winner: winner.name,
        runner_up: runnerUp.name,
        winner_votes: winner.fiveStarCount,
        runner_up_votes: runnerUp.fiveStarCount,
      });
      setTieBreak(roundResults, 'five_star');
      return logWinnerAfterTiebreak(winner, runnerUp);
    }

    // RANDOM TIEBREAK: At a certain some point there's no other way 🤷
    let [winner, runnerUp] = shuffleCandidates([left, right], summaryData.nTallyVotes);
    roundResults.logs.push({
      key: `tabulation_logs.star.runoff_random`,
      winner: winner.name,
      runner_up: runnerUp.name,
    })
    setTieBreak(roundResults, 'random');
    return logWinnerAfterTiebreak(winner, runnerUp);
  }

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

  const finalists: starCandidatePair = getScoringRoundFinalists(remainingCandidates);

  const [winner, runnerUp]: starCandidatePair  = getRunoffResults(...finalists);

  roundResults.winners = [winner];
  roundResults.runner_up = [runnerUp];

  return roundResults;
}