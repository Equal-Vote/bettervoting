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
        rolls.forEach(r => expect(r.history?.at(-1)?.action_type).toBe('submitted_via_admin'));
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

    test("voter groups: an unknown group, or any group when groups are off, rejects the import", async () => {
        const groupsOn = await createElection(withSettings(testInputs.IDRollElection, {
            ...PAPER_ENABLED, voter_groups_enabled: true, voter_groups: ['North', 'South'],
        }));
        expect((await th.submitElectionRoll(groupsOn, testInputs.IDRoll, testInputs.user1token)).statusCode).toBe(200);
        const voter_ids = [testInputs.IDRoll[0].voter_id];

        const unknown = await th.importBallots(groupsOn, {
            race_order: RACE_ORDER, ballots: [{ ...ballot('G1'), precinct: 'Nroth' }], voter_ids,
        }, testInputs.user1token);
        expect(unknown.statusCode).toBe(400);
        expect(unknown.body.error).toContain('Unknown voter groups: "Nroth"');
        expect(await fetchBallots(groupsOn)).toHaveLength(0);

        // matched without regard to case, stored with the election's spelling
        const known = await th.importBallots(groupsOn, {
            race_order: RACE_ORDER, ballots: [{ ...ballot('G1'), precinct: 'north' }], voter_ids,
        }, testInputs.user1token);
        expect(known.statusCode).toBe(200);
        expect((await fetchBallots(groupsOn))[0].precinct).toBe('North');

        const groupsOff = await createIdRollElection();
        const off = await th.importBallots(groupsOff, {
            race_order: RACE_ORDER, ballots: [{ ...ballot('G1'), precinct: 'North' }], voter_ids,
        }, testInputs.user1token);
        expect(off.statusCode).toBe(400);
        expect(off.body.error).toContain('Voter groups are not enabled');
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
        expect(res.body.error).toContain('Ballot "A2", Race 0 / A: STAR scores go from 0 to 5, not 9');
        expect(await fetchBallots(id)).toHaveLength(0);
        th.testComplete();
    });

    // race 0 takes write-ins, race 1 doesn't
    const writeInElection = () => {
        const base = withSettings(testInputs.MultiRaceElection, PAPER_ENABLED);
        return { ...base, races: base.races.map((r, i) => i === 0 ? { ...r, enable_write_in: true } : r) };
    };

    test("write-ins are stored the way online write-ins are", async () => {
        const id = await createElection(writeInElection());
        const res = await th.importBallots(id, {
            race_order: MULTI_RACE_ORDER,
            ballots: [{ ...multiBallot('W1'), write_ins: [{ race_id: '0', name: ' Zed ', mark: 4 }] }],
        }, testInputs.user1token);
        expect(res.statusCode).toBe(200);
        const [stored] = await fetchBallots(id);
        expect(stored.votes[0].scores.at(-1)).toEqual({ candidate_id: 'cwi-Zed', score: 4, write_in_name: 'Zed' });
        expect(stored.votes[1].scores).toHaveLength(3);
        th.testComplete();
    });

    test("a write-in on a race without write-ins, or out of range, is refused by race and slot", async () => {
        const id = await createElection(writeInElection());
        const noWriteIns = await th.importBallots(id, {
            race_order: MULTI_RACE_ORDER,
            ballots: [{ ...multiBallot('W1'), write_ins: [{ race_id: '1', name: 'Zed', mark: 4 }] }],
        }, testInputs.user1token);
        expect(noWriteIns.statusCode).toBe(400);
        expect(noWriteIns.body.error).toContain(`Race "Race 1" doesn't allow write-ins`);

        const outOfRange = await th.importBallots(id, {
            race_order: MULTI_RACE_ORDER,
            ballots: [{ ...multiBallot('W1'), write_ins: [{ race_id: '0', name: 'Zed', mark: 7 }] }],
        }, testInputs.user1token);
        expect(outOfRange.statusCode).toBe(400);
        expect(outOfRange.body.error).toContain('Ballot "W1", Race 0 / write-in 1: STAR scores go from 0 to 5, not 7');
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
    const MULTI_RACE_ORDER = [{ race_id: '0', candidate_id_order: ['0', '1', '2'] }, { race_id: '1', candidate_id_order: ['0', '1', '2'] }];
    const multiBallot = (ballot_id: string): ImportBallotRow => ({ ballot_id, orderedVotes: [[5, 3, 0, null, null], [null, 4, 1, null, null]] });

    test("a draft election takes test uploads, and finalizing deletes them", async () => {
        const id = await createElection(withSettings({ ...testInputs.MultiRaceElection, state: 'draft' } as Election, PAPER_ENABLED));
        const res = await th.importBallots(id, { race_order: MULTI_RACE_ORDER, ballots: [multiBallot('A1'), multiBallot('A2')] }, testInputs.user1token);
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ imported: 2, voters_marked: 0 });
        expect(await fetchBallots(id)).toHaveLength(2);

        const finalized = await th.finalizeElection(id, testInputs.user1token);
        expect(finalized.statusCode).toBe(200);
        expect(await ServiceLocator.ballotsDb().getBallotsByElectionID(id, th.ctx)).toHaveLength(0);
        th.testComplete();
    });

    test("a draft election with a voter list checks the voter file but marks nobody", async () => {
        const id = await createElection(withSettings({ ...testInputs.IDRollElection, state: 'draft' } as Election, PAPER_ENABLED));
        expect((await th.submitElectionRoll(id, testInputs.IDRoll, testInputs.user1token)).statusCode).toBe(200);

        const notOnRoll = await th.importBallots(id, {
            race_order: RACE_ORDER, ballots: [ballot('P-1'), ballot('P-2')], voter_ids: ['AliceID', 'NobodyID'],
        }, testInputs.user1token);
        expect(notOnRoll.statusCode).toBe(400);
        expect(notOnRoll.body.error).toContain('Not on the voter list');

        const res = await th.importBallots(id, {
            race_order: RACE_ORDER, ballots: [ballot('P-1'), ballot('P-2')], voter_ids: ['AliceID', 'BobID'],
        }, testInputs.user1token);
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ imported: 2, voters_marked: 0 });
        expect((await fetchRolls(id)).map(r => r.submitted)).toEqual([false, false]);

        // finalizing removes the test ballots and leaves every voter free to vote
        expect((await th.finalizeElection(id, testInputs.user1token)).statusCode).toBe(200);
        expect(await ServiceLocator.ballotsDb().getBallotsByElectionID(id, th.ctx)).toHaveLength(0);
        expect((await fetchRolls(id)).map(r => r.submitted)).toEqual([false, false]);
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

describe("Import ballots — never together with ballot updates", () => {
    // ballot_updates is only allowed on email list elections
    const emailListDraft = { ...testInputs.EmailRollElection, state: 'draft' } as Election;

    test("an election can't be created with both", async () => {
        const res = await th.createElection(withSettings(emailListDraft, { ...PAPER_ENABLED, ballot_updates: true }), testInputs.user1token);
        expect(res.statusCode).toBe(400);
        th.testComplete();
    });

    test("a draft can't turn on ballot updates while uploads are on, or the reverse", async () => {
        const withUploads = await createElection(withSettings(emailListDraft, PAPER_ENABLED));
        const current = (await th.fetchElectionById(withUploads, testInputs.user1token)).election!;
        const addUpdates = await th.editElection(withSettings(current, { ballot_updates: true }), testInputs.user1token);
        expect(addUpdates.statusCode).toBe(400);
        expect(JSON.stringify(addUpdates.err)).toContain('cannot be combined with uploaded paper ballots');

        const withUpdates = await createElection(withSettings(emailListDraft, { ballot_updates: true }));
        const current2 = (await th.fetchElectionById(withUpdates, testInputs.user1token)).election!;
        const addUploads = await th.editElection(withSettings(current2, PAPER_ENABLED), testInputs.user1token);
        expect(addUploads.statusCode).toBe(400);
        th.testComplete();
    });

    test("upload settings can't be changed once the election is finalized", async () => {
        const id = await createElection(withSettings({ ...testInputs.MultiRaceElection, state: 'draft' } as Election, PAPER_ENABLED));
        expect((await th.finalizeElection(id, testInputs.user1token)).statusCode).toBe(200);
        const current = (await th.fetchElectionById(id, testInputs.user1token)).election!;
        const res = await th.editElection(withSettings(current, { allowed_submit_types: ['submitted_via_browser'] }), testInputs.user1token);
        expect(res.statusCode).toBe(400);
        expect((await th.fetchElectionById(id, testInputs.user1token)).election!.settings.allowed_submit_types).toContain('submitted_via_admin');
        th.testComplete();
    });

    test("an election saved with both before this rule still refuses uploads", async () => {
        const id = await createElection(withSettings(testInputs.EmailRollElection, PAPER_ENABLED));
        const stored = (await ServiceLocator.electionsDb().getElectionByID(id, th.ctx))!;
        stored.settings.ballot_updates = true;
        await ServiceLocator.electionsDb().updateElection(stored, th.ctx, 'test: legacy settings', String(stored.update_date));
        const res = await th.importBallots(id, {
            race_order: RACE_ORDER, ballots: [ballot('P-1')], voter_ids: ['Alice@email.com'],
        }, testInputs.user1token);
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toContain('update their ballot');
        th.testComplete();
    });
});

describe("Delete uploaded ballots", () => {
    test("withdraws uploads and unmarks their voters, keeps online ballots, and frees the ids", async () => {
        const id = await createIdRollElection();
        const uploaded = await th.importBallots(id, { race_order: RACE_ORDER, ballots: [ballot('P-1')], voter_ids: ['AliceID'] }, testInputs.user1token);
        expect(uploaded.statusCode).toBe(200);
        const online = await th.submitBallotWithId(id, testInputs.Ballot2, testInputs.user1token, 'BobID');
        expect(online.statusCode).toBe(200);
        await (await th.eventQueue as MockEventQueue).waitUntilJobsFinished();
        expect(await fetchBallots(id)).toHaveLength(2);

        const res = await th.deleteUploadedBallots(id, testInputs.user1token);
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ deleted: 1, voters_unmarked: 1 });

        const left = await fetchBallots(id);
        expect(left).toHaveLength(1);
        expect(left[0].ballot_id).not.toBe('P-1');
        const rolls = await fetchRolls(id);
        expect(rolls.find(r => r.voter_id === 'AliceID')!.submitted).toBe(false);
        expect(rolls.find(r => r.voter_id === 'AliceID')!.history?.at(-1)?.action_type).toBe('uploaded_ballots_deleted');
        expect(rolls.find(r => r.voter_id === 'BobID')!.submitted).toBe(true);

        // the withdrawn ballot stays in the store, archived with the deletion recorded
        const stored = await ServiceLocator.ballotsDb().getBallotsByElectionID(id, th.ctx);
        expect(stored.some(b => b.ballot_id === 'P-1')).toBe(false);

        // the corrected file can be uploaded with the same ids and voters
        const again = await th.importBallots(id, { race_order: RACE_ORDER, ballots: [ballot('P-1', [1, 2, 3])], voter_ids: ['AliceID'] }, testInputs.user1token);
        expect(again.statusCode).toBe(200);
        expect(await fetchBallots(id)).toHaveLength(2);
        th.testComplete();
    });

    test("only the election admin can delete, and nothing to delete is fine", async () => {
        const id = await createIdRollElection();
        const forbidden = await th.deleteUploadedBallots(id, testInputs.user2token);
        expect(forbidden.statusCode).toBe(401);
        const empty = await th.deleteUploadedBallots(id, testInputs.user1token);
        expect(empty.statusCode).toBe(200);
        expect(empty.body).toEqual({ deleted: 0, voters_unmarked: 0 });
        th.testComplete();
    });
});
