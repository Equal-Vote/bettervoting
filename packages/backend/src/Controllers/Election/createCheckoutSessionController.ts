import { Response, NextFunction } from 'express';
import { BadRequest } from '@curveball/http-errors';
import { permissions } from '@equal-vote/star-vote-shared/domain_model/permissions';
import { TransactionLineItem } from '@equal-vote/star-vote-shared/domain_model/Transaction';
import { ElectionEntitlements, EntitlementType } from '@equal-vote/star-vote-shared/domain_model/Entitlement';
import { CatalogPriceData, catalogLineItem, getCatalogProduct, productCatalog } from '@equal-vote/star-vote-shared/config';
import ServiceLocator from '../../ServiceLocator';
import Logger from '../../Services/Logging/Logger';
import { IElectionRequest } from '../../IRequest';
import { expectPermanentUser, expectPermission } from '../controllerUtils';
import { getElectionEntitlements } from './entitlementUtils';

const TransactionsModel = ServiceLocator.transactionsDb();
const StripeService = ServiceLocator.stripeService();

const className = 'election.Controllers';

const DISCLAIMER = 'This payment is a program service fee to Equal Vote. It is not tax-deductible.';

// The catalog's snapshot of a line: what's sent to Stripe and stored on the transaction
type CheckoutLineItem = TransactionLineItem & { price_data: CatalogPriceData };

// Long titles are cut so the submit message stays well inside Stripe's custom_text limit
const MAX_TITLE_LENGTH = 200;

// Checks the itemized cart against the catalog. A line whose unit_entitlement or unit_amount
// doesn't exactly match the catalog means the client's pricing is stale.
// The cart isn't checked against the current roll: extra headroom is paid for at catalog price.
function expectValidCart(line_items: unknown): CheckoutLineItem[] {
    if (!Array.isArray(line_items) || line_items.length === 0) {
        throw new BadRequest('line_items must be a non-empty array');
    }
    return line_items.map((line, i) => {
        const product = getCatalogProduct(line?.entitlement_type);
        if (!product) {
            throw new BadRequest(`line_items[${i}]: unknown entitlement_type`);
        }
        const quantity = line.quantity;
        if (!Number.isInteger(quantity) || quantity <= 0) {
            throw new BadRequest(`line_items[${i}]: quantity must be a positive integer`);
        }
        const expected = catalogLineItem(product, quantity);
        if (line.unit_entitlement !== expected.unit_entitlement || line.unit_amount !== expected.unit_amount) {
            throw new BadRequest(`line_items[${i}]: pricing doesn't match the current catalog; refresh and try again`);
        }
        return {
            entitlement_type: expected.entitlement_type,
            quantity,
            unit_entitlement: expected.unit_entitlement,
            // Built from the catalog's own price_data, never from client-sent copy
            price_data: product.priceData(quantity),
        };
    });
}

// Shown by the Pay button: which election this is for, and where each limit ends up.
// "from" is read now, so a second checkout paid in between can make it stale; what's granted is still right.
function submitMessage(title: string, lineItems: CheckoutLineItem[], entitlements: ElectionEntitlements): string {
    const added: Partial<Record<EntitlementType, number>> = {};
    lineItems.forEach(({ entitlement_type, quantity, unit_entitlement }) => {
        added[entitlement_type] = (added[entitlement_type] ?? 0) + quantity * unit_entitlement;
    });
    const changes = (Object.entries(added) as [EntitlementType, number][]).map(([type, amount]) => {
        const from = entitlements[type];
        return `${productCatalog[type].entitlementLabel} goes from ${from} to ${from + amount}`;
    });
    const shortTitle = title.length > MAX_TITLE_LENGTH ? `${title.slice(0, MAX_TITLE_LENGTH - 1)}…` : title;
    return `${shortTitle}: ${changes.join('; ')}.`;
}

const createCheckoutSession = async (req: IElectionRequest, res: Response, _next: NextFunction) => {
    const election_id = req.election.election_id;
    Logger.info(req, `${className}.createCheckoutSession ${election_id}`);
    expectPermission(req.user_auth.roles, permissions.canEditElection);
    // A transaction is tied to an account (and finalizing needs one anyway)
    expectPermanentUser(req.user, "Create an account to make a purchase for this election");
    const user_id = req.user?.sub as string; // expectPermanentUser guarantees it

    const lineItems = expectValidCart(req.body?.line_items);
    const entitlements = await getElectionEntitlements(election_id, req);

    const returnUrl = `${ServiceLocator.globalData().mainUrl}/${election_id}/admin`;
    const session = await StripeService.createCheckoutSession({
        mode: 'payment',
        submit_type: 'pay', // never 'donate': this is a service fee, not a donation
        line_items: lineItems.map(({ price_data, quantity }) => ({ price_data, quantity })),
        client_reference_id: election_id,
        metadata: { election_id, user_id },
        custom_text: {
            submit: { message: submitMessage(req.election.title, lineItems, entitlements) },
            after_submit: { message: DISCLAIMER },
        },
        success_url: `${returnUrl}?checkout_session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${returnUrl}?checkout=cancelled`,
    });

    // The row needs the session id, so it's inserted after the session is created. If the insert
    // fails the URL is never returned, so nobody can pay, and Stripe expires the unused session.
    await TransactionsModel.insert({
        election_id,
        user_id,
        line_items: lineItems,
        stripe_checkout_session_id: session.id,
        status: 'pending',
        created_date: new Date().toISOString(),
    }, req);

    res.json({ url: session.url });
};

export {
    createCheckoutSession
};
