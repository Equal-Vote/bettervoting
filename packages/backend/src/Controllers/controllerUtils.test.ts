import { secureShuffle } from "./controllerUtils";

describe("secureShuffle", () => {
    it("returns an array with the same elements", () => {
        const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const shuffled = secureShuffle(input);
        expect(shuffled).toHaveLength(input.length);
        expect([...shuffled].sort((a, b) => a - b)).toEqual(input);
    });

    it("does not mutate the input array", () => {
        const input = [1, 2, 3, 4, 5];
        const snapshot = [...input];
        secureShuffle(input);
        expect(input).toEqual(snapshot);
    });

    it("handles empty and single-element arrays", () => {
        expect(secureShuffle([])).toEqual([]);
        expect(secureShuffle([42])).toEqual([42]);
    });

    it("breaks insertion order across runs (probabilistic)", () => {
        // A correct shuffle will essentially never return 20 trials all matching
        // the input order. False-positive rate is 1 / 20!^20 — effectively zero.
        const input = Array.from({ length: 20 }, (_, i) => i);
        const orderedMatches = Array.from({ length: 20 }, () =>
            secureShuffle(input).every((v, i) => v === input[i])
        );
        expect(orderedMatches.every(Boolean)).toBe(false);
    });
});
