import 'dotenv/config';
import request from "supertest";
import makeApp from "../app";
import { MockEventQueue } from "../Services/EventQueue/MockEventQueue";
import { TestHelper } from "./TestHelper";
import testInputs from "./testInputs";
import { Election } from "@equal-vote/star-vote-shared/domain_model/Election";
import { Imsg } from "../Services/Email/IEmail";

const app = makeApp();
const th = new TestHelper();
// ServiceLocator is mocked (setupTests.ts), so this is the recording mock
// from Services/Email/__mocks__/EmailService.
const emailService = th.emailService as unknown as { sentEmails: Imsg[], clear: () => void };

afterEach(() => {
    jest.clearAllMocks();
    th.afterEach();
});

// A voter only ever learns their ballot id from the receipt email and the
// /ballot/<id> page. hide_ballot_ids (the default) closes both.
describe("Hide ballot IDs from voters", () => {
    beforeAll(() => {
        jest.clearAllMocks();
    });

    // Run the same voter flow for an election with ids hidden and one with
    // them shown, then compare what leaked.
    async function voteAs(electionInput: Election, email: string) {
        emailService.clear();
        // public_results lets the admin list ballots (to learn the id) while the election is open.
        const created = await th.createElection({
            ...electionInput,
            settings: { ...electionInput.settings, public_results: true },
        } as Election, testInputs.user1token);
        expect(created.statusCode).toBe(200);
        const electionId = created.election.election_id;

        const roll = await th.submitElectionRoll(electionId, [{ email, precinct: '' }], testInputs.user1token);
        expect(roll.statusCode).toBe(200);

        const reveal = await request(app)
            .post(`/API/Election/${electionId}/rolls/revealVoterId`)
            .set("Cookie", ["id_token=" + testInputs.user1token])
            .set("Accept", "application/json")
            .send({ email });
        expect(reveal.statusCode).toBe(200);
        const voterId = reveal.body.voter_id;

        const cast = await th.submitBallotWithId(electionId, testInputs.Ballot1, null, voterId);
        expect(cast.statusCode).toBe(200);
        const eventQueue: MockEventQueue = await th.eventQueue;
        await eventQueue.waitUntilJobsFinished();

        const receipt = emailService.sentEmails.find(m => m.subject.startsWith('Ballot Receipt'));
        expect(receipt).toBeDefined();
        const ballots = await th.getRequest(`/API/Election/${electionId}/ballots`, testInputs.user1token);
        expect(ballots.statusCode).toBe(200);
        const ballotId = ballots.body.ballots[0].ballot_id as string;
        return { electionId, ballotId, receipt: receipt!, voterId };
    }

    test("Default (hidden): cast response, receipt and lookup all withhold the id", async () => {
        const { electionId, ballotId, receipt, voterId } = await voteAs(testInputs.EmailRollElection, 'hidden@email.com');

        expect(receipt.text).not.toContain(ballotId);
        expect(receipt.html).not.toContain(ballotId);
        expect(receipt.html).not.toContain('/ballot/');

        const asVoter = await th.getRequest(`/API/Election/${electionId}/ballot/${ballotId}`, null, null, voterId);
        expect(asVoter.statusCode).toBe(401);

        const asAdmin = await th.getRequest(`/API/Election/${electionId}/ballot/${ballotId}`, testInputs.user1token);
        expect(asAdmin.statusCode).toBe(200);
        expect(asAdmin.body.ballot.ballot_id).toBe(ballotId);
        th.testComplete();
    });

    test("hide_ballot_ids=false: receipt links to the ballot and anyone can look it up", async () => {
        const shown = {
            ...testInputs.EmailRollElection,
            settings: { ...testInputs.EmailRollElection.settings, hide_ballot_ids: false },
        } as Election;
        const { electionId, ballotId, receipt, voterId } = await voteAs(shown, 'shown@email.com');

        expect(receipt.html).toContain(`/${electionId}/ballot/${ballotId}`);

        const asVoter = await th.getRequest(`/API/Election/${electionId}/ballot/${ballotId}`, null, null, voterId);
        expect(asVoter.statusCode).toBe(200);
        th.testComplete();
    });

    test("ballot_updates with ids hidden is rejected", async () => {
        const conflicting = {
            ...testInputs.EmailRollElection,
            settings: { ...testInputs.EmailRollElection.settings, ballot_updates: true, hide_ballot_ids: true },
        } as Election;
        const response = await th.createElection(conflicting, testInputs.user1token);
        expect(response.statusCode).toBe(400);
        th.testComplete();
    });

    test("Legacy election with ballot_updates and no hide_ballot_ids still shows the id", async () => {
        const legacy = {
            ...testInputs.EmailRollElection,
            settings: { ...testInputs.EmailRollElection.settings, ballot_updates: true },
        } as Election;
        const { electionId, ballotId, receipt } = await voteAs(legacy, 'legacy@email.com');
        expect(receipt.html).toContain(`/${electionId}/ballot/${ballotId}`);
        th.testComplete();
    });
});
