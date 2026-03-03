import { candidate, pluralityCandidate, pluralityResults, pluralitySummaryData, plurlaityRoundResults, rawVote, roundResults } from "@equal-vote/star-vote-shared/domain_model/ITabulators";

import { commaListFormatter, makeBoundsTest, makeAbstentionTest, runBlocTabulator, getSummaryData } from "./Util";
import { ElectionSettings } from "@equal-vote/star-vote-shared/domain_model/ElectionSettings";

export function Plurality(candidates: candidate[], votes: rawVote[], nWinners = 1, electionSettings?:ElectionSettings) {
  const {summaryData} = getSummaryData<pluralityCandidate, pluralitySummaryData>(
    // ordinal would be more correct, but for computing totalScores plurlaity uses cardinal rules
    candidates.map(c => ({...c, score: 0})),
    votes,
    'cardinal', 
    'score',
		[
			makeBoundsTest(0, 1),
			makeAbstentionTest(),
      // not sure why I can't use Object.values below
      ['nOvervotes', (vote: rawVote) => Object.entries(vote.marks).reduce((prev, [_, m]) => prev + (m??0), 0) > 1]
		]
	);

  return runBlocTabulator<pluralityCandidate, pluralitySummaryData, pluralityResults>(
		{
      votingMethod: 'Plurality',
      elected: [],
      tied: [],
      other: [],
      roundResults: [],
      summaryData: summaryData,
      tieBreakType: 'none',
    } as pluralityResults,
		nWinners,
		singleWinnerPlurality
  );
}

const singleWinnerPlurality = (remainingCandidates: pluralityCandidate[], summaryData: pluralitySummaryData): plurlaityRoundResults => {
  let winner = remainingCandidates[0];
  let tiedCandidates = remainingCandidates.filter(c => c.score == winner.score);

  return {
    winners: [winner],
    runner_up: [],
    logs: (tiedCandidates.length == 1)? [
      `${winner.name} has the most votes and wins the round`
    ] : [
      `${commaListFormatter.format(tiedCandidates.map(c => c.name))} all tied with the most votes`,
      `${winner.name} wins the round after a random tiebreaker`
    ],
    tieBreakType: (tiedCandidates.length == 1)? 'none' : 'random',
    tied: tiedCandidates,
  };
}
