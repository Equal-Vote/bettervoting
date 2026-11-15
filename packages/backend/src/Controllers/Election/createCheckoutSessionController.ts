import { Response, NextFunction } from 'express';
import { BadRequest } from '@curveball/http-errors';
import { permissions } from '@equal-vote/star-vote-shared/domain_model/permissions';
import { TransactionLineItem } from '@equal-vote/star-vote-shared/domain_model/Transaction';
import { CatalogPriceData, catalogLineItem, getCatalogProduct } from '@equal-vote/star-vote-shared/config';
import ServiceLocator from '../../ServiceLocator';
import Logger from '../../Services/Logging/Logger';
import { IElectionRequest } from '../../IRequest';
import { expectPermanentUser, expectPermission } from '../controllerUtils';

const TransactionsModel = ServiceLocator.transactionsDb();
const StripeService = ServiceLocator.stripeService();

const className = 'election.Controllers';

const DISCLAIMER = 'This payment is a program service fee to Equal Vote. It is not tax-deductible.';

// The catalog's snapshot of a line: what's sent to Stripe and stored on the transaction
type CheckoutLineItem = TransactionLineItem & { price_data: CatalogPriceData };

// Checks the itemized cart against the catalog. A line whose entitlement_amount or price
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
        if (line.entitlement_amount !== expected.entitlement_amount || line.unit_amount !== expected.unit_amount) {
            throw new BadRequest(`line_items[${i}]: pricing doesn't match the current catalog; refresh and try again`);
        }
        return {
            entitlement_type: expected.entitlement_type,
            entitlement_amount: expected.entitlement_amount,
            quantity,
            // Built from the catalog's own price_data, never from client-sent copy
            price_data: product.priceData(),
        };
    });
}

const createCheckoutSession = async (req: IElectionRequest, res: Response, _next: NextFunction) => {
    const election_id = req.election.election_id;
    Logger.info(req, `${className}.createCheckoutSession ${election_id}`);
    expectPermission(req.user_auth.roles, permissions.canEditElection);
    // A transaction is tied to an account (and finalizing needs one anyway)
    expectPermanentUser(req.user, "Create an account to make a purchase for this election");
    const user_id = req.user?.sub as string; // expectPermanentUser guarantees it

    const lineItems = expectValidCart(req.body?.line_items);

    const returnUrl = `${ServiceLocator.globalData().mainUrl}/${election_id}/admin`;
    const session = await StripeService.createCheckoutSession({
        mode: 'payment',
        submit_type: 'pay', // never 'donate': this is a service fee, not a donation
        line_items: lineItems.map(({ price_data, quantity }) => ({ price_data, quantity })),
        client_reference_id: election_id,
        metadata: { election_id, user_id },
        custom_text: { after_submit: { message: DISCLAIMER } },
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
