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
})