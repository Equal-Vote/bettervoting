import 'dotenv/config';
import request from "supertest";
import jwt from "jsonwebtoken";
import crypto, { createHash } from "crypto";
import { Election } from '@equal-vote/star-vote-shared/domain_model/Election';
import { ElectionSettings } from '@equal-vote/star-vote-shared/domain_model/ElectionSettings';
import { MockEventQueue } from "../Services/EventQueue/MockEventQueue";
import ServiceLocator from "../ServiceLocator";
import { TestHelper } from "./TestHelper";
import testInputs from "./testInputs";

// What a caller may do depending on whether they are anonymous, a temp id, a signed-in
// account whose email is unverified, or a signed-in account whose email is verified.

const th = new TestHelper();
const app = th.expressApp;
// ServiceLocator is jest.mock()'d (see setupTests.ts), so these are the mock services.
// (Typed structurally: importing the mock classes from __mocks__ is a lint error.)
const emailService = ServiceLocator.emailService() as unknown as { sentEmails: { to: string }[], clear: () => void };
const blobService = ServiceLocator.blobService() as unknown as { uploaded: unknown[], clear: () => void };
const accountService = ServiceLocator.accountService() as unknown as { verify: boolean };

const verified = testInputs.user1token;          // Alice1234, Alice@email.com, verified
const otherVerified = testInputs.user2token;     // Bob2345, Bob@email.com, verified
const unverified = testInputs.unverifiedUserToken; // Mallory9999 claiming Alice@email.com, unverified
// Same account id as Alice (so it holds the owner role) but the email is not verified.
const unverifiedOwner = jwt.sign({ sub: 'Alice1234', email: 'Alice@email.com', email_verified: false }, "privateKey");
// A token that carries no email_verified claim at all must be treated as unverified.
const ownerWithoutClaim = jwt.sign({ sub: 'Alice1234', email: 'Alice@email.com' }, "privateKey");

type Cookies = Record<string, string>;
const cookieHeader = (cookies: Cookies) => [Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ')];
const post = (url: string, cookies: Cookies, body: object = {}) => {
    const r = request(app).post(url).set("Accept", "application/json");
    return (Object.keys(cookies).length > 0 ? r.set("Cookie", cookieHeader(cookies)) : r).send(body);
};
const get = (url: string, cookies: Cookies) => {
    const r = request(app).get(url).set("Accept", "application/json");
    return Object.keys(cookies).length > 0 ? r.set("Cookie", cookieHeader(cookies)) : r;
};
const drainQueue = async () => {
    const q: MockEventQueue = await th.eventQueue;
    await q.waitUntilJobsFinished();
};
const recipients = () => emailService.sentEmails.map(m => m.to);

afterEach(() => {
    jest.clearAllMocks();
    emailService.clear();
    blobService.clear();
    th.afterEach();
});

describe("Image upload requires a verified account", () => {
    const upload = (cookies: Cookies, mimetype = 'image/jpeg') => {
        const r = request(app).post('/API/images');
        return (Object.keys(cookies).length > 0 ? r.set("Cookie", cookieHeader(cookies)) : r)
            .attach('file', Buffer.from('not really a jpeg'), { filename: 'image.jpg', contentType: mimetype });
    };

    test("anonymous caller is refused and nothing is stored", async () => {
        const res = await upload({});
        expect(res.statusCode).toBe(401);
        expect(res.body.error).toMatch(/Sign in with a verified email address to upload images/);
        expect(blobService.uploaded.length).toBe(0);
        th.testComplete();
    });

    test("temp id caller is refused", async () => {
        const res = await upload({ temp_id: 'v-temp123' });
        expect(res.statusCode).toBe(401);
        expect(blobService.uploaded.length).toBe(0);
        th.testComplete();
    });

    test("signed-in caller with an unverified email is told to verify it", async () => {
        const res = await upload({ id_token: unverified });
        expect(res.statusCode).toBe(403);
        expect(res.body.error).toMatch(/Verify your email address to upload images/);
        expect(blobService.uploaded.length).toBe(0);
        th.testComplete();
    });

    test("token with no email_verified claim counts as unverified", async () => {
        const res = await upload({ id_token: ownerWithoutClaim });
        expect(res.statusCode).toBe(403);
        expect(blobService.uploaded.length).toBe(0);
        th.testComplete();
    });

    test("signed-in caller with a verified email can upload", async () => {
        const res = await upload({ id_token: verified });
        expect(res.statusCode).toBe(200);
        expect(res.body.photo_filename).toBeTruthy();
        expect(blobService.uploaded.length).toBe(1);
        th.testComplete();
    });

    test("verified caller cannot upload an SVG", async () => {
        const res = await upload({ id_token: verified }, 'image/svg+xml');
        expect(res.statusCode).not.toBe(200);
        expect(blobService.uploaded.length).toBe(0);
        th.testComplete();
    });
});

describe("Voting in the one-vote-per-account-email mode (#1357)", () => {
    let electionId = "";

    test("create open + email election", async () => {
        const res = await th.createElection(testInputs.OpenEmailElection, verified);
        expect(res.statusCode).toBe(200);
        electionId = res.election.election_id;
        th.testComplete();
    });

    test("anonymous caller is asked to sign in", async () => {
        const res = await th.requestBallot(electionId, null);
        expect(res.voterAuth.authorized_voter).toBe(false);
        expect(res.voterAuth.required).toBe('Email Validation Required');
        th.testComplete();
    });

    test("temp id caller is asked to sign in", async () => {
        const res = await post(`/API/Election/${electionId}/ballot`, { temp_id: 'v-temp123' });
        expect(res.body.voterAuth.authorized_voter).toBe(false);
        expect(res.body.voterAuth.required).toBe('Email Validation Required');
        th.testComplete();
    });

    test("unverified account is asked to verify, and cannot vote as the address it claims", async () => {
        const ballot = await th.requestBallot(electionId, unverified);
        expect(ballot.voterAuth.authorized_voter).toBe(false);
        expect(ballot.voterAuth.required).toBe('Email Verification Required');

        const vote = await th.submitBallot(electionId, testInputs.Ballot1, unverified);
        expect(vote.statusCode).toBe(401);
        expect(vote.body.error).toMatch(/Email Verification Required/);
        th.testComplete();
    });

    test("the real owner of that address is unaffected and can still vote", async () => {
        const before = await th.requestBallot(electionId, verified);
        expect(before.voterAuth.authorized_voter).toBe(true);
        expect(before.voterAuth.has_voted).toBe(false);

        const vote = await th.submitBallot(electionId, testInputs.Ballot1, verified);
        expect(vote.statusCode).toBe(200);
        await drainQueue();

        const after = await th.requestBallot(electionId, verified);
        expect(after.voterAuth.has_voted).toBe(true);
        th.testComplete();
    });

    test("roles granted by email do not go to an unverified claim on that email", async () => {
        // OpenEmailElection lists Alice@email.com as a credentialer.
        const asUnverified = await th.fetchElectionById(electionId, unverified);
        expect(asUnverified.voterAuth.roles).toEqual([]);
        const asVerified = await th.fetchElectionById(electionId, verified);
        expect(asVerified.voterAuth.roles).toContain('credentialer');
        th.testComplete();
    });
});

describe("Sending election emails requires a verified account", () => {
    const testBlast = { target: "test", testEmails: ['victim@example.com'], email: { subject: "hi", body: "vote please" } };
    const send = (id: string, cookies: Cookies) => post(`/API/Election/${id}/sendEmails`, cookies, testBlast);
    let electionId = "";

    test("create closed election with a roll", async () => {
        const created = await th.createElection(testInputs.EmailRollElection, verified);
        expect(created.statusCode).toBe(200);
        electionId = created.election.election_id;
        const rolled = await th.submitElectionRoll(electionId, testInputs.EmailRoll, verified);
        expect(rolled.statusCode).toBe(200);
        th.testComplete();
    });

    test("anonymous caller is refused", async () => {
        const res = await send(electionId, {});
        expect(res.statusCode).toBe(401);
        await drainQueue();
        expect(recipients()).toEqual([]);
        th.testComplete();
    });

    test("another verified account without a role is refused", async () => {
        const res = await send(electionId, { id_token: otherVerified });
        expect(res.statusCode).toBe(401);
        th.testComplete();
    });

    test("owner whose email is unverified is told to verify it", async () => {
        const res = await send(electionId, { id_token: unverifiedOwner });
        expect(res.statusCode).toBe(403);
        expect(res.body.error).toMatch(/Verify your email address to send emails/);
        await drainQueue();
        expect(recipients()).toEqual([]);
        th.testComplete();
    });

    test("owner whose token has no email_verified claim is refused", async () => {
        const res = await send(electionId, { id_token: ownerWithoutClaim });
        expect(res.statusCode).toBe(403);
        th.testComplete();
    });

    test("owner with a verified email can send", async () => {
        const res = await send(electionId, { id_token: verified });
        expect(res.statusCode).toBe(200);
        await drainQueue();
        expect(recipients()).toEqual(['victim@example.com']);
        th.testComplete();
    });

    test("temp owner holds the owner role but cannot send until the election is claimed", async () => {
        const tempId = 'v-temp123';
        const claimKey = 'claim-key-for-test';
        const election: Election = {
            ...testInputs.EmailRollElection,
            owner_id: tempId,
            credential_ids: [],
            claim_key_hash: createHash('sha256').update(claimKey).digest('hex'),
        };
        const created = await post('/API/Elections', { temp_id: tempId }, { Election: election });
        expect(created.statusCode).toBe(200);
        const id = created.body.election.election_id;
        const cookies = { temp_id: tempId, [`${id}_claim_key`]: claimKey };

        const fetched = await get(`/API/Election/${id}`, cookies);
        expect(fetched.body.voterAuth.roles).toContain('owner');

        const res = await send(id, cookies);
        expect(res.statusCode).toBe(401);
        expect(res.body.error).toMatch(/Sign in with a verified email address to send emails/);
        await drainQueue();
        expect(recipients()).toEqual([]);
        th.testComplete();
    });

    test("an identity signed by the election's own auth_key cannot send, whatever it claims", async () => {
        const keys = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        });
        const customToken = jwt.sign(
            { sub: 'Alice1234', email: 'Alice@email.com', email_verified: true },
            keys.privateKey, { algorithm: 'RS256' }
        );
        accountService.verify = true;
        try {
            const created = await post('/API/Elections', { custom_id_token: customToken },
                { Election: { ...testInputs.EmailRollElection, auth_key: keys.publicKey } });
            expect(created.statusCode).toBe(200);
            const id = created.body.election.election_id;

            const fetched = await get(`/API/Election/${id}`, { custom_id_token: customToken });
            expect(fetched.body.voterAuth.roles).toContain('owner');

            const res = await send(id, { custom_id_token: customToken });
            expect(res.statusCode).toBe(401);
            await drainQueue();
            expect(recipients()).toEqual([]);
        } finally {
            accountService.verify = false;
        }
        th.testComplete();
    });
});

describe("Receipt emails only go to addresses the server can vouch for", () => {
    const openElection: Election = {
        ...testInputs.OpenEmailElection,
        credential_ids: [],
        settings: { voter_access: 'open', voter_authentication: {} } as ElectionSettings,
    };
    const vote = (id: string, cookies: Cookies) =>
        post(`/API/Election/${id}/vote`, cookies, { ballot: testInputs.Ballot1, receiptEmail: 'victim@example.com' });
    let electionId = "";

    test("create open election with no voter authentication", async () => {
        const res = await th.createElection(openElection, verified);
        expect(res.statusCode).toBe(200);
        electionId = res.election.election_id;
        th.testComplete();
    });

    test("anonymous voter cannot have a receipt sent to an address they type in", async () => {
        const res = await vote(electionId, {});
        expect(res.statusCode).toBe(200);
        await drainQueue();
        expect(recipients()).toEqual([]);
        th.testComplete();
    });

    test("unverified account gets no receipt, at its own address or a typed one", async () => {
        const res = await vote(electionId, { id_token: unverified });
        expect(res.statusCode).toBe(200);
        await drainQueue();
        expect(recipients()).toEqual([]);
        th.testComplete();
    });

    test("verified account gets the receipt at its own address, not the typed one", async () => {
        const res = await vote(electionId, { id_token: otherVerified });
        expect(res.statusCode).toBe(200);
        await drainQueue();
        expect(recipients()).toEqual(['Bob@email.com']);
        th.testComplete();
    });

    test("closed election: receipt goes to the address on the voter's roll entry", async () => {
        const created = await th.createElection(testInputs.EmailRollElection, verified);
        const id = created.election.election_id;
        await th.submitElectionRoll(id, testInputs.EmailRoll, verified);
        const revealed = await post(`/API/Election/${id}/rolls/revealVoterId`, { id_token: verified }, { email: "Bob@email.com" });
        expect(revealed.statusCode).toBe(200);

        const res = await vote(id, { voter_id: btoa(revealed.body.voter_id) });
        expect(res.statusCode).toBe(200);
        await drainQueue();
        expect(recipients()).toEqual(['Bob@email.com']);
        th.testComplete();
    });
});
