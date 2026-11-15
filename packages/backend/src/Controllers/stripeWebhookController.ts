import { Response } from 'express';
import Stripe from 'stripe';
import { BadRequest, InternalServerError } from '@curveball/http-errors';
import { Transaction } from '@equal-vote/star-vote-shared/domain_model/Transaction';
import { IRequest } from '../IRequest';
import Logger from '../Services/Logging/Logger';
import { ILoggingContext } from '../Services/Logging/ILogger';
import ServiceLocator from '../ServiceLocator';
import { CompleteResult } from '../Models/Transactions';
import { PaymentReceipt } from '../Services/Email/EmailTemplates';
import { getErrorMessage } from '../errorUtils';

const className = 'stripeWebhook.Controllers';

// Completes a pending transaction and grants its line items, in one DB transaction:
// either the status change and every entitlement commit, or nothing does.
// Returns the completed row, or null when it was already complete (a redelivered webhook).
// Doesn't finalize the election; the checkout return page does that once the grant has landed.
export async function fulfillTransaction(stripe_checkout_session_id: string, ctx: ILoggingContext): Promise<Transaction | null> {
    const TransactionsModel = ServiceLocator.transactionsDb();
    const EntitlementsModel = ServiceLocator.entitlementsDb();
    return ServiceLocator.database().transaction().execute(async (trx) => {
        const result: CompleteResult = await TransactionsModel.completeIfPending(stripe_checkout_session_id, ctx, trx);
        if (result === 'already_complete') return null;
        if (result !== 'completed') {
            // Thrown so the webhook gets a non-2xx and Stripe redelivers, e.g. if this raced the pending insert
            Logger.error(ctx, `${className}.fulfillTransaction ${stripe_checkout_session_id}: transaction is ${result}`);
            throw new InternalServerError(`Transaction is ${result}`);
        }

        const transaction = await TransactionsModel.getByStripeSessionId(stripe_checkout_session_id, ctx, trx);
        if (!transaction) throw new InternalServerError('Completed transaction not found');

        const created_date = new Date().toISOString();
        await EntitlementsModel.insert(transaction.line_items.map(line => ({
            election_id: transaction.election_id,
            transaction_id: transaction.id,
            type: line.entitlement_type,
            amount: line.quantity * line.unit_entitlement, // unit_entitlement is per unit, snapshotted at checkout
            source: 'purchase' as const,
            created_date,
        })), ctx, trx);
        return transaction;
    });
}

// The grant is already committed, so a failure here is logged rather than failing the webhook
async function sendReceipt(transaction: Transaction, email: string | null, ctx: ILoggingContext) {
    try {
        if (!email) {
            Logger.warn(ctx, `${className}.sendReceipt: no email for ${transaction.stripe_checkout_session_id}`);
            return;
        }
        const election = await ServiceLocator.electionsDb().getElectionByID(transaction.election_id, ctx);
        const url = ServiceLocator.globalData().mainUrl;
        await ServiceLocator.emailService().sendEmails([PaymentReceipt(transaction, email, url, election?.title)]);
    } catch (err: unknown) {
        Logger.error(ctx, `${className}.sendReceipt failed for ${transaction.stripe_checkout_session_id}: ${getErrorMessage(err)}`);
    }
}

async function handleCheckoutPaid(session_id: string, ctx: ILoggingContext) {
    // Re-fetched rather than trusting the event payload
    const session = await ServiceLocator.stripeService().retrieveCheckoutSession(session_id);
    if (session.payment_status !== 'paid') {
        // A delayed payment method; it's granted on checkout.session.async_payment_succeeded
        Logger.info(ctx, `${className}: ${session_id} is ${session.payment_status}; not fulfilling yet`);
        return;
    }
    const transaction = await fulfillTransaction(session.id, ctx);
    if (transaction) {
        await sendReceipt(transaction, session.customer_email, ctx);
    }
}

// Mounted with express.raw(), so req.body is the raw Buffer the signature is computed over.
// Any failure returns non-2xx so Stripe redelivers; redelivery is safe since completeIfPending only acts once.
export const stripeWebhookController = async (req: IRequest, res: Response) => {
    let event: Stripe.Event;
    try {
        event = ServiceLocator.stripeService().constructWebhookEvent(req.body as Buffer, String(req.headers['stripe-signature'] ?? ''));
    } catch (err: unknown) {
        if (err instanceof Stripe.errors.StripeSignatureVerificationError) {
            Logger.warn(req, `${className}: invalid signature`);
            throw new BadRequest('Invalid signature');
        }
        throw err;
    }
    Logger.info(req, `${className}: ${event.type} ${event.id}`);

    switch (event.type) {
        case 'checkout.session.completed':
        case 'checkout.session.async_payment_succeeded':
            await handleCheckoutPaid(event.data.object.id, req);
            break;
        case 'checkout.session.expired':
            await ServiceLocator.transactionsDb().markExpired(event.data.object.id, req);
            break;
        case 'checkout.session.async_payment_failed':
            // The row stays pending, which grants nothing
            Logger.warn(req, `${className}: async payment failed for ${event.data.object.id}`);
            break;
        default:
            break;
    }
    res.status(200).json({ received: true });
};
