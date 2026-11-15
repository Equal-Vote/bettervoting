import { useState } from 'react';
import { ElectionEntitlements } from '@equal-vote/star-vote-shared/domain_model/Entitlement';
import { CartLineItem, entitlementsAfter } from '@equal-vote/star-vote-shared/domain_model/ProductCatalog';
import { useCreateCheckoutSession } from '~/hooks/useAPI';
import useElection from '~/components/ElectionContextProvider';
import { clearExpectedEntitlements, saveExpectedEntitlements } from './paymentsUtils';

// Posts the cart to POST /Election/:id/CheckoutSession and sends the browser to Stripe's hosted page.
// `entitlements` are the ones the cart was itemized against.
export function useCheckout() {
    const { election } = useElection();
    const { makeRequest, isPending } = useCreateCheckoutSession(election.election_id);
    // Stays true once we've handed off to Stripe, so the button can't be clicked again while the page unloads
    const [redirecting, setRedirecting] = useState(false);

    const startCheckout = async (lineItems: CartLineItem[], entitlements: ElectionEntitlements): Promise<boolean> => {
        saveExpectedEntitlements(election.election_id, entitlementsAfter(entitlements, lineItems));
        const res = await makeRequest({ line_items: lineItems });
        if (!res) { // useFetch already showed the error
            clearExpectedEntitlements(election.election_id);
            return false;
        }
        setRedirecting(true);
        window.location.assign(res.url);
        return true;
    };

    return { startCheckout, isPending: isPending || redirecting };
}
