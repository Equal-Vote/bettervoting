import { Election } from "@equal-vote/star-vote-shared/domain_model/Election";
import { Uid } from "@equal-vote/star-vote-shared/domain_model/Uid";
import { ILoggingContext } from "../Services/Logging/ILogger";

// The columns the public audit log reads from every version of an election.
export type ElectionVersionRow = Pick<Election, 'state' | 'settings' | 'update_date' | 'audit_note'>;

export interface IElectionStore {
    createElection: (election: Election, ctx: ILoggingContext, reason: string) => Promise<Election>;
    // audit_note is set on the new version by the store (null when omitted) so a
    // note from an earlier action is never carried forward onto a later one.
    updateElection: (election: Election, ctx: ILoggingContext, reason: string, expected_update_date: string, audit_note?: string | null) => Promise<Election>;
    // Every version (head and non-head) of one election, oldest first.
    getElectionVersions: (election_id: Uid, ctx: ILoggingContext) => Promise<ElectionVersionRow[]>;
    getElections: (id: string, email: string, ctx: ILoggingContext) => Promise<Election[] | null>;
    getElectionByID: (election_id: Uid, ctx:ILoggingContext) => Promise<Election | null>;
    delete: (election_id: Uid, ctx:ILoggingContext, reason:string) => Promise<boolean>;
    electionExistsByID: (election_id: Uid, ctx: ILoggingContext) => Promise<boolean | string>;
}