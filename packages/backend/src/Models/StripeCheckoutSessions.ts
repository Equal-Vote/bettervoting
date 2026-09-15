import { ILoggingContext } from '../Services/Logging/ILogger';
import Logger from '../Services/Logging/Logger';
import { Kysely } from 'kysely'
import { Database } from './Database';
import { StripeCheckoutSession } from '@equal-vote/star-vote-shared/domain_model/StripeCheckoutSession';

const tableName = 'stripeCheckoutSessionsDB';

export default class StripeCheckoutSessionsDB {

    _postgresClient;

    constructor(postgresClient: Kysely<Database>) {
        this._postgresClient = postgresClient;
    }

    async insert(session: Omit<StripeCheckoutSession, 'id'>, ctx: ILoggingContext): Promise<void> {
        Logger.debug(ctx, `${tableName}.insert election_id=${session.election_id} stripe_checkout_session_id=${session.stripe_checkout_session_id}`);
        await this._postgresClient
            .insertInto(tableName)
            .values(session)
            .execute();
    }

    async getByStripeSessionId(stripe_checkout_session_id: string, ctx: ILoggingContext): Promise<StripeCheckoutSession | null> {
        Logger.debug(ctx, `${tableName}.getByStripeSessionId`);
        const result = await this._postgresClient
            .selectFrom(tableName)
            .where('stripe_checkout_session_id', '=', stripe_checkout_session_id)
            .selectAll()
            .executeTakeFirst();
        return result ?? null;
    }

    async markPaid(stripe_checkout_session_id: string, ctx: ILoggingContext): Promise<void> {
        Logger.debug(ctx, `${tableName}.markPaid stripe_checkout_session_id=${stripe_checkout_session_id}`);
        await this._postgresClient
            .updateTable(tableName)
            .set({ status: 'paid' })
            .where('stripe_checkout_session_id', '=', stripe_checkout_session_id)
            .execute();
    }

    // Audit/support total only — voter_limit itself is authoritative on the election row.
    // voter_count_granted is already the aggregate across any voter_limit line items in
    // the row (set at insert time), so no per-product filtering is needed here.
    async sumVoterLimitPurchases(election_id: string, ctx: ILoggingContext): Promise<number> {
        Logger.debug(ctx, `${tableName}.sumVoterLimitPurchases election_id=${election_id}`);
        const result = await this._postgresClient
            .selectFrom(tableName)
            .select((eb) => eb.fn.sum<number>('voter_count_granted').as('total'))
            .where('election_id', '=', election_id)
            .where('status', '=', 'paid')
            .executeTakeFirst();
        return Number(result?.total ?? 0);
    }
}
