import 'dotenv/config';
import { TestHelper } from "./TestHelper";
import testInputs from "./testInputs";

const th = new TestHelper();

afterEach(() => {
    jest.clearAllMocks();
    th.afterEach();
});

const rollFor = async (electionId: string, token: string) => {
    const response = await th.fetchElectionRoll(electionId, token);
    expect(response.statusCode).toBe(200);
    return response.body.electionRoll as { voter_id?: string, email?: string, submitted: boolean, state: string, ballot_id?: string }[];
};

describe("Edit Election Roll", () => {
    let electionA = "";
    let electionB = "";

    test("Set up two elections with different owners", async () => {
        const a = await th.createElection({ ...testInputs.IDRollElection, state: 'draft' }, testInputs.user1token);
        expect(a.statusCode).toBe(200);
        electionA = a.election.election_id;
        expect((await th.submitElectionRoll(electionA, testInputs.IDRoll, testInputs.user1token)).statusCode).toBe(200);

        const b = await th.createElection({ ...testInputs.IDRollElection, state: 'draft', owner_id: 'Bob2345' }, testInputs.user2token);
        expect(b.statusCode).toBe(200);
        electionB = b.election.election_id;
        th.testComplete();
    });

    test("An entry can't be written to a different election than the URL", async () => {
        const response = await th.editElectionRoll(
            electionB,
            { election_id: electionA, voter_id: 'MalloryID', submitted: false, state: 'approved' },
            testInputs.user2token,
        );
        expect(response.statusCode).toBe(400);

        const roll = await rollFor(electionA, testInputs.user1token);
        expect(roll).toHaveLength(2);
        expect(roll.map(r => r.voter_id)).not.toContain('MalloryID');
        th.testComplete();
    });

    test("An existing entry in another election can't be changed through this one", async () => {
        const response = await th.editElectionRoll(
            electionB,
            { election_id: electionA, voter_id: 'AliceID', email: 'changed@example.org', submitted: false },
            testInputs.user2token,
        );
        expect(response.statusCode).toBe(400);

        const alice = (await rollFor(electionA, testInputs.user1token)).find(r => r.voter_id === 'AliceID')!;
        expect(alice.email).not.toBe('changed@example.org');
        th.testComplete();
    });

    test("Editing a voter that isn't on the roll doesn't create one", async () => {
        const response = await th.editElectionRoll(
            electionA,
            { voter_id: 'NewVoterID', email: 'new@example.org' },
            testInputs.user1token,
        );
        expect(response.statusCode).toBe(400);
        expect(await rollFor(electionA, testInputs.user1token)).toHaveLength(2);
        th.testComplete();
    });

    test("The owner can edit email and precinct, and nothing else changes", async () => {
        const before = (await rollFor(electionA, testInputs.user1token)).find(r => r.voter_id === 'AliceID')!;

        const response = await th.editElectionRoll(
            electionA,
            {
                voter_id: 'AliceID',
                email: 'alice@example.org',
                precinct: 'P1',
                submitted: true,
                state: 'invalid',
                ballot_id: 'b-forged',
            },
            testInputs.user1token,
        );
        expect(response.statusCode).toBe(200);
        expect(response.body.election_id).toBe(electionA);
        expect(response.body.email).toBe('alice@example.org');
        expect(response.body.precinct).toBe('P1');
        expect(response.body.submitted).toBe(before.submitted);
        expect(response.body.state).toBe(before.state);
        expect(response.body.ballot_id).toBeUndefined();
        expect(response.body.history.at(-1).action_type).toBe('edited');
        th.testComplete();
    });

    test("Someone without edit permission on the election is refused", async () => {
        const response = await th.editElectionRoll(
            electionA,
            { voter_id: 'BobID', email: 'bob@example.org' },
            testInputs.user2token,
        );
        expect(response.statusCode).toBe(401);
        th.testComplete();
    });

    test("A missing voter_id is rejected", async () => {
        const response = await th.editElectionRoll(electionA, { email: 'x@example.org' }, testInputs.user1token);
        expect(response.statusCode).toBe(400);
        th.testComplete();
    });
});
