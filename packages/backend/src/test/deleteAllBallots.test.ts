import 'dotenv/config';
import { TestHelper } from "./TestHelper";
import testInputs from "./testInputs";

const th = new TestHelper();

afterEach(() => {
    jest.clearAllMocks();
    th.afterEach();
});

describe("Delete All Ballots", () => {
    beforeAll(() => {
        jest.clearAllMocks();
    });
    let electionId = "";
    test("Create draft election, responds 200", async () => {
        const response = await th.createElection(
            { ...testInputs.EmailRollElection, state: 'draft' },
            testInputs.user1token
        );

        expect(response.statusCode).toBe(200);
        electionId = response.election.election_id;
        th.testComplete();
    });
    test("Logged-out request is rejected in draft", async () => {
        const response = await th.deleteAllBallots(electionId, null);
        expect(response.statusCode).toBe(401);
        th.testComplete();
    });
    test("Non-owner is rejected in draft", async () => {
        const response = await th.deleteAllBallots(electionId, testInputs.user2token);
        expect(response.statusCode).toBe(401);
        th.testComplete();
    });
    test("Owner can reset ballots in draft", async () => {
        const response = await th.deleteAllBallots(electionId, testInputs.user1token);
        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        th.testComplete();
    });
    test("Finalize election", async () => {
        await th.submitElectionRoll(electionId, testInputs.EmailRoll, testInputs.user1token);
        const response = await th.finalizeElection(electionId, testInputs.user1token);
        expect(response.statusCode).toBe(200);
        th.testComplete();
    });
    test("Logged-out request is rejected once finalized", async () => {
        const response = await th.deleteAllBallots(electionId, null);
        expect(response.statusCode).toBe(401);
        th.testComplete();
    });
    test("Owner gets an error response once finalized", async () => {
        const response = await th.deleteAllBallots(electionId, testInputs.user1token);
        expect(response.statusCode).toBe(400);
        th.testComplete();
    });
});
