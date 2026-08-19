import ServiceLocator from '../../ServiceLocator';
import Logger from '../../Services/Logging/Logger';
import { NotFound } from '@curveball/http-errors';
import { IElectionRequest } from '../../IRequest';
import { Response, NextFunction } from 'express';
import { ElectionRollAction } from '@equal-vote/star-vote-shared/domain_model/ElectionRoll';
import { BallotAction } from '@equal-vote/star-vote-shared/domain_model/Ballot';

const className = 'election.Controllers';

const DAY_MS = 24 * 60 * 60 * 1000;

// Voter-related events expose only day-level granularity to avoid leaking
// per-voter timing that could be cross-referenced with traffic logs or
// roll-history timestamps to deanonymize. Truncating (rather than rounding to
// the nearest day) keeps the reported day the day the event actually happened.
const truncateToDayIso = (ms: number) => new Date(Math.floor(ms / DAY_MS) * DAY_MS).toISOString();

// First-time-reached count milestones (cumulative) for ballot casts. Coarse
// enough to bucket large elections, fine enough to give small ones some signal.
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
const ADMIN_SUBMIT_ACTION_TYPE = 'submitted_via_admin';

// Admin-submitted ballots from a single uploadBallots request are stamped with
// independent Date.now() calls, so a large batch can straddle several seconds.
// Anything within this gap is treated as one upload action.
const UPLOAD_BATCH_GAP_MS = 5 * 60 * 1000;

type MilestoneType = 'ballots_milestone' | 'ballots_edited_milestone';

// Spelled out one member per type (rather than reusing MilestoneType for a
// single member) so the union stays discriminated on `type`.
export type HistoryEvent =
    | { type: 'state_change'; timestamp: string; from: string | null; to: string }
    | { type: 'preliminary_results_change'; timestamp: string; to: boolean }
    | { type: 'ballots_milestone'; timestamp: string; count: number }
    | { type: 'ballots_edited_milestone'; timestamp: string; count: number }
    | { type: 'upload_ballots'; timestamp: string; count: number }
    | { type: 'voter_id_revealed'; timestamp: string };

// The row shapes buildHistory needs — a structural subset of what the
// electionDB / ballotDB / electionRollDB selects return.
export type ElectionHistoryRow = { state: string; settings: { public_results?: boolean } | null; update_date: Date | string };
export type BallotHistoryRow = { ballot_id: string; update_date: Date | string; history?: BallotAction[] | null };
export type RollHistoryRow = { history?: ElectionRollAction[] | null };

const msToIso = (ms: number) => new Date(ms).toISOString();

// update_date is typed `Date | string` in the domain model but always stored as
// a ms-since-epoch string in practice (see Elections/Ballots/Rolls DB writes).
const parseUpdateMs = (value: Date | string): number =>
    typeof value === 'string' ? parseInt(value, 10) : value.getTime();

// Milestones are voter-related, so timestamps are truncated to the day.
const emitMilestones = (
    type: MilestoneType,
    ladder: number[],
    sortedFirstSeenMs: number[],
): { event: HistoryEvent; rawMs: number }[] =>
    ladder
        .filter(m => sortedFirstSeenMs.length >= m)
        .map(m => {
            const rawMs = sortedFirstSeenMs[m - 1];
            return { event: { type, timestamp: truncateToDayIso(rawMs), count: m }, rawMs };
        });

// Collapse a sorted list of admin-submit timestamps into upload batches, so a
// single "upload 400 ballots" action reads as one event rather than 400.
const clusterUploads = (sortedMs: number[]): { startMs: number; count: number }[] => {
    const batches: { startMs: number; count: number }[] = [];
    for (const ms of sortedMs) {
        const current = batches[batches.length - 1];
        if (current !== undefined && ms - current.startMs <= UPLOAD_BATCH_GAP_MS) {
            current.count++;
        } else {
            batches.push({ startMs: ms, count: 1 });
        }
    }
    return batches;
};

/**
 * Derive the public audit log from raw version rows. Kept free of Express and
 * the DB so the event-shaping rules can be unit tested directly.
 *
 * `electionRows` must be ordered by update_date ascending (transitions are read
 * by walking it), and `rollHeadRows` must be the head=true roll rows only.
 * `ballotRows` may arrive in any order.
 */
export const buildHistory = (
    electionRows: ElectionHistoryRow[],
    ballotRows: BallotHistoryRow[],
    rollHeadRows: RollHistoryRow[],
): { finalizedAtMs: number; events: HistoryEvent[] } => {
    const finalizeRow = electionRows.find(r => r.state === 'finalized');
    if (!finalizeRow) {
        throw new NotFound('Election has not been finalized');
    }
    const finalizedAtMs = parseUpdateMs(finalizeRow.update_date);

    // Track (event, rawMs) pairs so we can filter and order on the true
    // timestamp even when the emitted event hides sub-day precision.
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

    // Collect every version of every ballot, plus the admin-submit actions
    // recorded in their history arrays. Grouping by ballot_id (rather than
    // trusting row order) is what makes the first-cast vs edit split reliable.
    const versionsByBallot = new Map<string, number[]>();
    const adminSubmitTimes: number[] = [];
    const seenAdminSubmit = new Set<string>();
    for (const row of ballotRows) {
        const rowMs = parseUpdateMs(row.update_date);
        const versions = versionsByBallot.get(row.ballot_id);
        if (versions === undefined) {
            versionsByBallot.set(row.ballot_id, [rowMs]);
        } else {
            versions.push(rowMs);
        }
        // A ballot's history array is re-persisted on every version, so the same
        // admin-submit action shows up on multiple rows; dedupe per ballot.
        const history = (row.history ?? []) as BallotAction[];
        for (const action of history) {
            if (action?.action_type === ADMIN_SUBMIT_ACTION_TYPE && typeof action.timestamp === 'number') {
                const key = `${row.ballot_id}:${action.timestamp}`;
                if (seenAdminSubmit.has(key)) continue;
                seenAdminSubmit.add(key);
                adminSubmitTimes.push(action.timestamp);
            }
        }
    }

    // Earliest version of a ballot is the cast; every later one is an edit.
    const castTimes: number[] = [];
    const editTimes: number[] = [];
    for (const versions of versionsByBallot.values()) {
        versions.sort((a, b) => a - b);
        castTimes.push(versions[0]);
        editTimes.push(...versions.slice(1));
    }

    castTimes.sort((a, b) => a - b);
    editTimes.sort((a, b) => a - b);
    adminSubmitTimes.sort((a, b) => a - b);

    pairs.push(...emitMilestones('ballots_milestone', COUNT_MILESTONES, castTimes));
    pairs.push(...emitMilestones('ballots_edited_milestone', EDIT_MILESTONES, editTimes));

    // Admin ballot uploads. The batch size is reported exactly — it is a
    // property of the admin's action, not of any individual voter — but the
    // timestamp is still truncated to the day since it bounds when the
    // uploaded ballots entered the count.
    for (const batch of clusterUploads(adminSubmitTimes)) {
        pairs.push({
            event: { type: 'upload_ballots', timestamp: truncateToDayIso(batch.startMs), count: batch.count },
            rawMs: batch.startMs,
        });
    }

    // Break-glass voter ID reveals: scan each head roll row's history field
    // for the reveal action_type. Voter-related, so truncate to day.
    for (const roll of rollHeadRows) {
        const history = (roll.history ?? []) as ElectionRollAction[];
        for (const action of history) {
            if (action?.action_type === REVEAL_ACTION_TYPE && typeof action.timestamp === 'number') {
                pairs.push({
                    event: { type: 'voter_id_revealed', timestamp: truncateToDayIso(action.timestamp) },
                    rawMs: action.timestamp,
                });
            }
        }
    }

    // Events from the finalize moment onward, sorted chronologically. The
    // transition into 'finalized' is itself the first event; everything before
    // it is drafting, which isn't part of the public record.
    const events = pairs
        .filter(p => p.rawMs >= finalizedAtMs)
        .sort((a, b) => a.rawMs - b.rawMs)
        .map(p => p.event);

    return { finalizedAtMs, events };
};

const getElectionHistory = async (req: IElectionRequest, res: Response, next: NextFunction) => {
    const electionId = req.election.election_id;
    Logger.info(req, `${className}.getElectionHistory ${electionId}`);

    const db = ServiceLocator.database();

    // Need full version histories (head=false rows included) for elections and
    // ballots. For rolls we only need head=true: each update inserts a fresh row
    // carrying the full appended history array, so the head row contains every
    // reveal action ever recorded.
    const [electionRows, ballotRows, rollHeadRows] = await Promise.all([
        db.selectFrom('electionDB')
            .where('election_id', '=', electionId)
            .select(['state', 'settings', 'update_date'])
            .orderBy('update_date', 'asc')
            .execute(),
        db.selectFrom('ballotDB')
            .where('election_id', '=', electionId)
            .select(['ballot_id', 'update_date', 'history'])
            .orderBy('update_date', 'asc')
            .execute(),
        db.selectFrom('electionRollDB')
            .where('election_id', '=', electionId)
            .where('head', '=', true)
            .select(['history'])
            .execute(),
    ]);

    const { finalizedAtMs, events } = buildHistory(
        electionRows as ElectionHistoryRow[],
        ballotRows as BallotHistoryRow[],
        rollHeadRows as RollHistoryRow[],
    );

    res.json({
        election_id: electionId,
        finalized_at: msToIso(finalizedAtMs),
        events,
    });
};

export { getElectionHistory };
