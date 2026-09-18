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

// The in-flight guard: a new blast to an election is refused while a previous one
// still has un-started jobs. The mock queue's pause() holds jobs in the pending
// state, which is exactly what a paced send looks like from the guard's side.
describe("Send in-flight guard", () => {
    var electionId = "";
    const campaign = { target: "all", email: { subject: "hi", body: "vote please" } };
    const send = () => request(app)
        .post(`/API/Election/${electionId}/sendEmails`)
        .set("Cookie", ["id_token=" + testInputs.user1token])
        .set("Accept", "application/json")
        .send(campaign);

    test("Create election and add a roll", async () => {
        const created = await th.createElection(testInputs.EmailRollElection, testInputs.user1token);
        expect(created.statusCode).toBe(200);
        electionId = created.election.election_id;
        const rolled = await th.submitElectionRoll(electionId, testInputs.EmailRoll, testInputs.user1token);
        expect(rolled.statusCode).toBe(200);
        th.testComplete();
    });

    test("First blast is accepted", async () => {
        const q: MockEventQueue = await th.eventQueue;
        q.pause();
        const r = await send();
        expect(r.statusCode).toBe(200);
        // the response is a plan, not a confirmation: nothing has been sent yet
        expect(r.body.queued).toBe(testInputs.EmailRoll.length);
        expect(r.body.ratePerMinute).toBeGreaterThan(0);
        expect(r.body.etaMinutes).toBeGreaterThanOrEqual(0);
        th.testComplete();
    });

    test("Second blast is refused while the first has not started", async () => {
        const r = await send();
        expect(r.statusCode).toBe(400);
        expect(r.body.error).toMatch(/still in progress/);
        expect(r.body.error).toMatch(/emails remaining/);
        th.testComplete();
    });

    test("A pending campaign also blocks invites (cross-queue)", async () => {
        const r = await request(app)
            .post(`/API/Election/${electionId}/sendInvites`)
            .set("Cookie", ["id_token=" + testInputs.user1token])
            .set("Accept", "application/json")
            .send({});
        expect(r.statusCode).toBe(400);
        expect(r.body.error).toMatch(/still in progress/);
        th.testComplete();
    });

    test("Once the queue drains, a new blast is accepted", async () => {
        const q: MockEventQueue = await th.eventQueue;
        q.resume();
        await q.waitUntilJobsFinished();
        const r = await send();
        expect(r.statusCode).toBe(200);
        th.testComplete();
    });
});
