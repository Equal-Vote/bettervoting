import {
    buildHistory,
    BallotHistoryRow,
    ElectionHistoryRow,
    HistoryEvent,
    RollHistoryRow,
} from "../Controllers/Election/getElectionHistoryController";

const DAY_MS = 24 * 60 * 60 * 1000;

// A fixed UTC midnight so day-truncation assertions are exact.
const DAY0 = Date.UTC(2026, 0, 5);
const day = (n: number, hours = 0) => DAY0 + n * DAY_MS + hours * 60 * 60 * 1000;
const dayIso = (n: number) => new Date(DAY0 + n * DAY_MS).toISOString();

const electionRow = (
    state: string,
    ms: number,
    public_results = false,
): ElectionHistoryRow => ({ state, settings: { public_results }, update_date: ms.toString() });

const ballotRow = (
    ballot_id: string,
    ms: number,
    history?: { action_type: string; timestamp: number }[],
): BallotHistoryRow => ({
    ballot_id,
    update_date: ms.toString(),
    history: history as BallotHistoryRow['history'],
});

// Cast n ballots one hour apart starting at `startMs`.
const castBallots = (n: number, startMs: number, prefix = 'b'): BallotHistoryRow[] =>
    Array.from({ length: n }, (_, i) => ballotRow(`${prefix}${i}`, startMs + i * 60 * 60 * 1000));

const typesOf = (events: HistoryEvent[]) => events.map(e => e.type);
const only = <T extends HistoryEvent['type']>(events: HistoryEvent[], type: T) =>
    events.filter(e => e.type === type) as Extract<HistoryEvent, { type: T }>[];

describe("election audit log", () => {
    test("throws when the election was never finalized", () => {
        expect(() => buildHistory([electionRow('draft', day(0))], [], [])).toThrow();
    });

    test("starts at the transition into finalized and drops earlier drafting", () => {
        const { finalizedAtMs, events } = buildHistory(
            [
                electionRow('draft', day(0)),
                electionRow('draft', day(1)),
                electionRow('finalized', day(2)),
                electionRow('open', day(3)),
            ],
            [],
            [],
        );

        expect(finalizedAtMs).toBe(day(2));
        expect(events).toEqual([
            { type: 'state_change', timestamp: new Date(day(2)).toISOString(), from: 'draft', to: 'finalized' },
            { type: 'state_change', timestamp: new Date(day(3)).toISOString(), from: 'finalized', to: 'open' },
        ]);
    });

    test("records close/reopen cycles so admins can't hide them", () => {
        const { events } = buildHistory(
            [
                electionRow('draft', day(0)),
                electionRow('finalized', day(1)),
                electionRow('open', day(2)),
                electionRow('closed', day(3)),
                electionRow('open', day(4)),
                electionRow('closed', day(5)),
            ],
            [],
            [],
        );

        expect(only(events, 'state_change').map(e => [e.from, e.to])).toEqual([
            ['draft', 'finalized'],
            ['finalized', 'open'],
            ['open', 'closed'],
            ['closed', 'open'],
            ['open', 'closed'],
        ]);
    });

    test("reports preliminary results being toggled on and off", () => {
        const { events } = buildHistory(
            [
                electionRow('draft', day(0), false),
                electionRow('finalized', day(1), false),
                electionRow('open', day(2), true),
                electionRow('open', day(3), false),
            ],
            [],
            [],
        );

        expect(only(events, 'preliminary_results_change').map(e => [e.timestamp, e.to])).toEqual([
            [new Date(day(2)).toISOString(), true],
            [new Date(day(3)).toISOString(), false],
        ]);
    });

    test("emits ballot cast milestones on the ladder, truncated to the day", () => {
        const elections = [electionRow('draft', day(0)), electionRow('finalized', day(1))];
        // 12 ballots, one per day starting the day after finalization.
        const ballots = Array.from({ length: 12 }, (_, i) => ballotRow(`b${i}`, day(2 + i, 13)));

        const { events } = buildHistory(elections, ballots, []);
        const milestones = only(events, 'ballots_milestone');

        // Ladder is 1, 5, 10, 25, ... so 12 ballots yield exactly 1/5/10.
        expect(milestones.map(e => e.count)).toEqual([1, 5, 10]);
        // The 1st/5th/10th ballots landed on days 2, 6 and 11 at 13:00 UTC;
        // truncation must report those days, not the ones after.
        expect(milestones.map(e => e.timestamp)).toEqual([dayIso(2), dayIso(6), dayIso(11)]);
    });

    test("emits ballot edit milestones on the finer ladder", () => {
        const elections = [electionRow('draft', day(0)), electionRow('finalized', day(1))];
        // One ballot cast, then revised twice.
        const ballots = [
            ballotRow('b0', day(2)),
            ballotRow('b0', day(3)),
            ballotRow('b0', day(4)),
        ];

        const { events } = buildHistory(elections, ballots, []);

        expect(only(events, 'ballots_milestone').map(e => e.count)).toEqual([1]);
        // Edit ladder starts 1, 2, so two edits produce two milestones.
        expect(only(events, 'ballots_edited_milestone').map(e => [e.count, e.timestamp])).toEqual([
            [1, dayIso(3)],
            [2, dayIso(4)],
        ]);
    });

    test("splits casts from edits regardless of the order ballot rows arrive in", () => {
        const elections = [electionRow('draft', day(0)), electionRow('finalized', day(1))];
        // Two ballots, each revised once, deliberately shuffled.
        const ballots = [
            ballotRow('b1', day(6)),   // b1's edit
            ballotRow('b0', day(2)),   // b0's cast
            ballotRow('b1', day(4)),   // b1's cast
            ballotRow('b0', day(5)),   // b0's edit
        ];

        const { events } = buildHistory(elections, ballots, []);

        // 2 casts -> only the "1" milestone; earliest cast was day 2.
        expect(only(events, 'ballots_milestone').map(e => [e.count, e.timestamp])).toEqual([
            [1, dayIso(2)],
        ]);
        // 2 edits on days 5 and 6 -> milestones 1 and 2.
        expect(only(events, 'ballots_edited_milestone').map(e => [e.count, e.timestamp])).toEqual([
            [1, dayIso(5)],
            [2, dayIso(6)],
        ]);
    });

    test("collapses an admin bulk upload into a single event with an exact count", () => {
        const elections = [electionRow('draft', day(0)), electionRow('finalized', day(1))];
        // 4 admin-submitted ballots stamped seconds apart, as a real upload is.
        const uploadStart = day(3, 9);
        const ballots = Array.from({ length: 4 }, (_, i) =>
            ballotRow(`u${i}`, uploadStart + i * 1000, [
                { action_type: 'submitted_via_admin', timestamp: uploadStart + i * 1000 },
            ]),
        );

        const { events } = buildHistory(elections, ballots, []);
        const uploads = only(events, 'upload_ballots');

        expect(uploads).toEqual([
            { type: 'upload_ballots', timestamp: dayIso(3), count: 4 },
        ]);
    });

    test("separates upload batches that are far apart in time", () => {
        const elections = [electionRow('draft', day(0)), electionRow('finalized', day(1))];
        const ballots = [
            ballotRow('u0', day(2), [{ action_type: 'submitted_via_admin', timestamp: day(2) }]),
            ballotRow('u1', day(2, 1), [{ action_type: 'submitted_via_admin', timestamp: day(2, 1) }]),
            ballotRow('u2', day(5), [{ action_type: 'submitted_via_admin', timestamp: day(5) }]),
        ];

        const { events } = buildHistory(elections, ballots, []);

        expect(only(events, 'upload_ballots').map(e => [e.timestamp, e.count])).toEqual([
            [dayIso(2), 1],
            [dayIso(2), 1],
            [dayIso(5), 1],
        ]);
    });

    test("ignores browser submissions when counting uploads", () => {
        const elections = [electionRow('draft', day(0)), electionRow('finalized', day(1))];
        const ballots = [
            ballotRow('b0', day(2), [{ action_type: 'submitted_via_browser', timestamp: day(2) }]),
            ballotRow('b1', day(3), [{ action_type: 'submitted_via_browser', timestamp: day(3) }]),
        ];

        const { events } = buildHistory(elections, ballots, []);

        expect(only(events, 'upload_ballots')).toEqual([]);
    });

    test("counts an upload action once even when re-persisted across ballot versions", () => {
        const elections = [electionRow('draft', day(0)), electionRow('finalized', day(1))];
        const uploadedAt = day(2, 10);
        const uploadAction = { action_type: 'submitted_via_admin', timestamp: uploadedAt };
        // The ballot is later edited; the original upload action rides along on
        // the new version's history array.
        const ballots = [
            ballotRow('b0', uploadedAt, [uploadAction]),
            ballotRow('b0', day(4), [uploadAction, { action_type: 'submitted_via_browser', timestamp: day(4) }]),
        ];

        const { events } = buildHistory(elections, ballots, []);

        expect(only(events, 'upload_ballots')).toEqual([
            { type: 'upload_ballots', timestamp: dayIso(2), count: 1 },
        ]);
    });

    test("surfaces break-glass voter ID reveals at day precision", () => {
        const elections = [electionRow('draft', day(0)), electionRow('finalized', day(1))];
        const rolls: RollHistoryRow[] = [
            { history: [{ action_type: '🚨 VOTER_ID_REVEALED', actor: 'admin', timestamp: day(4, 17) }] },
            { history: [{ action_type: 'submit', actor: 'v2', timestamp: day(3) }] },
            { history: [{ action_type: '🚨 VOTER_ID_REVEALED', actor: 'admin', timestamp: day(6, 2) }] },
        ];

        const { events } = buildHistory(elections, [], rolls);

        expect(only(events, 'voter_id_revealed').map(e => e.timestamp)).toEqual([dayIso(4), dayIso(6)]);
    });

    test("drops reveals and ballots that predate finalization", () => {
        const elections = [electionRow('draft', day(0)), electionRow('finalized', day(5))];
        // Draft-mode test ballots and a pre-finalize reveal.
        const ballots = castBallots(3, day(1));
        const rolls: RollHistoryRow[] = [
            { history: [{ action_type: '🚨 VOTER_ID_REVEALED', actor: 'admin', timestamp: day(2) }] },
        ];

        const { events } = buildHistory(elections, ballots, rolls);

        expect(typesOf(events)).toEqual(['state_change']);
    });

    test("orders every event type chronologically by its true timestamp", () => {
        const elections = [
            electionRow('draft', day(0)),
            electionRow('finalized', day(1)),
            electionRow('open', day(2)),
            electionRow('open', day(6), true),
        ];
        const ballots = [
            ballotRow('b0', day(3)),
            ballotRow('u0', day(4), [{ action_type: 'submitted_via_admin', timestamp: day(4) }]),
            ballotRow('b0', day(5)),
        ];
        const rolls: RollHistoryRow[] = [
            { history: [{ action_type: '🚨 VOTER_ID_REVEALED', actor: 'admin', timestamp: day(7) }] },
        ];

        const { events } = buildHistory(elections, ballots, rolls);

        expect(typesOf(events)).toEqual([
            'state_change',              // day 1: finalized
            'state_change',              // day 2: open
            'ballots_milestone',         // day 3: 1st ballot
            'upload_ballots',            // day 4
            'ballots_edited_milestone',  // day 5: 1st edit
            'preliminary_results_change',// day 6
            'voter_id_revealed',         // day 7
        ]);
    });

    test("never leaks ballot ids, voter ids or actor names", () => {
        const elections = [electionRow('draft', day(0)), electionRow('finalized', day(1))];
        const ballots = [
            ballotRow('secret-ballot-id', day(2), [
                { action_type: 'submitted_via_admin', timestamp: day(2) },
            ]),
        ];
        const rolls: RollHistoryRow[] = [
            { history: [{ action_type: '🚨 VOTER_ID_REVEALED', actor: 'secret-admin', timestamp: day(3) }] },
        ];

        const { events } = buildHistory(elections, ballots, rolls);
        const serialized = JSON.stringify(events);

        expect(serialized).not.toContain('secret-ballot-id');
        expect(serialized).not.toContain('secret-admin');
    });
});
