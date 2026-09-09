require("dotenv").config();

import { Election } from "@equal-vote/star-vote-shared/domain_model/Election";
import { NewBallot } from "@equal-vote/star-vote-shared/domain_model/Ballot";
import { Race } from "@equal-vote/star-vote-shared/domain_model/Race";
import { ElectionSettings } from "@equal-vote/star-vote-shared/domain_model/ElectionSettings";
import testInputs from "./testInputs";
import { TestHelper } from "./TestHelper";

// getElectionResultsController streams ballots once and fans them out into a
// per-race projection, then indexes those projections alongside election.races.
// The existing multi-race tests only cover ballot submission — they never fetch
// results — so nothing pinned that fan-out. A race/projection mixup produces
// plausible-looking results for the wrong race, which is the failure mode this
// whole change is supposed to be guarded against.
//
// Both races deliberately reuse the same candidate ids, so a mixup yields marks
// that still resolve rather than an obviously empty tally.

const th = new TestHelper();

const waitForQueue = async () => (await th.eventQueue).waitUntilJobsFinished();

afterEach(() => {
    jest.clearAllMocks();
    th.afterEach();
});

const TwoRaceElection: Election = {
    election_id: "0",
    title: 'Two Race Election',
    state: 'open',
    frontend_url: '',
    owner_id: 'Alice1234',
    races: [
        {
            race_id: 'race0',
            title: 'Race Zero',
            num_winners: 1,
            voting_method: 'STAR',
            candidates: [
                { candidate_id: '0', candidate_name: 'Alice' },
                { candidate_id: '1', candidate_name: 'Bob' },
                { candidate_id: '2', candidate_name: 'Cara' },
            ],
        },
        {
            race_id: 'race1',
            title: 'Race One',
            num_winners: 1,
            voting_method: 'STAR',
            candidates: [
                { candidate_id: '0', candidate_name: 'Dan' },
                { candidate_id: '1', candidate_name: 'Erin' },
                { candidate_id: '2', candidate_name: 'Fay' },
            ],
        },
    ] as Race[],
    settings: {
        voter_access: 'open',
        voter_authentication: {},
        public_results: true,
    } as ElectionSettings,
} as Election;

const scores = (a: number, b: number, c: number) => [
    { candidate_id: '0', score: a },
    { candidate_id: '1', score: b },
    { candidate_id: '2', score: c },
];

// Alice wins race0 outright; Fay wins race1 outright. Only two of the five
// ballots vote in race1, so the per-race tally counts differ too — a projection
// read off the wrong race would get both the winner and the count wrong.
const BALLOTS: NewBallot[] = [
    { votes: [{ race_id: 'race0', scores: scores(5, 0, 1) }] },
    { votes: [{ race_id: 'race0', scores: scores(5, 0, 1) }] },
    { votes: [{ race_id: 'race0', scores: scores(5, 1, 0) }] },
    { votes: [
        { race_id: 'race0', scores: scores(5, 0, 2) },
        { race_id: 'race1', scores: scores(0, 1, 5) },
    ] },
    { votes: [
        { race_id: 'race0', scores: scores(4, 0, 1) },
        { race_id: 'race1', scores: scores(0, 2, 5) },
    ] },
].map(b => b as NewBallot);

describe("Multi Race Results", () => {
    var election: Election;

    test("Create a two race election", async () => {
        const response = await th.createElection(TwoRaceElection, testInputs.user1token);
        expect(response.statusCode).toBe(200);
        election = response.election;
        expect(election.races.length).toBe(2);
        th.testComplete();
    });

    test("Submit ballots across both races", async () => {
        for (const ballot of BALLOTS) {
            const response = await th.submitBallot(
                election.election_id,
                { ...ballot, election_id: election.election_id } as NewBallot,
                testInputs.user1token,
            );
            expect(response.statusCode).toBe(200);
        }
        th.testComplete();
    });

    test("each race is tabulated over its own ballots", async () => {
        await waitForQueue();

        const res = await th.getRequest(
            `/API/ElectionResult/${election.election_id}`,
            testInputs.user1token,
        );
        expect(res.statusCode).toBe(200);
        expect(res.body.results).toHaveLength(2);

        const [race0, race1] = res.body.results;

        // the candidate lists must not have crossed over
        expect(race0.summaryData.candidates.map((c: any) => c.name).sort())
            .toEqual(['Alice', 'Bob', 'Cara']);
        expect(race1.summaryData.candidates.map((c: any) => c.name).sort())
            .toEqual(['Dan', 'Erin', 'Fay']);

        // nor the marks
        expect(race0.elected[0].name).toBe('Alice');
        expect(race1.elected[0].name).toBe('Fay');

        // nor the per-race ballot counts: three ballots skipped race1 entirely
        expect(race0.summaryData.nTallyVotes).toBe(5);
        expect(race1.summaryData.nTallyVotes).toBe(2);

        th.testComplete();
    // the mock event queue drains roughly one ballot per second
    }, 30000);
});
