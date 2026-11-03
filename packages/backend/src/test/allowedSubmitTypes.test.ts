import 'dotenv/config';

import { Election } from "@equal-vote/star-vote-shared/domain_model/Election";
import { ElectionSettings } from "@equal-vote/star-vote-shared/domain_model/ElectionSettings";
import { Race } from "@equal-vote/star-vote-shared/domain_model/Race";
import testInputs from "./testInputs";
import { TestHelper } from "./TestHelper";

const th = new TestHelper();

afterEach(() => {
    jest.clearAllMocks();
    th.afterEach();
});

// Based on testInputs.Election1, but opened and given a STAR race with two candidates.
const makeElection = (allowed_submit_types?: string[]): Election => ({
    ...testInputs.Election1,
    title: "Submit Types Test Election",
    state: "open",
    races: [
        {
            race_id: "race0",
            title: "Best Candidate",
            num_winners: 1,
            voting_method: "STAR",
            candidates: [
                { candidate_id: "cand0", candidate_name: "Alice" },
                { candidate_id: "cand1", candidate_name: "Bob" },
            ],
        },
    ] as Race[],
    settings: {
        voter_access: "open",
        voter_authentication: {},
        ...(allowed_submit_types !== undefined ? { allowed_submit_types } : {}),
    } as ElectionSettings,
} as Election);

// race_order and a single ballot in ordered-vote format for the election above.
const RACE_ORDER = [{ race_id: "race0", candidate_id_order: ["cand0", "cand1"] }];
// orderedVote = [aliceScore, bobScore, overvote_rank, has_duplicate_rank]
const IMPORT_BODY = { race_order: RACE_ORDER, ballots: [{ ballot_id: "P-1", orderedVotes: [[5, 0, null, null]] }] };

// electionSettingsValidation unit tests for allowed_submit_types live in
// packages/shared/src/domain_model/ElectionSettings.test.ts, next to the
// function they test.

describe("allowed_submit_types enforcement — admin ballot import", () => {
    test("import is accepted when allowed_submit_types includes submitted_via_admin", async () => {
        const elec = makeElection(["submitted_via_browser", "submitted_via_admin"]);
        const created = await th.createElection(elec, testInputs.user1token);
        expect(created.statusCode).toBe(200);
        const id = created.election.election_id;

        const res = await th.importBallots(id, IMPORT_BODY, testInputs.user1token);
        expect(res.statusCode).toBe(200);
        expect(res.body.imported).toBe(1);
        th.testComplete();
    });

    test("import is rejected when allowed_submit_types excludes submitted_via_admin", async () => {
        const elec = makeElection(["submitted_via_browser"]);
        const created = await th.createElection(elec, testInputs.user1token);
        expect(created.statusCode).toBe(200);
        const id = created.election.election_id;

        const res = await th.importBallots(id, IMPORT_BODY, testInputs.user1token);
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toContain("not enabled");
        th.testComplete();
    });

    test("import is rejected by default (no allowed_submit_types field set)", async () => {
        // Default is ['submitted_via_browser', 'submitted_via_discord'] — admin is not included.
        const elec = makeElection(undefined);
        const created = await th.createElection(elec, testInputs.user1token);
        expect(created.statusCode).toBe(200);
        const id = created.election.election_id;

        const res = await th.importBallots(id, IMPORT_BODY, testInputs.user1token);
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toContain("not enabled");
        th.testComplete();
    });

    test("browser vote is rejected when allowed_submit_types excludes submitted_via_browser", async () => {
        const elec = makeElection(["submitted_via_admin"]);
        const created = await th.createElection(elec, testInputs.user1token);
        expect(created.statusCode).toBe(200);
        const id = created.election.election_id;

        const res = await th.submitBallot(id, {
            votes: [{ race_id: "race0", scores: [{ candidate_id: "cand0", score: 5 }, { candidate_id: "cand1", score: 0 }] }],
        }, testInputs.user1token);
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toContain("submitted_via_browser");
        th.testComplete();
    });

    test("allowed_submit_types check and already-voted check compose without interfering", async () => {
        // Election that allows admin submissions with a closed voter roll.
        const closedElec: Election = {
            ...makeElection(["submitted_via_browser", "submitted_via_admin"]),
            title: "Closed Admin Upload Election",
            settings: {
                voter_access: "closed",
                voter_authentication: { voter_id: true },
                allowed_submit_types: ["submitted_via_browser", "submitted_via_admin"],
            } as ElectionSettings,
        } as Election;

        const created = await th.createElection(closedElec, testInputs.user1token);
        expect(created.statusCode).toBe(200);
        const id = created.election.election_id;

        // Add voter roll with voter5.
        const rollRes = await th.submitElectionRoll(id, [{ voter_id: "voter5" }], testInputs.user1token);
        expect(rollRes.statusCode).toBe(200);

        // First import for voter5 should succeed (admin is allowed).
        const firstImport = await th.importBallots(id, { ...IMPORT_BODY, voter_ids: ["voter5"] }, testInputs.user1token);
        expect(firstImport.statusCode).toBe(200);

        // Second import for voter5 should fail (already voted) — not because of allowed_submit_types.
        const secondImport = await th.importBallots(id, {
            ...IMPORT_BODY,
            ballots: [{ ballot_id: "P-2", orderedVotes: [[5, 0, null, null]] }],
            voter_ids: ["voter5"],
        }, testInputs.user1token);
        expect(secondImport.statusCode).toBe(400);
        expect(secondImport.body.error).toContain("Already voted");

        th.testComplete();
    });
});
