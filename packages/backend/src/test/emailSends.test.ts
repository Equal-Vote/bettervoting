import 'dotenv/config';
import request from "supertest";
import makeApp from "../app";
import ServiceLocator from "../ServiceLocator";
import { ILoggingContext } from "../Services/Logging/ILogger";
import { MockEventQueue } from "../Services/EventQueue/MockEventQueue";
import { handlePruneEmailEvents, PruneEmailEventsQueue } from "../Services/Email/pruneEmailEvents";
import { emailStatusForEvent, laterEmailStatus, EmailSend, EmailStatus, EmailStatusRecord } from "@equal-vote/star-vote-shared/domain_model/EmailSend";
import { EmailEvent } from "@equal-vote/star-vote-shared/domain_model/EmailEvent";
import { TestHelper } from "./TestHelper";
import testInputs from "./testInputs";

// ServiceLocator is jest.mock()'d (see setupTests.ts). These describe the in-memory
// state the mocks expose, so tests can inspect and adjust it.
type MockStatusStore = { _rows: EmailStatusRecord[], advanceByMessageId(message_id: string, status: EmailStatus, ctx: ILoggingContext): Promise<boolean> };
type MockSendStore = { _sends: EmailSend[] };
type MockEventStore = { _events: EmailEvent[], insert(event: Omit<EmailEvent, 'id'>, ctx: ILoggingContext): Promise<void> };
type MockMailer = { failNextSend: boolean };

const app = makeApp();
const th = new TestHelper();
const ctx = {} as ILoggingContext;
const statusDb = ServiceLocator.emailStatusDb() as unknown as MockStatusStore;
const sendsDb = ServiceLocator.emailSendsDb() as unknown as MockSendStore;
const eventsDb = ServiceLocator.emailEventsDb() as unknown as MockEventStore;
const emailService = ServiceLocator.emailService() as unknown as MockMailer;

afterEach(() => {
    jest.clearAllMocks();
    th.afterEach();
});

describe("Email status rule", () => {
    test("statuses only move forward: queued, sending, done, failed", () => {
        const order: EmailStatus[] = ['queued', 'sending', 'done', 'failed'];
        order.forEach((current, i) => order.forEach((incoming, j) => {
            expect(laterEmailStatus(current, incoming)).toBe(order[Math.max(i, j)]);
        }));
    });

    test("SendGrid events map to statuses", () => {
        expect(emailStatusForEvent('bounce')).toBe('failed');
        expect(emailStatusForEvent('dropped')).toBe('failed');
        expect(emailStatusForEvent('delivered')).toBe('done');
        expect(emailStatusForEvent('processed')).toBe('sending');
        expect(emailStatusForEvent('deferred')).toBe('sending');
        expect(emailStatusForEvent('sent')).toBe('sending');
        expect(emailStatusForEvent('open')).toBeNull();
        expect(emailStatusForEvent('spamreport')).toBeNull();
    });

    test("a bounce after a delivery fails the email; a delivery after a bounce doesn't undo it", () => {
        expect(laterEmailStatus(laterEmailStatus('sending', 'done'), 'failed')).toBe('failed');
        expect(laterEmailStatus(laterEmailStatus('sending', 'failed'), 'done')).toBe('failed');
    });
});

describe("Email sends and per-email status", () => {
    let electionId = "";
    const get = (url: string) => request(app).get(url)
        .set("Cookie", ["id_token=" + testInputs.user1token]).set("Accept", "application/json");
    const post = (url: string, body: object) => request(app).post(url)
        .set("Cookie", ["id_token=" + testInputs.user1token]).set("Accept", "application/json").send(body);
    const sendsFor = async () => (await get(`/API/Election/${electionId}/emailSends`)).body.sends;
    const emailsFor = async (email: string) =>
        (await post(`/API/Election/${electionId}/rolls/lookup`, { email })).body.electionRollEntry.emails;

    test("Create election and add two voters", async () => {
        const created = await th.createElection(testInputs.EmailRollElection, testInputs.user1token);
        expect(created.statusCode).toBe(200);
        electionId = created.election.election_id;
        const rolled = await th.submitElectionRoll(electionId, testInputs.EmailRoll, testInputs.user1token);
        expect(rolled.statusCode).toBe(200);
        th.testComplete();
    });

    test("A blast records one send and a queued row per voter", async () => {
        const q: MockEventQueue = await th.eventQueue;
        q.pause();
        const r = await post(`/API/Election/${electionId}/sendEmails`, { target: "all", email: { subject: "Reminder", body: "Please vote" } });
        expect(r.statusCode).toBe(200);

        const sends = await sendsFor();
        expect(sends).toHaveLength(1);
        expect(sends[0]).toMatchObject({ kind: "blast", audience: "all", subject: "Reminder", body: "Please vote", recipient_count: 2 });
        expect(sends[0].counts).toEqual({ queued: 2, sending: 0, done: 0, failed: 0 });
        th.testComplete();
    });

    test("Once SendGrid accepts them, the emails are sending and have message ids", async () => {
        const q: MockEventQueue = await th.eventQueue;
        q.resume();
        await q.waitUntilJobsFinished();
        await new Promise(r => setTimeout(r, 100)); // the last job finishes just after the queue empties

        const sends = await sendsFor();
        expect(sends[0].counts).toEqual({ queued: 0, sending: 2, done: 0, failed: 0 });
        statusDb._rows.forEach(row => expect(row.message_id).toMatch(/^mock-message-/));
        th.testComplete();
    });

    test("Webhook outcomes show up in the send's counts and on each voter", async () => {
        const [first, second] = statusDb._rows;
        await statusDb.advanceByMessageId(first.message_id!, 'done', ctx);
        await statusDb.advanceByMessageId(second.message_id!, 'failed', ctx);

        const sends = await sendsFor();
        expect(sends[0].counts).toEqual({ queued: 0, sending: 0, done: 1, failed: 1 });

        const emails = await emailsFor("Alice@email.com");
        expect(emails).toHaveLength(1);
        expect(emails[0]).toMatchObject({ kind: "blast", subject: "Reminder" });
        expect(['done', 'failed']).toContain(emails[0].status);
        th.testComplete();
    });

    test("An email SendGrid rejects is marked failed", async () => {
        const q: MockEventQueue = await th.eventQueue;
        emailService.failNextSend = true;
        const r = await post(`/API/Election/${electionId}/sendEmails`, {
            target: "single", recipient_email: "Bob@email.com", email: { subject: "Just you", body: "Hi Bob" },
        });
        expect(r.statusCode).toBe(200);
        await q.waitUntilJobsFinished();
        await new Promise(r => setTimeout(r, 100));

        const sends = await sendsFor();
        expect(sends[0]).toMatchObject({ kind: "single", audience: "single", recipient_count: 1 });
        expect(sends[0].counts).toEqual({ queued: 0, sending: 0, done: 0, failed: 1 });

        const emails = await emailsFor("Bob@email.com");
        expect(emails.map((e: { kind: string }) => e.kind)).toEqual(["single", "blast"]); // newest first
        expect(emails[0].status).toBe("failed");
        th.testComplete();
    });

    test("Emails to the admin's test addresses aren't tracked", async () => {
        const q: MockEventQueue = await th.eventQueue;
        const before = sendsDb._sends.length;
        const r = await post(`/API/Election/${electionId}/sendEmails`, {
            target: "test", testEmails: ["admin@example.com"], email: { subject: "Draft", body: "Draft" },
        });
        expect(r.statusCode).toBe(200);
        await q.waitUntilJobsFinished();
        expect(sendsDb._sends.length).toBe(before);
        th.testComplete();
    });

    test("Invitations are a send too", async () => {
        const q: MockEventQueue = await th.eventQueue;
        const r = await post(`/API/Election/${electionId}/sendInvites`, {});
        expect(r.statusCode).toBe(200);
        await q.waitUntilJobsFinished();
        await new Promise(r => setTimeout(r, 100));

        const sends = await sendsFor();
        expect(sends[0]).toMatchObject({ kind: "invite", audience: "uninvited", subject: null, body: null, recipient_count: 2 });
        expect(sends[0].counts).toEqual({ queued: 0, sending: 2, done: 0, failed: 0 });
        th.testComplete();
    });

    test("Someone who can't view the voter list can't see the sends", async () => {
        const r = await request(app).get(`/API/Election/${electionId}/emailSends`)
            .set("Cookie", ["id_token=" + testInputs.user2token]).set("Accept", "application/json");
        expect(r.statusCode).toBe(401);
        th.testComplete();
    });
});

describe("Email event retention", () => {
    test("The cleanup is scheduled daily", async () => {
        const q: MockEventQueue = await th.eventQueue;
        expect(q.schedules.get(PruneEmailEventsQueue)).toBe('17 4 * * *');
    });

    test("Events older than 30 days are deleted; newer ones stay", async () => {
        eventsDb._events = [];
        const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString();
        await eventsDb.insert({ message_id: "old", election_id: "e", voter_id: "v", event_type: "delivered", event_timestamp: daysAgo(31) }, ctx);
        await eventsDb.insert({ message_id: "new", election_id: "e", voter_id: "v", event_type: "delivered", event_timestamp: daysAgo(29) }, ctx);
        await handlePruneEmailEvents();
        expect(eventsDb._events.map(e => e.message_id)).toEqual(["new"]);
    });
});
