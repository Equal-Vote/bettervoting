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

// Public "email me my voter id" flow for bv-managed-id elections. The contract under
// test: the response never reveals whether an address is on the roll, the email that
// goes out carries the voter id and no links, and elections that don't use bv-managed
// ids don't have the endpoint at all.
describe("Request voter ID by email", () => {
    var electionId = "";
    var idRollElectionId = "";
    const sentCount = () => th.emailService.sentEmails.length;
    const ask = (id: string, body: object) => request(app)
        .post(`/API/Election/${id}/requestVoterId`)
        .set("Accept", "application/json")
        .send(body);
    const drain = async () => { await (th.eventQueue as Promise<MockEventQueue>).then(q => q.waitUntilJobsFinished()); };

    test("Create a bv-managed-id election with a roll", async () => {
        const created = await th.createElection(testInputs.EmailRollElection, testInputs.user1token);
        expect(created.statusCode).toBe(200);
        electionId = created.election.election_id;
        const rolled = await th.submitElectionRoll(electionId, testInputs.EmailRoll, testInputs.user1token);
        expect(rolled.statusCode).toBe(200);
        th.emailService.clear();
        th.testComplete();
    });

    test("Address on the roll: 200, one link-free email with the voter id", async () => {
        const before = sentCount();
        const r = await ask(electionId, { email: "alice@email.com" });
        expect(r.statusCode).toBe(200);
        expect(r.body).toEqual({});
        await drain();
        expect(sentCount()).toBe(before + 1);
        const sent = th.emailService.sentEmails[sentCount() - 1];
        expect(sent.to).toBe("Alice@email.com");
        expect(sent.asm).toBeUndefined();
        expect(sent.text).toMatch(/v-[bcdfghjkmpqrtvwxy2346789]{8}/);
        expect(sent.html).toMatch(/v-[bcdfghjkmpqrtvwxy2346789]{8}/);
        expect(sent.html).not.toMatch(/<a\s/i);
        expect(sent.html).not.toContain("asm_group_unsubscribe_url");
        // The id in the mail is the one the roll actually holds (the roll list redacts
        // ids on bv-managed elections, so compare against the break-glass reveal)
        const reveal = await request(app)
            .post(`/API/Election/${electionId}/rolls/revealVoterId`)
            .set("Cookie", ["id_token=" + testInputs.user1token])
            .set("Accept", "application/json")
            .send({ email: "Alice@email.com" });
        expect(reveal.statusCode).toBe(200);
        expect(sent.text).toContain(reveal.body.voter_id);
        expect(sent.html).toContain(reveal.body.voter_id);
        th.testComplete();
    });

    test("Same address again inside the window: identical 200, nothing more sent", async () => {
        const before = sentCount();
        const r = await ask(electionId, { email: "ALICE@email.com" });
        expect(r.statusCode).toBe(200);
        expect(r.body).toEqual({});
        await drain();
        expect(sentCount()).toBe(before);
        th.testComplete();
    });

    test("Address not on the roll: identical 200, nothing sent", async () => {
        const before = sentCount();
        const r = await ask(electionId, { email: "nobody@example.com" });
        expect(r.statusCode).toBe(200);
        expect(r.body).toEqual({});
        await drain();
        expect(sentCount()).toBe(before);
        th.testComplete();
    });

    test("Malformed address: 400 (shape only, says nothing about the roll)", async () => {
        const r = await ask(electionId, { email: "not an email" });
        expect(r.statusCode).toBe(400);
        const r2 = await ask(electionId, {});
        expect(r2.statusCode).toBe(400);
        th.testComplete();
    });

    test("Election without bv-managed ids: 404, even for an address on its roll", async () => {
        const created = await th.createElection(testInputs.IDRollElection, testInputs.user1token);
        expect(created.statusCode).toBe(200);
        idRollElectionId = created.election.election_id;
        const before = sentCount();
        const r = await ask(idRollElectionId, { email: "alice@email.com" });
        expect(r.statusCode).toBe(404);
        await drain();
        expect(sentCount()).toBe(before);
        th.testComplete();
    });
});
