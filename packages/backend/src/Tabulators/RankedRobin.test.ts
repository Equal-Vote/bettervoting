import { mapMethodInputs } from '../test/TestHelper'
import { RankedRobin } from './RankedRobin'

describe("Ranked Robin Tests", () => {
    test("Single winner test", () => {
        const names = ['Alice', 'Bob', 'Carol', 'Dave']

        const votes = [
            [1, 2, 3, 0],
            [1, 2, 3, 4],
            [1, 2, 3, 4],
            [1, 1, 2, 3],
            [1, 1, 2, 3],
            [2, 1, 3, 4],
            [2, 1, 3, 4],
            [2, 3, 1, 4],
            [2, 3, 4, 1],
            [null, null, null, null],
            [2, 3, 4, -1],
        ]

        const results = RankedRobin(...mapMethodInputs(names, votes))
        expect(results.summaryData.nAbstentions).toBe(1)
        expect(results.summaryData.nOutOfBoundsVotes).toBe(1)
        expect(results.summaryData.nTallyVotes).toBe(9)

        expect(results.elected[0].name).toBe('Alice');
        expect(results.elected.length).toBe(1);
        const candidates = results.summaryData.candidates;
        expect(candidates.map(c => candidates[0].votesPreferredOver[c.id])).toStrictEqual([0,5,8,8]);  
        expect(candidates.map(c => candidates[1].votesPreferredOver[c.id])).toStrictEqual([2,0,8,8]);  
        expect(candidates.map(c => candidates[2].votesPreferredOver[c.id])).toStrictEqual([1,1,0,8]);  
        expect(candidates.map(c => candidates[3].votesPreferredOver[c.id])).toStrictEqual([1,1,1,0]);  
        expect(candidates.map(c => candidates[0].winsAgainst[c.id])).toStrictEqual([false,true,true,true]);  
        expect(candidates.map(c => candidates[1].winsAgainst[c.id])).toStrictEqual([false,false,true,true]);  
        expect(candidates.map(c => candidates[2].winsAgainst[c.id])).toStrictEqual([false,false,false,true]);  
        expect(candidates.map(c => candidates[3].winsAgainst[c.id])).toStrictEqual([false,false,false,false]);  
        
        expect(candidates[0].id).toBe('Alice');  
        expect(candidates[0].copelandScore).toBe(3);  
        expect(candidates[1].id).toBe('Bob');  
        expect(candidates[1].copelandScore).toBe(2);  
        expect(candidates[2].id).toBe('Carol');  
        expect(candidates[2].copelandScore).toBe(1);  
        expect(candidates[3].id).toBe('Dave');  
        expect(candidates[3].copelandScore).toBe(0); 
    })    
    test("Muilti winner test", () => {
        const candidates = ['Alice', 'Bob', 'Carol', 'Dave']

        const votes = [
            [1, 2, 3, 0],
            [1, 2, 3, 4],
            [1, 2, 3, 4],
            [1, 1, 2, 3],
            [1, 1, 2, 3],
            [2, 1, 3, 4],
            [2, 1, 3, 4],
            [2, 3, 1, 4],
            [2, 3, 4, 1],
        ]
        const results = RankedRobin(...mapMethodInputs(candidates, votes), 2)
        expect(results.summaryData.nAbstentions).toBe(0)
        expect(results.summaryData.nOutOfBoundsVotes).toBe(0)
        expect(results.summaryData.nTallyVotes).toBe(9)

        expect(results.elected.length).toBe(2);
        expect(results.elected[0].name).toBe('Alice');
        expect(results.elected[1].name).toBe('Bob');
    })
    test("Ties", () => {
        // Tiebreak order not defined, select lower index
        const names = ['Alice', 'Bob', 'Carol', 'Dave']

        const votes = [
            [1, 2, 3, 4],
            [1, 2, 3, 4],
            [1, 2, 3, 4],
            [2, 1, 3, 4],
            [2, 1, 3, 4],
            [2, 1, 3, 4],
        ]
        const results = RankedRobin(...mapMethodInputs(names, votes))
        expect(results.summaryData.nAbstentions).toBe(0)
        expect(results.summaryData.nTallyVotes).toBe(6)
        expect(results.summaryData.nOutOfBoundsVotes).toBe(0)

        expect(results.elected[0].name).toBe('Alice')
        expect(results.elected.length).toBe(1);
        const candidates = results.summaryData.candidates;
        expect(candidates.map(c => candidates[0].votesPreferredOver[c.id])).toStrictEqual([0,3,6,6]);  
        expect(candidates.map(c => candidates[1].votesPreferredOver[c.id])).toStrictEqual([3,0,6,6]);  
        expect(candidates.map(c => candidates[2].votesPreferredOver[c.id])).toStrictEqual([0,0,0,6]);  
        expect(candidates.map(c => candidates[3].votesPreferredOver[c.id])).toStrictEqual([0,0,0,0]);  
        expect(candidates.map(c => candidates[0].winsAgainst[c.id])).toStrictEqual([false,false,true,true]);  
        expect(candidates.map(c => candidates[1].winsAgainst[c.id])).toStrictEqual([false,false,true,true]);  
        expect(candidates.map(c => candidates[2].winsAgainst[c.id])).toStrictEqual([false,false,false,true]);  
        expect(candidates.map(c => candidates[3].winsAgainst[c.id])).toStrictEqual([false,false,false,false]);  
        
        expect(candidates[0].id).toBe('Alice');  
        expect(candidates[0].copelandScore).toBe(2.5);
        expect(candidates[1].id).toBe('Bob'); 
        expect(candidates[1].copelandScore).toBe(2.5);
        expect(candidates[2].id).toBe('Carol');  
        expect(candidates[2].copelandScore).toBe(1);  
        expect(candidates[3].id).toBe('Dave');  
        expect(candidates[3].copelandScore).toBe(0); 

    })
    //test("Ties, tiebreak order defined", () => {
    //    // Tiebreak order defined, select lower
    //    const candidates = ['Alice', 'Bob', 'Carol', 'Dave']

    //    const votes = [
    //        [1, 2, 3, 4],
    //        [1, 2, 3, 4],
    //        [1, 2, 3, 4],
    //        [2, 1, 3, 4],
    //        [2, 1, 3, 4],
    //        [2, 1, 3, 4],
    //    ]
    //    const results = RankedRobin(candidates, votes,1,[4,3,2,1])
    //    expect(results.elected[0].name).toBe('Bob')
    //    expect(results.elected.length).toBe(1);
    //})
})