import { Uid } from "./Uid";

export interface WriteInCandidate {
    candidate_name: string;
    aliases: string[];
    approved: boolean;
}

export interface WriteInData {
    race_id: Uid,
    names: { [key: string]: number }
}