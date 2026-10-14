import { ILoggingContext } from '../Services/Logging/ILogger';
import Logger from '../Services/Logging/Logger';
import { Kysely } from 'kysely'
import { Database } from './Database';
import { EmailSend } from '@equal-vote/star-vote-shared/domain_model/EmailSend';

const tableName = 'emailSendsDB';

// Status rows per INSERT. Each row is 7 parameters, well under Postgres's 65535-parameter limit.
const INSERT_CHUNK_SIZE = 5000;

export default class EmailSendsDB {

    _postgresClient;

    constructor(postgresClient: Kysely<Database>) {
        this._postgresClient = postgresClient;
    }

    // Record a send and one queued emailStatusDB row per recipient, in one transaction, so
    // a send never exists without its emails. Returns each recipient's status row id.
    async create(send: EmailSend, voter_ids: string[], ctx: ILoggingContext): Promise<Map<string, number>> {
        Logger.debug(ctx, `${tableName}.create send_id=${send.send_id} kind=${send.kind} recipients=${voter_ids.length}`);
        return this._postgresClient.transaction().execute(async (trx) => {
            await trx.insertInto(tableName).values(send).execute();
            const statusIds = new Map<string, number>();
            for (let i = 0; i < voter_ids.length; i += INSERT_CHUNK_SIZE) {
                const rows = voter_ids.slice(i, i + INSERT_CHUNK_SIZE).map(voter_id => ({
                    send_id: send.send_id,
                    election_id: send.election_id,
                    voter_id,
                    message_id: null,
                    status: 'queued' as const,
                    created_at: send.created_at,
                    updated_at: send.created_at,
                }));
                const inserted = await trx.insertInto('emailStatusDB').values(rows).returning(['id', 'voter_id']).execute();
                inserted.forEach(r => statusIds.set(r.voter_id, Number(r.id)));
            }
            return statusIds;
        });
    }

    // Newest first.
    async getByElection(election_id: string, ctx: ILoggingContext): Promise<EmailSend[]> {
        Logger.debug(ctx, `${tableName}.getByElection ${election_id}`);
        return this._postgresClient
            .selectFrom(tableName)
            .where('election_id', '=', election_id)
            .selectAll()
            .orderBy('created_at', 'desc')
            .execute();
    }
}
