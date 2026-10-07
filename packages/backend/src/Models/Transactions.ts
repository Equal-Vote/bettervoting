import { ILoggingContext } from '../Services/Logging/ILogger';
import Logger from '../Services/Logging/Logger';
import { Kysely } from 'kysely'
import { Database } from './Database';
import { Transaction } from '@equal-vote/star-vote-shared/domain_model/Transaction';

const tableName = 'transactionsDB';

export default class TransactionsDB {

    _postgresClient;

    constructor(postgresClient: Kysely<Database>) {
        this._postgresClient = postgresClient;
    }

    async insert(transaction: Omit<Transaction, 'id'>, ctx: ILoggingContext): Promise<void> {
        Logger.debug(ctx, `${tableName}.insert election_id=${transaction.election_id} stripe_checkout_session_id=${transaction.stripe_checkout_session_id}`);
        await this._postgresClient
            .insertInto(tableName)
            // pg serializes JS arrays as Postgres array literals, not JSON, so jsonb arrays must be stringified
            .values({ ...transaction, line_items: JSON.stringify(transaction.line_items) as unknown as Transaction['line_items'] })
            .execute();
    }

    async getByStripeSessionId(stripe_checkout_session_id: string, ctx: ILoggingContext): Promise<Transaction | null> {
        Logger.debug(ctx, `${tableName}.getByStripeSessionId`);
        const result = await this._postgresClient
            .selectFrom(tableName)
            .where('stripe_checkout_session_id', '=', stripe_checkout_session_id)
            .selectAll()
            .executeTakeFirst();
        return result ?? null;
    }

    async markComplete(stripe_checkout_session_id: string, ctx: ILoggingContext): Promise<void> {
        Logger.debug(ctx, `${tableName}.markComplete stripe_checkout_session_id=${stripe_checkout_session_id}`);
        await this._postgresClient
            .updateTable(tableName)
            .set({ status: 'complete', completed_date: new Date().toISOString() })
            .where('stripe_checkout_session_id', '=', stripe_checkout_session_id)
            .execute();
    }

    async markExpired(stripe_checkout_session_id: string, ctx: ILoggingContext): Promise<void> {
        Logger.debug(ctx, `${tableName}.markExpired stripe_checkout_session_id=${stripe_checkout_session_id}`);
        await this._postgresClient
            .updateTable(tableName)
            .set({ status: 'expired' })
            .where('stripe_checkout_session_id', '=', stripe_checkout_session_id)
            .execute();
    }
}
