import { Approval } from './Approval'

describe("Approval Tests", () => {
    test("Single Winner Test", () => {
        // Simple test to elect the candidate with most votes
        const candidates = ['Alice', 'Bob', 'Carol', 'Dave']

        const votes = [
            [1, 1, 1, 1],
            [0, 1, 1, 1],
            [0, 1, 1, 1],
            [0, 0, 1, 1],
            [0, 0, 1, 1],
            [0, 0, 1, 1],
            [0, 0, 0, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 2],
            [0, 0, -1, 0],
        ]
        const results = Approval(candidates, votes)
        expect(results.elected.length).toBe(1);
        expect(results.elected[0].name).toBe('Dave');
        expect(results.summaryData.totalScores[0].score).toBe(7)
        expect(results.summaryData.totalScores[0].index).toBe(3)
        expect(results.summaryData.totalScores[1].score).toBe(6)
        expect(results.summaryData.totalScores[1].index).toBe(2)
        expect(results.summaryData.totalScores[2].score).toBe(3)
        expect(results.summaryData.totalScores[2].index).toBe(1)
        expect(results.summaryData.totalScores[3].score).toBe(1)
        expect(results.summaryData.totalScores[3].index).toBe(0)
        
        expect(results.summaryData.nUnderVotes).toBe(1)
        expect(results.summaryData.nValidVotes).toBe(8)
        expect(results.summaryData.nInvalidVotes).toBe(2)
    })

    test("Multi Winner Test", () => {
        // Simple test to elect the candidate with most votes
        const candidates = ['Alice', 'Bob', 'Carol', 'Dave']

        const votes = [
            [1, 1, 1, 1],
            [0, 1, 1, 1],
            [0, 1, 1, 1],
            [0, 0, 1, 1],
            [0, 0, 1, 1],
            [0, 0, 1, 1],
            [0, 0, 0, 1],
        ]
        const results = Approval(candidates, votes,2)
        expect(results.elected.length).toBe(2);
        expect(results.elected[0].name).toBe('Dave');
        expect(results.elected[1].name).toBe('Carol');
        expect(results.summaryData.totalScores[0].score).toBe(7)
        expect(results.summaryData.totalScores[0].index).toBe(3)
        expect(results.summaryData.totalScores[1].score).toBe(6)
        expect(results.summaryData.totalScores[1].index).toBe(2)
        expect(results.summaryData.totalScores[2].score).toBe(3)
        expect(results.summaryData.totalScores[2].index).toBe(1)
        expect(results.summaryData.totalScores[3].score).toBe(1)
        expect(results.summaryData.totalScores[3].index).toBe(0)
        
        expect(results.summaryData.nUnderVotes).toBe(0)
        expect(results.summaryData.nValidVotes).toBe(7)
        expect(results.summaryData.nInvalidVotes).toBe(0)
    })

    // NOTE: I'm proposing we always have tie breaker order in place, so we wouldn't need to worry about this
    //test("Ties Test", () => {
    //    // Tie for second
    //    // Tiebreak order not defined, select lower index
    //    const candidates = ['Alice', 'Bob', 'Carol', 'Dave']

    //    const votes = [
    //        [1, 1, 1, 1],
    //        [0, 1, 1, 1],
    //        [0, 1, 1, 1],
    //        [0, 1, 1, 1],
    //        [0, 1, 1, 1],
    //        [0, 1, 1, 1],
    //        [0, 0, 0, 1],
    //    ]
    //    const results = Approval(candidates, votes)
    //    expect(results.elected.length).toBe(1);
    //    expect(results.elected[0].name).toBe('Dave');
    //    expect(results.summaryData.totalScores[0].score).toBe(7)
    //    expect(results.summaryData.totalScores[0].index).toBe(3)
    //    expect(results.summaryData.totalScores[1].score).toBe(6)
    //    expect(results.summaryData.totalScores[1].index).toBe(1) // random tiebreaker, second place lower index 1
    //    expect(results.summaryData.totalScores[2].score).toBe(6)
    //    expect(results.summaryData.totalScores[2].index).toBe(2) // random tiebreaker, third place higher index 2
    //    expect(results.summaryData.totalScores[3].score).toBe(1)
    //    expect(results.summaryData.totalScores[3].index).toBe(0)
    //    
    //    expect(results.summaryData.nUnderVotes).toBe(0)
    //    expect(results.summaryData.nValidVotes).toBe(7)
    //    expect(results.summaryData.nInvalidVotes).toBe(0)
    //})
    test("Ties Test, tiebreak order defined", () => {
        // Tie for second
        // Tiebreak order defined, select lower
        const candidates = ['Alice', 'Bob', 'Carol', 'Dave']

        const votes = [
            [1, 1, 1, 1],
            [0, 1, 1, 1],
            [0, 1, 1, 1],
            [0, 1, 1, 1],
            [0, 1, 1, 1],
            [0, 1, 1, 1],
            [0, 0, 0, 1],
        ]
        const results = Approval(candidates, votes, 1, [4,3,2,1])
        expect(results.elected.length).toBe(1);
        expect(results.elected[0].name).toBe('Dave');
        expect(results.summaryData.totalScores[0].score).toBe(7)
        expect(results.summaryData.totalScores[0].index).toBe(3)
        expect(results.summaryData.totalScores[1].score).toBe(6)
        expect(results.summaryData.totalScores[1].index).toBe(2) // random tiebreaker, second place lower in tiebreak order
        expect(results.summaryData.totalScores[2].score).toBe(6)
        expect(results.summaryData.totalScores[2].index).toBe(1) // random tiebreaker, third place higher in tiebreak order
        expect(results.summaryData.totalScores[3].score).toBe(1)
        expect(results.summaryData.totalScores[3].index).toBe(0)
        
        expect(results.summaryData.nUnderVotes).toBe(0)
        expect(results.summaryData.nValidVotes).toBe(7)
        expect(results.summaryData.nInvalidVotes).toBe(0)
    })
})