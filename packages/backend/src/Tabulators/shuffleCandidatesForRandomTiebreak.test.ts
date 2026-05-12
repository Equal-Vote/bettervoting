import shuffleCandidatesForRandomTiebreak from './shuffleCandidatesForRandomTiebreak';
import { candidate } from '@equal-vote/star-vote-shared/domain_model/ITabulators';
import { ID_LENGTHS, ID_PREFIXES, makeID } from '@equal-vote/star-vote-shared/utils/makeID';

const makeCandidates = (names: string[]): candidate[] =>
    names.map(name => ({
        id: name,
        name,
        tieBreakOrder: -1,
        votesPreferredOver: {},
        winsAgainst: {},
    }));

describe('shuffleCandidatesForRandomTiebreak', () => {
    test('does not throw for any race_id at the current production ID length', () => {
        for (let i = 0; i < 1000; i++) {
            const raceId = makeID(ID_PREFIXES.RACE, ID_LENGTHS.RACE);
            const candidates = makeCandidates(['A', 'B', 'C']);
            expect(() =>
                shuffleCandidatesForRandomTiebreak(new Date(), candidates, 0, raceId)
            ).not.toThrow();
        }
    });

    // The internal hash uses signed 32-bit arithmetic. At ID_LENGTHS.RACE = 3
    // the values are small enough to stay positive, but a longer raceId
    // overflows into negative — and TinyRand throws on a negative seed. This
    // test pins behavior so increasing the race-id length doesn't silently
    // turn into a tabulator crash.
    test('does not throw when the raceId hash is negative', () => {
        for (let i = 0; i < 1000; i++) {
            const raceId = makeID(ID_PREFIXES.RACE, ID_LENGTHS.RACE + 1);
            const candidates = makeCandidates(['A', 'B', 'C']);
            expect(() =>
                shuffleCandidatesForRandomTiebreak(new Date(), candidates, 0, raceId)
            ).not.toThrow();
        }
    });

    test('assigns each candidate a unique tieBreakOrder in [0, n)', () => {
        const candidates = makeCandidates(['A', 'B', 'C', 'D', 'E']);
        shuffleCandidatesForRandomTiebreak(new Date(), candidates, 0, makeID(ID_PREFIXES.RACE, ID_LENGTHS.RACE));
        const orders = candidates.map(c => c.tieBreakOrder).sort((a, b) => a - b);
        expect(orders).toEqual([0, 1, 2, 3, 4]);
    });

    test('is deterministic for the same inputs', () => {
        const raceId = makeID(ID_PREFIXES.RACE, ID_LENGTHS.RACE);
        const a = makeCandidates(['A', 'B', 'C', 'D', 'E']);
        const b = makeCandidates(['A', 'B', 'C', 'D', 'E']);
        shuffleCandidatesForRandomTiebreak(new Date(), a, 7, raceId);
        shuffleCandidatesForRandomTiebreak(new Date(), b, 7, raceId);
        expect(a.map(c => c.name)).toEqual(b.map(c => c.name));
    });
});
