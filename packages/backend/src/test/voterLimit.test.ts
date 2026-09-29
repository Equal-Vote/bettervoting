import 'dotenv/config';
import { Election } from '@equal-vote/star-vote-shared/domain_model/Election';
import { TestHelper } from './TestHelper';
import testInputs from './testInputs';
import ServiceLocator from '../ServiceLocator';
import { ILoggingContext } from '../Services/Logging/ILogger';
import { sharedConfig } from '@equal-vote/star-vote-shared/config';

const th = new TestHelper();

afterEach(() => {
    jest.clearAllMocks();
    th.afterEach();
});

const makeIdVoters = (count: number, prefix: string) =>
    Array.from({ length: count }, (_, i) => ({ voter_id: `${prefix}-${i}` }));

const createClosedElection = async (): Promise<string> => {
    const response = await th.createElection(testInputs.IDRollElection, testInputs.user1token);
    expect(response.statusCode).toBe(200);
    return response.election.election_id;
};

// Stands in for a completed voter-limit purchase: there is deliberately no API
// for an admin to raise voter_limit, so the test arranges it at the store.
const setStoredVoterLimit = async (id: string, voterLimit: number) => {
    const ctx: ILoggingContext = { contextId: 'voterLimit.test' };
    const electionsDb = ServiceLocator.electionsDb();
    const stored = await electionsDb.getElectionByID(id, ctx) as Election;
    await electionsDb.updateElection({ ...stored, voter_limit: voterLimit }, ctx, 'test purchase', String(stored.update_date));
};

describe("Voter limit on closed elections", () => {
    test("adding voters beyond the free tier limit responds 402 with a PAYMENT_REQUIRED body", async () => {
        const id = await createClosedElection();

        const response = await th.submitElectionRoll(id, makeIdVoters(150, 'over'), testInputs.user1token);

        expect(response.statusCode).toBe(402);
        expect(response.body).toEqual({
            error: expect.stringContaining('Request Denied: this election is limited to 100 voters'),
            code: 'PAYMENT_REQUIRED',
            currentVoterLimit: 100,
            requestedVoterCount: 150,
            blockSize: 200,
            pricePerBlockCents: 1000,
        });
        th.testComplete();
    });

    test("an election's own voter_limit replaces the free tier limit", async () => {
        const id = await createClosedElection();
        await setStoredVoterLimit(id, 150);

        const withinLimit = await th.submitElectionRoll(id, makeIdVoters(120, 'within'), testInputs.user1token);
        expect(withinLimit.statusCode).toBe(200);

        const overLimit = await th.submitElectionRoll(id, makeIdVoters(31, 'over'), testInputs.user1token);
        expect(overLimit.statusCode).toBe(402);
        expect(overLimit.body.currentVoterLimit).toBe(150);
        expect(overLimit.body.requestedVoterCount).toBe(151);
        th.testComplete();
    });
});

describe("Manual voter limit overrides", () => {
    const overrides = sharedConfig.ELECTION_VOTER_LIMIT_OVERRIDES as Record<string, number>;
    const addedOverrides: string[] = [];
    afterAll(() => addedOverrides.forEach(id => delete overrides[id]));

    test("an override takes precedence over the election's voter_limit", async () => {
        const id = await createClosedElection();
        await setStoredVoterLimit(id, 300);
        overrides[id] = 5;
        addedOverrides.push(id);

        const response = await th.submitElectionRoll(id, makeIdVoters(6, 'override'), testInputs.user1token);

        expect(response.statusCode).toBe(402);
        expect(response.body.currentVoterLimit).toBe(5);
        th.testComplete();
    });
});

describe("Editing an election cannot change voter_limit", () => {
    test("a client-submitted voter_limit is discarded", async () => {
        const created = await th.createElection(testInputs.Election1, testInputs.user1token);
        expect(created.statusCode).toBe(200);
        const id = created.election.election_id;

        const response = await th.editElection(
            { ...testInputs.Election1, election_id: id, title: 'Renamed', voter_limit: 9999 },
            testInputs.user1token,
        );

        expect(response.statusCode).toBe(200);
        expect(response.election.title).toBe('Renamed');
        expect(response.election.voter_limit).toBe(100);
        const refetched = await th.fetchElectionById(id, testInputs.user1token);
        expect(refetched.election.voter_limit).toBe(100);
        th.testComplete();
    });

    test("omitting voter_limit from the edit keeps the stored value", async () => {
        const created = await th.createElection(testInputs.Election1, testInputs.user1token);
        const id = created.election.election_id;
        await setStoredVoterLimit(id, 300);

        const { voter_limit: _voterLimit, ...withoutLimit } = { ...testInputs.Election1, election_id: id };
        const response = await th.editElection(withoutLimit as Election, testInputs.user1token);

        expect(response.statusCode).toBe(200);
        expect(response.election.voter_limit).toBe(300);
        th.testComplete();
    });
});
