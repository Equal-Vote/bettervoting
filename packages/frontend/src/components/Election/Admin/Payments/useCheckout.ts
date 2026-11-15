import { ElectionEntitlements, EntitlementType } from '@equal-vote/star-vote-shared/domain_model/Entitlement';
import { CartLineItem, entitlementsAfter } from '@equal-vote/star-vote-shared/domain_model/ProductCatalog';
import { useCreateCheckoutSession } from '~/hooks/useAPI';
import useElection from '~/components/ElectionContextProvider';

// What the election's entitlements should be once the checkout we sent the admin to is fulfilled.
// Saved before redirecting to Stripe, so the return page knows when the webhook's grant has landed.
const storageKey = (election_id: string) => `checkout_expected_entitlements:${election_id}`;

export function saveExpectedEntitlements(election_id: string, expected: ElectionEntitlements) {
    try { sessionStorage.setItem(storageKey(election_id), JSON.stringify(expected)); } catch { /* storage unavailable */ }
}

export function readExpectedEntitlements(election_id: string): ElectionEntitlements | null {
    try {
        const saved = sessionStorage.getItem(storageKey(election_id));
        return saved ? JSON.parse(saved) : null;
    } catch {
        return null;
    }
}

export function clearExpectedEntitlements(election_id: string) {
    try { sessionStorage.removeItem(storageKey(election_id)); } catch { /* storage unavailable */ }
}

// True once every entitlement has reached what was expected
export const entitlementsCover = (current: ElectionEntitlements, expected: ElectionEntitlements) =>
    (Object.keys(expected) as EntitlementType[]).every(type => (current[type] ?? 0) >= expected[type]);

// Posts the cart to POST /Election/:id/CheckoutSession and sends the browser to Stripe's hosted page.
// `entitlements` are the ones the cart was itemized against.
export default function useCheckout() {
    const { election } = useElection();
    const { makeRequest, isPending } = useCreateCheckoutSession(election.election_id);

    const startCheckout = async (lineItems: CartLineItem[], entitlements: ElectionEntitlements): Promise<boolean> => {
        saveExpectedEntitlements(election.election_id, entitlementsAfter(entitlements, lineItems));
        const res = await makeRequest({ line_items: lineItems });
        if (!res) { // useFetch already showed the error
            clearExpectedEntitlements(election.election_id);
            return false;
        }
        window.location.assign(res.url);
        return true;
    };

    return { startCheckout, isPending };
}
