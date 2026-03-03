import { candidate, allocatedScoreResults, allocatedScoreSummaryData, rawVote, allocatedScoreCandidate, vote } from "@equal-vote/star-vote-shared/domain_model/ITabulators";

const Fraction = require('fraction.js');
import { getSummaryData, makeAbstentionTest, makeBoundsTest } from "./Util";
import { ElectionSettings } from "@equal-vote/star-vote-shared/domain_model/ElectionSettings";

interface winner_scores {
    index: number
    ballot_weight: typeof Fraction,
    weighted_score: typeof Fraction
}

type ballotFrac = typeof Fraction[]

const MAX_SCORE = 5;

export function AllocatedScore(candidates: candidate[], votes: rawVote[], nWinners = 3, electionSettings?:ElectionSettings) {
    const {summaryData: initialSummaryData, tallyVotes} =
    getSummaryData<allocatedScoreCandidate, Omit<allocatedScoreSummaryData,'splitPoints' | 'spentAboves' | 'weight_on_splits' | 'weightedScoresByRound'>>(
		candidates.map(c => ({...c, score: 0})),
        votes,
        'cardinal',
        undefined,
		[
			makeBoundsTest(0, 5),
			makeAbstentionTest(true), 
		]
	)

    const summaryData = {
        ...initialSummaryData,
        splitPoints: [],
        spentAboves: [],
        weight_on_splits: [],
        weightedScoresByRound: []
    } as allocatedScoreSummaryData;

    // Initialize output data structure
    const results: allocatedScoreResults = {
        votingMethod: 'STAR_PR',
        elected: [],
        tied: [],
        other: [],
        roundResults: [],
        summaryData: summaryData,
        tieBreakType: 'none',
        logs: []
    }
    let remainingCandidates = [...summaryData.candidates]
    // Run election rounds until there are no remaining candidates
    // Keep running elections rounds even if all seats have been filled to determine candidate order

    // Normalize scores array
    let scoresNorm = votes.map(v => candidates.map(c => new Fraction(v.marks[c.id]).div(MAX_SCORE)))

    // Find number of voters and quota size
    const V = scoresNorm.length;
    const quota = new Fraction(V).div(nWinners);
    results.logs.push(`${nWinners} winners will represent ${V} voters, so winners will need to represent a quota of ${rounded(quota)} voters each.`)
    let num_candidates = candidates.length

    let ballot_weights: typeof Fraction[] = Array(V).fill(new Fraction(1));

    // let weightedSumsByRound = []
    let candidatesByRound: candidate[][] = []
    // run loop until specified number of winners are found
    while (results.elected.length < nWinners) {
        results.logs.push(`Round ${results.elected.length+1} of tabulation...`)
        // weight the scores
        let weighted_scores: ballotFrac[] = Array(scoresNorm.length);
        let weighted_sums: typeof Fraction[] = Array(num_candidates).fill(new Fraction(0));
        scoresNorm.forEach((ballot, b) => {
            weighted_scores[b] = [];
            ballot.forEach((score, s) => {
                weighted_scores[b][s] = score.mul(ballot_weights[b]);
                weighted_sums[s] = weighted_sums[s].add(weighted_scores[b][s])
            });
            // sum scores for each candidate
            // weighted_sums[r] = sumArray(weighted_scores[r]);
        });
        summaryData.weightedScoresByRound.push(weighted_sums.map(w => {
            return w.valueOf()
        }))

        candidatesByRound.push([...remainingCandidates])
        // get index of winner
        let maxAndTies = indexOfMax(weighted_sums, summaryData.candidates);
        let w = maxAndTies.maxIndex;
        // add winner to winner list
        results.logs.push(`${summaryData.candidates[w].name} is scored highest with ${rounded(weighted_sums[w].mul(MAX_SCORE))} stars and is elected!`)
        results.elected.push(summaryData.candidates[w]);
        // Update scores
        // the and is not perfect, but I'll fix this once I switch to localizing
        if(maxAndTies.ties.length > 1){
            results.logs.push(`${maxAndTies.ties.map(c => c.name).join(' and ')} are tied for the highest scores!`)
        }
        results.tied.push(...maxAndTies.ties);
        // Set all scores for winner to zero
        scoresNorm.forEach((ballot, b) => {
            ballot[w] = new Fraction(0)
        })
        remainingCandidates = remainingCandidates.filter(c => c != summaryData.candidates[w])
        // remainingCandidates.splice(w, 1);

        // create arrays for sorting ballots
        let cand_df: winner_scores[] = [];
        let cand_df_sorted: winner_scores[] = [];

        weighted_scores.forEach((weighted_score, i) => {
            cand_df.push({
                index: i,
                ballot_weight: ballot_weights[i],
                weighted_score: weighted_score[w]
            });
            cand_df_sorted.push({
                index: i,
                ballot_weight: ballot_weights[i],
                weighted_score: weighted_score[w]
            });
        });

        cand_df_sorted.sort((a, b) =>
            a.weighted_score < b.weighted_score ? 1 : -1
        );

        let split_point = findSplitPoint(cand_df_sorted, quota);

        summaryData.splitPoints.push(split_point.valueOf());

        let spent_above = new Fraction(0);
        cand_df.forEach((c, i) => {
            if (c.weighted_score.compare(split_point) > 0) {
                spent_above = spent_above.add(c.ballot_weight);
            }
        });
        summaryData.spentAboves.push(spent_above.valueOf());

        if (spent_above.valueOf() > 0) {
            results.logs.push(`The ${rounded(spent_above)} voters who gave ${summaryData.candidates[w].name} more than ${rounded(split_point.mul(MAX_SCORE))} stars are fully represented and will be removed from future rounds.`)
            cand_df.forEach((c, i) => {
                if (c.weighted_score.compare(split_point) > 0) {
                    cand_df[i].ballot_weight = new Fraction(0);
                }
            });
        }

        let weight_on_split = findWeightOnSplit(cand_df, split_point);

        // quota = spent_above + weight_on_split*new_weight
        let new_weight = (quota.sub(spent_above)).div(weight_on_split);
        results.logs.push(
            `The ${rounded(weight_on_split)} voters who gave ${summaryData.candidates[w].name} ${rounded(split_point.mul(MAX_SCORE))} stars are partially represented. `+
            `${percent(new_weight)} of their remaining vote will go toward ${summaryData.candidates[w].name} and ${percent(new Fraction(1).sub(new_weight))} will be preserved for future rounds.`)

        summaryData.weight_on_splits.push(weight_on_split.valueOf());
        ballot_weights = updateBallotWeights(
            cand_df,
            ballot_weights,
            weight_on_split,
            quota,
            spent_above,
            split_point
        );
    }

    for (let i = 0; i < summaryData.weightedScoresByRound.length; i++) {
        for (let j = 0; j < summaryData.weightedScoresByRound[i].length; j++) {
            summaryData.weightedScoresByRound[i][j] *= MAX_SCORE
        }
    }

    results.other = remainingCandidates;

    return results
}

function rounded(n: typeof Fraction){
    return Math.round(n.valueOf()*100)/100
}

function percent(n: typeof Fraction){
    return `${Math.round(n.valueOf()*100)}%`
}

function updateBallotWeights(
    cand_df: winner_scores[],
    ballot_weights: typeof Fraction[],
    weight_on_split: typeof Fraction,
    quota: typeof Fraction,
    spent_above: typeof Fraction,
    split_point: typeof Fraction
) {
    if (weight_on_split.compare(0) > 0) {
        let spent_value = quota.sub(spent_above).div(weight_on_split);
        cand_df.forEach((c, i) => {
            if (c.weighted_score.equals(split_point)) {
                cand_df[i].ballot_weight = cand_df[i].ballot_weight.mul( (new Fraction(1).sub(spent_value) ) );
            }
        });
    }
    cand_df.forEach((c, i) => {
        if (c.ballot_weight.compare(1) > 0) {
            ballot_weights[i] = new Fraction(1);
        } else if (c.ballot_weight.compare(0) < 0) {
            ballot_weights[i] = new Fraction(0);
        } else {
            ballot_weights[i] = c.ballot_weight;
        }
    });

    return ballot_weights;
}

function findWeightOnSplit(cand_df: winner_scores[], split_point: typeof Fraction) {
    let weight_on_split = new Fraction(0);
    cand_df.forEach((c, i) => {
        if (c.weighted_score.equals(split_point)) {
            weight_on_split = weight_on_split.add(c.ballot_weight);
        }
    });
    return weight_on_split;
}

function indexOfMax(arr: typeof Fraction[], candidates: candidate[]) {
    if (arr.length === 0) {
        return { maxIndex: -1, ties: [] };
    }

    let max = arr[0];
    let maxIndex = 0;
    let ties: candidate[] = [candidates[0]];
    for (let i = 1; i < arr.length; i++) {
        if (max.equals(arr[i])) {
            ties.push(candidates[i]);
        } else if (arr[i].compare(max) > 0) {
            maxIndex = i;
            max = arr[i];
            ties = [candidates[i]];
        }
    }
    if (ties.length > 1) {
        maxIndex = candidates.indexOf(ties.sort((a, b) => -(a.tieBreakOrder-b.tieBreakOrder))[0]);
    }
    return { maxIndex, ties };
}

function findSplitPoint(cand_df_sorted: winner_scores[], quota: typeof Fraction) {
    let cumsum : typeof Fraction = new Fraction(0);
    for(const c of cand_df_sorted ){
        cumsum = cumsum.add(c.ballot_weight);

        // Since cand_df_sorted is sorted by weighted score we know that this will be the smallest
        if(cumsum.compare(quota) >= 0){
            return c.weighted_score;
        }
    }

    return cand_df_sorted.slice(-1)[0].weighted_score
}
