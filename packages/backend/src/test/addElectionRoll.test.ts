import 'dotenv/config';
import { TestHelper } from './TestHelper';
import testInputs from './testInputs';

const th = new TestHelper();

afterEach(() => {
    jest.clearAllMocks();
    th.afterEach();
});

describe("Adding to the voter roll", () => {
    beforeAll(() => {
        jest.resetAllMocks();
    });
    let electionId = "";

    test("Create election, responds 200", async () => {
        const response = await th.createElection(testInputs.IDRollElection, testInputs.user1token);
        expect(response.statusCode).toBe(200);
        electionId = response.election.election_id;
        th.testComplete();
    });

    test("Add initial voters", async () => {
        const response = await th.submitElectionRoll(
            electionId,
            [
                { voter_id: 'AliceID', email: 'Alice@email.com' },
                { voter_id: 'BobID', email: 'Bob@email.com' },
            ],
            testInputs.user1token
        );
        expect(response.statusCode).toBe(200);
        th.testComplete();
    });

    test("Rejects a voter whose voter_id already exists", async () => {
        const response = await th.submitElectionRoll(electionId, [{ voter_id: 'AliceID' }], testInputs.user1token);
        expect(response.statusCode).toBe(400);
        th.testComplete();
    });

    test("Rejects a voter whose voter_id only differs by surrounding whitespace", async () => {
        const response = await th.submitElectionRoll(electionId, [{ voter_id: ' AliceID ' }], testInputs.user1token);
        expect(response.statusCode).toBe(400);
        th.testComplete();
    });

    test("Rejects a voter whose email only differs by letter case", async () => {
        const response = await th.submitElectionRoll(electionId, [{ voter_id: 'NewID', email: 'bOB@EMAIL.com' }], testInputs.user1token);
        expect(response.statusCode).toBe(400);
        th.testComplete();
    });

    test("Rejects the whole batch when only some of its voters are duplicates", async () => {
        const response = await th.submitElectionRoll(
            electionId,
            [{ voter_id: 'CarolID' }, { voter_id: 'BobID' }],
            testInputs.user1token
        );
        expect(response.statusCode).toBe(400);

        const roll = await th.fetchElectionRoll(electionId, testInputs.user1token);
        expect(roll.body.electionRoll.some((r: { voter_id?: string }) => r.voter_id === 'CarolID')).toBe(false);
        th.testComplete();
    });

    test("Ignores empty emails when checking for duplicates", async () => {
        const response = await th.submitElectionRoll(
            electionId,
            [{ voter_id: 'DaveID', email: '' }, { voter_id: 'ErinID', email: '' }],
            testInputs.user1token
        );
        expect(response.statusCode).toBe(200);
        th.testComplete();
    });

    test("Accepts a request body larger than the express default of 100kb", async () => {
        // open elections aren't subject to the closed-election voter limit
        const openElection = {
            ...testInputs.IDRollElection,
            settings: { ...testInputs.IDRollElection.settings, voter_access: 'open' as const },
        };
        const created = await th.createElection(openElection, testInputs.user1token);
        expect(created.statusCode).toBe(200);

        const voters = Array.from({ length: 2000 }, (_, i) => ({ voter_id: `bulk${i}`, email: `Bulk${i}@email.com` }));
        expect(JSON.stringify({ electionRoll: voters }).length).toBeGreaterThan(100 * 1024);
        const response = await th.submitElectionRoll(created.election.election_id, voters, testInputs.user1token);
        expect(response.statusCode).toBe(200);
        th.testComplete();
    });
});
