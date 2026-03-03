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

})