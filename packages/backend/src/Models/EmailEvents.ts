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

    // Events for a single voter, resolved by email address. The admin voter list
    // redacts voter_id on email-invitation elections, so the dialog only holds the
    // email; resolving it here keeps voter_id (which is ballot access) server-side.
    // Case-insensitive to match how the rest of the roll code compares emails.
    async getByElectionIdAndEmail(election_id: string, email: string, ctx: ILoggingContext): Promise<EmailEvent[]> {
        Logger.debug(ctx, `${tableName}.getByElectionIdAndEmail ${election_id}`);
        return this._postgresClient
            .selectFrom(tableName)
            .innerJoin('electionRollDB', (join) => join
                .onRef('electionRollDB.election_id', '=', `${tableName}.election_id`)
                .onRef('electionRollDB.voter_id', '=', `${tableName}.voter_id`))
            .where(`${tableName}.election_id`, '=', election_id)
            .where('electionRollDB.head', '=', true)
            .where(({ eb, fn }) => eb(fn('lower', ['electionRollDB.email']), '=', email.toLowerCase()))
            .selectAll(tableName)
            .orderBy(`${tableName}.event_timestamp`, 'asc')
            .execute();
    }
}
