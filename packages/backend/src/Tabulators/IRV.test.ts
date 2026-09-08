import { mapMethodInputs } from '../test/TestHelper'
import { IRV } from './IRV'

describe("IRV Tests", () => {
    test("First round majority", () => {
        // Simple test to elect the candidate with most votes in first round
        const candidates = ['Alice', 'Bob', 'Carol', 'Dave']

        const votes = [
            // 0 added to end for overvote rank
            [1, 2, 3, 4, 0],
            [1, 2, 3, 4, 0],
            [1, 2, 3, 4, 0],
            [1, 2, 3, 4, 0],
            [1, 2, 3, 4, 0],
            [2, 1, 3, 4, 0],
            [2, 1, 3, 4, 0],
            [2, 3, 1, 4, 0],
            [2, 3, 4, 1, 0],
        ]
        const results = IRV(...mapMethodInputs(candidates, votes))
        expect(results.elected[0].name).toBe('Alice');
        expect(results.summaryData.candidates[0].hareScores).toStrictEqual([5]);  
        expect(results.summaryData.candidates[1].hareScores).toStrictEqual([2]);  
        expect(results.summaryData.candidates[2].hareScores).toStrictEqual([1]);  
        expect(results.summaryData.candidates[3].hareScores).toStrictEqual([1]);  
    })

    test("Multiwinner ", () => {
        // Simple multiwinner test, shows first winner's votes transfer correctly
        const candidates = ['Alice', 'Bob', 'Carol', 'Dave']

        const votes = [
            // 0 added to end for overvote rank
            [1, 2, 3, 4, 0],
            [1, 2, 3, 4, 0],
            [1, 2, 3, 4, 0],
            [1, 2, 3, 4, 0],
            [1, 3, 2, 4, 0],
            [2, 1, 3, 4, 0],
            [2, 1, 3, 4, 0],
            [2, 3, 1, 4, 0],
            [2, 3, 4, 1, 0],
        ]
        const results = IRV(...mapMethodInputs(candidates, votes), 2)
        expect(results.elected.length).toBe(2); 
        expect(results.elected[0].name).toBe('Alice');
        expect(results.elected[1].name).toBe('Bob');

        expect(results.summaryData.candidates[0].hareScores).toStrictEqual([5, 0]);  
        expect(results.summaryData.candidates[1].hareScores).toStrictEqual([2, 6]);  
        expect(results.summaryData.candidates[2].hareScores).toStrictEqual([1, 2]);  
        expect(results.summaryData.candidates[3].hareScores).toStrictEqual([1, 1]);  
    })

    test("2 round test", () => {
        // Majority can't be found in first round
        const candidates = ['Alice', 'Bob', 'Carol']

        const votes = [
            // 0 added to end for overvote rank
            [1, 2, 3, 0],
            [1, 2, 3, 0],
            [3, 2, 1, 0],
            [3, 2, 1, 0],
            [2, 1, 3, 0],
        ]
        const results = IRV(...mapMethodInputs(candidates, votes))
        expect(results.elected[0].name).toBe('Alice');
        expect(results.summaryData.candidates[0].hareScores).toStrictEqual([2, 3]);  
        expect(results.summaryData.candidates[1].hareScores).toStrictEqual([2, 2]);  
        expect(results.summaryData.candidates[2].hareScores).toStrictEqual([1, 0]);  
    })
    test("Exhausted Ballots", () => {
        // Exhaust ballot if no remaining candidates
        const candidates = ['Alice', 'Bob', 'Carol']

        const votes = [
            // 0 added to end for overvote rank
            [1, 2, 3, 0],
            [1, 2, 3, 0],
            [1, 2, 3, 0],
            [1, 2, 3, 0],
            [3, 2, 1, 0],
            [3, 2, 1, 0],
            [3, 2, 1, 0],
            [3, 2, 1, 0],
            [2, 1, 1, 1],//first round overvote & exhausted
            [3, 2, 0, 0],//no first rank, not exhausted
            [2, 1, 2, 2],//second round overvote & exhausted
            [0, 1, 0, 0],//second round exhausted vote
        ]
        const results = IRV(...mapMethodInputs(candidates, votes))
        expect(results.elected[0].name).toBe('Alice');
        expect(results.summaryData.candidates[0].hareScores).toStrictEqual([4, 5]);  
        expect(results.summaryData.candidates[1].hareScores).toStrictEqual([4, 4]);  
        expect(results.summaryData.candidates[2].hareScores).toStrictEqual([3, 0]);  
        expect(results.exhaustedVoteCounts).toStrictEqual([1,3]); 
        expect(results.nExhaustedViaOvervote).toBe(2); 
    })
    test("Lots of overvotes Ballots", () => {
        // Exhaust ballot if no remaining candidates
        const candidates = ['Alice', 'Bob', 'Carol', 'Dean']

        const votes = [
            // 0 added to end for overvote rank
            [1, 2, 3, 4, 0],
            [1, 2, 3, 4, 0],
            [1, 2, 3, 4, 0],
            [1, 2, 3, 4, 0],
            [1, 2, 3, 4, 0],
            [1, 2, 3, 4, 0],
            [4, 3, 2, 1, 0],
            [4, 3, 2, 1, 0],
            [4, 3, 2, 1, 0],
            [4, 3, 2, 1, 0],
            [4, 3, 2, 1, 0],
            [4, 3, 2, 1, 0],
            [2, 1, 3, 4, 0],
            [2, 1, 3, 4, 0],
            [2, 1, 3, 4, 0],
            [2, 1, 1, 4, 1],//first round overvote & exhausted
            [2, 2, 1, 4, 2],//second round overvote & exhausted
            [3, 2, 1, 3, 3],//third round overvote
        ]
        const results = IRV(...mapMethodInputs(candidates, votes))
        expect(results.elected[0].name).toBe('Alice');

        expect(results.summaryData.candidates[0].hareScores).toStrictEqual([6, 6, 9]);  
        expect(results.summaryData.candidates[1].hareScores).toStrictEqual([6, 6, 6]);  
        expect(results.summaryData.candidates[2].hareScores).toStrictEqual([3, 4, 0]);  
        expect(results.summaryData.candidates[3].hareScores).toStrictEqual([2, 0, 0]);  
        expect(results.exhaustedVoteCounts).toStrictEqual([1,2,3]); 
        expect(results.nExhaustedViaOvervote).toBe(3); 
    })

    test("No ballots have been cast yet", () => {
        // Regression test for election mkvb4f, which 500'd its results page.
        // With no votes at all nobody can reach the quota, so every round eliminates
        // another candidate. Once the last one was gone the loop kept going and read
        // remainingCandidates[0] off an empty array, throwing on .hareScores.
        // STV survives this because it seats the survivors once they can fill the
        // remaining seats; plain IRV has no such branch, so it has to stop instead.
        const candidates = ['Alice', 'Bob', 'Carol']

        const results = IRV(...mapMethodInputs(candidates, []), 2)
        expect(results.elected.length).toBe(0);
        expect(results.summaryData.nTallyVotes).toBe(0);
    })

    test("Single winner with no ballots", () => {
        // The same crash never needed multiple seats: an ordinary single-winner IRV
        // race that nobody had voted in yet was enough to take the results page down.
        const candidates = ['Alice', 'Bob', 'Carol']

        const results = IRV(...mapMethodInputs(candidates, []))
        expect(results.elected.length).toBe(0);
    })

    test("Every ballot exhausts before the seats are filled", () => {
        // Bloc IRV, two seats, every voter ranking only Alice. Alice takes the majority
        // and wins seat one; the pool is rebuilt as Bob and Carol and every ballot is
        // redistributed, but none of them rank either candidate, so all are exhausted.
        // With no active votes left neither can reach the quota, so both are eliminated
        // and seat two is simply left unfilled rather than crashing.
        const candidates = ['Alice', 'Bob', 'Carol']

        const votes = [
            [1, 0, 0, 0],
            [1, 0, 0, 0],
            [1, 0, 0, 0],
        ]
        const results = IRV(...mapMethodInputs(candidates, votes), 2)
        expect(results.elected.length).toBe(1);
        expect(results.elected[0].name).toBe('Alice');
    })
})
