require("dotenv").config();
import crypto from 'crypto';
const request = require("supertest");
import makeApp from "../app";
import ServiceLocator from "../ServiceLocator";
import EmailEventsDB from "../Models/__mocks__/EmailEvents";

// The real controller uses a hardcoded SendGrid public key.
// For tests we generate a test key pair and mock crypto.createPublicKey
// to return our test public key when the controller loads the verification key.
const testKeyPair = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });

const originalCreatePublicKey = crypto.createPublicKey;
jest.spyOn(crypto, 'createPublicKey').mockImplementation((...args: any[]) => {
    const arg = args[0];
    if (arg && typeof arg === 'object' && arg.format === 'der' && arg.type === 'spki') {
        return testKeyPair.publicKey;
    }
    return originalCreatePublicKey.apply(crypto, args as any);
});

function signPayload(timestamp: string, body: string): string {
    const sign = crypto.createSign('SHA256');
    sign.update(timestamp + body);
    return sign.sign(testKeyPair.privateKey, 'base64');
}

function webhookPost(app: any, body: string, timestamp: string, signature: string) {
    return request(app)
        .post("/API/SendGridWebhook")
        .set("Content-Type", "application/json")
        .set("x-twilio-email-event-webhook-signature", signature)
        .set("x-twilio-email-event-webhook-timestamp", timestamp)
        .send(body);
}

const app = makeApp();
const emailEventsDb = ServiceLocator.emailEventsDb() as unknown as EmailEventsDB;

afterEach(() => {
    emailEventsDb._events = [];
    emailEventsDb._nextId = 1;
});

afterAll(() => {
    jest.restoreAllMocks();
});

describe("SendGrid Webhook", () => {

    test("rejects invalid signature with 403", async () => {
        const body = JSON.stringify([{ event: "delivered", sg_message_id: "abc123", timestamp: 1000 }]);
        const res = await webhookPost(app, body, "12345", "AAAA");
        expect(res.statusCode).toBe(403);
    });

    test("rejects stale timestamp with 403", async () => {
        const body = JSON.stringify([{ event: "delivered", sg_message_id: "abc123", timestamp: 1000 }]);
        const timestamp = "12345"; // old timestamp
        const signature = signPayload(timestamp, body);
        const res = await webhookPost(app, body, timestamp, signature);
        expect(res.statusCode).toBe(403);
    });

    test("accepts valid signature with 200", async () => {
        const body = JSON.stringify([{ event: "delivered", sg_message_id: "abc123", timestamp: 1000 }]);
        const timestamp = String(Math.floor(Date.now() / 1000));
        const signature = signPayload(timestamp, body);
        const res = await webhookPost(app, body, timestamp, signature);
        expect(res.statusCode).toBe(200);
    });

    test("inserts event when sent row exists", async () => {
        emailEventsDb._events.push({
            id: 1,
            message_id: "abc123",
            election_id: "election1",
            voter_id: "voter1",
            event_type: "sent",
            event_timestamp: new Date(999000).toISOString(),
        });
        emailEventsDb._nextId = 2;

        const events = [{
            event: "delivered",
            sg_message_id: "abc123.filter0001.12345.ABC.0",
            timestamp: 1000,
            response: "250 OK",
            email: "voter@example.com",
        }];
        const body = JSON.stringify(events);
        const timestamp = String(Math.floor(Date.now() / 1000));
        const signature = signPayload(timestamp, body);
        const res = await webhookPost(app, body, timestamp, signature);

        expect(res.statusCode).toBe(200);
        expect(emailEventsDb._events).toHaveLength(2);

        const inserted = emailEventsDb._events[1];
        expect(inserted.message_id).toBe("abc123");
        expect(inserted.election_id).toBe("election1");
        expect(inserted.voter_id).toBe("voter1");
        expect(inserted.event_type).toBe("delivered");
        expect(inserted.event_timestamp).toBe(new Date(1000 * 1000).toISOString());
        // email should NOT be in details (PII)
        expect((inserted.details as any)?.email).toBeUndefined();
        // response should be in details
        expect((inserted.details as any)?.response).toBe("250 OK");
    });

    test("skips event when no sent row exists", async () => {
        const events = [{
            event: "bounce",
            sg_message_id: "unknown_id.filter0001.12345.ABC.0",
            timestamp: 1000,
        }];
        const body = JSON.stringify(events);
        const timestamp = String(Math.floor(Date.now() / 1000));
        const signature = signPayload(timestamp, body);
        const res = await webhookPost(app, body, timestamp, signature);

        expect(res.statusCode).toBe(200);
        expect(emailEventsDb._events).toHaveLength(0);
    });

    test("handles multiple events in one webhook", async () => {
        emailEventsDb._events.push({
            id: 1,
            message_id: "msg1",
            election_id: "election1",
            voter_id: "voter1",
            event_type: "sent",
            event_timestamp: new Date(999000).toISOString(),
        });
        emailEventsDb._nextId = 2;

        const events = [
            { event: "processed", sg_message_id: "msg1.filter001.abc", timestamp: 1000 },
            { event: "delivered", sg_message_id: "msg1.filter001.abc", timestamp: 1001 },
        ];
        const body = JSON.stringify(events);
        const timestamp = String(Math.floor(Date.now() / 1000));
        const signature = signPayload(timestamp, body);
        const res = await webhookPost(app, body, timestamp, signature);

        expect(res.statusCode).toBe(200);
        expect(emailEventsDb._events).toHaveLength(3);
        expect(emailEventsDb._events[1].event_type).toBe("processed");
        expect(emailEventsDb._events[2].event_type).toBe("delivered");
    });

    test("strips .filter suffix correctly from sg_message_id", async () => {
        emailEventsDb._events.push({
            id: 1,
            message_id: "evEK_IhZSlKus235aGfxIQ",
            election_id: "elec1",
            voter_id: "v1",
            event_type: "sent",
            event_timestamp: new Date(999000).toISOString(),
        });
        emailEventsDb._nextId = 2;

        const events = [{
            event: "delivered",
            sg_message_id: "evEK_IhZSlKus235aGfxIQ.filter0001.16648.5515E0B88.0",
            timestamp: 2000,
        }];
        const body = JSON.stringify(events);
        const timestamp = String(Math.floor(Date.now() / 1000));
        const signature = signPayload(timestamp, body);
        const res = await webhookPost(app, body, timestamp, signature);

        expect(res.statusCode).toBe(200);
        expect(emailEventsDb._events).toHaveLength(2);
        expect(emailEventsDb._events[1].message_id).toBe("evEK_IhZSlKus235aGfxIQ");
    });

    test("strips .recvd- suffix (including canary variant) from sg_message_id", async () => {
        emailEventsDb._events.push({
            id: 1,
            message_id: "Cgn9VOciTmKWBU8Ec3mfqw",
            election_id: "elec1",
            voter_id: "v1",
            event_type: "sent",
            event_timestamp: new Date(999000).toISOString(),
        }, {
            id: 2,
            message_id: "GLtITr5eRUOanFH17dmGwQ",
            election_id: "elec1",
            voter_id: "v2",
            event_type: "sent",
            event_timestamp: new Date(999000).toISOString(),
        });
        emailEventsDb._nextId = 3;

        const events = [
            {
                event: "delivered",
                sg_message_id: "Cgn9VOciTmKWBU8Ec3mfqw.recvd-5756697cd6-qp4jz-1-69E90327-D.0",
                timestamp: 2000,
            },
            {
                event: "delivered",
                sg_message_id: "GLtITr5eRUOanFH17dmGwQ.recvd-canary-648b498b67-n4zsd-1-69E90341-E.0",
                timestamp: 2001,
            },
        ];
        const body = JSON.stringify(events);
        const timestamp = String(Math.floor(Date.now() / 1000));
        const signature = signPayload(timestamp, body);
        const res = await webhookPost(app, body, timestamp, signature);

        expect(res.statusCode).toBe(200);
        expect(emailEventsDb._events).toHaveLength(4);
        expect(emailEventsDb._events[2].message_id).toBe("Cgn9VOciTmKWBU8Ec3mfqw");
        expect(emailEventsDb._events[3].message_id).toBe("GLtITr5eRUOanFH17dmGwQ");
    });
});
