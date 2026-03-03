import { candidate, irvCandidate, irvResults, irvRoundResults, irvSummaryData, keyedObject, rawVote, vote } from "@equal-vote/star-vote-shared/domain_model/ITabulators";

import { getSummaryData, makeAbstentionTest, makeBoundsTest, sortCandidates } from "./Util";
import { ElectionSettings } from "@equal-vote/star-vote-shared/domain_model/ElectionSettings";

const Fraction = require('fraction.js');

const DEBUG = false;

type weightedVote = {
    weight: typeof Fraction,
    vote: vote,
}

type candidateVoteList = {
    votes: weightedVote[],
    candidate: irvCandidate
}

export function IRV(candidates: candidate[], votes: rawVote[], nWinners = 1, electionSettings?:ElectionSettings) {
    return IRV_STV(candidates, votes, nWinners, electionSettings, false)
}

export function STV(candidates: candidate[], votes: rawVote[], nWinners = 1, electionSettings?:ElectionSettings) {
    return IRV_STV(candidates, votes, nWinners, electionSettings, true)
}

export function IRV_STV(candidates: candidate[], votes: rawVote[], nWinners = 1, electionSettings?:ElectionSettings, proportional = true) {

    const {tallyVotes, summaryData} = getSummaryData<irvCandidate, Omit<irvSummaryData, 'nExhaustedViaOverVote' | 'nExhaustedViaSkippedRank' | 'nExhaustedViaDuplicateRank'>>(
        candidates.map(c => ({...c, hareScores: []})), 
		votes,
        'ordinal',
        undefined,
		[
			makeBoundsTest(0, electionSettings?.max_rankings ?? Infinity), 
			makeAbstentionTest(),
		]
	);

    // Initialize output data structure
    const results: irvResults = {
        votingMethod: proportional? 'STV' : 'IRV',
        elected: [],
        tied: [],
        other: [],
        summaryData: summaryData,
        roundResults: [],
        exhaustedVoteCounts: [],
        tieBreakType: 'none',
        nExhaustedViaOvervote: 0,
        nExhaustedViaSkippedRank: 0,
        nExhaustedViaDuplicateRank: 0,
    }

    let remainingCandidates = [...summaryData.candidates]
    let activeVotes: vote[] = tallyVotes;

    let weightedVotes: weightedVote[] = activeVotes.map(vote => ({ weight: Fraction(1), vote: vote }))

    // Initialize candidate vote pools to empty arrays
    let candidateVoteLists: keyedObject<candidateVoteList> = Object.fromEntries(summaryData.candidates.map(c => [c.id, {
        candidate: c, 
        votes: [] as weightedVote[]
    }]))

    // Initial vote distribution, moves weighted votes into the appropriate candidate pools 
    distributeVotes(remainingCandidates, candidateVoteLists, weightedVotes, results, electionSettings)

    // Set quota based on number of winners and if its proportional
    let quota: typeof Fraction = 0;
    if (proportional) {
        quota = Math.floor(activeVotes.length/(nWinners + 1) + 1)
    } else {
        quota = Math.floor(activeVotes.length/2 + 1)
    }

    while (results.elected.length < nWinners) {

        if (DEBUG) console.log("IRV Round");

        let roundResults: irvRoundResults = {
            winners: [],
            runner_up: [],
            tied: [],
            tieBreakType: 'none',
            eliminated: [],
            logs: [],
        }

        summaryData.candidates.forEach(c => {
            c.hareScores.push(addWeightedVotes(candidateVoteLists[c.id].votes))
        });
        sortCandidates(remainingCandidates, ['hareScores', 'tieBreakOrder'])

        // get max number of votes

        let topCandidate = remainingCandidates[0];
        let maxVotes: typeof Fraction = (topCandidate.hareScores.at(-1) as typeof Fraction);
        let nActiveVotes: typeof Fraction = remainingCandidates.reduce((sum, c) => sum.add(c.hareScores.at(-1)), new Fraction(0));
        if (!proportional) {
            quota = Math.floor(nActiveVotes /2 + 1)
        }

        results.exhaustedVoteCounts.push(tallyVotes.length - nActiveVotes.valueOf() - quota*results.elected.length)

        if (maxVotes.compare(quota) >= 0) {
            // candidate meets the threshold
            // add winner, remove from remaining candidates
            results.elected.push(topCandidate)
            roundResults.winners.push(topCandidate)
            if (DEBUG) console.log("winner", topCandidate);

            if (proportional) {
                remainingCandidates.shift(); // remove top
                let fractionalSurplus = new Fraction(maxVotes.sub(quota)).div(maxVotes)
                let winningCandidateVotes = candidateVoteLists[topCandidate.id].votes;
                candidateVoteLists[topCandidate.id].votes = []
                winningCandidateVotes.forEach(vote => {
                    vote.weight = vote.weight.mul(fractionalSurplus).floor(5)
                })
                distributeVotes(remainingCandidates, candidateVoteLists, winningCandidateVotes, results, electionSettings)
            }
            else {
                // Reset candidate pool and remove elected candidates
                remainingCandidates = summaryData.candidates.filter(c => !results.elected.includes(c))

                // Reset candidate vote counts and redistribute votes
                Object.entries(candidateVoteLists).forEach(([_, c]) => c.votes = [])
                distributeVotes(remainingCandidates, candidateVoteLists, weightedVotes, results, electionSettings)
            }
        }
        else if ( proportional && remainingCandidates.length <= (nWinners - results.elected.length)) {
            // If number of candidates remaining can fill seats, elect them and end election
            // Only used in proportional as order can matter in block 
            results.elected.push(...remainingCandidates)
            roundResults.winners.push(...remainingCandidates)
        }
        else {
            // find candidate with least votes and remove from remaining candidates
            let eliminatedCandidate = remainingCandidates.pop() as irvCandidate;
            let eliminatedCandidateVotes = candidateVoteLists[eliminatedCandidate.id].votes;
            candidateVoteLists[eliminatedCandidate.id].votes = []
            distributeVotes(remainingCandidates, candidateVoteLists, eliminatedCandidateVotes, results, electionSettings)
            if (DEBUG) console.log("eliminate", JSON.stringify(eliminatedCandidate));
            roundResults.eliminated.push(eliminatedCandidate)
        }

        results.roundResults.push(roundResults)
    }

    // HACK: If we add an early return we might miss this logic
    results.summaryData.candidates.forEach(c => c.hareScores = c.hareScores.map(h => h.valueOf()));
    sortCandidates(summaryData.candidates, ['hareScores', 'tieBreakOrder'], results.roundResults)

    return results
}

function addWeightedVotes(weightedVotes: weightedVote[]): typeof Fraction {
    let voteTotal = new Fraction(0)
    weightedVotes.forEach(vote => {
        voteTotal = voteTotal.add(vote.weight)
    })
    return voteTotal
}

function distributeVotes(remainingCandidates: irvCandidate[], candidateVotes: keyedObject<candidateVoteList>, votesToDistribute: weightedVote[], results: irvResults, electionSettings?: ElectionSettings) {
    // we'll remove as votes get exhausted, hence the backwards iteration
    for(let i = votesToDistribute.length-1; i >= 0; i--){
        let ballot = votesToDistribute[i];
        let v = ballot.vote;

        const mapZero = (n: number) => n == 0 ? Infinity : n;
        let topCandidate = remainingCandidates.reduce((top, c) => mapZero(v.marks[top.id]) < mapZero(v.marks[c.id])? top : c)
        let topRemainingRank: number = (v.overvote_rank && v.marks[topCandidate.id] > v.overvote_rank) ? v.overvote_rank : v.marks[topCandidate.id];

        let prevTopRank = Object.entries(v.marks).reduce((prevTopRank, [_, rank]) => {
            if(rank == 0 || rank >= topRemainingRank) return prevTopRank;
            return Math.max(prevTopRank, rank);
        }, 0); // 0 as default to we can catch front skips

        // TODO: get "2" from election settings
        let exhaustedViaSkippedRankings = (topRemainingRank - prevTopRank) > (electionSettings?.exhaust_on_N_repeated_skipped_marks ?? 9999);
        let exhaustedViaOvervote = !exhaustedViaSkippedRankings && v.overvote_rank && topRemainingRank == v.overvote_rank;
        if (topRemainingRank === 0 || exhaustedViaOvervote || exhaustedViaSkippedRankings) {
            if(exhaustedViaSkippedRankings) results.nExhaustedViaSkippedRank++;
            if(exhaustedViaOvervote) results.nExhaustedViaOvervote++;

            // ballot is exhausted
            votesToDistribute.splice(i,1);
        } else {
            // give vote to top rank candidate
            candidateVotes[topCandidate.id].votes.push(ballot)
        }
    }
}
