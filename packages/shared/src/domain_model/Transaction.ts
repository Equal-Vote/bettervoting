import { Uid } from "./Uid";
import { EntitlementType } from "./Entitlement";

export type TransactionStatus = 'pending' | 'complete' | 'expired';

// A cart line item as submitted to Stripe Checkout Session creation — a full
// snapshot of the Stripe price_data (which holds the unit_amount), plus the
// entitlement each unit grants once paid. Both are resolved at checkout time so a
// pricing change between checkout and payment can't alter what the customer
// receives. Fulfillment grants quantity × unit_entitlement.
export interface TransactionLineItem {
    entitlement_type: EntitlementType;
    quantity: number;
    unit_entitlement: number;
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
