import { ElectionEntitlements, EntitlementType } from '@equal-vote/star-vote-shared/domain_model/Entitlement';

// Publish & Share's cost section; Manage Voters and Add Voters link to it
export const FINALIZE_COST_ID = 'finalize-cost';
export const finalizeCostPath = (electionId: string) => `/${electionId}/admin/publish#${FINALIZE_COST_ID}`;

// Set on Manage Voters after paying for an over-limit upload: reopens Add Voters to re-submit the list
export const PAYMENT_RECEIVED_PARAM = 'payment_received';

// POST /Election/:id/CheckoutSession sends Stripe back to /:id/admin with one of these
export const CHECKOUT_SESSION_PARAM = 'checkout_session_id';
export const CHECKOUT_CANCEL_PARAM = 'checkout';
export const isCheckoutReturn = (params: URLSearchParams) =>
    params.has(CHECKOUT_SESSION_PARAM) || params.get(CHECKOUT_CANCEL_PARAM) === 'cancelled';

// "Poll" or "Election", following the election's term_type
export const electionTermTitle = (settings: { term_type?: string }) => settings.term_type === 'poll' ? 'Poll' : 'Election';

// What the election's entitlements should be once the checkout we sent the admin to is fulfilled.
// Saved before redirecting to Stripe, so the return page knows when the webhook's grant has landed.
const storageKey = (electionId: string) => `checkout_expected_entitlements:${electionId}`;

export function saveExpectedEntitlements(electionId: string, expected: ElectionEntitlements) {
    try { sessionStorage.setItem(storageKey(electionId), JSON.stringify(expected)); } catch { /* storage unavailable */ }
}

export function readExpectedEntitlements(electionId: string): ElectionEntitlements | null {
    try {
        const saved = sessionStorage.getItem(storageKey(electionId));
        return saved ? JSON.parse(saved) : null;
    } catch {
        return null;
    }
}

export function clearExpectedEntitlements(electionId: string) {
    try { sessionStorage.removeItem(storageKey(electionId)); } catch { /* storage unavailable */ }
}

// True once every entitlement has reached what was expected
export const entitlementsCover = (current: ElectionEntitlements, expected: ElectionEntitlements) =>
    (Object.keys(expected) as EntitlementType[]).every(type => (current[type] ?? 0) >= expected[type]);
