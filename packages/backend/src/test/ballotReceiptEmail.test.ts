require("dotenv").config();

import { Election } from "@equal-vote/star-vote-shared/domain_model/Election";
import { NewBallot } from "@equal-vote/star-vote-shared/domain_model/Ballot";
import { Race } from "@equal-vote/star-vote-shared/domain_model/Race";
import { ElectionSettings } from "@equal-vote/star-vote-shared/domain_model/ElectionSettings";
import { MockEventQueue } from "../Services/EventQueue/MockEventQueue";
import testInputs from "./testInputs";
import { TestHelper } from "./TestHelper";

const th = new TestHelper();

afterEach(() => {
    jest.clearAllMocks();
    th.afterEach();
});

const ReceiptElection: Election = {
    election_id: "0",
    title: 'Receipt Election',
    state: 'open',
    frontend_url: '',
    owner_id: 'Alice1234',
    races: [
        {
            race_id: 'race0',
            title: 'Best Leader',
            num_winners: 1,
            voting_method: 'STAR',
            candidates: [
                { candidate_id: '0', candidate_name: 'Alice' },
                { candidate_id: '1', candidate_name: 'Bob' },
            ],
        },
    ] as Race[],
    settings: {
        voter_access: 'open',
        voter_authentication: {},
        public_results: true,
    } as ElectionSettings,
} as Election;

const makeBallot = (election_id: string): NewBallot => ({
    election_id,
    votes: [{
        race_id: 'race0',
        scores: [
            { candidate_id: '0', score: 5 },
            { candidate_id: '1', score: 0 },
        ],
    }],
} as NewBallot);

// Covers handleCastVoteEvent, the one queue consumer the suite exercises.
// The receipt matters because castVoteController deliberately scrubs ballot_id
// from the HTTP response, so the email is the only channel that carries it back
// to the voter.
describe("Ballot receipt email", () => {
    var election: Election;
    var eventQueue: MockEventQueue;

    beforeAll(async () => {
        eventQueue = await th.eventQueue;
        const response = await th.createElection(ReceiptElection, testInputs.user1token);
        expect(response.statusCode).toBe(200);
        election = response.election;
    });

    beforeEach(() => {
        th.emailService.clear();
    });

    test("Submitting a ballot mails the voter a receipt carrying the ballot_id", async () => {
        const res = await th.submitBallot(election.election_id, makeBallot(election.election_id), testInputs.user1token);
        expect(res.statusCode).toBe(200);
        // the response withholds the ballot_id on purpose
        expect(res.body.ballot.ballot_id).toBeUndefined();

        const sent = th.emailService.sentEmails;
        expect(sent).toHaveLength(1);
        expect(sent[0].to).toBe('Alice@email.com');
        expect(sent[0].subject).toBe(`Ballot Receipt For ${election.title}`);
        expect(sent[0].text).toMatch(new RegExp(`/${election.election_id}/ballot/b-`));
        th.testComplete();
    });

    test("The receipt is sent off the queue, not inline with the response", async () => {
        eventQueue.pause();
        try {
            const res = await th.submitBallot(election.election_id, makeBallot(election.election_id), testInputs.user1token);
            expect(res.statusCode).toBe(200);
            // the voter is told their ballot was accepted before the email goes out
            expect(th.emailService.sentEmails).toHaveLength(0);
            expect(eventQueue.pendingJobCount()).toBe(1);
        } finally {
            await eventQueue.resume();
        }

        expect(th.emailService.sentEmails).toHaveLength(1);
        expect(eventQueue.pendingJobCount()).toBe(0);
        th.testComplete();
    });
});
