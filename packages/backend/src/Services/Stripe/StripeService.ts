import Stripe from 'stripe';
import { InternalServerError } from '@curveball/http-errors';

export type CheckoutSessionParams = Stripe.Checkout.SessionCreateParams;

export interface CreatedCheckoutSession {
    id: string;
    url: string;
}

// Thin wrapper around the Stripe SDK, so controllers depend on this (and tests on its mock)
// rather than on the SDK itself.
export default class StripeService {
    private _client: Stripe | undefined;

    // Created on first use, so the app still starts when STRIPE_SECRET_KEY isn't set;
    // only payment requests fail.
    private client(): Stripe {
        if (this._client == null) {
            const secretKey = process.env.STRIPE_SECRET_KEY;
            if (!secretKey) {
                throw new InternalServerError('Stripe secret key is not configured');
            }
            this._client = new Stripe(secretKey);
        }
        return this._client;
    }

    async createCheckoutSession(params: CheckoutSessionParams): Promise<CreatedCheckoutSession> {
        const session = await this.client().checkout.sessions.create(params);
        // Stripe always returns a url for a hosted (ui_mode: 'hosted') session
        if (!session.url) {
            throw new InternalServerError('Stripe did not return a checkout URL');
        }
        return { id: session.id, url: session.url };
    }
}
