import { Uid } from "./Uid";

export interface Score {
    candidate_id: Uid;   // Must match the candidate_id of the poll, or empty if write in 
    score: number | null;   // 0-5 integer value, null if voter hasn't scored this candidate
    write_in_name?: string // Candidate's name if candidate is a write in
}