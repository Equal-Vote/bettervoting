import { mapMethodInputs } from '../test/TestHelper'
import { AllocatedScore } from './AllocatedScore'

describe("Allocated Score Tests", () => {
    test("Basic Example", () => {
        // Two winners, two main parties, Allison wins first round with highest score, 1 quota of voters are allocated reducing Bill's score to zero
        // Carmen's score is reduced some causing Doug to win second 
        const candidates = ['Allison', 'Bill', 'Carmen', 'Doug']
        const votes = [
            [5, 5, 1, 0],
            [5, 5, 1, 0],
            [5, 5, 1, 0],
            [5, 5, 1, 0],
            [5, 4, 4, 0],
            [0, 0, 0, 3],
            [0, 0, 4, 5],
            [0, 0, 4, 5],
            [0, 0, 4, 5],
            [0, 0, 4, 5]]
        const results = AllocatedScore(...mapMethodInputs(candidates, votes), 2)
        expect(results.elected.length).toBe(2);
        expect(results.elected[0].name).toBe('Allison');
        expect(results.elected[1].name).toBe('Doug');
        expect(results.summaryData.weightedScoresByRound[0]).toStrictEqual([25, 24, 24, 23]);  
        expect(results.summaryData.weightedScoresByRound[1]).toStrictEqual([0, 0, 16, 23]);  
    })
    test("Single vote fractional surplus", () => {
        // Two winners, two main parties
        // Allison wins first round with highest score
        // quota = 4.5
        // Round 1: Allison's 5 star supporters are weighted to 0, her 4 star supported is weighted to 0.5
        // Carmen's score is reduced some causing Doug to win second 
        // Round 2: Doug wins
        const candidates = ['Allison', 'Bill', 'Carmen', 'Doug']
        const votes = [
            [5, 5, 0, 0], // Round 1 Weight Change: 1 -> 0
            [5, 5, 0, 0], // Round 1 Weight Change: 1 -> 0
            [5, 5, 0, 0], // Round 1 Weight Change: 1 -> 0
            [5, 5, 0, 0], // Round 1 Weight Change: 1 -> 0
            [4, 0, 4, 0], // Round 1 Weight Change: 1 -> 0.5
            [0, 0, 0, 3],
            [0, 0, 4, 5],
            [0, 0, 4, 5],
            [0, 0, 4, 5],
        ]
        const results = AllocatedScore(...mapMethodInputs(candidates, votes), 2)
        expect(results.elected.length).toBe(2);
        expect(results.elected[0].name).toBe('Allison');
        expect(results.elected[1].name).toBe('Doug');
        expect(results.summaryData.weightedScoresByRound[0]).toStrictEqual([24, 20, 16, 18]);  
        expect(results.summaryData.weightedScoresByRound[1]).toStrictEqual([0, 0, 14, 18]);  
        expect(results.summaryData.splitPoints[0]).toStrictEqual(0.8);  
    })
    test("Voters < Winners", () => {
        const candidates = ['Allison', 'Bill', 'Carmen', 'Doug']
        const votes = [
            [5, 5, 0, 0], 
            [5, 4, 3, 0], 
        ]
        const results = AllocatedScore(...mapMethodInputs(candidates, votes), 3)
        expect(results.elected.length).toBe(3);
        expect(results.elected[0].name).toBe('Allison');
        expect(results.elected[1].name).toBe('Bill');
        expect(results.elected[2].name).toBe('Carmen');
        expect(results.summaryData.weightedScoresByRound[0]).toStrictEqual([10, 9, 3, 0]);  
        expect(results.summaryData.weightedScoresByRound[1]).toStrictEqual([0, 6, 2, 0]);  
        expect(results.summaryData.weightedScoresByRound[2]).toStrictEqual([0, 0, 2, 0]);  
    })
    test("Fractional surplus", () => {
        // Two winners, two main parties, Allison wins first round with highest score, Allison has 8 highest level supporters, more than the quota of 6 voters
        // Voters who gave Allison their highest score have their ballot weight reduced to (1-6/8) = 0.25
        const candidates = ['Allison', 'Bill', 'Carmen', 'Doug']
        const votes = [
            [5, 5, 1, 0],// Ballot weight reduced to 0.25 after first round
            [5, 5, 1, 0],// Ballot weight reduced to 0.25 after first round
            [5, 5, 1, 0],// Ballot weight reduced to 0.25 after first round
            [5, 5, 1, 0],// Ballot weight reduced to 0.25 after first round
            [5, 5, 1, 0],// Ballot weight reduced to 0.25 after first round
            [5, 5, 1, 0],// Ballot weight reduced to 0.25 after first round
            [5, 5, 1, 0],// Ballot weight reduced to 0.25 after first round
            [5, 4, 4, 0],// Ballot weight reduced to 0.25 after first round
            [0, 0, 0, 3],
            [0, 0, 4, 5],
            [0, 0, 4, 5],
            [0, 0, 4, 5]]
        const results = AllocatedScore(...mapMethodInputs(candidates, votes), 2)
        expect(results.elected.length).toBe(2);
        expect(results.elected[0].name).toBe('Allison');
        expect(results.elected[1].name).toBe('Doug');
        expect(results.summaryData.weightedScoresByRound[0]).toStrictEqual([40, 39, 23, 18]);  
        expect(results.summaryData.weightedScoresByRound[1]).toStrictEqual([0, 9.75, 14.75, 18]);
    })

    test("Fractional surplus on lower split", () => {
        // Two winners, two main parties, Allison wins first round with highest score, Allison has 8 highest level supporters, more than the quota of 6 voters
        // 4 gave Allison 5s, 4 gave Allison 4s. The 5's contribute 100% of their ballot weight to the quota bring the quota to 4/6 filled
        // 4 who gave Allison 4s share remaining 2/6 quota equally, reducing their ballot weight to 0.5
        const candidates = ['Allison', 'Bill', 'Carmen', 'Doug']
        const votes = [
            [4, 4, 1, 0],// Ballot weight reduced to 0.50 after first round
            [4, 4, 1, 0],// Ballot weight reduced to 0.50 after first round
            [4, 4, 1, 0],// Ballot weight reduced to 0.50 after first round
            [4, 4, 1, 0],// Ballot weight reduced to 0.50 after first round
            [5, 5, 1, 0],// Ballot weight reduced to 0 after first round
            [5, 5, 1, 0],// Ballot weight reduced to 0 after first round
            [5, 5, 1, 0],// Ballot weight reduced to 0 after first round
            [5, 4, 4, 0],// Ballot weight reduced to 0 after first round
            [0, 0, 0, 3],
            [0, 0, 4, 5],
            [0, 0, 4, 5],
            [0, 0, 4, 5]]
        const results = AllocatedScore(...mapMethodInputs(candidates, votes), 2)
        expect(results.elected.length).toBe(2);
        expect(results.elected[0].name).toBe('Allison');
        expect(results.elected[1].name).toBe('Doug');
        expect(results.summaryData.weightedScoresByRound[0]).toStrictEqual([36, 35, 23, 18]);  
        expect(results.summaryData.weightedScoresByRound[1]).toStrictEqual([0, 8, 14, 18]);
    })

    //test("Random Tiebreaker", () => {
    //    // Two winners, two candidates tie for first
    //    // Tiebreak order not defined, select lower index
    //    const candidates = ['Allison', 'Bill', 'Carmen', 'Doug']
    //    const votes = [
    //        [5, 5, 1, 0],
    //        [5, 5, 1, 0],
    //        [5, 5, 1, 0],
    //        [5, 5, 1, 0],
    //        [5, 5, 4, 0],
    //        [0, 0, 0, 3],
    //        [0, 0, 4, 5],
    //        [0, 0, 4, 5],
    //        [0, 0, 4, 5],
    //        [0, 0, 4, 5]]
    //    const results = AllocatedScore(...mapMethodInputs(candidates, votes), 2)
    //    console.log(results)
    //    expect(results.elected.length).toBe(2);
    //    // tied is no longer a round by round structure
    //    //expect(results.tied[0].length).toBe(2); // two candidates tied in first round
    //    expect(results.elected[0].name).toBe('Allison') // random tiebreaker, second place lower index 1
    //    expect(results.elected[1].name).toBe('Doug');
    //})

    //test("Random Tiebreaker, tiebreak order defined", () => {
    //    // Two winners, two candidates tie for first
    //    // Tiebreak order defined, select lower
    //    const candidates = ['Allison', 'Bill', 'Carmen', 'Doug']
    //    const votes = [
    //        [5, 5, 1, 0],
    //        [5, 5, 1, 0],
    //        [5, 5, 1, 0],
    //        [5, 5, 1, 0],
    //        [5, 5, 4, 0],
    //        [0, 0, 0, 3],
    //        [0, 0, 4, 5],
    //        [0, 0, 4, 5],
    //        [0, 0, 4, 5],
    //        [0, 0, 4, 5]]
    //    const results = AllocatedScore(candidates, votes, 2, [4,3,2,1], true)
    //    expect(results.elected.length).toBe(2);
    //    expect(results.tied[0].length).toBe(2); // two candidates tied in forst round
    //    expect(results.elected[0].name).toBe('Bill') // random tiebreaker, second place lower index 1
    //    expect(results.elected[1].name).toBe('Doug');
    //})

    test("Test valid/invalid/under/bullet vote counts", () => {
        const candidates = ['Allison', 'Bill', 'Carmen']
        const votes = [
            [5, 5, 5],
            [3, 3, 3],
            [null, null, null],
            [null, null, null],
            [0, null, null],
            [null, 0, null],
            [0, 3, 6],
            [-1, 3, 5],
            [1, 3, 5],
            [1, 3, 5],
            [1, 3, 5],
            [5, 0, 0],
            [0, 5, 0],
            [0, 0, 5],
        ]
        const results = AllocatedScore(...mapMethodInputs(candidates, votes), 1)
        expect(results.summaryData.nTallyVotes).toBe(6);
        expect(results.summaryData.nOutOfBoundsVotes).toBe(2);
        expect(results.summaryData.nAbstentions).toBe(6);
    })
})
