import { CheckoutSessionParams, CreatedCheckoutSession } from './StripeService';

export default class MockStripeService {
    public createdSessions: (CreatedCheckoutSession & { params: CheckoutSessionParams })[] = [];
    private _nextId = 1;

    async createCheckoutSession(params: CheckoutSessionParams): Promise<CreatedCheckoutSession> {
        const id = `cs_test_mock_${this._nextId++}`;
        const session = { id, url: `https://checkout.stripe.com/c/pay/${id}` };
        this.createdSessions.push({ ...session, params });
        return session;
    }

    clear() {
        this.createdSessions = [];
    }
}
