import 'dotenv/config';
import { TestHelper } from "./TestHelper";
import testInputs from "./testInputs";
import ServiceLocator from "../ServiceLocator";
import { Election } from "@equal-vote/star-vote-shared/domain_model/Election";
import { AUDIT_LOG_CUTOFF_DATE, AUDIT_NOTE_MAX_LENGTH } from "@equal-vote/star-vote-shared/domain_model/AuditLog";

// Covers the optional admin explanation (`audit_note`) on auditable actions and
// the creation-date cutoff that decides whether an election has a public audit
// log at all. The election store is the jest mock (see setupTests.ts), so the
// cutoff is driven by rewriting create_date on the stored row — the API always
// stamps "now" on creation, and "now" moves across the cutoff over time.

const th = new TestHelper();

afterEach(() => {
    jest.clearAllMocks();
    th.afterEach();
});

const ONE_MS_BEFORE_CUTOFF = new Date(new Date(AUDIT_LOG_CUTOFF_DATE).getTime() - 1).toISOString();

const setCreateDate = (electionId: string, createDate: string) => {
    // ServiceLocator is jest.mock()'d, so electionsDb() is the in-memory mock
    // store; TS still sees the real module's type, hence the cast.
    const store = ServiceLocator.electionsDb() as unknown as { elections: Election[] };
    const stored = store.elections.find(e => e.election_id === electionId);
    if (!stored) throw new Error(`election ${electionId} not in mock store`);
    stored.create_date = createDate;
};

const createDraft = async (createDate: string): Promise<string> => {
    const response = await th.createElection({ ...testInputs.Election1, state: 'draft' }, testInputs.user1token);
    expect(response.statusCode).toBe(200);
    setCreateDate(response.election.election_id, createDate);
    return response.election.election_id;
};

const finalize = async (electionId: string, body: object) => {
    const current = await th.fetchElectionById(electionId, testInputs.user1token);
    return th.postRequest(
        `/API/Election/${electionId}/finalize`,
        { expected_update_date: current.election?.update_date, ...body },
        testInputs.user1token,
    );
};

// The log is public, so by default it is fetched anonymously.
const getHistory = (electionId: string, userToken: string | null = null) => th.getRequest(`/API/Election/${electionId}/history`, userToken);

describe("audit note", () => {
    test("is stored with the action and returned in the audit log", async () => {
        const electionId = await createDraft(AUDIT_LOG_CUTOFF_DATE);

        const finalized = await finalize(electionId, { audit_note: '  Board <b>approved</b> the ballot on Monday  ' });
        expect(finalized.statusCode).toBe(200);
        // Markup stripped, whitespace trimmed, plain text preserved.
        expect(finalized.body.election.audit_note).toBe('Board approved the ballot on Monday');

        // Election1 has no start time, so loading it (as the history request
        // does) auto-opens it: the log is [finalized, open].
        const history = await getHistory(electionId);
        expect(history.statusCode).toBe(200);
        expect(history.body.events).toEqual([
            expect.objectContaining({ type: 'state_change', to: 'finalized', audit_note: 'Board approved the ballot on Monday' }),
            expect.objectContaining({ type: 'state_change', to: 'open' }),
        ]);
        th.testComplete();
    });

    test("is optional: callers that send nothing still work and the event carries no note", async () => {
        const electionId = await createDraft(AUDIT_LOG_CUTOFF_DATE);

        const finalized = await finalize(electionId, {});
        expect(finalized.statusCode).toBe(200);
        expect(finalized.body.election.audit_note).toBeNull();

        const history = await getHistory(electionId);
        expect(history.statusCode).toBe(200);
        expect(history.body.events.length).toBeGreaterThanOrEqual(1);
        for (const event of history.body.events) {
            expect(event.type).toBe('state_change');
            expect(event).not.toHaveProperty('audit_note');
        }
        th.testComplete();
    });

    test("is not carried forward onto a later action that gives none", async () => {
        const electionId = await createDraft(AUDIT_LOG_CUTOFF_DATE);
        expect((await finalize(electionId, { audit_note: 'finalize note' })).statusCode).toBe(200);

        // Election1 has no scheduled times: the next fetch auto-opens it (an
        // automatic transition, so no note), and then open/close is manual.
        const current = await th.fetchElectionById(electionId, testInputs.user1token);
        expect(current.election.state).toBe('open');
        expect(current.election.audit_note).toBeNull();

        const closed = await th.postRequest(
            `/API/Election/${electionId}/setOpenState`,
            { open: false, expected_update_date: current.election.update_date },
            testInputs.user1token,
        );
        expect(closed.statusCode).toBe(200);
        expect(closed.body.election.audit_note).toBeNull();

        const history = await getHistory(electionId);
        expect(history.statusCode).toBe(200);
        expect(history.body.events).toEqual([
            expect.objectContaining({ type: 'state_change', to: 'finalized', audit_note: 'finalize note' }),
            expect.objectContaining({ type: 'state_change', to: 'open' }),
            expect.objectContaining({ type: 'state_change', to: 'closed' }),
        ]);
        expect(history.body.events[1]).not.toHaveProperty('audit_note');
        expect(history.body.events[2]).not.toHaveProperty('audit_note');
        th.testComplete();
    });

    test("rejects a note over the length bound", async () => {
        const electionId = await createDraft(AUDIT_LOG_CUTOFF_DATE);
        const tooLong = await finalize(electionId, { audit_note: 'x'.repeat(AUDIT_NOTE_MAX_LENGTH + 1) });
        expect(tooLong.statusCode).toBe(400);
        // Nothing was written: the election is still a draft.
        const current = await th.fetchElectionById(electionId, testInputs.user1token);
        expect(current.election.state).toBe('draft');
        th.testComplete();
    });

    test("rejects a non-string note", async () => {
        const electionId = await createDraft(AUDIT_LOG_CUTOFF_DATE);
        const bad = await finalize(electionId, { audit_note: { text: 'nope' } });
        expect(bad.statusCode).toBe(400);
        th.testComplete();
    });
});

describe("audit log creation-date cutoff", () => {
    test("hides the log of a pre-cutoff election from the public", async () => {
        const electionId = await createDraft(ONE_MS_BEFORE_CUTOFF);
        expect((await finalize(electionId, {})).statusCode).toBe(200);

        // Anonymous
        const anonymous = await getHistory(electionId);
        expect(anonymous.statusCode).toBe(403);
        expect(anonymous.body).not.toHaveProperty('events');

        // Logged in, but holding no role on this election
        const outsider = await getHistory(electionId, testInputs.user2token);
        expect(outsider.statusCode).toBe(403);
        expect(outsider.body).not.toHaveProperty('events');
        th.testComplete();
    });

    test("still returns the log of a pre-cutoff election to its admins", async () => {
        const electionId = await createDraft(ONE_MS_BEFORE_CUTOFF);
        expect((await finalize(electionId, { audit_note: 'owner note' })).statusCode).toBe(200);

        // user1 owns Election1 (canEditElection), so the cutoff doesn't apply.
        const history = await getHistory(electionId, testInputs.user1token);
        expect(history.statusCode).toBe(200);
        expect(history.body.events[0]).toEqual(
            expect.objectContaining({ type: 'state_change', to: 'finalized', audit_note: 'owner note' }),
        );
        th.testComplete();
    });

    test("returns the log for an election created on or after the cutoff", async () => {
        const electionId = await createDraft(AUDIT_LOG_CUTOFF_DATE);
        expect((await finalize(electionId, {})).statusCode).toBe(200);

        const history = await getHistory(electionId);
        expect(history.statusCode).toBe(200);
        expect(history.body.election_id).toBe(electionId);
        // finalized, then auto-opened on load (no start time)
        expect(history.body.events.map((e: { type: string; to?: string }) => [e.type, e.to])).toEqual([
            ['state_change', 'finalized'],
            ['state_change', 'open'],
        ]);
        th.testComplete();
    });
});
