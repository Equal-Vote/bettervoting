import { TestHelper } from './TestHelper';
import testInputs from './testInputs';
import ServiceLocator from '../ServiceLocator';
import { ILoggingContext } from '../Services/Logging/ILogger';
import MockStripeService from '../Services/Stripe/MockStripeService';

const th = new TestHelper();
const ctx: ILoggingContext = { contextId: 'checkoutSession.test' };

// ServiceLocator is jest.mock()'d in tests (see setupTests.ts), so this is the mock
const stripe = () => ServiceLocator.stripeService() as unknown as MockStripeService;

afterEach(() => {
    jest.clearAllMocks();
    stripe().clear();
    th.afterEach();
});

const createElection = async (): Promise<string> => {
    const response = await th.createElection({ ...testInputs.IDRollElection, state: 'draft' }, testInputs.user1token);
    expect(response.statusCode).toBe(200);
    return response.election.election_id;
};

const postCheckout = (election_id: string, body: object, token: string | null = testInputs.user1token) =>
    th.postRequest(`/API/Election/${election_id}/CheckoutSession`, body, token);

// 3 blocks of 200 voters at $10.00 each, as the catalog prices them
const validLine = { entitlement_type: 'voter_limit', quantity: 3, entitlement_amount: 600, unit_amount: 1000 };

describe("POST /Election/:id/CheckoutSession", () => {
    test("creates a Stripe session, records a pending transaction, and returns the checkout URL", async () => {
        const id = await createElection();

        const response = await postCheckout(id, { line_items: [validLine] });

        expect(response.statusCode).toBe(200);
        const [session] = stripe().createdSessions;
        expect(response.body).toEqual({ url: session.url });

        expect(session.params).toMatchObject({
            mode: 'payment',
            submit_type: 'pay',
            client_reference_id: id,
            metadata: { election_id: id, user_id: 'Alice1234' },
            line_items: [{
                quantity: 3,
                price_data: { currency: 'usd', unit_amount: 1000, product_data: { name: '200 Additional Voters' } },
            }],
        });
        expect(session.params.custom_text?.after_submit).toMatchObject({ message: expect.stringMatching(/not tax-deductible/) });
        expect(session.params.success_url).toContain(`/${id}/admin`);
        expect(session.params.success_url).toContain('{CHECKOUT_SESSION_ID}');
        expect(session.params.cancel_url).toContain(`/${id}/admin`);

        const transaction = await ServiceLocator.transactionsDb().getByStripeSessionId(session.id, ctx);
        expect(transaction).toMatchObject({
            election_id: id,
            user_id: 'Alice1234',
            status: 'pending',
            line_items: [{
                entitlement_type: 'voter_limit',
                entitlement_amount: 600,
                quantity: 3,
                price_data: session.params.line_items?.[0].price_data,
            }],
        });
        th.testComplete();
    });

    test("returns no URL when the transaction can't be recorded", async () => {
        const id = await createElection();
        jest.spyOn(ServiceLocator.transactionsDb(), 'insert').mockRejectedValueOnce(new Error('db down'));

        const response = await postCheckout(id, { line_items: [validLine] });

        expect(response.statusCode).toBe(500);
        expect(response.body.url).toBeUndefined();
        th.testComplete();
    });

    describe("rejects a cart that doesn't match the catalog with 400", () => {
        test.each([
            ['an empty cart', { line_items: [] }],
            ['a missing cart', {}],
            ['an unknown type', { line_items: [{ ...validLine, entitlement_type: 'donation' }] }],
            ['a null line', { line_items: [null] }],
            ['a non-integer quantity', { line_items: [{ ...validLine, quantity: 1.5, entitlement_amount: 300, unit_amount: 1000 }] }],
            ['a zero quantity', { line_items: [{ ...validLine, quantity: 0, entitlement_amount: 0 }] }],
            ['an entitlement_amount that is the number of blocks, not voters', { line_items: [{ ...validLine, entitlement_amount: 3 }] }],
            ['a stale unit price', { line_items: [{ ...validLine, unit_amount: 500 }] }],
        ])("%s", async (_name, body) => {
            const id = await createElection();

            const response = await postCheckout(id, body);

            expect(response.statusCode).toBe(400);
            expect(stripe().createdSessions).toHaveLength(0);
            th.testComplete();
        });
    });

    test("an unauthenticated user gets 401", async () => {
        const id = await createElection();

        const response = await postCheckout(id, { line_items: [validLine] }, null);

        expect(response.statusCode).toBe(401);
        expect(stripe().createdSessions).toHaveLength(0);
        th.testComplete();
    });

    test("a signed-in user who can't edit the election gets 401", async () => {
        const id = await createElection();

        const response = await postCheckout(id, { line_items: [validLine] }, testInputs.user2token);

        expect(response.statusCode).toBe(401);
        expect(stripe().createdSessions).toHaveLength(0);
        th.testComplete();
    });
});
