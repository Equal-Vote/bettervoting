/////////////// GENERAL TYPES //////////////////

export type keyedObject<T> = {[key: string]: T};

export type rawVote = {
    marks: keyedObject<number | null>; // candidate id => bubble value mapping
    overvote_rank?: number;
    has_duplicate_rank?: boolean;
}

export type vote = {
    marks: keyedObject<number>; // candidate id => bubble value mapping
    overvote_rank?: number;
    has_duplicate_rank?: boolean;
}

// commenting and seeing where things break
//export interface voter {
//    csvRow: number
//}

export type tabulatorLog = string | tabulatorLogObject;

interface tabulatorLogObject {
    key: string,
    [key: string]: string | number | string[]
}

export type tieBreakType = 'none' | 'score' | 'head_to_head' | 'five_star' | 'random';

export type ElectionResults =
    starResults |
    allocatedScoreResults |
    approvalResults |
    rankedRobinResults | 
    irvResults |
    pluralityResults;

type votingMethod = 
    'STAR' |
    'STAR_PR' |
    'Approval' |
    'RankedRobin' |
    'IRV' |
    'STV' |
    'Plurality';

/////////////// GENERICS //////////////////

export interface candidate {
    id: string,
    name: string,
    tieBreakOrder: number,
    votesPreferredOver: keyedObject<number>,
    winsAgainst: keyedObject<boolean>,
}

export interface genericSummaryData<CandidateType extends candidate> {
    candidates: CandidateType[],
    // nVotes = nOutOfBoundsVotes + nAbstentions + nTallyVotes
    nOutOfBoundsVotes: number,
    nAbstentions: number,
    nTallyVotes: number,
}

export interface roundResults<CandidateType extends candidate> {
    winners: CandidateType[],
    runner_up: CandidateType[],
    tied: CandidateType[],
    tieBreakType: tieBreakType,
    logs: tabulatorLog[],
}

export interface genericResults<CandidateType extends candidate, SummaryType extends genericSummaryData<CandidateType>> {
    votingMethod: votingMethod,
    elected: CandidateType[],
    tied: candidate[],
    other: candidate[],
    roundResults: roundResults<CandidateType>[],
    summaryData: SummaryType,
    tieBreakType: tieBreakType,
    numUnprocessedWriteIns?: number,
}

/////////////// STAR TYPES //////////////////
export interface starCandidate extends candidate {
    score: number,
    fiveStarCount: number;
}

export type starSummaryData = genericSummaryData<starCandidate>

export type starRoundResults = roundResults<starCandidate>

export interface starResults extends genericResults<starCandidate, starSummaryData> {
    votingMethod: 'STAR',
}

/////////////// APPROVAL TYPES //////////////////

export interface approvalCandidate extends candidate {
    score: number,
}

export type approvalSummaryData = genericSummaryData<approvalCandidate>

export type approvalRoundResults = roundResults<approvalCandidate>

export interface approvalResults extends genericResults<approvalCandidate, approvalSummaryData> {
    votingMethod: 'Approval',
}

/////////////// RANKED ROBIN TYPES //////////////////
export interface rankedRobinCandidate extends candidate {
    copelandScore: number,
}

export type rankedRobinSummaryData = genericSummaryData<rankedRobinCandidate>;

export type rankedRobinRoundResults = roundResults<rankedRobinCandidate>

export interface rankedRobinResults extends genericResults<rankedRobinCandidate, rankedRobinSummaryData> {
    votingMethod: 'RankedRobin',
}

/////////////// STAR PR TYPES //////////////////
export interface allocatedScoreCandidate extends candidate {
    score: number,
}

export interface allocatedScoreSummaryData extends genericSummaryData<allocatedScoreCandidate > {
    splitPoints: number[],
    spentAboves: number[],
    weight_on_splits: number[],
    weightedScoresByRound: number[][]
}

export type allocatedScoreRoundResults = roundResults<allocatedScoreCandidate>
export interface allocatedScoreResults extends genericResults<allocatedScoreCandidate, allocatedScoreSummaryData>{
    votingMethod: 'STAR_PR',
    logs: tabulatorLog[]
}

/////////////// PLURALITY TYPES //////////////////
 
export interface pluralityCandidate extends candidate{
    score: number,
}

export interface pluralitySummaryData extends genericSummaryData<pluralityCandidate> {
    nOvervotes: number
}

export type plurlaityRoundResults = roundResults<pluralityCandidate>;
export interface pluralityResults extends genericResults<pluralityCandidate, pluralitySummaryData> {
    votingMethod: 'Plurality',
}

/////////////// IRV TYPES //////////////////

export interface irvCandidate extends candidate{
    hareScores: number[]
};

export type irvSummaryData = genericSummaryData<irvCandidate>;

export interface irvRoundResults extends roundResults<irvCandidate>{
    eliminated: irvCandidate[],
    /* Sorted by decreasing Hare score */
    /* Next two are maybe filled in only in front end: */
    exhaustedVoteCount?: number | undefined,
    isStartOfSearch?: boolean | undefined,
}

export interface irvResults extends genericResults<irvCandidate, irvSummaryData> {
    votingMethod: 'IRV' | 'STV',
    roundResults: irvRoundResults[],
      /* Outer index is round; inner index is candidate. */
    exhaustedVoteCounts: number[],  /* by round */
    nExhaustedViaOvervote: number,
    nExhaustedViaSkippedRank: number,
    nExhaustedViaDuplicateRank: number,
}