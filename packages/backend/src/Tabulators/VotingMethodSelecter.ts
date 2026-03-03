import { Star } from "./Star";
import { Approval } from "./Approval";
import { Plurality } from "./Plurality";
import { IRV, STV } from "./IRV";
import { RankedRobin } from "./RankedRobin";
import { AllocatedScore } from "./AllocatedScore";
import { ElectionSettings, electionSettingsValidation } from "@equal-vote/star-vote-shared/domain_model/ElectionSettings";
import { allocatedScoreCandidate, allocatedScoreResults, allocatedScoreSummaryData, approvalCandidate, approvalResults, approvalSummaryData, candidate, genericResults, genericSummaryData, irvCandidate, irvResults, irvSummaryData, pluralityCandidate, pluralityResults, pluralitySummaryData, rankedRobinCandidate, rankedRobinResults, rankedRobinRoundResults, rankedRobinSummaryData, rawVote, starCandidate, starResults, starSummaryData, vote } from "@equal-vote/star-vote-shared/domain_model/ITabulators";

type TabulatorFunction<
    CandidateType extends candidate,
    SummaryType extends genericSummaryData<CandidateType>,
    ResultsType extends genericResults<CandidateType, SummaryType>,
> = (
    candidates: candidate[],
    votes: rawVote[],
    nWinners?: number,
    electionSettings?: ElectionSettings
) => ResultsType;

export const VotingMethods: {
    'STAR': TabulatorFunction<starCandidate, starSummaryData, starResults>,
    'Approval': TabulatorFunction<approvalCandidate, approvalSummaryData, approvalResults>,
    'STAR_PR': TabulatorFunction<allocatedScoreCandidate, allocatedScoreSummaryData, allocatedScoreResults>,
    'Plurality': TabulatorFunction<pluralityCandidate, pluralitySummaryData, pluralityResults>,
    'IRV': TabulatorFunction<irvCandidate, irvSummaryData, irvResults>,
    'STV': TabulatorFunction<irvCandidate, irvSummaryData, irvResults>,
    'RankedRobin': TabulatorFunction<rankedRobinCandidate, rankedRobinSummaryData, rankedRobinResults>,
} = {
    STAR: Star,
    Approval: Approval,
    STAR_PR: AllocatedScore,
    Plurality: Plurality,
    IRV: IRV,
    STV: STV,
    RankedRobin: RankedRobin
}