import ServiceLocator from '../../ServiceLocator';
import Logger from '../../Services/Logging/Logger';
import { NotFound } from '@curveball/http-errors';
import { IElectionRequest } from '../../IRequest';
import { Response, NextFunction } from 'express';
import { ElectionRollAction } from '@equal-vote/star-vote-shared/domain_model/ElectionRoll';

const className = 'election.Controllers';

const DAY_MS = 24 * 60 * 60 * 1000;

// Voter-related events expose only day-level granularity to avoid leaking
// per-voter timing that could be cross-referenced with traffic logs or
// roll-history timestamps to deanonymize.
const roundToDayIso = (ms: number) => new Date(Math.round(ms / DAY_MS) * DAY_MS).toISOString();

// First-time-reached count milestones (cumulative) for ballot casts and roll
// additions. Coarse enough to bucket large elections, fine enough to give small
// ones some signal.
const COUNT_MILESTONES = [
    1, 5, 10, 25, 50, 100, 250, 500,
    1000, 2500, 5000, 10000, 25000, 50000,
    100000, 250000, 500000, 1000000,
];

// Finer ladder for ballot edits — edits are rarer than casts and a single edit
// is already worth public attention.
const EDIT_MILESTONES = [
    1, 2, 5, 10, 25, 50, 100, 250, 500,
    1000, 2500, 5000, 10000, 25000, 50000, 100000,
];

const REVEAL_ACTION_TYPE = '🚨 VOTER_ID_REVEALED';

type MilestoneType = 'ballots_milestone' | 'rolls_milestone' | 'ballots_edited_milestone';

type HistoryEvent =
    | { type: 'finalization_summary'; timestamp: string; rolls_at_finalization: number; voter_ids_revealed_at_finalization: number }
    | { type: 'state_change'; timestamp: string; from: string | null; to: string }
    | { type: 'preliminary_results_change'; timestamp: string; to: boolean }
    | { type: MilestoneType; timestamp: string; count: number }
    | { type: 'voter_id_revealed'; timestamp: string };

const msToIso = (ms: number) => new Date(ms).toISOString();

// update_date is typed `Date | string` in the domain model but always stored as
// a ms-since-epoch string in practice (see Elections/Ballots/Rolls DB writes).
const parseUpdateMs = (value: Date | string): number =>
    typeof value === 'string' ? parseInt(value, 10) : value.getTime();

const firstSeenMsByKey = <T extends { update_date: Date | string }>(rows: T[], keyOf: (r: T) => string) => {
    const out = new Map<string, number>();
    for (const r of rows) {
        const ts = parseUpdateMs(r.update_date);
        const k = keyOf(r);
        const prior = out.get(k);
        if (prior === undefined || ts < prior) out.set(k, ts);
    }
    return out;
};

// Milestones are voter-related, so timestamps are rounded to the nearest day.
const emitMilestones = (
    type: MilestoneType,
    ladder: number[],
    sortedFirstSeenMs: number[],
): { event: HistoryEvent; rawMs: number }[] =>
    ladder
        .filter(m => sortedFirstSeenMs.length >= m)
        .map(m => {
            const rawMs = sortedFirstSeenMs[m - 1];
            return { event: { type, timestamp: roundToDayIso(rawMs), count: m }, rawMs };
        });

const getElectionHistory = async (req: IElectionRequest, res: Response, next: NextFunction) => {
    const electionId = req.election.election_id;
    Logger.info(req, `${className}.getElectionHistory ${electionId}`);

    const db = ServiceLocator.database();

    // Need full version histories (head=false rows included). For rolls we only
    // need head=true: each update inserts a fresh row carrying the full appended
    // history array, so the head row contains every reveal action ever recorded.
    const [electionRows, ballotRows, rollHeadRows] = await Promise.all([
        db.selectFrom('electionDB')
            .where('election_id', '=', electionId)
            .select(['state', 'settings', 'update_date'])
            .orderBy('update_date', 'asc')
            .execute(),
        db.selectFrom('ballotDB')
            .where('election_id', '=', electionId)
            .select(['ballot_id', 'update_date'])
            .orderBy('update_date', 'asc')
            .execute(),
        db.selectFrom('electionRollDB')
            .where('election_id', '=', electionId)
            .where('head', '=', true)
            .select(['voter_id', 'create_date', 'history'])
            .execute(),
    ]);

    const finalizeRow = electionRows.find(r => r.state === 'finalized');
    if (!finalizeRow) {
        throw new NotFound('Election has not been finalized');
    }
    const finalizedAtMs = parseUpdateMs(finalizeRow.update_date);

    // Track (event, rawMs) pairs so we can filter on the true timestamp even
    // when the emitted event hides sub-day precision.
    const pairs: { event: HistoryEvent; rawMs: number }[] = [];

    // State + preliminary-results transitions, walking electionDB rows in order.
    // These are admin actions, not voter actions, so the exact timestamp is fine.
    let prevState: string | null = null;
    let prevPublicResults: boolean | null = null;
    for (const row of electionRows) {
        const rowMs = parseUpdateMs(row.update_date);
        if (row.state !== prevState) {
            pairs.push({
                event: { type: 'state_change', timestamp: msToIso(rowMs), from: prevState, to: row.state },
                rawMs: rowMs,
            });
        }
        const publicResults = row.settings?.public_results ?? false;
        if (prevPublicResults !== null && publicResults !== prevPublicResults) {
            pairs.push({
                event: { type: 'preliminary_results_change', timestamp: msToIso(rowMs), to: publicResults },
                rawMs: rowMs,
            });
        }
        prevState = row.state;
        prevPublicResults = publicResults;
    }

    // Ballot cast milestones (earliest update_date per ballot_id = first-cast time).
    const ballotFirstSeen = firstSeenMsByKey(ballotRows, r => r.ballot_id);
    const castTimes = Array.from(ballotFirstSeen.values()).sort((a, b) => a - b);
    pairs.push(...emitMilestones('ballots_milestone', COUNT_MILESTONES, castTimes));

    // Roll-addition milestones. create_date on head=true rolls is preserved
    // from the original insert, so it doubles as the first-seen time for the voter.
    const rollAddTimes = rollHeadRows
        .map(r => new Date(r.create_date as string | Date).getTime())
        .sort((a, b) => a - b);
    pairs.push(...emitMilestones('rolls_milestone', COUNT_MILESTONES, rollAddTimes));

    // Ballot edit milestones: each row past the first for a given ballot_id is
    // an edit. Sort their timestamps and emit on the finer EDIT ladder.
    const editTimes: number[] = [];
    const seenBallot = new Set<string>();
    for (const row of ballotRows) {
        if (seenBallot.has(row.ballot_id)) {
            editTimes.push(parseUpdateMs(row.update_date));
        } else {
            seenBallot.add(row.ballot_id);
        }
    }
    editTimes.sort((a, b) => a - b);
    pairs.push(...emitMilestones('ballots_edited_milestone', EDIT_MILESTONES, editTimes));

    // Break-glass voter ID reveals: scan each head roll row's history field
    // for the reveal action_type. Voter-related, so round to day.
    for (const roll of rollHeadRows) {
        const history = (roll.history ?? []) as ElectionRollAction[];
        for (const action of history) {
            if (action?.action_type === REVEAL_ACTION_TYPE && typeof action.timestamp === 'number') {
                pairs.push({
                    event: { type: 'voter_id_revealed', timestamp: roundToDayIso(action.timestamp) },
                    rawMs: action.timestamp,
                });
            }
        }
    }

    // Compute the at-finalization snapshot from pre-finalize activity:
    // how many voters were already on the roll and how many break-glass
    // voter ID reveals had already happened. These collapse into a single
    // summary "event" pinned to the finalize moment.
    const rollsAtFinalization = rollHeadRows.filter(roll => {
        const createdMs = new Date(roll.create_date as string | Date).getTime();
        return createdMs <= finalizedAtMs;
    }).length;

    let revealsBeforeFinalization = 0;
    for (const roll of rollHeadRows) {
        const history = (roll.history ?? []) as ElectionRollAction[];
        for (const action of history) {
            if (action?.action_type === REVEAL_ACTION_TYPE
                && typeof action.timestamp === 'number'
                && action.timestamp <= finalizedAtMs) {
                revealsBeforeFinalization++;
            }
        }
    }

    const summary: HistoryEvent = {
        type: 'finalization_summary',
        timestamp: msToIso(finalizedAtMs),
        rolls_at_finalization: rollsAtFinalization,
        voter_ids_revealed_at_finalization: revealsBeforeFinalization,
    };

    // Events strictly after finalize, sorted chronologically. Pre-finalize
    // activity is captured by the summary above.
    const postFinalize = pairs
        .filter(p => p.rawMs > finalizedAtMs)
        .sort((a, b) => a.rawMs - b.rawMs)
        .map(p => p.event);

    res.json({
        election_id: electionId,
        finalized_at: msToIso(finalizedAtMs),
        events: [summary, ...postFinalize],
    });
};

export { getElectionHistory };
