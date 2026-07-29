import { RaceCandidateOrder } from "./Ballot";
import { Score } from "./Score";
import { OrderedVote, OrderedVoteMark, Vote } from "./Vote";

// An OrderedVote is one race's marks flattened into a positional array:
//
//   [ ...one entry per candidate in RaceCandidateOrder.candidate_id_order,
//     overvote_rank,
//     has_duplicate_rank ]
//
// The candidate ids live once in the RaceCandidateOrder instead of once per
// ballot, which is what makes the format cheap enough to hold a whole election
// in memory. Bulk uploads send ballots in this shape and tabulation projects
// stored ballots back into it, so the layout is defined here, once.
export const ORDERED_VOTE_TAIL_LENGTH = 2; // overvote_rank, has_duplicate_rank

export class OrderedVoteFormatError extends Error {}

/** How long an OrderedVote must be for a race with this many candidates. */
export const orderedVoteLength = (candidateCount: number) => candidateCount + ORDERED_VOTE_TAIL_LENGTH;

export const orderedVoteMarks = (orderedVote: OrderedVote): OrderedVoteMark[] =>
    orderedVote.slice(0, -ORDERED_VOTE_TAIL_LENGTH);

// null is what JSON.stringify writes for an absent overvote_rank, so uploaded
// ballots routinely carry it. It's passed through rather than normalized so
// stored ballots stay byte-identical to what the format has always produced
// (tabulation only tests overvote_rank for truthiness, where the two agree).
export const orderedVoteOvervoteRank = (orderedVote: OrderedVote) =>
    orderedVote.at(-2) as number | undefined;

export const orderedVoteHasDuplicateRank = (orderedVote: OrderedVote) => {
    const tail = orderedVote.at(-1);
    // undefined only shows up in ordered votes we built in-process (JSON can't
    // carry it); there it means "the source Vote didn't set the field"
    return tail === undefined ? undefined : tail == 1;
};

export const encodeOrderedVote = (
    marks: readonly OrderedVoteMark[],
    overvote_rank?: number,
    has_duplicate_rank?: boolean,
): OrderedVote => [
    ...marks,
    overvote_rank,
    has_duplicate_rank === undefined ? undefined : (has_duplicate_rank ? 1 : 0),
];

/**
 * Expand a ballot's ordered votes back into verbose Votes.
 * Throws OrderedVoteFormatError when the ballot doesn't line up with raceOrder.
 */
export const orderedVotesToVotes = (orderedVotes: OrderedVote[], raceOrder: RaceCandidateOrder[]): Vote[] => {
    if (orderedVotes.length != raceOrder.length) {
        throw new OrderedVoteFormatError(
            `Ballot contains different number of races than race_order: ${orderedVotes.length} != ${raceOrder.length}`
        );
    }
    return orderedVotes.map((orderedVote, i) => {
        const expectedLength = orderedVoteLength(raceOrder[i].candidate_id_order.length);
        if (orderedVote.length != expectedLength) {
            throw new OrderedVoteFormatError(
                `Race ${i} contains different number of candidates than race_order: ${orderedVote.length} != ${expectedLength}`
            );
        }
        return {
            race_id: raceOrder[i].race_id,
            scores: orderedVoteMarks(orderedVote).map((mark, j) => ({
                candidate_id: raceOrder[i].candidate_id_order[j],
                score: mark
            } as Score)),
            overvote_rank: orderedVoteOvervoteRank(orderedVote),
            has_duplicate_rank: orderedVoteHasDuplicateRank(orderedVote),
        };
    });
};
