import { Score } from "./Score";
import { Uid } from "./Uid";

export interface Vote {
    race_id: Uid;        // Must match the pollId of the election
    scores: Score[];       // One per candidate
    overvote_rank?: number;
    has_duplicate_rank?: boolean;
}

// One candidate's bubble value inside an OrderedVote:
//   number    — the score/rank the voter gave
//   null      — the voter left the candidate unmarked
//   undefined — the ballot has no entry for this candidate at all
// null and undefined are not interchangeable during tabulation: a candidate the
// ballot never mentioned is treated differently from one left explicitly blank.
export type OrderedVoteMark = number | null | undefined;

// this format is used in bulk uploads where the race/candidate order is mapped in a separate structure
// see OrderedVoteCodec for the layout (marks, then overvote_rank, then has_duplicate_rank)
export type OrderedVote = OrderedVoteMark[];