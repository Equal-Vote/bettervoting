import 'dotenv/config';
import request from "supertest";
import { Conflict } from "@curveball/http-errors";
import makeApp from "../app";
import ServiceLocator from "../ServiceLocator";
import Logger from "../Services/Logging/Logger";
import { TestHelper } from "./TestHelper";
import testInputs from "./testInputs";
import { Election } from "@equal-vote/star-vote-shared/domain_model/Election";
import { ElectionRoll } from "@equal-vote/star-vote-shared/domain_model/ElectionRoll";
import { Ballot, NewBallot } from "@equal-vote/star-vote-shared/domain_model/Ballot";
import { Race } from "@equal-vote/star-vote-shared/domain_model/Race";
import { ElectionSettings } from "@equal-vote/star-vote-shared/domain_model/ElectionSettings";

// The public audit log is derived from stored rows, so its integrity rests on
// two things these tests pin down: clients cannot write the rows it reads from
// (ballot history), and the writes it depends on cannot be lost to a
// concurrent writer or reported as done when they were not (roll history,
// most importantly the voter-ID reveal).

const app = makeApp();
const th = new TestHelper();

afterEach(() => {
    jest.restoreAllMocks();
    th.afterEach();
});

const waitForQueue = async () => (await th.eventQueue).waitUntilJobsFinished();

const REVEAL_ACTION_TYPE = '🚨 VOTER_ID_REVEALED';

// ServiceLocator is jest.mock()'d, so these are the in-memory stores.
const rollStore = ServiceLocator.electionRollDb();
const ctx = Logger.createContext('auditIntegrity.test');

const headRoll = (electionId: string, voterId: string): ElectionRoll => {
    const rows = (rollStore as unknown as { _electionRolls: ElectionRoll[] })._electionRolls;
    const head = rows.find(r => r.election_id === electionId && r.voter_id === voterId && r.head);
    if (!head) throw new Error(`no head roll row for ${voterId}`);
    return head;
};

const revealActions = (roll: ElectionRoll) => (roll.history ?? []).filter(a => a.action_type === REVEAL_ACTION_TYPE);

const reveal = (electionId: string, email: string) => request(app)
    .post(`/API/Election/${electionId}/rolls/revealVoterId`)
    .set("Cookie", ["id_token=" + testInputs.user1token])
    .set("Accept", "application/json")
    .send({ email });

describe("ballot history is server-authoritative", () => {
    const DraftElection: Election = {
        election_id: "0",
        title: 'History Forgery Election',
        state: 'draft',
        frontend_url: '',
        owner_id: 'Alice1234',
        races: [{
            race_id: 'race0',
            title: 'Best Leader',
            num_winners: 1,
            voting_method: 'STAR',
            candidates: [
                { candidate_id: '0', candidate_name: 'Alice' },
                { candidate_id: '1', candidate_name: 'Bob' },
            ],
        }] as Race[],
        settings: {
            voter_access: 'open',
            voter_authentication: {},
        } as ElectionSettings,
    } as Election;

    test("a voter's forged submitted_via_admin entries are never stored", async () => {
        const created = await th.createElection(DraftElection, testInputs.user1token);
        expect(created.statusCode).toBe(200);
        const electionId: string = created.election.election_id;
        // Finalize; with no start time the next load auto-opens it for voting.
        const finalized = await th.postRequest(
            `/API/Election/${electionId}/finalize`,
            { expected_update_date: created.election.update_date },
            testInputs.user1token,
        );
        expect(finalized.statusCode).toBe(200);
        expect((await th.fetchElectionById(electionId, testInputs.user1token)).election.state).toBe('open');

        // A ballot whose history claims an admin uploaded thousands of ballots
        // in the future, with a note in the admin's mouth.
        const forgedAt = Date.now() + 24 * 60 * 60 * 1000;
        const forged = {
            election_id: electionId,
            votes: [{ race_id: 'race0', scores: [{ candidate_id: '0', score: 5 }, { candidate_id: '1', score: 0 }] }],
            history: Array.from({ length: 5 }, (_, i) => ({
                action_type: 'submitted_via_admin',
                actor: '',
                timestamp: forgedAt + i,
                note: 'FORGED-NOTE',
            })),
        } as unknown as NewBallot;
        const cast = await th.submitBallot(electionId, forged, testInputs.user1token);
        expect(cast.statusCode).toBe(200);
        await waitForQueue();

        // Stored history is exactly the server's own entry.
        const stored = (ServiceLocator.ballotsDb() as unknown as { ballots: Ballot[] }).ballots.filter(b => b.election_id === electionId);
        expect(stored).toHaveLength(1);
        expect((stored[0].history ?? []).map(a => a.action_type)).toEqual(['submitted_via_browser']);
        expect(JSON.stringify(stored[0].history)).not.toContain('FORGED-NOTE');
        th.testComplete();
    });
});

describe("roll writes under concurrency", () => {
    let electionId = "";

    beforeAll(async () => {
        const created = await th.createElection(testInputs.EmailRollElection, testInputs.user1token);
        if (created.statusCode !== 200) throw new Error(`could not create election: ${created.statusCode}`);
        electionId = created.election.election_id;
        const added = await th.submitElectionRoll(electionId, testInputs.EmailRoll, testInputs.user1token);
        if (added.statusCode !== 200) throw new Error(`could not add roll: ${added.statusCode}`);
    });

    test("the store refuses a write built from a version that is no longer the head", async () => {
        const voterId = (await rollStore.getByElectionIdAndEmail(electionId, 'Bob@email.com', ctx))!.voter_id;
        const first = (await rollStore.getByVoterID(electionId, voterId, ctx))!;
        const second = (await rollStore.getByVoterID(electionId, voterId, ctx))!;

        first.history = [...(first.history ?? []), { action_type: 'first-writer', actor: 'a', timestamp: Date.now() }];
        await expect(rollStore.update(first, ctx, 'first', String(first.update_date))).resolves.toBeTruthy();

        // Same starting version, written after `first` replaced it: stale.
        second.history = [...(second.history ?? []), { action_type: 'second-writer', actor: 'b', timestamp: Date.now() }];
        await expect(rollStore.update(second, ctx, 'second', String(second.update_date))).rejects.toBeInstanceOf(Conflict);

        // The head still carries the first writer's entry; nothing was overwritten.
        const actions = (headRoll(electionId, voterId).history ?? []).map(a => a.action_type);
        expect(actions).toContain('first-writer');
        expect(actions).not.toContain('second-writer');
        th.testComplete();
    });

    test("a voter ID is disclosed only after its reveal is durably recorded", async () => {
        const voterId = (await rollStore.getByElectionIdAndEmail(electionId, 'Alice@email.com', ctx))!.voter_id;
        const revealsBefore = revealActions(headRoll(electionId, voterId)).length;

        // Every attempt to record the reveal loses to another writer.
        const update = jest.spyOn(rollStore, 'update').mockRejectedValue(new Conflict('Concurrent write detected, please try again'));

        const response = await reveal(electionId, 'Alice@email.com');
        expect(response.statusCode).toBe(409);
        expect(response.body).not.toHaveProperty('voter_id');
        expect(JSON.stringify(response.body)).not.toContain(voterId);
        // Bounded retries, then give up.
        expect(update).toHaveBeenCalledTimes(3);
        expect(revealActions(headRoll(electionId, voterId))).toHaveLength(revealsBefore);
        th.testComplete();
    });

    test("a reveal that loses one write race is retried from a fresh read and recorded exactly once", async () => {
        const voterId = (await rollStore.getByElectionIdAndEmail(electionId, 'Alice@email.com', ctx))!.voter_id;
        const revealsBefore = revealActions(headRoll(electionId, voterId)).length;

        const realUpdate = rollStore.update.bind(rollStore);
        const update = jest.spyOn(rollStore, 'update')
            .mockImplementationOnce(async (roll, ctx, reason, _expected) => {
                // Another writer sneaks in between the controller's read and its write.
                const current = (await rollStore.getByVoterID(roll.election_id, roll.voter_id, ctx))!;
                current.history = [...(current.history ?? []), { action_type: 'sneaky-writer', actor: 'x', timestamp: Date.now() }];
                await realUpdate(current, ctx, 'interleaved write', String(current.update_date));
                // ...so the controller's own write, built from the old version, is refused.
                return realUpdate(roll, ctx, reason, _expected);
            });

        const response = await reveal(electionId, 'Alice@email.com');
        expect(response.statusCode).toBe(200);
        expect(response.body.voter_id).toBe(voterId);
        expect(update).toHaveBeenCalledTimes(2);

        const head = headRoll(electionId, voterId);
        expect(revealActions(head)).toHaveLength(revealsBefore + 1);
        // The retry layered the reveal on top of the other writer's change instead of replacing it.
        expect((head.history ?? []).map(a => a.action_type)).toContain('sneaky-writer');
        th.testComplete();
    });

    test("a roll state change that cannot be recorded fails instead of pretending", async () => {
        const voterId = (await rollStore.getByElectionIdAndEmail(electionId, 'Bob@email.com', ctx))!.voter_id;
        const stateBefore = headRoll(electionId, voterId).state;
        jest.spyOn(rollStore, 'update').mockRejectedValue(new Conflict('Concurrent write detected, please try again'));

        const response = await th.postRequest(
            `/API/Election/${electionId}/rolls/flag`,
            { electionRollEntry: { voter_id: voterId } },
            testInputs.user1token,
        );
        expect(response.statusCode).toBe(409);
        expect(headRoll(electionId, voterId).state).toBe(stateBefore);
        th.testComplete();
    });
});
