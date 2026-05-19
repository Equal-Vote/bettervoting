import { ElectionRoll, NewElectionRoll } from "@equal-vote/star-vote-shared/domain_model/ElectionRoll";
import { ILoggingContext } from "../Services/Logging/ILogger";
import { Kysely, Transaction } from 'kysely';
import { Database } from './Database';

export interface IElectionRollStore {
    submitElectionRoll: (
        electionRolls: NewElectionRoll[],
        ctx: ILoggingContext,
        reason: string,
        db?: Kysely<Database> | Transaction<Database>
    ) => Promise<ElectionRoll[]>;
    getRollsByElectionID: (
        election_id: string,
        ctx: ILoggingContext,
        db?: Kysely<Database> | Transaction<Database>
    ) => Promise<ElectionRoll[] | null>;
    getByVoterID: (
        election_id: string,
        voter_id: string,
        ctx: ILoggingContext,
        db?: Kysely<Database> | Transaction<Database>
    ) => Promise<ElectionRoll | null>;
    getElectionRoll: (
        election_id: string,
        voter_id: string | null,
        email: string | null,
        ip_hash: string | null,
        ctx: ILoggingContext,
        db?: Kysely<Database> | Transaction<Database>
    ) => Promise<ElectionRoll[] | null>;
    update: (
        election_roll: NewElectionRoll,
        ctx: ILoggingContext,
        reason: string,
        db?: Kysely<Database> | Transaction<Database>
    ) => Promise<ElectionRoll | null>;
    delete: (
        election_roll: ElectionRoll,
        ctx: ILoggingContext,
        reason: string,
        db?: Kysely<Database> | Transaction<Database>
    ) => Promise<boolean>;
}
