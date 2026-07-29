require("dotenv").config();
import { TestHelper } from "./TestHelper";
import testInputs from "./testInputs";

const th = new TestHelper();

afterEach(() => {
    jest.clearAllMocks();
    th.afterEach();
});

describe("Clear Election Roll", () => {
    beforeAll(() => {
        jest.clearAllMocks();
    });
    var electionId = "";
    test("Create draft election, responds 200", async () => {
        const response = await th.createElection(
            { ...testInputs.EmailRollElection, state: 'draft' },
            testInputs.user1token
        );

        expect(response.statusCode).toBe(200);
        electionId = response.election.election_id;
        th.testComplete();
    });
    test("Add Voter Roll", async () => {
        const response = await th.submitElectionRoll(
            electionId,
            testInputs.EmailRoll,
            testInputs.user1token
        );
        expect(response.statusCode).toBe(200);
        th.testComplete();
    });
    test("Roll has both voters", async () => {
        const response = await th.fetchElectionRoll(electionId, testInputs.user1token);
        expect(response.statusCode).toBe(200);
        expect(response.body.electionRoll).toHaveLength(2);
        th.testComplete();
    });
    test("Non-owner can't clear the roll", async () => {
        const response = await th.clearElectionRoll(electionId, testInputs.user2token);
        expect(response.statusCode).toBe(401);
        th.testComplete();
    });
    test("Owner clears the roll", async () => {
        const response = await th.clearElectionRoll(electionId, testInputs.user1token);
        expect(response.statusCode).toBe(200);
        expect(response.body.cleared).toBe(2);
        th.testComplete();
    });
    test("Roll is empty afterwards", async () => {
        const response = await th.fetchElectionRoll(electionId, testInputs.user1token);
        expect(response.statusCode).toBe(200);
        expect(response.body.electionRoll).toHaveLength(0);
        th.testComplete();
    });
    test("Clearing an already empty roll is a no-op", async () => {
        const response = await th.clearElectionRoll(electionId, testInputs.user1token);
        expect(response.statusCode).toBe(200);
        expect(response.body.cleared).toBe(0);
        th.testComplete();
    });
    test("The same voters can be re-added after clearing", async () => {
        const response = await th.submitElectionRoll(
            electionId,
            testInputs.EmailRoll,
            testInputs.user1token
        );
        expect(response.statusCode).toBe(200);

        const rolls = await th.fetchElectionRoll(electionId, testInputs.user1token);
        expect(rolls.body.electionRoll).toHaveLength(2);
        th.testComplete();
    });
    test("Roll can't be cleared once the election is finalized", async () => {
        const finalized = await th.finalizeElection(electionId, testInputs.user1token);
        expect(finalized.statusCode).toBe(200);

        const response = await th.clearElectionRoll(electionId, testInputs.user1token);
        expect(response.statusCode).toBe(400);

        const rolls = await th.fetchElectionRoll(electionId, testInputs.user1token);
        expect(rolls.body.electionRoll).toHaveLength(2);
        th.testComplete();
    });
});
