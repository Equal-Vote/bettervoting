require("dotenv").config();
const request = require("supertest");
import { MockEventQueue } from "../Services/EventQueue/MockEventQueue";
import { TestHelper } from "./TestHelper";
import testInputs from "./testInputs";

const th = new TestHelper();

afterEach(() => {
    jest.clearAllMocks();
    th.afterEach();
});

describe("Email Roll", () => {
    beforeAll(() => {
        jest.clearAllMocks();
    });
    var electionId = "";
    test("Create election, responds 200", async () => {
        const response = await th.createElection(
            testInputs.EmailRollElection,
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
    test("Get voter auth, is authorized and hasn't voted", async () => {
        const response = await th.requestBallot(
            electionId,
            testInputs.user1token
        );

        expect(response.statusCode).toBe(200);
        expect(response.voterAuth.authorized_voter).toBe(true);
        expect(response.voterAuth.has_voted).toBe(false);
        th.testComplete();
    });
    test("Authorized voter submits ballot", async () => {
        const response = await th.submitBallot(
            electionId,
            testInputs.Ballot1,
            testInputs.user1token
        );

        expect(response.statusCode).toBe(200);
        const eventQueue:MockEventQueue = await th.eventQueue;
        await eventQueue.waitUntilJobsFinished();
        th.testComplete();
    });
    test("Get voter auth, is authorized and has voted", async () => {
        const response = await th.requestBallot(
            electionId,
            testInputs.user1token
        );

        expect(response.statusCode).toBe(200);
        expect(response.voterAuth.authorized_voter).toBe(true);
        expect(response.voterAuth.has_voted).toBe(true);
        th.testComplete();
    });
    test("Authorized voter re-submits ballot", async () => {
        const response = await th.submitBallot(
            electionId,
            testInputs.Ballot1,
            testInputs.user1token
        );
        expect(response.statusCode).toBe(400);
        th.testComplete();
    });

    test("Get voter auth, isn't authorized and hasn't voted", async () => {
        const response = await th.requestBallot(
            electionId,
            testInputs.user3token
        );

        expect(response.statusCode).toBe(200);
        expect(response.voterAuth.authorized_voter).toBe(false);
        expect(response.voterAuth.has_voted).toBe(false);
        th.testComplete();
    });
    test("Unauthorized voter submits ballot", async () => {
        const response = await th.submitBallot(
            electionId,
            testInputs.Ballot1,
            testInputs.user3token
        );
        expect(response.statusCode).toBe(401);
        th.testComplete();
    });
});
