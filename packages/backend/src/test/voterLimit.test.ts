import 'dotenv/config';
import { TestHelper } from './TestHelper';
import testInputs from './testInputs';
import ServiceLocator from '../ServiceLocator';
import { ILoggingContext } from '../Services/Logging/ILogger';
import { pricingConfig, sharedConfig } from '@equal-vote/star-vote-shared/config';
import { Election } from '@equal-vote/star-vote-shared/domain_model/Election';
import { Transaction } from 'kysely';
import { Database } from '../Models/Database';

const th = new TestHelper();

afterEach(() => {
    jest.clearAllMocks();
    th.afterEach();
});

const makeIdVoters = (count: number, prefix: string) =>
    Array.from({ length: count }, (_, i) => ({ voter_id: `${prefix}-${i}` }));

// IDRollElection is a closed (voter id) election; copied so the shared input isn't mutated
const createClosedElection = async (state: Election['state'] = 'open'): Promise<string> => {
    const response = await th.createElection({ ...testInputs.IDRollElection, state }, testInputs.user1token);
    expect(response.statusCode).toBe(200);
    return response.election.election_id;
};

// Stands in for a completed voter-limit purchase: there is deliberately no API
// for an admin to add entitlements, so the test arranges them at the store.
const grantVoters = async (election_id: string, amount: number) => {
    const ctx: ILoggingContext = { contextId: 'voterLimit.test' };
    await ServiceLocator.entitlementsDb().insert([{
        election_id,
        type: 'voter_limit',
        amount,
        source: 'admin_grant',
        created_date: new Date().toISOString(),
    // Tests run against the mock store, which ignores the transaction
    }], ctx, {} as Transaction<Database>);
};

describe("Voter limit on closed elections", () => {
    test("adding voters past draft beyond the free tier limit responds 402 Payment Required", async () => {
        const id = await createClosedElection();

        const response = await th.submitElectionRoll(id, makeIdVoters(150, 'over'), testInputs.user1token);

        expect(response.statusCode).toBe(402);
        expect(response.body.error).toContain(`Request Denied: this election is limited to ${pricingConfig.FREE_TIER_LIMIT} voters`);
        th.testComplete();
    });

    test("entitlement rows add to the free tier limit", async () => {
        const id = await createClosedElection();
        await grantVoters(id, 30);
        await grantVoters(id, 20);

        const withinLimit = await th.submitElectionRoll(id, makeIdVoters(120, 'within'), testInputs.user1token);
        expect(withinLimit.statusCode).toBe(200);

        const overLimit = await th.submitElectionRoll(id, makeIdVoters(31, 'over'), testInputs.user1token);
        expect(overLimit.statusCode).toBe(402);
        expect(overLimit.body.error).toContain('limited to 150 voters');
        th.testComplete();
    });

    test("drafts accept voters over the limit, since payment happens at finalize", async () => {
        const id = await createClosedElection('draft');

        const response = await th.submitElectionRoll(id, makeIdVoters(150, 'draft'), testInputs.user1token);

        expect(response.statusCode).toBe(200);
        th.testComplete();
    });
});

describe("Finalize gate", () => {
    const createDraftWithVoters = async (count: number): Promise<string> => {
        const id = await createClosedElection('draft');
        const rollResponse = await th.submitElectionRoll(id, makeIdVoters(count, 'draft'), testInputs.user1token);
        expect(rollResponse.statusCode).toBe(200);
        return id;
    };

    test("finalizing with more voters than the limit responds 402 and leaves the election in draft", async () => {
        const id = await createDraftWithVoters(pricingConfig.FREE_TIER_LIMIT + 1);

        const response = await th.finalizeElection(id, testInputs.user1token);

        expect(response.statusCode).toBe(402);
        expect(response.err).toEqual(expect.objectContaining({
            error: expect.stringContaining(`Request Denied: this election is limited to ${pricingConfig.FREE_TIER_LIMIT} voters`),
        }));
        const after = await th.fetchElectionById(id, testInputs.user1token);
        expect(after.election.state).toBe('draft');
        th.testComplete();
    });

    test("finalizing at exactly the limit succeeds", async () => {
        const id = await createDraftWithVoters(pricingConfig.FREE_TIER_LIMIT);

        const response = await th.finalizeElection(id, testInputs.user1token);

        expect(response.statusCode).toBe(200);
        th.testComplete();
    });

    test("finalizing succeeds when an entitlement row covers the roll", async () => {
        const id = await createDraftWithVoters(pricingConfig.FREE_TIER_LIMIT + 1);
        await grantVoters(id, 200);

        const response = await th.finalizeElection(id, testInputs.user1token);

        expect(response.statusCode).toBe(200);
        th.testComplete();
    });
});

describe("Manual voter limit overrides", () => {
    const overrides = sharedConfig.ELECTION_VOTER_LIMIT_OVERRIDES as Record<string, number>;
    const addedOverrides: string[] = [];
    afterAll(() => addedOverrides.forEach(id => delete overrides[id]));

    test("an override replaces the computed limit", async () => {
        const id = await createClosedElection();
        await grantVoters(id, 200);
        overrides[id] = 5;
        addedOverrides.push(id);

        const response = await th.submitElectionRoll(id, makeIdVoters(6, 'override'), testInputs.user1token);

        expect(response.statusCode).toBe(402);
        expect(response.body.error).toContain('limited to 5 voters');
        th.testComplete();
    });

    test("an override covering the roll lets finalize succeed", async () => {
        const id = await createClosedElection('draft');
        const rollResponse = await th.submitElectionRoll(id, makeIdVoters(pricingConfig.FREE_TIER_LIMIT + 50, 'override'), testInputs.user1token);
        expect(rollResponse.statusCode).toBe(200);
        overrides[id] = pricingConfig.FREE_TIER_LIMIT + 50;
        addedOverrides.push(id);

        const response = await th.finalizeElection(id, testInputs.user1token);

        expect(response.statusCode).toBe(200);
        th.testComplete();
    });
});

describe("GET /Election/:id entitlements", () => {
    test("returns the free tier default when there are no entitlement rows", async () => {
        const id = await createClosedElection();

        const response = await th.fetchElectionById(id, testInputs.user1token);

        expect(response.entitlements).toEqual({ voter_limit: pricingConfig.FREE_TIER_LIMIT });
        th.testComplete();
    });

    test("includes granted entitlements for an admin", async () => {
        const id = await createClosedElection();
        await grantVoters(id, 200);

        const response = await th.fetchElectionById(id, testInputs.user1token);

        expect(response.entitlements).toEqual({ voter_limit: pricingConfig.FREE_TIER_LIMIT + 200 });
        th.testComplete();
    });

    test("is left out for an anonymous request", async () => {
        const id = await createClosedElection();

        const res = await th.getRequest(`/API/Election/${id}`, null);

        expect(res.statusCode).toBe(200);
        expect(res.body).not.toHaveProperty('entitlements');
        th.testComplete();
    });
});
