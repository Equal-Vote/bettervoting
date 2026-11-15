import request from 'supertest';
import Stripe from 'stripe';
import makeApp from '../app';
import ServiceLocator from '../ServiceLocator';
import { ILoggingContext } from '../Services/Logging/ILogger';
import MockStripeService from '../Services/Stripe/MockStripeService';
import { Imsg } from '../Services/Email/IEmail';
import { Transaction, TransactionLineItem } from '@equal-vote/star-vote-shared/domain_model/Transaction';
import { Entitlement } from '@equal-vote/star-vote-shared/domain_model/Entitlement';

const WEBHOOK_SECRET = 'whsec_test_secret';
process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;

const app = makeApp();
const ctx: ILoggingContext = { contextId: 'stripeWebhook.test' };

// ServiceLocator is jest.mock()'d in tests (see setupTests.ts), so these are the mocks
const stripe = () => ServiceLocator.stripeService() as unknown as MockStripeService;
// The in-memory state of the mock stores (typed structurally: jest forbids importing from __mocks__)
const emails = () => ServiceLocator.emailService() as unknown as { sentEmails: Imsg[]; clear: () => void };
const transactions = () => ServiceLocator.transactionsDb() as unknown as { _transactions: Transaction[] };
const entitlements = () => ServiceLocator.entitlementsDb() as unknown as { _entitlements: Entitlement[] };

const SESSION_ID = 'cs_test_webhook_1';
const ELECTION_ID = 'webhook-election';

const voterBlockPrice = { currency: 'usd', unit_amount: 600, product_data: { name: 'Increase Voter Limit', description: '' } };

const lineItems: TransactionLineItem[] = [
    {
        entitlement_type: 'voter_limit',
        quantity: 3,
        unit_entitlement: 100,
        price_data: voterBlockPrice,
    },
    {
        entitlement_type: 'voter_limit',
        quantity: 1,
        unit_entitlement: 100,
        price_data: voterBlockPrice,
    },
];

const insertPending = () => ServiceLocator.transactionsDb().insert({
    election_id: ELECTION_ID,
    user_id: 'Alice1234',
    line_items: lineItems,
    stripe_checkout_session_id: SESSION_ID,
    status: 'pending',
    created_date: new Date().toISOString(),
}, ctx);

const getRow = () => ServiceLocator.transactionsDb().getByStripeSessionId(SESSION_ID, ctx);

let eventCount = 0;
// The payload's session is deliberately stale ('unpaid'): the controller must re-fetch it from Stripe
const makeEvent = (type: string) => JSON.stringify({
    id: `evt_test_${++eventCount}`,
    object: 'event',
    type,
    data: { object: { id: SESSION_ID, object: 'checkout.session', payment_status: 'unpaid' } },
});

const postEvent = (body: string, signature = Stripe.webhooks.generateTestHeaderString({ payload: body, secret: WEBHOOK_SECRET })) =>
    request(app)
        .post('/API/StripeWebhook')
        .set('Content-Type', 'application/json')
        .set('Stripe-Signature', signature)
        .send(body);

beforeEach(async () => {
    await insertPending();
    stripe().setSession({ id: SESSION_ID, payment_status: 'paid', customer_email: 'alice@example.com' });
});

afterEach(() => {
    jest.restoreAllMocks();
    stripe().clear();
    emails().clear();
    transactions()._transactions = [];
    entitlements()._entitlements = [];
});

describe('POST /API/StripeWebhook', () => {
    test('rejects a bad signature with 400', async () => {
        const body = makeEvent('checkout.session.completed');
        const res = await postEvent(body, Stripe.webhooks.generateTestHeaderString({ payload: body, secret: 'whsec_wrong' }));

        expect(res.statusCode).toBe(400);
        expect((await getRow())?.status).toBe('pending');
        expect(entitlements()._entitlements).toHaveLength(0);
    });

    test('completed + paid: completes the row and grants one entitlement per line item', async () => {
        const res = await postEvent(makeEvent('checkout.session.completed'));

        expect(res.statusCode).toBe(200);
        const row = await getRow();
        expect(row?.status).toBe('complete');
        expect(entitlements()._entitlements).toEqual([
            expect.objectContaining({ election_id: ELECTION_ID, transaction_id: row?.id, type: 'voter_limit', amount: 300, source: 'purchase' }),
            expect.objectContaining({ election_id: ELECTION_ID, transaction_id: row?.id, type: 'voter_limit', amount: 100, source: 'purchase' }),
        ]);
    });

    test('a redelivered event grants nothing a second time and sends one receipt', async () => {
        const body = makeEvent('checkout.session.completed');
        expect((await postEvent(body)).statusCode).toBe(200);
        expect((await postEvent(body)).statusCode).toBe(200);
        expect((await postEvent(makeEvent('checkout.session.async_payment_succeeded'))).statusCode).toBe(200);

        expect(entitlements()._entitlements).toHaveLength(2);
        expect(emails().sentEmails).toHaveLength(1);
    });

    test('the receipt is itemized and carries the disclaimer', async () => {
        await postEvent(makeEvent('checkout.session.completed'));

        const [email] = emails().sentEmails;
        expect(email.to).toBe('alice@example.com');
        expect(email.html).toContain('Increase Voter Limit');
        expect(email.html).toContain('$18.00');
        expect(email.html).toContain('$24.00');
        expect(email.html).toMatch(/not tax-deductible/);
        expect(email.text).toMatch(/not tax-deductible/);
    });

    test('completed + unpaid grants nothing; async_payment_succeeded then grants', async () => {
        stripe().setSession({ id: SESSION_ID, payment_status: 'unpaid', customer_email: 'alice@example.com' });

        expect((await postEvent(makeEvent('checkout.session.completed'))).statusCode).toBe(200);
        expect((await getRow())?.status).toBe('pending');
        expect(entitlements()._entitlements).toHaveLength(0);
        expect(emails().sentEmails).toHaveLength(0);

        stripe().setSession({ id: SESSION_ID, payment_status: 'paid', customer_email: 'alice@example.com' });
        expect((await postEvent(makeEvent('checkout.session.async_payment_succeeded'))).statusCode).toBe(200);
        expect((await getRow())?.status).toBe('complete');
        expect(entitlements()._entitlements).toHaveLength(2);
        expect(emails().sentEmails).toHaveLength(1);
    });

    test('expired marks the row expired', async () => {
        const res = await postEvent(makeEvent('checkout.session.expired'));

        expect(res.statusCode).toBe(200);
        expect((await getRow())?.status).toBe('expired');
    });

    test('a late expired event leaves a completed row complete', async () => {
        await postEvent(makeEvent('checkout.session.completed'));

        expect((await postEvent(makeEvent('checkout.session.expired'))).statusCode).toBe(200);
        expect((await getRow())?.status).toBe('complete');
    });

    test('async_payment_failed leaves the row pending', async () => {
        const res = await postEvent(makeEvent('checkout.session.async_payment_failed'));

        expect(res.statusCode).toBe(200);
        expect((await getRow())?.status).toBe('pending');
        expect(entitlements()._entitlements).toHaveLength(0);
    });

    test('other events are acknowledged and ignored', async () => {
        const res = await postEvent(makeEvent('payment_intent.created'));

        expect(res.statusCode).toBe(200);
        expect((await getRow())?.status).toBe('pending');
    });

    test('a failed entitlement insert rolls back the status change so Stripe redelivers', async () => {
        jest.spyOn(ServiceLocator.entitlementsDb(), 'insert').mockRejectedValueOnce(new Error('db down'));

        const res = await postEvent(makeEvent('checkout.session.completed'));

        expect(res.statusCode).toBe(500);
        expect((await getRow())?.status).toBe('pending');
        expect(entitlements()._entitlements).toHaveLength(0);
        expect(emails().sentEmails).toHaveLength(0);

        // The redelivery succeeds
        expect((await postEvent(makeEvent('checkout.session.completed'))).statusCode).toBe(200);
        expect((await getRow())?.status).toBe('complete');
        expect(entitlements()._entitlements).toHaveLength(2);
    });

    test('an unknown session returns non-2xx so Stripe redelivers', async () => {
        transactions()._transactions = [];

        const res = await postEvent(makeEvent('checkout.session.completed'));

        expect(res.statusCode).toBe(500);
        expect(entitlements()._entitlements).toHaveLength(0);
    });

    test('a failed receipt email still returns 200, with the grant committed', async () => {
        jest.spyOn(ServiceLocator.emailService(), 'sendEmails').mockRejectedValueOnce(new Error('sendgrid down'));

        const res = await postEvent(makeEvent('checkout.session.completed'));

        expect(res.statusCode).toBe(200);
        expect((await getRow())?.status).toBe('complete');
        expect(entitlements()._entitlements).toHaveLength(2);
    });
});
