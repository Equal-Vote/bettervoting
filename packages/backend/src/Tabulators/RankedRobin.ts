import { candidate, rankedRobinCandidate, rankedRobinResults, rankedRobinRoundResults, rankedRobinSummaryData, rawVote } from "@equal-vote/star-vote-shared/domain_model/ITabulators";
import { getSummaryData, makeAbstentionTest, makeBoundsTest, runBlocTabulator } from "./Util";
import { ElectionSettings } from "@equal-vote/star-vote-shared/domain_model/ElectionSettings";

export function RankedRobin(candidates: candidate[], votes: rawVote[], nWinners = 1, electionSettings?:ElectionSettings) {

  const {summaryData} = getSummaryData<rankedRobinCandidate, rankedRobinSummaryData>(
    candidates.map(c => ({...c, copelandScore: 0})),
    votes,
    'ordinal',
    'copelandScore',
		[
			makeBoundsTest(0, electionSettings?.max_rankings ?? Infinity), 
			makeAbstentionTest(),
		]
	);

  return runBlocTabulator<rankedRobinCandidate, rankedRobinSummaryData, rankedRobinResults>(
		{
      votingMethod: 'RankedRobin',
      elected: [],
      tied: [],
      other: [],
      roundResults: [],
      summaryData: summaryData,
      tieBreakType: 'none',
    } as rankedRobinResults,
		nWinners,
		singleWinnerRankedRobin
  );
}

const singleWinnerRankedRobin = (remainingCandidates: rankedRobinCandidate[], summaryData: rankedRobinSummaryData): rankedRobinRoundResults => {
  // Initialize output results data structure
  const roundResults: rankedRobinRoundResults = {
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

  let winners = remainingCandidates.filter(c => c.copelandScore === remainingCandidates[0].copelandScore);

  if (winners.length===1) {
    roundResults.winners.push(winners[0])
    roundResults.logs.push(`${winners[0].name} wins round with highest number of wins.`)
    return roundResults
  }
  
  const [left, right] = winners.slice(0, 2);
  if (winners.length===2 && left.winsAgainst[right.id] != right.winsAgainst[left.id]){
    const [winner, loser] = left.winsAgainst[right.id] ? [left, right] : [right, left];

    roundResults.winners.push(winner)
    roundResults.logs.push(`${winner.name} preferred over ${loser.name} in runoff.`)
    return roundResults
  }

  // Break Tie Randomly
  const randomWinner = winners.sort((a, b) => (a.tieBreakOrder - b.tieBreakOrder))[0]
  roundResults.winners.push(randomWinner)
  roundResults.logs.push(`${winners[0].name} picked in random tie-breaker, more robust tiebreaker not yet implemented.`)
  return roundResults
}
