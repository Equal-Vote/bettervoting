require("dotenv").config();
const request = require("supertest");
import makeApp from "../app";
import { MockEventQueue } from "../Services/EventQueue/MockEventQueue";
import { TestHelper } from "./TestHelper";
import testInputs from "./testInputs";

const app = makeApp();
const th = new TestHelper();

// The mock event queue processes email jobs asynchronously with a 1s delay per job.
jest.setTimeout(30000);
const waitForQueue = async () => (await th.eventQueue).waitUntilJobsFinished();

const fetchRolls = async (electionId: string) => {
    const response = await th.fetchElectionRoll(electionId, testInputs.user1token);
    expect(response.statusCode).toBe(200);
    return response.body.electionRoll;
};

// waitUntilJobsFinished can return while the final shifted job is still being handled,
// so poll briefly for the expected roll state instead of asserting immediately.
const fetchRollsUntil = async (electionId: string, predicate: (rolls: any[]) => boolean) => {
    let rolls = await fetchRolls(electionId);
    for (let i = 0; i < 10 && !predicate(rolls); i++) {
        await new Promise((r) => setTimeout(r, 500));
        rolls = await fetchRolls(electionId);
    }
    return rolls;
};

afterEach(() => {
    jest.clearAllMocks();
    th.afterEach();
});

// The roll's "Email invite status" (email_data.inviteResponse) used to be written only by
// the legacy sendInvites/sendInvite endpoints, which no current UI calls. Invitations
// actually go out through the email-blast endpoint (sendEmails), which didn't write it —
// so after an admin sent invites, every roll row still read "Invite not sent".
// These tests pin the fix: an 'invite'-template blast records the invite status on each
// targeted roll; other blasts leave it untouched.
describe("Email blast invite status", () => {
    beforeAll(() => {
        jest.clearAllMocks();
    });
    var electionId = "";

    test("Create email-list election and add roll", async () => {
        const electionResponse = await th.createElection(
            testInputs.EmailRollElection,
            testInputs.user1token
        );
        expect(electionResponse.statusCode).toBe(200);
        electionId = electionResponse.election.election_id;

        const rollResponse = await th.submitElectionRoll(
            electionId,
            testInputs.EmailRoll,
            testInputs.user1token
        );
        expect(rollResponse.statusCode).toBe(200);
        th.testComplete();
    });

    test("A non-invite blast does not mark voters as invited", async () => {
        const response = await request(app)
            .post(`/API/Election/${electionId}/sendEmails`)
            .set("Cookie", ["id_token=" + testInputs.user1token])
            .set("Accept", "application/json")
            .send({
                target: "all",
                email: { subject: "An update", body: "Just an update, not an invitation" },
                template: "blank",
            });
        expect(response.statusCode).toBe(200);
        await waitForQueue();

        // The blast is recorded in history (via the queue), but must NOT flip the
        // "Email invite status" — that would report an invite that wasn't sent.
        const rolls = await fetchRollsUntil(electionId, (rolls) =>
            rolls.every((roll: any) => (roll.history?.length ?? 0) > 0)
        );
        expect(rolls.length).toBe(testInputs.EmailRoll.length);
        rolls.forEach((roll: any) => {
            expect(roll.email_data?.inviteResponse).toBeUndefined();
        });
        th.testComplete();
    });

    test("An invite-template blast marks each targeted voter as invited", async () => {
        const response = await request(app)
            .post(`/API/Election/${electionId}/sendEmails`)
            .set("Cookie", ["id_token=" + testInputs.user1token])
            .set("Accept", "application/json")
            .send({
                target: "all",
                email: { subject: "Invitation to vote", body: "You are invited __VOTE_BUTTON__" },
                template: "invite",
            });
        expect(response.statusCode).toBe(200);
        await waitForQueue();

        const rolls = await fetchRollsUntil(electionId, (rolls) =>
            rolls.every((roll: any) => roll.email_data?.inviteResponse !== undefined)
        );
        expect(rolls.length).toBe(testInputs.EmailRoll.length);
        rolls.forEach((roll: any) => {
            // Same shape the legacy sendInvites path writes, and what the admin UI reads:
            // inviteResponse[0].statusCode < 400 renders as "Sent".
            expect(roll.email_data?.inviteResponse).toBeDefined();
            expect(roll.email_data.inviteResponse[0].statusCode).toBeLessThan(400);
        });
        th.testComplete();
    });
});
