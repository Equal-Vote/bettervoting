import { mapMethodInputs } from '../test/TestHelper'
import { Star, singleWinnerStar } from './Star'
import { starCandidate, starSummaryData } from '@equal-vote/star-vote-shared/domain_model/ITabulators'

describe("STAR Tests", () => {
    test("Condorcet Winner", () => {
        // Simple test to elect the candidate that is the highest scoring and condorcet winner
        const candidates = ['Allison', 'Bill', 'Carmen', 'Doug']
        const votes = [
            [5, 2, 1, 4],
            [5, 2, 1, 0],
            [5, 2, 1, 0],
            [5, 2, 1, 0],
            [5, 3, 4, 0],
            [5, 1, 4, 0],
            [5, 1, 4, 0],
            [4, 0, 5, 1],
            [3, 4, 5, 0],
            [3, 5, 5, 5]]
        const results = Star(...mapMethodInputs(candidates, votes), 1)
        expect(results.elected[0].name).toBe('Allison');
        expect(results.roundResults[0].runner_up[0].name).toBe('Carmen');
    })
    test("Runnerup tie", () => {
        const candidates = ['Allison', 'Bill', 'Carmen', 'Doug']
        const votes = [
            [5, 4, 3, 3],
            [4, 5, 1, 1],
            [4, 5, 1, 2],
            [3, 5, 1, 0],
            [5, 4, 3, 0],
            [5, 0, 4, 1],
            [5, 0, 4, 0],
            [4, 0, 5, 1],
            [3, 4, 5, 0],
            [3, 5, 5, 4]]

        const results = Star(...mapMethodInputs(candidates, votes), 1)
        expect(results.elected[0].name).toBe('Allison');
        expect(results.roundResults[0].runner_up[0].name).toBe('Bill');
        // expect(results.tied.length).toBe(2)
        // Ensure summary data sorts candidates according to the results
        expect(results.summaryData.candidates[0].name).toBe('Allison')
        expect(results.summaryData.candidates[1].name).toBe('Bill')
        expect(results.summaryData.candidates[2].name).toBe('Carmen')
        expect(results.summaryData.candidates[3].name).toBe('Doug')
    })
    test("Runoff", () => {
        // Simple runoff test, second candidate wins
        const candidates = ['Allison', 'Bill']
        const votes = [
            [0, 5],
            [2, 4],
        ]
        const results = Star(...mapMethodInputs(candidates, votes), 1)
        expect(results.elected[0].name).toBe('Bill');
        expect(results.roundResults[0].runner_up[0].name).toBe('Allison');
    })
    test("Runoff tie, score resolves", () => {
        // Two candidates tie in runoff round, highest scoring candidate wins
        const candidates = ['Allison', 'Bill']
        const votes = [
            [0, 5],
            [3, 2],
        ]
        const results = Star(...mapMethodInputs(candidates, votes), 1)
        expect(results.elected[0].name).toBe('Bill');
        expect(results.roundResults[0].runner_up[0].name).toBe('Allison');
        // Ensure summary data sorts candidates according to the results
        expect(results.summaryData.candidates[0].name).toBe('Bill')
        expect(results.summaryData.candidates[1].name).toBe('Allison')
    })
    //test("True Tie, use five-star tiebreaker to resolve", () => {
    //    // Both candidates have same score and runoff votes, five star tiebreaker selected, one candidate wins 
    //    const candidates = ['Allison', 'Bill']
    //    const votes = [
    //        [2, 4],
    //        [5, 3],
    //    ]
    //    const results = Star(candidates, votes, 1, [])
    //    expect(results.elected[0].name).toBe('Allison');
    //    expect(results.elected.length).toBe(1);
    //    expect(results.tied.length).toBe(0);
    //    // Ensure summary data sorts candidates according to the results
    //    expect(results.summaryData.candidates[0].name).toBe('Allison')
    //})
    //test("True Tie, use five-star tiebreaker, still tied, select lower index", () => {
    //    // Both candidates have same score and runoff votes, five star tiebreaker selected, candidates still tied
    //    // Tie break order not defined, select winner based on index 
    //    const candidates = ['Allison', 'Bill']
    //    const votes = [
    //        [1, 3],
    //        [4, 2],
    //    ]
    //    const results = Star(candidates, votes, 1, [])
    //    // No candidates elected
    //    expect(results.elected[0].name).toBe('Allison');
    //    expect(results.elected.length).toBe(1);
    //    expect(results.tied.length).toBe(0);
    //})
    //test("True Tie, use five-star tiebreaker, still tied, tiebreak order defined", () => {
    //    // Both candidates have same score and runoff votes, five star tiebreaker selected, candidates still tied
    //    // Tie break order defined, select lower 
    //    const candidates = ['Allison', 'Bill']
    //    const votes = [
    //        [1, 3],
    //        [4, 2],
    //    ]
    //    const results = Star(candidates, votes, 1, [2,1])
    //    // No candidates elected
    //    expect(results.elected[0].name).toBe('Bill');
    //    expect(results.elected.length).toBe(1);
    //    expect(results.tied.length).toBe(0);
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

        const results = Star(...mapMethodInputs(candidates, votes), 1)
        expect(results.summaryData.nTallyVotes).toBe(6);
        expect(results.summaryData.nOutOfBoundsVotes).toBe(2);
        expect(results.summaryData.nAbstentions).toBe(6);
    })
})

function buildTestSummaryData(names: string[], scores: number[], pairwiseMatrix: number[][], fiveStarCounts: number[]) {
    return {
        candidates: names.map((name, i) => ({
            name,
            id: name,
            tieBreakOrder: 0,
            votesPreferredOver: Object.fromEntries(pairwiseMatrix[i].map((count, j) => ([names[j], count]))),
            winsAgainst: Object.fromEntries(pairwiseMatrix[i].map((count, j) => ([names[j], count > 0]))),
            score: scores[i],
            fiveStarCount: fiveStarCounts[i],
        } as starCandidate)) as starCandidate[],
        nOutOfBoundsVotes: 0,
        nTallyVotes: 0,
        nInvalidVotes: 0,
        nAbstentions: 0,
    } as starSummaryData
}

describe("STAR Score Round Tests", () => {
    // These tests bypass the main STAR function and test the singleWinnerStar function
    // This lets us build the summary data objects directly with candidate scores, five star counts, and pairwise matrix
    // in order to more easily create unique election conditions and test edge cases. 
    // Note these conditions might not be realistic, just help cover any "what if" cases
    test("Simple score-runoff test", () => {
        // Simple test to elect the candidate that is the highest scoring and condorcet winner
        const candidates = ['Allison', 'Bill', 'Carmen', 'Doug']
        const scores = [10, 9, 8, 7]
        const pairwiseMatrix = [
            [0, 1, 1, 1], 
            [0, 0, 1, 1], 
            [0, 0, 0, 1], 
            [0, 0, 0, 0]]
        const fiveStarCounts = [3, 2, 1, 0]
        const summaryData = buildTestSummaryData(candidates, scores, pairwiseMatrix, fiveStarCounts)

        const roundResults = singleWinnerStar(summaryData.candidates, summaryData)
        expect(roundResults.winners.length).toBe(1);
        expect(roundResults.winners[0].name).toBe('Allison');
        expect(roundResults.runner_up[0].name).toBe('Bill');
    })
    test("Simple score-runoff test, second candidate wins", () => {
        // Simple test to elect the candidate that is the second highest scoring and condorcet winner
        const candidates = ['Allison', 'Bill', 'Carmen', 'Doug']
        const scores = [10, 9, 8, 7]
        const pairwiseMatrix = [
            [0, 0, 1, 1], 
            [1, 0, 1, 1], 
            [0, 0, 0, 1], 
            [0, 0, 0, 0]]
        const fiveStarCounts = [3, 2, 1, 0]
        const summaryData = buildTestSummaryData(candidates, scores, pairwiseMatrix, fiveStarCounts)

        const roundResults = singleWinnerStar(summaryData.candidates, summaryData)
        expect(roundResults.winners.length).toBe(1);
        expect(roundResults.winners[0].name).toBe('Bill');
        expect(roundResults.runner_up[0].name).toBe('Allison');
    })
    test("Score tie, both advance", () => {
        // Two candidates tie for highest score, but both can advance
        const candidates = ['Allison', 'Bill', 'Carmen', 'Doug']
        const scores = [10, 10, 8, 7]
        const pairwiseMatrix = [
            [0, 1, 1, 1], 
            [0, 0, 1, 1], 
            [0, 0, 0, 1], 
            [0, 0, 0, 0]]
        const fiveStarCounts = [3, 2, 1, 0]
        const summaryData = buildTestSummaryData(candidates, scores, pairwiseMatrix, fiveStarCounts)

        const roundResults = singleWinnerStar(summaryData.candidates, summaryData)
        expect(roundResults.winners.length).toBe(1);
        expect(roundResults.winners[0].name).toBe('Allison');
        expect(roundResults.runner_up[0].name).toBe('Bill');
    })
    test("Three way score tie for first, eliminate candidate with most losses", () => {
        // Three way score tie for first. 
        // Among the three candidates Carmen has two losses and is eliminated
        // Next Bill has one loss and is eliminated and Alison advances
        // For next runoff candidate Bill and Carmen are tied, Carmen is eliminated with one loss and Bill advances
        const candidates = ['Allison', 'Bill', 'Carmen', 'Doug']
        const scores = [10, 10, 10, 7]
        const pairwiseMatrix = [
            [0, 1, 1, 1], 
            [0, 0, 1, 1], 
            [0, 0, 0, 1], 
            [0, 0, 0, 0]]
        const fiveStarCounts = [3, 2, 1, 0]
        const summaryData = buildTestSummaryData(candidates, scores, pairwiseMatrix, fiveStarCounts)

        const roundResults = singleWinnerStar(summaryData.candidates, summaryData)
        expect(roundResults.winners.length).toBe(1);
        expect(roundResults.winners[0].name).toBe('Allison');
        expect(roundResults.runner_up[0].name).toBe('Bill');
    })
    test("Three way score tie for first, eliminate candidate with most losses", () => {
        // Three way score tie for first.
        // Among the three candidates Carmen has two losses and is eliminated
        // Next Alison and Bill have the same number of losses, but both can advance
        const candidates = ['Allison', 'Bill', 'Carmen', 'Doug']
        const scores = [10, 10, 10, 7]
        const pairwiseMatrix = [
            [0, 0, 1, 1], 
            [0, 0, 1, 1], 
            [0, 0, 0, 1], 
            [0, 0, 0, 0]]
        const fiveStarCounts = [3, 2, 1, 0]
        const summaryData = buildTestSummaryData(candidates, scores, pairwiseMatrix, fiveStarCounts)

        const roundResults = singleWinnerStar(summaryData.candidates, summaryData)
        expect(roundResults.winners.length).toBe(1);
        expect(roundResults.winners[0].name).toBe('Allison');
        expect(roundResults.runner_up[0].name).toBe('Bill');
    })
    test("Three way score tie for second, eliminate candidates with most losses", () => {
        // Three way score tie for second, candidates are eliminated same as above cases until Bill advances
        const candidates = ['Allison', 'Bill', 'Carmen', 'Doug']
        const scores = [11, 10, 10, 10]
        const pairwiseMatrix = [
            [0, 1, 1, 1], 
            [0, 0, 1, 1], 
            [0, 0, 0, 1], 
            [0, 0, 0, 0]]
        const fiveStarCounts = [3, 2, 1, 0]
        const summaryData = buildTestSummaryData(candidates, scores, pairwiseMatrix, fiveStarCounts)

        const roundResults = singleWinnerStar(summaryData.candidates, summaryData)
        expect(roundResults.winners.length).toBe(1);
        expect(roundResults.winners[0].name).toBe('Allison');
        expect(roundResults.runner_up[0].name).toBe('Bill');
    })
    test("Three way score tie for first, advance candidates with most five star votes", () => {
        // Three way score tie for first, condorcet cycle between the candidates
        // Proceed to five star tiebreaker
        // Allison and Bill both advance with the most counts
        const candidates = ['Allison', 'Bill', 'Carmen', 'Doug']
        const scores = [10, 10, 10, 9]
        const pairwiseMatrix = [
            [0, 1, 0, 1], 
            [0, 0, 1, 1], 
            [1, 0, 0, 1], 
            [0, 0, 0, 0]]
        const fiveStarCounts = [3, 3, 1, 0]
        const summaryData = buildTestSummaryData(candidates, scores, pairwiseMatrix, fiveStarCounts)

        const roundResults = singleWinnerStar(summaryData.candidates, summaryData)
        expect(roundResults.winners.length).toBe(1);
        expect(roundResults.winners[0].name).toBe('Allison');
        expect(roundResults.runner_up[0].name).toBe('Bill');
    })
    test("Three way score tie for first, advance one candidate with most five star votes", () => {
        // Three way score tie for first, condorcet cycle between the candidates
        // Proceed to five star tiebreaker
        // Only Allison advances with most counts
        const candidates = ['Allison', 'Bill', 'Carmen', 'Doug']
        const scores = [10, 10, 10, 9]
        const pairwiseMatrix = [
            [0, 1, 0, 1], 
            [0, 0, 1, 1], 
            [1, 0, 0, 1], 
            [0, 0, 0, 0]]
        const fiveStarCounts = [3, 2, 2, 0]
        const summaryData = buildTestSummaryData(candidates, scores, pairwiseMatrix, fiveStarCounts)

        const roundResults = singleWinnerStar(summaryData.candidates, summaryData)
        expect(roundResults.winners.length).toBe(1);
        expect(roundResults.winners[0].name).toBe('Allison');
        expect(roundResults.runner_up[0].name).toBe('Bill');
    })
    test("Four way score tie for first, eliminate candidates with least five star votes", () => {
        // Four way score tie for first, condorcet cycle between the candidates
        // Proceed to five star tiebreaker
        // Cannon advance a candidate, eliminate candidate with least counts
        const candidates = ['Allison', 'Bill', 'Carmen', 'Doug']
        const scores = [10, 10, 10, 10]
        const pairwiseMatrix = [
            [0, 1, 0, 0], 
            [0, 0, 1, 1], 
            [0, 0, 0, 0], 
            [1, 0, 0, 0]]
        const fiveStarCounts = [3, 3, 3, 2]
        const summaryData = buildTestSummaryData(candidates, scores, pairwiseMatrix, fiveStarCounts)

        const roundResults = singleWinnerStar(summaryData.candidates, summaryData)
        expect(roundResults.winners.length).toBe(1);
        expect(roundResults.winners[0].name).toBe('Allison');
        expect(roundResults.runner_up[0].name).toBe('Bill');
    })
    test("Three way score tie for second, eliminate candidates with least five star votes", () => {
        // Three way score tie for second, condorcet cycle between the candidates
        // Proceed to five star tiebreaker
        // Cannon advance a candidate, eliminate candidate with least counts
        const candidates = ['Allison', 'Bill', 'Carmen', 'Doug']
        const scores = [11, 10, 10, 10]
        const pairwiseMatrix = [
            [0, 1, 1, 1], 
            [0, 0, 1, 0], 
            [0, 0, 0, 1], 
            [0, 1, 0, 0]]
        const fiveStarCounts = [4, 3, 3, 2]
        const summaryData = buildTestSummaryData(candidates, scores, pairwiseMatrix, fiveStarCounts)

        const roundResults = singleWinnerStar(summaryData.candidates, summaryData)
        expect(roundResults.winners.length).toBe(1);
        expect(roundResults.winners[0].name).toBe('Allison');
        expect(roundResults.runner_up[0].name).toBe('Bill');
    })
    test("Three way score tie for second, advance with most five star votes", () => {
        // Three way score tie for first, condorcet cycle between the candidates
        // Proceed to five star tiebreaker
        // Cannon advance a candidate, eliminate candidate with least counts
        const candidates = ['Allison', 'Bill', 'Carmen', 'Doug']
        const scores = [11, 10, 10, 10]
        const pairwiseMatrix = [
            [0, 1, 1, 1], 
            [0, 0, 1, 0], 
            [0, 0, 0, 1], 
            [0, 1, 0, 0]]
        const fiveStarCounts = [4, 3, 2, 2]
        const summaryData = buildTestSummaryData(candidates, scores, pairwiseMatrix, fiveStarCounts)

        const roundResults = singleWinnerStar(summaryData.candidates, summaryData)
        expect(roundResults.winners.length).toBe(1);
        expect(roundResults.winners[0].name).toBe('Allison');
        expect(roundResults.runner_up[0].name).toBe('Bill');
    })
    test("Three way true tie for second, pick random to advance", () => {
        // Simple test to elect the candidate that is the highest scoring and condorcet winner
        const candidates = ['Allison', 'Bill', 'Carmen', 'Doug']
        const scores = [11, 10, 10, 10]
        const pairwiseMatrix = [
            [0, 1, 1, 1], 
            [0, 0, 1, 0], 
            [0, 0, 0, 1], 
            [0, 1, 0, 0]]
        const fiveStarCounts = [4, 3, 3, 3]
        const summaryData = buildTestSummaryData(candidates, scores, pairwiseMatrix, fiveStarCounts)

        const roundResults = singleWinnerStar(summaryData.candidates, summaryData)
        expect(roundResults.winners.length).toBe(1);
        expect(roundResults.winners[0].name).toBe('Allison');
        //runner up doesn't matter here, but need test that random selection occurred
        //
    }),
    test("Four way tie for second, require iterative pairwise checks", () => {
        const candidates = ['Super', 'Allison', 'Bill', 'Carmen', 'Doug']
        const scores = [15, 10, 10, 10, 10]
        const pairwiseMatrix = [
            // NOTE: Arend thinks this matrix is technically impossible since Bill beats Doug AND Doug beats Bill, 
            //       but for the purposes of the tests it still validates the tie breaker protocol
            // https://docs.google.com/drawings/d/1L-tIDY6-8OeKGzW0w1eh2EUjlHbarEcsfvhsegMT8qg/edit
            [0, 1, 1, 1, 1], 
            [0, 0, 0, 1, 1], 
            [0, 0, 0, 0, 1], 
            [0, 0, 0, 0, 0], 
            [0, 0, 1, 1, 0]
        ]

        // Intended flow
        // S is elected
        // A,B,C,D are tie for scores
        // C,D are removed since they have the most pairwise losses (2 each)
        // A,B are tied for pairwise losses (relative to each other)
        // B wins from score tiebreaker

        const fiveStarCounts = [10, 1, 5, 1, 1]
        const summaryData = buildTestSummaryData(candidates, scores, pairwiseMatrix, fiveStarCounts)

        const roundResults = singleWinnerStar(summaryData.candidates, summaryData)
        expect(roundResults.winners.length).toBe(1);
        expect(roundResults.winners[0].name).toBe('Super');
        expect(roundResults.runner_up[0].name).toBe('Bill');
    })    
    test("Two way score tie for second, don't advance candidate not in score tie", () => {
        // Tie for second finalist, last place candidate has lowest score and head to head wins but highest five star count
        // This is to test a bug that was found that was advancing the five star winners even if they weren't in the score tiebreaker

        const candidates = ['Allison', 'Bill', 'Carmen', 'Doug']
        const scores = [11, 10, 10, 9]
        const pairwiseMatrix = [
            [0, 1, 1, 1], 
            [0, 0, 0, 1], 
            [0, 0, 0, 1], 
            [0, 0, 0, 0]]
        const fiveStarCounts = [4, 3, 3, 5]
        const summaryData = buildTestSummaryData(candidates, scores, pairwiseMatrix, fiveStarCounts)

        const roundResults = singleWinnerStar(summaryData.candidates, summaryData)
        expect(roundResults.winners.length).toBe(1);
        expect(roundResults.winners[0].name).toBe('Allison');
        expect(roundResults.runner_up[0].name).toBe('Bill');
    })
})
