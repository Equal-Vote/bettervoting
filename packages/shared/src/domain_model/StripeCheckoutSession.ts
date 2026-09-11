import { Uid } from "./Uid";

export type StripeCheckoutSessionProduct = 'voter_limit';
export type StripeCheckoutSessionStatus = 'pending' | 'paid';

// A cart line item as submitted to Stripe Checkout Session creation — a full
// snapshot of the Stripe price_data for that item, tagged with the internal
// product type it corresponds to (Phase 1 only ships 'voter_limit', but a
// single Checkout Session can carry multiple line items/products).
export interface StripeCheckoutSessionLineItem {
    product: StripeCheckoutSessionProduct;
    price_data: unknown;
    quantity: number;
}

export interface StripeCheckoutSession {
    id?: number;
    election_id: Uid;
    user_id: Uid;
    line_items: StripeCheckoutSessionLineItem[];
    amount_cents: number;
    voter_count_granted?: number;
    stripe_checkout_session_id: string;
    stripe_customer_id?: string;
    status: StripeCheckoutSessionStatus;
    created_date: string;
}
