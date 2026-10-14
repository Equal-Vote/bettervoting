import { ILoggingContext } from '../Services/Logging/ILogger';
import Logger from '../Services/Logging/Logger';
import { Kysely, sql } from 'kysely'
import { Database } from './Database';
import { EmailStatus, EmailStatusRecord, statusesBefore, VoterEmail } from '@equal-vote/star-vote-shared/domain_model/EmailSend';

const tableName = 'emailStatusDB';

// Every status change goes through one conditional UPDATE that only moves a status
// forward (see laterEmailStatus in the shared EmailSend model). Doing the comparison in
// the WHERE clause, rather than reading then writing, means two webhook deliveries for the
// same email can't race: the second waits on the first's row lock, then rechecks.
export default class EmailStatusDB {

    _postgresClient;

    constructor(postgresClient: Kysely<Database>) {
        this._postgresClient = postgresClient;
    }

    // SendGrid accepted the email: record its message id, and move it to sending unless a
    // webhook event has somehow already moved it further.
    async markSent(id: number, message_id: string, ctx: ILoggingContext): Promise<void> {
        Logger.debug(ctx, `${tableName}.markSent id=${id}`);
        await this._postgresClient
            .updateTable(tableName)
            .set({
                message_id,
                status: sql<EmailStatus>`CASE WHEN status = 'queued' THEN 'sending' ELSE status END`,
                updated_at: new Date().toISOString(),
            })
            .where('id', '=', id)
            .execute();
    }

    // Move the email with this SendGrid message id forward to `status`. Returns false when
    // nothing changed: the email is unknown, or already at or past `status`.
    async advanceByMessageId(message_id: string, status: EmailStatus, ctx: ILoggingContext): Promise<boolean> {
        Logger.debug(ctx, `${tableName}.advanceByMessageId status=${status}`);
        const result = await this._postgresClient
            .updateTable(tableName)
            .set({ status, updated_at: new Date().toISOString() })
            .where('message_id', '=', message_id)
            .where('status', 'in', statusesBefore(status))
            .executeTakeFirst();
        return Number(result.numUpdatedRows) > 0;
    }

    // We couldn't hand these emails to SendGrid.
    async markFailed(ids: number[], ctx: ILoggingContext): Promise<void> {
        if (ids.length === 0) return;
        Logger.debug(ctx, `${tableName}.markFailed count=${ids.length}`);
        await this._postgresClient
            .updateTable(tableName)
            .set({ status: 'failed', updated_at: new Date().toISOString() })
            .where('id', 'in', ids)
            .where('status', 'in', statusesBefore('failed'))
            .execute();
    }

    async getByMessageId(message_id: string, ctx: ILoggingContext): Promise<EmailStatusRecord | null> {
        Logger.debug(ctx, `${tableName}.getByMessageId`);
        const row = await this._postgresClient
            .selectFrom(tableName)
            .where('message_id', '=', message_id)
            .selectAll()
            .executeTakeFirst();
        return row ?? null;
    }

    // Every email sent to one voter, newest send first.
    async getByElectionAndVoter(election_id: string, voter_id: string, ctx: ILoggingContext): Promise<VoterEmail[]> {
        Logger.debug(ctx, `${tableName}.getByElectionAndVoter ${election_id}`);
        const rows = await this._postgresClient
            .selectFrom(`${tableName} as st`)
            .innerJoin('emailSendsDB as s', 's.send_id', 'st.send_id')
            .where('st.election_id', '=', election_id)
            .where('st.voter_id', '=', voter_id)
            .select(['st.send_id', 's.kind', 's.subject', 's.sent_by', 's.created_at', 'st.status', 'st.updated_at'])
            .orderBy('s.created_at', 'desc')
            .execute();
        return rows.map(r => ({
            ...r,
            created_at: new Date(r.created_at).toISOString(),
            updated_at: new Date(r.updated_at).toISOString(),
        }));
    }

    // How many of each send's emails are in each status, for one election.
    async countsByElection(election_id: string, ctx: ILoggingContext): Promise<{ send_id: string, status: EmailStatus, count: number }[]> {
        Logger.debug(ctx, `${tableName}.countsByElection ${election_id}`);
        const rows = await this._postgresClient
            .selectFrom(tableName)
            .where('election_id', '=', election_id)
            .select(['send_id', 'status', (eb) => eb.fn.countAll().as('count')])
            .groupBy(['send_id', 'status'])
            .execute();
        return rows.map(r => ({ send_id: r.send_id, status: r.status, count: Number(r.count) }));
    }
}
