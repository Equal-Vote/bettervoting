import 'dotenv/config';

import { Election } from "@equal-vote/star-vote-shared/domain_model/Election";
import { ElectionSettings } from "@equal-vote/star-vote-shared/domain_model/ElectionSettings";
import { ImportBallotRow } from "@equal-vote/star-vote-shared/domain_model/BallotImport";
import { Ballot } from "@equal-vote/star-vote-shared/domain_model/Ballot";
import { ElectionRoll } from "@equal-vote/star-vote-shared/domain_model/ElectionRoll";
import { MockEventQueue } from '../Services/EventQueue/MockEventQueue';
import testInputs from "./testInputs";
import { TestHelper } from "./TestHelper";
import ServiceLocator from "../ServiceLocator";

const th = new TestHelper();

afterEach(() => {
    jest.clearAllMocks();
    th.afterEach();
});

// Every fixture election here opts in to paper ballots; the default (admin upload
// off) is covered in allowedSubmitTypes.test.ts.
// public_results lets the tests read the ballots back through the API.
const PAPER_ENABLED: Partial<ElectionSettings> = {
    allowed_submit_types: ['submitted_via_browser', 'submitted_via_admin'],
    public_results: true,
};

const withSettings = (election: Election, settings: Partial<ElectionSettings>): Election => ({
    ...election,
    settings: { ...election.settings, ...settings } as ElectionSettings,
});

// race 0 of IDRollElection / EmailRollElection: candidates 0, 1, 2 (STAR)
const RACE_ORDER = [{ race_id: '0', candidate_id_order: ['0', '1', '2'] }];
// orderedVote = [scoreA, scoreB, scoreC, overvote_rank, has_duplicate_rank]
const ballot = (ballot_id: string, marks: (number | null)[] = [5, 0, 4]): ImportBallotRow => ({
    ballot_id,
    orderedVotes: [[...marks, null, null]],
});

const createElection = async (election: Election) => {
    const created = await th.createElection(election, testInputs.user1token);
    expect(created.statusCode).toBe(200);
    return created.election.election_id;
};

const createIdRollElection = async () => {
    const id = await createElection(withSettings(testInputs.IDRollElection, PAPER_ENABLED));
    const rollRes = await th.submitElectionRoll(id, testInputs.IDRoll, testInputs.user1token);
    expect(rollRes.statusCode).toBe(200);
    return id;
};

const fetchRolls = async (id: string): Promise<ElectionRoll[]> => {
    const res = await th.fetchElectionRoll(id, testInputs.user1token);
    expect(res.statusCode).toBe(200);
    return res.body.electionRoll;
};

const fetchBallots = async (id: string): Promise<Ballot[]> => {
    const res = await th.fetchBallots(id, testInputs.user1token);
    expect(res.statusCode).toBe(200);
    return res.body.ballots;
};

describe("Import ballots — election with a voter list (two lists: ballots and voters)", () => {
    test("happy path: ballots stored, listed voters marked as voted, lists not linked", async () => {
        const id = await createIdRollElection();

        const res = await th.importBallots(id, {
            race_order: RACE_ORDER,
            ballots: [ballot('P-0001'), ballot('P-0002', [0, 5, null])],
            voter_ids: ['AliceID', 'BobID'],
        }, testInputs.user1token);
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ imported: 2, voters_marked: 2 });

        const ballots = await fetchBallots(id);
        const imported = ballots.filter(b => b.election_id === id);
        expect(imported.map(b => b.ballot_id).sort()).toEqual(['P-0001', 'P-0002']);
        imported.forEach(b => expect(b.status).toBe('submitted'));
        // the API scrubs ballot history, so check the audit trail in the store
        const stored = await ServiceLocator.ballotsDb().getBallotsByElectionID(id, th.ctx);
        stored.forEach(b => expect(b.history?.[0].action_type).toBe('submitted_via_admin'));
        const second = imported.find(b => b.ballot_id === 'P-0002')!;
        expect(second.votes[0].scores.map(s => s.score)).toEqual([0, 5, null]);

        const rolls = await fetchRolls(id);
        expect(rolls.map(r => r.submitted)).toEqual([true, true]);
        // the roll never learns which ballot belongs to which voter
        rolls.forEach(r => expect(r.ballot_id).toBeUndefined());
        rolls.forEach(r => expect(r.history?.at(-1)?.action_type).toBe('submit'));
        th.testComplete();
    });

    test("voter list required: ballots without voter_ids are rejected and nothing is written", async () => {
        const id = await createIdRollElection();
        const res = await th.importBallots(id, {
            race_order: RACE_ORDER,
            ballots: [ballot('P-0001')],
        }, testInputs.user1token);
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toContain('voter list');
        expect(await fetchBallots(id)).toHaveLength(0);
        th.testComplete();
    });

    test("mismatched counts: two ballots but one voter rejects the whole import", async () => {
        const id = await createIdRollElection();
        const res = await th.importBallots(id, {
            race_order: RACE_ORDER,
            ballots: [ballot('P-0001'), ballot('P-0002')],
            voter_ids: ['AliceID'],
        }, testInputs.user1token);
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toContain('must equal the number of ballots');
        expect(await fetchBallots(id)).toHaveLength(0);
        expect((await fetchRolls(id)).every(r => !r.submitted)).toBe(true);
        th.testComplete();
    });

    test("duplicate ballot ids within the upload are rejected", async () => {
        const id = await createIdRollElection();
        const res = await th.importBallots(id, {
            race_order: RACE_ORDER,
            ballots: [ballot('P-0001'), ballot('P-0001')],
            voter_ids: ['AliceID', 'BobID'],
        }, testInputs.user1token);
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toContain('Repeated ballot_id');
        expect(res.body.error).toContain('ballot 2');
        expect(await fetchBallots(id)).toHaveLength(0);
        th.testComplete();
    });

    test("a ballot id that is already in the election is rejected", async () => {
        const id = await createIdRollElection();
        const first = await th.importBallots(id, {
            race_order: RACE_ORDER,
            ballots: [ballot('P-0001')],
            voter_ids: ['AliceID'],
        }, testInputs.user1token);
        expect(first.statusCode).toBe(200);

        const second = await th.importBallots(id, {
            race_order: RACE_ORDER,
            ballots: [ballot('P-0001')],
            voter_ids: ['BobID'],
        }, testInputs.user1token);
        expect(second.statusCode).toBe(400);
        expect(second.body.error).toContain('Already in this election');
        expect(await fetchBallots(id)).toHaveLength(1);
        // Bob was not marked as voted by the rejected import
        expect((await fetchRolls(id)).find(r => r.voter_id === 'BobID')?.submitted).toBe(false);
        th.testComplete();
    });

    test("a voter who is not on the roll rejects the whole import", async () => {
        const id = await createIdRollElection();
        const res = await th.importBallots(id, {
            race_order: RACE_ORDER,
            ballots: [ballot('P-0001'), ballot('P-0002')],
            voter_ids: ['AliceID', 'NotOnTheRoll'],
        }, testInputs.user1token);
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toContain('Not on the voter list');
        expect(res.body.error).toContain('voter 2');
        expect(await fetchBallots(id)).toHaveLength(0);
        expect((await fetchRolls(id)).every(r => !r.submitted)).toBe(true);
        th.testComplete();
    });

    test("a voter who already voted online rejects the whole import", async () => {
        const id = await createIdRollElection();
        const vote = await th.submitBallotWithId(id, testInputs.Ballot2, testInputs.user1token, 'AliceID');
        expect(vote.statusCode).toBe(200);
        await (await th.eventQueue as MockEventQueue).waitUntilJobsFinished();

        const res = await th.importBallots(id, {
            race_order: RACE_ORDER,
            ballots: [ballot('P-0001'), ballot('P-0002')],
            voter_ids: ['BobID', 'AliceID'],
        }, testInputs.user1token);
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toContain('Already voted');
        expect(res.body.error).toContain('voter 2');
        expect(await fetchBallots(id)).toHaveLength(1); // only Alice's online ballot
        expect((await fetchRolls(id)).find(r => r.voter_id === 'BobID')?.submitted).toBe(false);
        th.testComplete();
    });

    test("the same voter listed twice is rejected", async () => {
        const id = await createIdRollElection();
        const res = await th.importBallots(id, {
            race_order: RACE_ORDER,
            ballots: [ballot('P-0001'), ballot('P-0002')],
            voter_ids: ['AliceID', 'AliceID'],
        }, testInputs.user1token);
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toContain('Repeated voter_id');
        th.testComplete();
    });

    test("imported voters cannot vote online afterwards", async () => {
        const id = await createIdRollElection();
        const res = await th.importBallots(id, {
            race_order: RACE_ORDER,
            ballots: [ballot('P-0001')],
            voter_ids: ['AliceID'],
        }, testInputs.user1token);
        expect(res.statusCode).toBe(200);

        const auth = await th.requestBallotWithId(id, testInputs.user1token, 'AliceID');
        expect(auth.voterAuth.has_voted).toBe(true);
        const vote = await th.submitBallotWithId(id, testInputs.Ballot2, testInputs.user1token, 'AliceID');
        expect(vote.statusCode).toBe(400);
        th.testComplete();
    });

    test("email list election: voters are matched by email, case-insensitively", async () => {
        const id = await createElection(withSettings(testInputs.EmailRollElection, PAPER_ENABLED));
        const rollRes = await th.submitElectionRoll(id, testInputs.EmailRoll, testInputs.user1token);
        expect(rollRes.statusCode).toBe(200);

        const res = await th.importBallots(id, {
            race_order: RACE_ORDER,
            ballots: [ballot('P-0001'), ballot('P-0002')],
            voter_key: 'email',
            voter_ids: ['alice@EMAIL.com', 'Bob@email.com'],
        }, testInputs.user1token);
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ imported: 2, voters_marked: 2 });
        expect((await fetchRolls(id)).map(r => r.submitted)).toEqual([true, true]);
        th.testComplete();
    });

    test("only the owner or a system admin may import", async () => {
        const id = await createIdRollElection();
        const res = await th.importBallots(id, {
            race_order: RACE_ORDER,
            ballots: [ballot('P-0001')],
            voter_ids: ['AliceID'],
        }, testInputs.user2token);
        expect(res.statusCode).toBe(401);
        expect(await fetchBallots(id)).toHaveLength(0);
        th.testComplete();
    });
});

describe("Import ballots — election without a voter list (ballots only)", () => {
    // MultiRaceElection: open_open, two STAR races with candidates 0,1,2 each
    const MULTI_RACE_ORDER = [
        { race_id: '0', candidate_id_order: ['0', '1', '2'] },
        { race_id: '1', candidate_id_order: ['0', '1', '2'] },
    ];
    const multiBallot = (ballot_id: string): ImportBallotRow => ({
        ballot_id,
        orderedVotes: [[5, 3, 0, null, null], [null, 4, 1, null, null]],
    });

    test("happy path: ballots stored with no voter list involved", async () => {
        const id = await createElection(withSettings(testInputs.MultiRaceElection, PAPER_ENABLED));
        const res = await th.importBallots(id, {
            race_order: MULTI_RACE_ORDER,
            ballots: [multiBallot('A1'), multiBallot('A2'), multiBallot('A3')],
        }, testInputs.user1token);
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ imported: 3, voters_marked: 0 });

        const ballots = await fetchBallots(id);
        expect(ballots.map(b => b.ballot_id).sort()).toEqual(['A1', 'A2', 'A3']);
        expect(ballots[0].votes).toHaveLength(2);
        expect(ballots[0].votes[1].scores.map(s => s.score)).toEqual([null, 4, 1]);
        th.testComplete();
    });

    test("voter ids are rejected because there is no roll to mark", async () => {
        const id = await createElection(withSettings(testInputs.MultiRaceElection, PAPER_ENABLED));
        const res = await th.importBallots(id, {
            race_order: MULTI_RACE_ORDER,
            ballots: [multiBallot('A1')],
            voter_ids: ['someone'],
        }, testInputs.user1token);
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toContain('no voter list');
        expect(await fetchBallots(id)).toHaveLength(0);
        th.testComplete();
    });

    test("duplicate ballot ids within the upload are rejected", async () => {
        const id = await createElection(withSettings(testInputs.MultiRaceElection, PAPER_ENABLED));
        const res = await th.importBallots(id, {
            race_order: MULTI_RACE_ORDER,
            ballots: [multiBallot('A1'), multiBallot('A2'), multiBallot('A1')],
        }, testInputs.user1token);
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toContain('Repeated ballot_id');
        expect(res.body.error).toContain('ballot 3');
        expect(await fetchBallots(id)).toHaveLength(0);
        th.testComplete();
    });

    test("race_order must cover every race", async () => {
        const id = await createElection(withSettings(testInputs.MultiRaceElection, PAPER_ENABLED));
        const res = await th.importBallots(id, {
            race_order: [MULTI_RACE_ORDER[0]],
            ballots: [{ ballot_id: 'A1', orderedVotes: [[5, 3, 0, null, null]] }],
        }, testInputs.user1token);
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toContain('race_order is missing');
        th.testComplete();
    });

    test("an out-of-range score rejects the whole import and names the ballot", async () => {
        const id = await createElection(withSettings(testInputs.MultiRaceElection, PAPER_ENABLED));
        const res = await th.importBallots(id, {
            race_order: MULTI_RACE_ORDER,
            ballots: [multiBallot('A1'), { ballot_id: 'A2', orderedVotes: [[9, 3, 0, null, null], [null, 4, 1, null, null]] }],
        }, testInputs.user1token);
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toContain('Invalid ballot 2');
        expect(res.body.error).toContain('out of bounds');
        expect(await fetchBallots(id)).toHaveLength(0);
        th.testComplete();
    });

    test("an empty upload is rejected", async () => {
        const id = await createElection(withSettings(testInputs.MultiRaceElection, PAPER_ENABLED));
        const res = await th.importBallots(id, { race_order: MULTI_RACE_ORDER, ballots: [] }, testInputs.user1token);
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toContain('No ballots');
        th.testComplete();
    });
});

describe("Import ballots — election state", () => {
    test("a draft election rejects imports", async () => {
        const id = await createElection(withSettings({ ...testInputs.MultiRaceElection, state: 'draft' } as Election, PAPER_ENABLED));
        const res = await th.importBallots(id, {
            race_order: [{ race_id: '0', candidate_id_order: ['0', '1', '2'] }, { race_id: '1', candidate_id_order: ['0', '1', '2'] }],
            ballots: [{ ballot_id: 'A1', orderedVotes: [[5, 3, 0, null, null], [null, 4, 1, null, null]] }],
        }, testInputs.user1token);
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toContain("state is 'draft'");
        expect(await fetchBallots(id)).toHaveLength(0);
        th.testComplete();
    });

    test("a closed election rejects imports", async () => {
        const id = await createElection(withSettings({ ...testInputs.MultiRaceElection, state: 'closed' } as Election, PAPER_ENABLED));
        const res = await th.importBallots(id, {
            race_order: [{ race_id: '0', candidate_id_order: ['0', '1', '2'] }, { race_id: '1', candidate_id_order: ['0', '1', '2'] }],
            ballots: [{ ballot_id: 'A1', orderedVotes: [[5, 3, 0, null, null], [null, 4, 1, null, null]] }],
        }, testInputs.user1token);
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toContain("state is 'closed'");
        th.testComplete();
    });

    test("the legacy per-row uploadBallots endpoint no longer accepts live elections", async () => {
        const id = await createIdRollElection();
        const res = await th.uploadBallots(
            id,
            [{ ballot: { orderedVotes: [[5, 0, 4, null, null]] }, voter_id: 'AliceID' }],
            RACE_ORDER,
            testInputs.user1token,
        );
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toContain('importBallots');
        expect(await fetchBallots(id)).toHaveLength(0);
        th.testComplete();
    });
});
