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

// A voter must have no way to prove how they voted (vote buying / coercion):
// the receipt never carries their ballot id, and only election staff can
// look a ballot up by id. This holds even when ballot updates are allowed.
describe("Voters can't prove how they voted", () => {
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
        expect(cast.body.ballot.ballot_id).toBeUndefined();
        const eventQueue: MockEventQueue = await th.eventQueue;
        await eventQueue.waitUntilJobsFinished();

        const receipt = emailService.sentEmails.find(m => m.subject.startsWith('Ballot Receipt'));
        expect(receipt).toBeDefined();
        const ballots = await th.getRequest(`/API/Election/${electionId}/ballots`, testInputs.user1token);
        expect(ballots.statusCode).toBe(200);
        const ballotId = ballots.body.ballots[0].ballot_id as string;
        return { electionId, ballotId, receipt: receipt!, voterId };
    }

    async function expectNoProof(electionInput: Election, email: string) {
        const { electionId, ballotId, receipt, voterId } = await voteAs(electionInput, email);

        expect(receipt.text).not.toContain(ballotId);
        expect(receipt.html).not.toContain(ballotId);
        expect(receipt.html).not.toContain('/ballot/');

        const asVoter = await th.getRequest(`/API/Election/${electionId}/ballot/${ballotId}`, null, null, voterId);
        expect(asVoter.statusCode).toBe(401);
        const anonymous = await th.getRequest(`/API/Election/${electionId}/ballot/${ballotId}`, null);
        expect(anonymous.statusCode).toBe(401);

        const asAdmin = await th.getRequest(`/API/Election/${electionId}/ballot/${ballotId}`, testInputs.user1token);
        expect(asAdmin.statusCode).toBe(200);
        expect(asAdmin.body.ballot.ballot_id).toBe(ballotId);
        return { electionId, receipt, voterId };
    }

    test("Receipt and ballot lookup don't reveal the ballot", async () => {
        await expectNoProof(testInputs.EmailRollElection, 'noproof@email.com');
        th.testComplete();
    });

    test("Same with ballot updates on; the receipt still links to updating", async () => {
        const updatable = {
            ...testInputs.EmailRollElection,
            settings: { ...testInputs.EmailRollElection.settings, ballot_updates: true },
        } as Election;
        const { electionId, receipt, voterId } = await expectNoProof(updatable, 'updatable@email.com');
        expect(receipt.html).toContain(`/${electionId}/id/${voterId}`);
        th.testComplete();
    });
});
