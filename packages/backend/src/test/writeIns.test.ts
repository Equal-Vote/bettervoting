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

const WriteInElection: Election = {
    election_id: "0",
    title: 'Write-In Election',
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
            enable_write_in: true,
        },
    ] as Race[],
    settings: {
        voter_access: 'open',
        voter_authentication: { ip_address: true },
        public_results: true,
    } as ElectionSettings,
} as Election;

describe("Write-In Candidates", () => {
    var election: Election;

    test("Create election with write-ins enabled", async () => {
        const response = await th.createElection(WriteInElection, testInputs.user1token);
        expect(response.statusCode).toBe(200);
        expect(response.election).toBeTruthy();
        election = response.election;
        expect(election.races[0].enable_write_in).toBe(true);
        th.testComplete();
    });

    test("Submit ballot with write-in candidate", async () => {
        const ballot: NewBallot = {
            election_id: election.election_id,
            votes: [{
                race_id: 'race0',
                scores: [
                    { candidate_id: '0', score: 3 },
                    { candidate_id: '1', score: 1 },
                    { candidate_id: 'cwi-Charlie', score: 5, write_in_name: 'Charlie' },
                ],
            }],
        } as NewBallot;
        const response = await th.submitBallot(election.election_id, ballot, testInputs.user1token);
        expect(response.statusCode).toBe(200);
        th.testComplete();
    });

    test("Submit ballot with multiple write-ins", async () => {
        const ballot: NewBallot = {
            election_id: election.election_id,
            votes: [{
                race_id: 'race0',
                scores: [
                    { candidate_id: '0', score: 0 },
                    { candidate_id: '1', score: 2 },
                    { candidate_id: 'cwi-Charlie', score: 4, write_in_name: 'Charlie' },
                    { candidate_id: 'cwi-Dana', score: 5, write_in_name: 'Dana' },
                ],
            }],
        } as NewBallot;
        const response = await th.submitBallot(election.election_id, ballot, testInputs.user1token);
        expect(response.statusCode).toBe(200);
        th.testComplete();
    });

    test("Submit ballot with only official candidates (no write-ins)", async () => {
        const ballot: NewBallot = {
            election_id: election.election_id,
            votes: [{
                race_id: 'race0',
                scores: [
                    { candidate_id: '0', score: 5 },
                    { candidate_id: '1', score: 4 },
                ],
            }],
        } as NewBallot;
        const response = await th.submitBallot(election.election_id, ballot, testInputs.user1token);
        expect(response.statusCode).toBe(200);
        th.testComplete();
    });

    test("Reject ballot with write-in when write-ins disabled", async () => {
        // Create a separate election without write-ins
        const noWriteInElection: Election = {
            ...WriteInElection,
            election_id: "0",
            title: 'No Write-In Election',
            races: [{
                ...WriteInElection.races[0],
                race_id: 'race-nowi',
                enable_write_in: false,
            }] as Race[],
        } as Election;
        const createRes = await th.createElection(noWriteInElection, testInputs.user1token);
        expect(createRes.statusCode).toBe(200);

        const ballot: NewBallot = {
            election_id: createRes.election.election_id,
            votes: [{
                race_id: 'race-nowi',
                scores: [
                    { candidate_id: '0', score: 3 },
                    { candidate_id: '1', score: 1 },
                    { candidate_id: 'cwi-Charlie', score: 5, write_in_name: 'Charlie' },
                ],
            }],
        } as NewBallot;
        const response = await th.submitBallot(createRes.election.election_id, ballot, testInputs.user1token);
        expect(response.statusCode).toBe(400);
        th.testComplete();
    });

    test("Reject ballot with too many write-ins (>10)", async () => {
        const scores = [
            { candidate_id: '0', score: 1 },
            { candidate_id: '1', score: 1 },
        ];
        for (let i = 0; i < 11; i++) {
            scores.push({ candidate_id: `cwi-WriteIn${i}`, score: 1, write_in_name: `WriteIn${i}` } as any);
        }
        const ballot: NewBallot = {
            election_id: election.election_id,
            votes: [{ race_id: 'race0', scores }],
        } as NewBallot;
        const response = await th.submitBallot(election.election_id, ballot, testInputs.user1token);
        expect(response.statusCode).toBe(400);
        th.testComplete();
    });

    test("Reject ballot with write-in name too long (>100 chars)", async () => {
        const longName = 'A'.repeat(101);
        const ballot: NewBallot = {
            election_id: election.election_id,
            votes: [{
                race_id: 'race0',
                scores: [
                    { candidate_id: '0', score: 3 },
                    { candidate_id: `cwi-${longName}`, score: 5, write_in_name: longName },
                ],
            }],
        } as NewBallot;
        const response = await th.submitBallot(election.election_id, ballot, testInputs.user1token);
        expect(response.statusCode).toBe(400);
        th.testComplete();
    });

    test("Get write-in names", async () => {
        await waitForQueue();

        const res = await th.getRequest(
            `/API/Election/${election.election_id}/getWriteIns`,
            testInputs.user1token,
        );
        expect(res.statusCode).toBe(200);
        expect(res.body.write_in_data).toBeTruthy();

        const raceData = res.body.write_in_data.find((d: any) => d.race_id === 'race0');
        expect(raceData).toBeTruthy();
        // We submitted 'Charlie' in 2 ballots, 'Dana' in 1 ballot
        expect(raceData.names['Charlie']).toBe(2);
        expect(raceData.names['Dana']).toBe(1);
        th.testComplete();
    });

    test("Set write-in results (approve Charlie)", async () => {
        const res = await th.postRequest(
            `/API/Election/${election.election_id}/setWriteInResults`,
            {
                write_in_results: {
                    race_id: 'race0',
                    write_in_candidates: [
                        { candidate_name: 'Charlie', approved: true, aliases: ['charlie'] },
                        { candidate_name: 'Dana', approved: false, aliases: ['dana'] },
                    ],
                },
            },
            testInputs.user1token,
        );
        expect(res.statusCode).toBe(200);
        expect(res.body.election).toBeTruthy();

        const race = res.body.election.races.find((r: any) => r.race_id === 'race0');
        expect(race.write_in_candidates).toHaveLength(2);
        expect(race.write_in_candidates[0].candidate_name).toBe('Charlie');
        expect(race.write_in_candidates[0].approved).toBe(true);
        expect(race.write_in_candidates[1].approved).toBe(false);
        th.testComplete();
    });

    test("Get results includes approved write-in, excludes unapproved", async () => {
        await waitForQueue();

        const res = await th.getRequest(
            `/API/ElectionResult/${election.election_id}`,
            testInputs.user1token,
        );
        expect(res.statusCode).toBe(200);
        expect(res.body.results).toBeTruthy();

        const raceResult = res.body.results[0];
        // Approved write-in 'Charlie' should appear as a candidate
        const candidateNames = raceResult.summaryData.candidates.map((c: any) => c.name);
        expect(candidateNames).toContain('Alice');
        expect(candidateNames).toContain('Bob');
        expect(candidateNames).toContain('Charlie');
        // Unapproved write-in 'Dana' should NOT appear
        expect(candidateNames).not.toContain('Dana');

        // writeInDiagnostics should be present
        expect(raceResult.writeInDiagnostics).toBeTruthy();
        expect(raceResult.writeInDiagnostics.numScoresDisregarded).toBeGreaterThan(0);
        th.testComplete();
    });

    test("Results without any approved write-ins only show official candidates", async () => {
        // Update: disapprove all write-ins
        await th.postRequest(
            `/API/Election/${election.election_id}/setWriteInResults`,
            {
                write_in_results: {
                    race_id: 'race0',
                    write_in_candidates: [
                        { candidate_name: 'Charlie', approved: false, aliases: ['charlie'] },
                        { candidate_name: 'Dana', approved: false, aliases: ['dana'] },
                    ],
                },
            },
            testInputs.user1token,
        );

        const res = await th.getRequest(
            `/API/ElectionResult/${election.election_id}`,
            testInputs.user1token,
        );
        expect(res.statusCode).toBe(200);

        const candidateNames = res.body.results[0].summaryData.candidates.map((c: any) => c.name);
        expect(candidateNames).toContain('Alice');
        expect(candidateNames).toContain('Bob');
        expect(candidateNames).not.toContain('Charlie');
        expect(candidateNames).not.toContain('Dana');
        expect(candidateNames).toHaveLength(2);
        th.testComplete();
    });
});

describe("Write-In Validation (setWriteInResults)", () => {
    var election: Election;

    beforeAll(async () => {
        const response = await th.createElection(WriteInElection, testInputs.user1token);
        election = response.election;
    });

    test("Reject when write_in_results not provided", async () => {
        const res = await th.postRequest(
            `/API/Election/${election.election_id}/setWriteInResults`,
            {},
            testInputs.user1token,
        );
        expect(res.statusCode).toBe(400);
        th.testComplete();
    });

    test("Reject when race_id is missing", async () => {
        const res = await th.postRequest(
            `/API/Election/${election.election_id}/setWriteInResults`,
            { write_in_results: { write_in_candidates: [] } },
            testInputs.user1token,
        );
        expect(res.statusCode).toBe(400);
        th.testComplete();
    });

    test("Reject when race_id is invalid", async () => {
        const res = await th.postRequest(
            `/API/Election/${election.election_id}/setWriteInResults`,
            {
                write_in_results: {
                    race_id: 'nonexistent-race',
                    write_in_candidates: [],
                },
            },
            testInputs.user1token,
        );
        expect(res.statusCode).toBe(400);
        th.testComplete();
    });

    test("Reject duplicate candidate names", async () => {
        const res = await th.postRequest(
            `/API/Election/${election.election_id}/setWriteInResults`,
            {
                write_in_results: {
                    race_id: 'race0',
                    write_in_candidates: [
                        { candidate_name: 'Charlie', approved: true, aliases: ['charlie'] },
                        { candidate_name: 'charlie', approved: false, aliases: ['charlie'] },
                    ],
                },
            },
            testInputs.user1token,
        );
        expect(res.statusCode).toBe(400);
        th.testComplete();
    });

    test("Reject candidate_name exceeding max length", async () => {
        const res = await th.postRequest(
            `/API/Election/${election.election_id}/setWriteInResults`,
            {
                write_in_results: {
                    race_id: 'race0',
                    write_in_candidates: [
                        { candidate_name: 'A'.repeat(101), approved: true, aliases: ['a'] },
                    ],
                },
            },
            testInputs.user1token,
        );
        expect(res.statusCode).toBe(400);
        th.testComplete();
    });

    test("Reject too many aliases", async () => {
        const aliases = Array.from({ length: 21 }, (_, i) => `alias${i}`);
        const res = await th.postRequest(
            `/API/Election/${election.election_id}/setWriteInResults`,
            {
                write_in_results: {
                    race_id: 'race0',
                    write_in_candidates: [
                        { candidate_name: 'Charlie', approved: true, aliases },
                    ],
                },
            },
            testInputs.user1token,
        );
        expect(res.statusCode).toBe(400);
        th.testComplete();
    });

    test("Reject alias exceeding max length", async () => {
        const res = await th.postRequest(
            `/API/Election/${election.election_id}/setWriteInResults`,
            {
                write_in_results: {
                    race_id: 'race0',
                    write_in_candidates: [
                        { candidate_name: 'Charlie', approved: true, aliases: ['A'.repeat(101)] },
                    ],
                },
            },
            testInputs.user1token,
        );
        expect(res.statusCode).toBe(400);
        th.testComplete();
    });

    test("Reject too many write-in candidates (>100)", async () => {
        const candidates = Array.from({ length: 101 }, (_, i) => ({
            candidate_name: `Candidate${i}`,
            approved: false,
            aliases: [`candidate${i}`],
        }));
        const res = await th.postRequest(
            `/API/Election/${election.election_id}/setWriteInResults`,
            {
                write_in_results: {
                    race_id: 'race0',
                    write_in_candidates: candidates,
                },
            },
            testInputs.user1token,
        );
        expect(res.statusCode).toBe(400);
        th.testComplete();
    });

    test("Accept valid empty write-in candidates array", async () => {
        const res = await th.postRequest(
            `/API/Election/${election.election_id}/setWriteInResults`,
            {
                write_in_results: {
                    race_id: 'race0',
                    write_in_candidates: [],
                },
            },
            testInputs.user1token,
        );
        expect(res.statusCode).toBe(200);
        th.testComplete();
    });
});
