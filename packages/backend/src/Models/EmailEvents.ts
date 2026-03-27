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
}
