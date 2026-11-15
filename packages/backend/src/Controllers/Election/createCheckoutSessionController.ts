import ServiceLocator from '../../ServiceLocator';
import Logger from '../../Services/Logging/Logger';
import { permissions } from '@equal-vote/star-vote-shared/domain_model/permissions';
import { TransactionLineItem } from '@equal-vote/star-vote-shared/domain_model/Transaction';
import { CatalogProduct, catalogLineItem, getCatalogProduct } from '@equal-vote/star-vote-shared/config';
import { expectPermanentUser, expectPermission } from '../controllerUtils';
import { BadRequest } from '@curveball/http-errors';
import { IElectionRequest } from '../../IRequest';
import { Response, NextFunction } from 'express';

const TransactionsModel = ServiceLocator.transactionsDb();
const StripeService = ServiceLocator.stripeService();

const className = 'election.Controllers';

const DISCLAIMER = 'This payment is a program service fee to Equal Vote. It is non-refundable and not tax-deductible.';

type CartItem = { product: CatalogProduct; quantity: number };

// Checks the itemized cart against the catalog. A line whose entitlement_amount or price
// doesn't exactly match the catalog means the client's pricing is stale.
// The cart isn't checked against the current roll: extra headroom is paid for at catalog price.
function expectValidCart(line_items: unknown): CartItem[] {
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
        return { product, quantity };
    });
}

const createCheckoutSession = async (req: IElectionRequest, res: Response, _next: NextFunction) => {
    const election_id = req.election.election_id;
    Logger.info(req, `${className}.createCheckoutSession ${election_id}`);
    expectPermission(req.user_auth.roles, permissions.canEditElection);
    // A transaction is tied to an account (and finalizing needs one anyway)
    expectPermanentUser(req.user);
    const user_id = req.user?.sub as string; // expectPermanentUser guarantees it

    const cart = expectValidCart(req.body?.line_items);

    // Built from the catalog's own price_data, never from client-sent copy
    const lineItems: TransactionLineItem[] = cart.map(({ product, quantity }) => ({
        entitlement_type: product.entitlement_type,
        entitlement_amount: product.entitlementAmount(quantity),
        quantity,
        price_data: product.priceData(),
    }));

    const returnUrl = `${ServiceLocator.globalData().mainUrl}/${election_id}/admin`;
    const session = await StripeService.createCheckoutSession({
        mode: 'payment',
        submit_type: 'pay', // never 'donate': this is a service fee, not a donation
        line_items: cart.map(({ product, quantity }) => ({ price_data: product.priceData(), quantity })),
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
