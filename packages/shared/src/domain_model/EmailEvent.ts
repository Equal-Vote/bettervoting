import { Uid } from "./Uid";

export interface EmailEvent {
    id?: number;
    message_id: string;
    election_id: Uid;
    voter_id: Uid;
    event_type: string;
    event_timestamp: string;
    details?: Record<string, unknown>;
}
