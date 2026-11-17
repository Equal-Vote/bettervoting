import Stripe from 'stripe';
import { CheckoutSessionParams, CreatedCheckoutSession, RetrievedCheckoutSession, verifyWebhookEvent } from './StripeService';

export default class MockStripeService {
    public createdSessions: (CreatedCheckoutSession & { params: CheckoutSessionParams })[] = [];
    private _sessions = new Map<string, RetrievedCheckoutSession>();
    private _nextId = 1;

    async createCheckoutSession(params: CheckoutSessionParams): Promise<CreatedCheckoutSession> {
        const id = `cs_test_mock_${this._nextId++}`;
        const session = { id, url: `https://checkout.stripe.com/c/pay/${id}` };
        this.createdSessions.push({ ...session, params });
        this._sessions.set(id, { id, payment_status: 'unpaid', customer_email: null });
        return session;
    }

    // What retrieveCheckoutSession returns for this session id, e.g. once it's paid
    setSession(session: RetrievedCheckoutSession) {
        this._sessions.set(session.id, session);
    }

    async retrieveCheckoutSession(id: string): Promise<RetrievedCheckoutSession> {
        const session = this._sessions.get(id);
        if (!session) {
            throw new Error(`No such checkout.session: ${id}`);
        }
        return session;
    }

    // Real signature verification, so tests sign events with Stripe.webhooks.generateTestHeaderString
    constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
        return verifyWebhookEvent(rawBody, signature);
    }

    clear() {
        this.createdSessions = [];
        this._sessions.clear();
    }
}
