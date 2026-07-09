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

const StvElection: Election = {
    election_id: "0",
    title: 'STV Surplus Election',
    state: 'open',
    frontend_url: '',
    owner_id: 'Alice1234',
    races: [
        {
            race_id: 'race0',
            title: 'Best Leader',
            num_winners: 1,
            voting_method: 'STV',
            candidates: [
                { candidate_id: '0', candidate_name: 'Avery' },
                { candidate_id: '1', candidate_name: 'Blake' },
                { candidate_id: '2', candidate_name: 'Casey' },
            ],
        },
    ] as Race[],
    settings: {
        voter_access: 'open',
        voter_authentication: {},
        public_results: true,
    } as ElectionSettings,
} as Election;

// Rankings per ballot as [Avery, Blake, Casey]. Quota is floor(8/2 + 1) = 5.
// First preferences are Avery 3, Blake 3, Casey 2, so no one reaches quota
// until eliminations leave a single candidate holding all 8 votes. That last
// candidate wins with surplus, and redistributing the surplus with zero
// remaining candidates is the crash under test.
const ballotRankings: number[][] = [
    [3, 2, 1],
    [2, 3, 1],
    [3, 1, 2],
    [1, 3, 2],
    [3, 1, 2],
    [3, 1, 2],
    [1, 3, 2],
    [1, 3, 2],
];

describe("STV surplus redistribution after the final winner", () => {
    var election: Election;

    test("Create STV election", async () => {
        const response = await th.createElection(StvElection, testInputs.user1token);
        expect(response.statusCode).toBe(200);
        expect(response.election).toBeTruthy();
        election = response.election;
        th.testComplete();
    });

    test("Submit ballots", async () => {
        for (const rankings of ballotRankings) {
            const ballot: NewBallot = {
                election_id: election.election_id,
                votes: [{
                    race_id: 'race0',
                    scores: rankings.map((rank, i) => ({ candidate_id: String(i), score: rank })),
                }],
            } as NewBallot;
            const response = await th.submitBallot(election.election_id, ballot, testInputs.user1token);
            expect(response.statusCode).toBe(200);
        }
        th.testComplete();
    });

    test("Results tabulate when the last remaining candidate wins with surplus", async () => {
        await waitForQueue();

        const res = await th.getRequest(
            `/API/ElectionResult/${election.election_id}`,
            testInputs.user1token,
        );
        expect(res.statusCode).toBe(200);
        expect(res.body.results).toBeTruthy();
        expect(res.body.results[0].elected).toHaveLength(1);
        th.testComplete();
    }, 30000); // the mock event queue takes ~1s per queued ballot
});
