import { Uid } from "./Uid";
import { EntitlementType } from "./Entitlement";

export type TransactionStatus = 'pending' | 'complete' | 'expired';

// A cart line item as submitted to Stripe Checkout Session creation — a full
// snapshot of the Stripe price_data, plus the entitlement it grants once paid.
// The entitlement is resolved at checkout time so a pricing change between
// checkout and payment can't alter what the customer receives.
export interface TransactionLineItem {
    entitlement_type: EntitlementType;
    entitlement_amount: number;
    quantity: number;
    price_data: unknown;
}

export interface Transaction {
    id?: number;
    election_id: Uid;
    user_id: Uid;
    line_items: TransactionLineItem[];
    stripe_checkout_session_id: string;
    stripe_customer_id?: string;
    status: TransactionStatus;
    created_date: string;
    completed_date?: string;
}
