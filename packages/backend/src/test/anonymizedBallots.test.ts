require("dotenv").config();

import { Election } from "@equal-vote/star-vote-shared/domain_model/Election";
import { NewBallot } from "@equal-vote/star-vote-shared/domain_model/Ballot";
import { Race } from "@equal-vote/star-vote-shared/domain_model/Race";
import { ElectionSettings } from "@equal-vote/star-vote-shared/domain_model/ElectionSettings";
import testInputs from "./testInputs";
import { TestHelper } from "./TestHelper";

const th = new TestHelper();

// The mock event queue processes ballots asynchronously with a 1s delay.
// We must wait for it to flush before reading ballots back.
const waitForQueue = async () => (await th.eventQueue).waitUntilJobsFinished();

afterEach(() => {
    jest.clearAllMocks();
    th.afterEach();
});

const BaseElection: Election = {
    election_id: "0",
    title: 'Anonymized Ballots Election',
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

const makeBallot = (election_id: string, aliceScore: number, bobScore: number): NewBallot => ({
    election_id,
    votes: [{
        race_id: 'race0',
        scores: [
            { candidate_id: '0', score: aliceScore },
            { candidate_id: '1', score: bobScore },
        ],
    }],
} as NewBallot);

describe("Anonymized ballots endpoint", () => {
    var election: Election;

    test("Create election and submit ballots", async () => {
        const response = await th.createElection(BaseElection, testInputs.user1token);
        expect(response.statusCode).toBe(200);
        election = response.election;

        for (const [alice, bob] of [[5, 0], [3, 2], [0, 5]]) {
            const res = await th.submitBallot(election.election_id, makeBallot(election.election_id, alice, bob), testInputs.user1token);
            expect(res.statusCode).toBe(200);
        }
        th.testComplete();
    });

    test("Returns all submitted ballots, anonymized", async () => {
        await waitForQueue();

        const res = await th.getRequest(
            `/API/Election/${election.election_id}/anonymizedBallots`,
            testInputs.user1token,
        );
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toMatch(/application\/json/);
        expect(res.body.ballots).toHaveLength(3);

        // All submitted scores come back, regardless of response order
        const scorePairs = res.body.ballots
            .map((b: any) => b.votes[0].scores.map((s: any) => s.score))
            .sort();
        expect(scorePairs).toEqual([[0, 5], [3, 2], [5, 0]].sort());

        for (const ballot of res.body.ballots) {
            expect(Object.keys(ballot).sort()).toEqual(['ballot_id', 'election_id', 'precinct', 'votes']);
            expect(ballot.election_id).toBe(election.election_id);
        }
        th.testComplete();
    });

    test("Returns empty ballot list for election with no ballots", async () => {
        const response = await th.createElection({
            ...BaseElection,
            election_id: "0",
            title: 'Empty Election',
        } as Election, testInputs.user1token);
        expect(response.statusCode).toBe(200);

        const res = await th.getRequest(
            `/API/Election/${response.election.election_id}/anonymizedBallots`,
            testInputs.user1token,
        );
        expect(res.statusCode).toBe(200);
        expect(res.body.ballots).toEqual([]);
        th.testComplete();
    });

    test("Rejects when results are not public and election is open", async () => {
        const response = await th.createElection({
            ...BaseElection,
            election_id: "0",
            title: 'Private Election',
            settings: {
                ...BaseElection.settings,
                public_results: false,
            } as ElectionSettings,
        } as Election, testInputs.user1token);
        expect(response.statusCode).toBe(200);

        const res = await th.getRequest(
            `/API/Election/${response.election.election_id}/anonymizedBallots`,
            testInputs.user2token,
        );
        expect(res.statusCode).toBe(401);
        th.testComplete();
    });
});
