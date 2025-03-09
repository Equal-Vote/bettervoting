import { Candidate } from "./Candidate";
import { Uid } from "./Uid";
import { checkForDuplicates } from "./Util";
import { candidateValidation } from "./Candidate";
import { WriteInCandidate } from "./WriteIn";

const validVotingMethods = ['STAR', 'STAR_PR', 'Approval', 'RankedRobin', 'IRV', 'Plurality', 'STV'] as const;
export type VotingMethod = typeof validVotingMethods[number];
export interface Race {
    race_id:        Uid; // short mnemonic for the race
    title:          string; // display caption for the race
    description?:   string; // mark-up text describing the race
    voting_method:  VotingMethod; //voting method to be used
    num_winners:    number; // number of winners
    candidates:     Candidate[]; // list of candidates
    precincts?:     String[]; // list of precincts that vote in this election, if null then open to all precincts
    enable_write_in?: Boolean; //Allow voters to write in candidates
    write_in_candidates?: WriteInCandidate[]
}
export function raceValidation(obj:Race):string | null {
    if (!obj.race_id || typeof obj.race_id !== 'string') {
        return "Invalid Race Id";
    }
    if (typeof obj.title !== 'string'){
        return "Invalid Title";
    }
    if ((obj.title.length < 3 || obj.title.length > 256)) {
        return "invalid Title length";
    }
    if (obj.description && typeof obj.description !== 'string'){
        return "Invalid Description";
    }
    if (!obj.voting_method || !validVotingMethods.includes(obj.voting_method)){
        return "Invalid Voting Method";
    }
    if (obj.num_winners < 1 || obj.num_winners > 100){
        return "Invalid Number of Winners";
    }
    if (!obj.candidates || obj.candidates.length < 2){
        return "Invalid Number of Candidates";
    } else {
        if (checkForDuplicates(obj.candidates.map(candidate => candidate.candidate_id))){
            return "Duplicate Candidate Ids";
        }
        if (checkForDuplicates(obj.candidates.map(candidate => candidate.candidate_name))){
            return "Duplicate Candidate Names";
        }
        let candidateErrors = '';
        obj.candidates.forEach(candidate => {
            const candidateError = candidateValidation(candidate);
            if (candidateError){
                candidateErrors += `candidate_id: ${candidate.candidate_id}: ${candidateError} `;
            }
        });
    }
    return null;
    
}