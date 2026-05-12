require("dotenv").config();
const request = require("supertest");
import makeApp from "../app";
import { MockEventQueue } from "../Services/EventQueue/MockEventQueue";
import { TestHelper } from "./TestHelper";
import testInputs from "./testInputs";

const app = makeApp();
const th = new TestHelper();

afterEach(() => {
    jest.clearAllMocks();
    th.afterEach();
});

// Exercises the canonical "bv-managed email list" election type:
// closed + voter_authentication.voter_id + invitation:'email'.
// Adding a roll auto-generates a voter_id per email; voters then authenticate
// via the voter_id cookie that the (production) invite-link click would set.
describe("Email List Voter Auth", () => {
    beforeAll(() => {
        jest.clearAllMocks();
    });
    var electionId = "";
    var aliceVoterId = "";

    test("Create election, responds 200", async () => {
        const response = await th.createElection(
            testInputs.EmailRollElection,
            testInputs.user1token
        );
        expect(response.statusCode).toBe(200);
        electionId = response.election.election_id;
        th.testComplete();
    });

    test("Add voter roll (server auto-generates voter_ids)", async () => {
        const response = await th.submitElectionRoll(
            electionId,
            testInputs.EmailRoll,
            testInputs.user1token
        );
        expect(response.statusCode).toBe(200);
        th.testComplete();
    });

    test("Admin reveals Alice's voter_id via break-glass endpoint", async () => {
        const response = await request(app)
            .post(`/API/Election/${electionId}/rolls/revealVoterId`)
            .set("Cookie", ["id_token=" + testInputs.user1token])
            .set("Accept", "application/json")
            .send({ email: "Alice@email.com" });
        expect(response.statusCode).toBe(200);
        expect(response.body.voter_id).toBeTruthy();
        aliceVoterId = response.body.voter_id;
        th.testComplete();
    });

    test("Voter with valid voter_id cookie is authorized and hasn't voted", async () => {
        const response = await th.requestBallotWithId(electionId, null, aliceVoterId);
        expect(response.statusCode).toBe(200);
        expect(response.voterAuth.authorized_voter).toBe(true);
        expect(response.voterAuth.has_voted).toBe(false);
        th.testComplete();
    });

    test("Voter without voter_id cookie is not authorized", async () => {
        const response = await th.requestBallot(electionId, testInputs.user1token);
        expect(response.statusCode).toBe(200);
        expect(response.voterAuth.authorized_voter).toBe(false);
        th.testComplete();
    });

    test("Voter with bogus voter_id cookie is not authorized", async () => {
        const response = await th.requestBallotWithId(electionId, null, "v-not-a-real-id");
        expect(response.voterAuth.authorized_voter).toBe(false);
        th.testComplete();
    });

    test("Authorized voter submits ballot", async () => {
        const response = await th.submitBallotWithId(
            electionId,
            testInputs.Ballot1,
            null,
            aliceVoterId
        );
        expect(response.statusCode).toBe(200);
        const eventQueue: MockEventQueue = await th.eventQueue;
        await eventQueue.waitUntilJobsFinished();
        th.testComplete();
    });

    test("After submission, voter sees has_voted=true", async () => {
        const response = await th.requestBallotWithId(electionId, null, aliceVoterId);
        expect(response.statusCode).toBe(200);
        expect(response.voterAuth.authorized_voter).toBe(true);
        expect(response.voterAuth.has_voted).toBe(true);
        th.testComplete();
    });

    test("Voter can't submit a second ballot", async () => {
        const response = await th.submitBallotWithId(
            electionId,
            testInputs.Ballot1,
            null,
            aliceVoterId
        );
        expect(response.statusCode).toBe(400);
        th.testComplete();
    });
});
