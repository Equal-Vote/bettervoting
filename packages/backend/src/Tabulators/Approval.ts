import { approvalResults, approvalCandidate, approvalSummaryData, candidate, rawVote, approvalRoundResults, } from "@equal-vote/star-vote-shared/domain_model/ITabulators";

import { commaListFormatter, makeBoundsTest, makeAbstentionTest, runBlocTabulator, getSummaryData } from "./Util";
import { ElectionSettings } from "@equal-vote/star-vote-shared/domain_model/ElectionSettings";

export function Approval(candidates: candidate[], votes: rawVote[], nWinners = 1, electionSettings?:ElectionSettings) {
  const {summaryData} = getSummaryData<approvalCandidate, approvalSummaryData>(
		candidates.map(c => ({...c, score: 0})),
    votes,
    'cardinal',
    'score',
		[
			makeBoundsTest(0, 1),
			makeAbstentionTest(),
		],
	);

	return runBlocTabulator<approvalCandidate, approvalSummaryData, approvalResults>(
		{
			votingMethod: 'Approval',
			elected: [],
			tied: [],
			other: [],
			roundResults: [],
			summaryData: summaryData,
			tieBreakType: 'none',
		} as approvalResults,
		nWinners,
		singleWinnerApproval,
    (candidate: approvalCandidate) => ([candidate.score])
	)
}

const singleWinnerApproval = (remainingCandidates: approvalCandidate[], summaryData: approvalSummaryData): approvalRoundResults => {

  let winner = remainingCandidates[0];
  let tiedCandidates = remainingCandidates.filter(c => c.score == winner.score);

  return {
    winners: [winner],
    runner_up: [],
    logs: (tiedCandidates.length == 1)? [
      `${winner.name} has the most approvals and wins the round`
    ] : [
      `${commaListFormatter.format(tiedCandidates.map(c => c.name))} all tied with the most approvals`,
      `${winner.name} wins the round after a random tiebreaker`
    ],
    tieBreakType: (tiedCandidates.length == 1)? 'none' : 'random',
    tied: tiedCandidates,
  };
}
