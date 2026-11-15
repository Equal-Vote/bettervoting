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

// 3 blocks of 100 voters at $6.00 each, as the catalog prices them
const validLine = { entitlement_type: 'voter_limit', quantity: 3, unit_entitlement: 100, unit_amount: 600 };

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
                price_data: { currency: 'usd', unit_amount: 600, product_data: {
                    name: 'Increase Voter Limit',
                    description: "Adds 300 voters (3 blocks of 100) to your election's voter limit.",
                } },
            }],
        });
        expect(session.params.custom_text?.submit).toEqual({ message: `Increase voter limit from 100 to 400 for election "${testInputs.IDRollElection.title}".` });
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
                quantity: 3,
                unit_entitlement: 100,
                price_data: session.params.line_items?.[0].price_data,
            }],
        });
        th.testComplete();
    });

    test("the submit message starts from the election's current limit, including past purchases", async () => {
        const id = await createElection();
        await ServiceLocator.entitlementsDb().insert([{
            election_id: id, type: 'voter_limit', amount: 200, source: 'purchase', created_date: new Date().toISOString(),
        }], ctx, undefined as never);

        const response = await postCheckout(id, { line_items: [validLine] });

        expect(response.statusCode).toBe(200);
        const [session] = stripe().createdSessions;
        expect(session.params.custom_text?.submit).toEqual({ message: expect.stringMatching(/^Increase voter limit from 300 to 600 for election /) });
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
            ['a non-integer quantity', { line_items: [{ ...validLine, quantity: 1.5 }] }],
            ['a zero quantity', { line_items: [{ ...validLine, quantity: 0 }] }],
            ['a unit_entitlement that is the line total, not per unit', { line_items: [{ ...validLine, unit_entitlement: 300 }] }],
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
