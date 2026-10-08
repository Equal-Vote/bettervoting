import { Uid } from "./Uid";

export type EntitlementType = 'voter_limit';
export type EntitlementSource = 'purchase' | 'admin_grant';

// One row per granted product. An election's total for a type is the SUM of
// amount across its rows; amount is signed so refunds can be negative rows.
export interface Entitlement {
    id?: number;
    election_id: Uid;
    transaction_id?: number; // absent for entitlements not tied to a payment
    type: EntitlementType;
    amount: number; // resolved effect, e.g. voters added — independent of current pricing
    source: EntitlementSource;
    created_date: string;
}
