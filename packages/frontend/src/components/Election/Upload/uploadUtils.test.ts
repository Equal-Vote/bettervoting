import { describe, it, expect } from 'vitest';
import { computeRaceOrder, encodeBallotRow } from './uploadUtils';
import { Election } from '@equal-vote/star-vote-shared/domain_model/Election';
import { NewBallot, RaceCandidateOrder } from '@equal-vote/star-vote-shared/domain_model/Ballot';
import { ORDERED_VOTE_TAIL_LENGTH } from '@equal-vote/star-vote-shared/domain_model/OrderedVoteCodec';

const mockElection = {
    election_id: 'elec1',
    title: 'Test Election',
    description: '',
    frontend_url: 'http://localhost',
    owner_id: 'owner1',
    state: 'closed' as const,
    ballot_source: 'prior_election' as const,
    settings: {} as Election['settings'],
    create_date: new Date(),
    update_date: new Date(),
    head: true,
    races: [
        {
            race_id: 'race1',
            title: 'Mayor',
            voting_method: 'IRV' as const,
            num_winners: 1,
            candidates: [
                { candidate_id: 'c1', candidate_name: 'Alice' },
                { candidate_id: 'c2', candidate_name: 'Bob' },
            ],
        },
        {
            race_id: 'race2',
            title: 'Council',
            voting_method: 'IRV' as const,
            num_winners: 1,
            candidates: [
                { candidate_id: 'c3', candidate_name: 'Charlie' },
                { candidate_id: 'c4', candidate_name: 'Dana' },
                { candidate_id: 'c5', candidate_name: 'Eve' },
            ],
        },
    ],
} as unknown as Election;

const raceOrder: RaceCandidateOrder[] = [
    { race_id: 'race1', candidate_id_order: ['c1', 'c2'] },
    { race_id: 'race2', candidate_id_order: ['c3', 'c4', 'c5'] },
];

describe('computeRaceOrder', () => {
    it('returns one entry per race', () => {
        const result = computeRaceOrder(mockElection);
        expect(result).toHaveLength(2);
    });

    it('maps race_id and candidate_id_order from the election', () => {
        const result = computeRaceOrder(mockElection);
        expect(result[0]).toEqual({ race_id: 'race1', candidate_id_order: ['c1', 'c2'] });
        expect(result[1]).toEqual({ race_id: 'race2', candidate_id_order: ['c3', 'c4', 'c5'] });
    });

    it('returns an empty array for an election with no races', () => {
        const noRaces = { ...mockElection, races: [] } as unknown as Election;
        expect(computeRaceOrder(noRaces)).toEqual([]);
    });
});

describe('encodeBallotRow', () => {
    const makeRow = (votes: NewBallot['votes']): NewBallot => ({
        election_id: 'elec1',
        status: 'submitted',
        date_submitted: 0,
        votes,
    } as NewBallot);

    it('produces one orderedVote per race in raceOrder', () => {
        const row = makeRow([
            { race_id: 'race1', scores: [{ candidate_id: 'c1', score: 1 }, { candidate_id: 'c2', score: null }] },
            { race_id: 'race2', scores: [{ candidate_id: 'c3', score: 2 }, { candidate_id: 'c4', score: 1 }, { candidate_id: 'c5', score: null }] },
        ]);
        const result = encodeBallotRow(row, raceOrder);
        expect(result.orderedVotes).toHaveLength(2);
    });

    it('encodes scores in candidate_id_order sequence', () => {
        const row = makeRow([
            { race_id: 'race1', scores: [{ candidate_id: 'c1', score: 1 }, { candidate_id: 'c2', score: 2 }] },
            { race_id: 'race2', scores: [{ candidate_id: 'c3', score: null }, { candidate_id: 'c4', score: null }, { candidate_id: 'c5', score: null }] },
        ]);
        const result = encodeBallotRow(row, raceOrder);
        // race1: marks are [1, 2] + 2 tail entries
        expect(result.orderedVotes[0][0]).toBe(1);
        expect(result.orderedVotes[0][1]).toBe(2);
        expect(result.orderedVotes[0]).toHaveLength(2 + ORDERED_VOTE_TAIL_LENGTH);
    });

    it('encodes a race missing from votes as all-undecided (all null marks)', () => {
        const row = makeRow([
            { race_id: 'race1', scores: [{ candidate_id: 'c1', score: 1 }, { candidate_id: 'c2', score: null }] },
            // race2 is absent
        ]);
        const result = encodeBallotRow(row, raceOrder);
        const race2Vote = result.orderedVotes[1];
        // length = 3 candidates + 2 tail entries
        expect(race2Vote).toHaveLength(3 + ORDERED_VOTE_TAIL_LENGTH);
        // marks are all null
        for (let i = 0; i < 3; i++) {
            expect(race2Vote[i]).toBeNull();
        }
    });

    it('handles a row with no votes at all (all races missing)', () => {
        const row = makeRow([]);
        const result = encodeBallotRow(row, raceOrder);
        expect(result.orderedVotes).toHaveLength(2);
        // Both races should be all-undecided
        const race1Vote = result.orderedVotes[0];
        expect(race1Vote[0]).toBeNull();
        expect(race1Vote[1]).toBeNull();
        const race2Vote = result.orderedVotes[1];
        expect(race2Vote[0]).toBeNull();
        expect(race2Vote[1]).toBeNull();
        expect(race2Vote[2]).toBeNull();
    });

    it('preserves non-votes fields from the row', () => {
        const row = makeRow([
            { race_id: 'race1', scores: [{ candidate_id: 'c1', score: 1 }, { candidate_id: 'c2', score: null }] },
            { race_id: 'race2', scores: [{ candidate_id: 'c3', score: null }, { candidate_id: 'c4', score: null }, { candidate_id: 'c5', score: null }] },
        ]);
        const result = encodeBallotRow(row, raceOrder);
        expect(result.election_id).toBe('elec1');
        expect(result.status).toBe('submitted');
        expect(result.votes).toBeUndefined();
    });

    it('looks up races by race_id, not by position in votes array', () => {
        // votes in reversed order compared to raceOrder
        const row = makeRow([
            { race_id: 'race2', scores: [{ candidate_id: 'c3', score: 1 }, { candidate_id: 'c4', score: 2 }, { candidate_id: 'c5', score: 3 }] },
            { race_id: 'race1', scores: [{ candidate_id: 'c1', score: 1 }, { candidate_id: 'c2', score: null }] },
        ]);
        const result = encodeBallotRow(row, raceOrder);
        // orderedVotes[0] should be race1 (score c1=1, c2=null), not race2
        expect(result.orderedVotes[0][0]).toBe(1);  // c1's score
        expect(result.orderedVotes[0][1]).toBeNull(); // c2's score
        // orderedVotes[1] should be race2 (score c3=1, c4=2, c5=3)
        expect(result.orderedVotes[1][0]).toBe(1);  // c3's score
        expect(result.orderedVotes[1][1]).toBe(2);  // c4's score
        expect(result.orderedVotes[1][2]).toBe(3);  // c5's score
    });
});
