import { mapMethodInputs } from '../test/TestHelper'
import { STV } from './IRV'

describe("STV Tests", () => {
    test("Two winner test", () => {
        // Simple two winner STV test.
        // Shows fractional surplus and candidate elimination works
        
        const candidates = ['Alice', 'Bob', 'Carol', 'Dave']

        const votes = [
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
        const results = STV(...mapMethodInputs(candidates, votes),2)
        expect(results.elected.length).toBe(2); 
        expect(results.elected[0].name).toBe('Alice');
        expect(results.elected[1].name).toBe('Bob');

        expect(results.summaryData.candidates[0].hareScores).toStrictEqual([5,0,0]);  
        expect(results.summaryData.candidates[1].hareScores).toStrictEqual([2,3,4]);  
        expect(results.summaryData.candidates[2].hareScores).toStrictEqual([1,1,1]);  
        expect(results.summaryData.candidates[3].hareScores).toStrictEqual([1,1,0]);
    })

    test("Final seat won by the last remaining candidate", () => {
        // Regression test for a crash on election h93tm4.
        // No one reaches the quota of 5 on first preferences (3/3/2), so candidates
        // are eliminated until a single candidate holds all 8 votes and wins the
        // final seat. Redistributing that winner's surplus used to reduce over an
        // empty candidate list and throw, 500ing the results endpoint.
        // Plain IRV can't hit this because its winner branch rebuilds the candidate pool.

        const candidates = ['Avery', 'Blake', 'Casey']

        const votes = [
            [3, 2, 1, 0],
            [2, 3, 1, 0],
            [3, 1, 2, 0],
            [1, 3, 2, 0],
            [3, 1, 2, 0],
            [3, 1, 2, 0],
            [1, 3, 2, 0],
            [1, 3, 2, 0],
        ]
        const results = STV(...mapMethodInputs(candidates, votes),1)
        expect(results.elected.length).toBe(1);
        expect(results.elected[0].name).toBe('Avery');

        // 3/3/2 in round one, then 4/4 after Casey is eliminated, then Avery holds all 8
        expect(results.summaryData.candidates[0].hareScores).toStrictEqual([3,4,8]);
        expect(results.summaryData.candidates[1].hareScores).toStrictEqual([3,4,0]);
        expect(results.summaryData.candidates[2].hareScores).toStrictEqual([2,0,0]);
    })

})