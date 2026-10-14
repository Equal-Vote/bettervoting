import { ILoggingContext } from '../Services/Logging/ILogger';
import Logger from '../Services/Logging/Logger';
import { Kysely } from 'kysely'
import { Database } from './Database';
import { EmailEvent } from '@equal-vote/star-vote-shared/domain_model/EmailEvent';

const tableName = 'emailEventsDB';

export default class EmailEventsDB {

    _postgresClient;

    constructor(postgresClient: Kysely<Database>) {
        this._postgresClient = postgresClient;
    }

    async insert(event: Omit<EmailEvent, 'id'>, ctx: ILoggingContext): Promise<void> {
        Logger.debug(ctx, `${tableName}.insert message_id=${event.message_id} event_type=${event.event_type}`);
        await this._postgresClient
            .insertInto(tableName)
            .values(event)
            .execute();
    }

    async getByElectionAndVoter(election_id: string, voter_id: string, ctx: ILoggingContext): Promise<EmailEvent[]> {
        Logger.debug(ctx, `${tableName}.getByElectionAndVoter`);
        return this._postgresClient
            .selectFrom(tableName)
            .where('election_id', '=', election_id)
            .where('voter_id', '=', voter_id)
            .selectAll()
            .orderBy('event_timestamp', 'asc')
            .execute();
    }

    async getByElectionId(election_id: string, ctx: ILoggingContext): Promise<EmailEvent[]> {
        Logger.debug(ctx, `${tableName}.getByElectionId`);
        return this._postgresClient
            .selectFrom(tableName)
            .where('election_id', '=', election_id)
            .selectAll()
            .orderBy('event_timestamp', 'asc')
            .execute();
    }

    async getByMessageId(message_id: string, ctx: ILoggingContext): Promise<EmailEvent | null> {
        Logger.debug(ctx, `${tableName}.getByMessageId`);
        const result = await this._postgresClient
            .selectFrom(tableName)
            .where('message_id', '=', message_id)
            .where('event_type', '=', 'sent')
            .selectAll()
            .executeTakeFirst();
        return result ?? null;
    }

    // Retention: the events are for diagnosing deliveries while they happen, and their
    // details can include receiving servers' messages that quote addresses. Each email's
    // lasting status lives in emailStatusDB. Returns how many rows were deleted.
    async deleteOlderThan(cutoff: Date, ctx: ILoggingContext): Promise<number> {
        Logger.debug(ctx, `${tableName}.deleteOlderThan ${cutoff.toISOString()}`);
        const result = await this._postgresClient
            .deleteFrom(tableName)
            .where('event_timestamp', '<', cutoff.toISOString())
            .executeTakeFirst();
        return Number(result.numDeletedRows);
    }

    // Full event history for one voter -- the per-voter lookup, not the list.
    async getByElectionIdAndVoterId(election_id: string, voter_id: string, ctx: ILoggingContext): Promise<EmailEvent[]> {
        Logger.debug(ctx, `${tableName}.getByElectionIdAndVoterId ${election_id}`);
        return this._postgresClient
            .selectFrom(tableName)
            .where('election_id', '=', election_id)
            .where('voter_id', '=', voter_id)
            .selectAll()
            .orderBy('event_timestamp', 'asc')
            .execute();
    }
}
