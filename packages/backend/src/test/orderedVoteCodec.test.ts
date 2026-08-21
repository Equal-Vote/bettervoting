import { RaceCandidateOrder } from "@equal-vote/star-vote-shared/domain_model/Ballot";
import { OrderedVote, Vote } from "@equal-vote/star-vote-shared/domain_model/Vote";
import {
    ORDERED_VOTE_TAIL_LENGTH,
    OrderedVoteFormatError,
    encodeOrderedVote,
    orderedVoteHasDuplicateRank,
    orderedVoteLength,
    orderedVoteOvervoteRank,
    orderedVotesToVotes,
} from "@equal-vote/star-vote-shared/domain_model/OrderedVoteCodec";

// The upload path (mapOrderedNewBallot) and the tabulation path (BallotProjection)
// both go through this codec, so it's pinned here against the exact behaviour the
// inline mapper in castVoteController had before it was extracted.

const raceOrder: RaceCandidateOrder[] = [
    {race_id: 'r0', candidate_id_order: ['a', 'b', 'c']},
    {race_id: 'r1', candidate_id_order: ['d', 'e']},
];

// what castVoteController used to do inline
const legacyMap = (orderedVotes: OrderedVote[], raceOrder: RaceCandidateOrder[]): Vote[] =>
    orderedVotes.map((vote, i) => ({
        race_id: raceOrder[i].race_id,
        scores: vote.slice(0, -2).map((s, j) => ({
            candidate_id: raceOrder[i].candidate_id_order[j],
            score: s,
        })),
        overvote_rank: vote.at(-2),
        has_duplicate_rank: vote.at(-1) == 1,
    })) as Vote[];

describe("OrderedVoteCodec", () => {
    test("tail length matches the layout the mapper assumed", () => {
        expect(ORDERED_VOTE_TAIL_LENGTH).toBe(2);
        expect(orderedVoteLength(3)).toBe(5);
    });

    test("decodes the same votes the inline mapper produced", () => {
        // exactly what the frontend uploader puts on the wire, including the
        // nulls JSON.stringify writes for unmarked candidates and absent ranks
        const orderedVotes: OrderedVote[] = [
            [5, null, 0, null, 0],
            [1, 2, 3, 1],
        ];
        expect(orderedVotesToVotes(orderedVotes, raceOrder)).toEqual(legacyMap(orderedVotes, raceOrder));
        expect(orderedVotesToVotes(orderedVotes, raceOrder)).toEqual([
            {
                race_id: 'r0',
                scores: [
                    {candidate_id: 'a', score: 5},
                    {candidate_id: 'b', score: null},
                    {candidate_id: 'c', score: 0},
                ],
                overvote_rank: null,
                has_duplicate_rank: false,
            },
            {
                race_id: 'r1',
                scores: [
                    {candidate_id: 'd', score: 1},
                    {candidate_id: 'e', score: 2},
                ],
                overvote_rank: 3,
                has_duplicate_rank: true,
            },
        ]);
    });

    test("rejects a ballot with the wrong number of races", () => {
        expect(() => orderedVotesToVotes([[1, 2, 3, 0, 0]], raceOrder))
            .toThrow(new OrderedVoteFormatError('Ballot contains different number of races than race_order: 1 != 2'));
        // the class identity matters: castVoteController turns this into a 400
        // via instanceof, and would surface a 500 if it ever stopped matching
        expect(() => orderedVotesToVotes([[1, 2, 3, 0, 0]], raceOrder)).toThrow(OrderedVoteFormatError);
    });

    test("rejects a race with the wrong number of candidates", () => {
        expect(() => orderedVotesToVotes([[1, 2, 0, 0], [1, 2, 0, 0]], raceOrder))
            .toThrow(new OrderedVoteFormatError('Race 0 contains different number of candidates than race_order: 4 != 5'));
    });

    test("encode round-trips through decode", () => {
        const encoded = encodeOrderedVote([5, null, undefined], 2, true);
        expect(encoded).toEqual([5, null, undefined, 2, 1]);
        expect(orderedVoteOvervoteRank(encoded)).toBe(2);
        expect(orderedVoteHasDuplicateRank(encoded)).toBe(true);
    });

    test("an unset has_duplicate_rank stays unset, rather than becoming false", () => {
        // JSON can't carry undefined, so this only happens for ordered votes we
        // build in-process — where losing the distinction would mean inventing a
        // field the source ballot never had
        const encoded = encodeOrderedVote([1, 2], undefined, undefined);
        expect(orderedVoteOvervoteRank(encoded)).toBeUndefined();
        expect(orderedVoteHasDuplicateRank(encoded)).toBeUndefined();
        expect(orderedVoteHasDuplicateRank(encodeOrderedVote([1, 2], undefined, false))).toBe(false);
    });
});
