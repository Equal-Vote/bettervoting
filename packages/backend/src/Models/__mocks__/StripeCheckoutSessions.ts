import { StripeCheckoutSession } from '@equal-vote/star-vote-shared/domain_model/StripeCheckoutSession';
import { ILoggingContext } from '../../Services/Logging/ILogger';
import Logger from '../../Services/Logging/Logger';

export default class StripeCheckoutSessionsDB {

    _sessions: StripeCheckoutSession[] = [];
    _nextId = 1;

    async insert(session: Omit<StripeCheckoutSession, 'id'>, ctx: ILoggingContext): Promise<void> {
        Logger.debug(ctx, `MockStripeCheckoutSessions insert stripe_checkout_session_id=${session.stripe_checkout_session_id}`);
        this._sessions.push({ ...session, id: this._nextId++ });
    }

    async getByStripeSessionId(stripe_checkout_session_id: string, ctx: ILoggingContext): Promise<StripeCheckoutSession | null> {
        return this._sessions.find(s => s.stripe_checkout_session_id === stripe_checkout_session_id) ?? null;
    }

    async markPaid(stripe_checkout_session_id: string, ctx: ILoggingContext): Promise<void> {
        const session = this._sessions.find(s => s.stripe_checkout_session_id === stripe_checkout_session_id);
        if (session) {
            session.status = 'paid';
        }
    }

    async sumVoterLimitPurchases(election_id: string, ctx: ILoggingContext): Promise<number> {
        return this._sessions
            .filter(s => s.election_id === election_id && s.status === 'paid')
            .reduce((sum, s) => sum + (s.voter_count_granted ?? 0), 0);
    }
}
