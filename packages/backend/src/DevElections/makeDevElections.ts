import * as path from 'path'
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })

import servicelocator from '../ServiceLocator'
import { DevElectionDefinition, validateDefinition } from './types'
import { ElectionState } from '@equal-vote/star-vote-shared/domain_model/ElectionStates'

const DAY_MS = 24 * 60 * 60 * 1000;

// Spread n timestamps evenly across (fromMs, toMs), avoiding the endpoints so
// rows don't sit exactly at the finalize moment or "now".
function spreadTimes(n: number, fromMs: number, toMs: number): number[] {
    if (n === 0) return [];
    if (n === 1) return [Math.floor((fromMs + toMs) / 2)];
    return Array.from({ length: n }, (_, i) => Math.floor(fromMs + (toMs - fromMs) * ((i + 0.5) / n)));
}

// Synthetic timeline anchors keyed off "now". Each state's row carries the
// update_date corresponding to when the election entered that state.
function makeTimeline(targetState: ElectionState, nowMs: number) {
    const createdMs = nowMs - 35 * DAY_MS;
    const finalizedMs = nowMs - 30 * DAY_MS;
    const openedMs = nowMs - 28 * DAY_MS;
    const closedMs = nowMs - 2 * DAY_MS;
    const archivedMs = nowMs - 1 * DAY_MS;

    // Build the chain of state transitions the election went through. The last
    // entry is the live (head=true) row; everything else is historical.
    const chain: { state: ElectionState; updateMs: number }[] = [];
    if (targetState === 'draft') {
        chain.push({ state: 'draft', updateMs: nowMs - 5 * DAY_MS });
    } else {
        chain.push({ state: 'draft', updateMs: createdMs });
        chain.push({ state: 'finalized', updateMs: finalizedMs });
        if (targetState !== 'finalized') {
            chain.push({ state: 'open', updateMs: openedMs });
            if (targetState === 'closed' || targetState === 'archived') {
                chain.push({ state: 'closed', updateMs: closedMs });
            }
            if (targetState === 'archived') {
                chain.push({ state: 'archived', updateMs: archivedMs });
            }
        }
    }

    // Window during which ballots could legitimately have been cast.
    // - draft: anytime since creation (test ballots)
    // - finalized: no ballots possible yet
    // - open: from open moment to now
    // - closed/archived: open window was (openedMs, closedMs)
    let ballotWindow: { fromMs: number; toMs: number } | null = null;
    if (targetState === 'draft') {
        ballotWindow = { fromMs: chain[0].updateMs, toMs: nowMs };
    } else if (targetState === 'open') {
        ballotWindow = { fromMs: openedMs, toMs: nowMs };
    } else if (targetState === 'closed' || targetState === 'archived') {
        ballotWindow = { fromMs: openedMs, toMs: closedMs };
    }
    // 'finalized' state: ballotWindow stays null — no ballots are valid.

    const earliestMs = chain[0].updateMs;
    const liveMs = chain[chain.length - 1].updateMs;
    return { chain, ballotWindow, earliestMs, liveMs };
}

// Import all dev election definitions here
import wizardstar from './elections/wizardstar'
import emailtracking from './elections/emailtracking'
import writeins from './elections/writeins'
import tiechecks from './elections/tiechecks'
import starprordering from './elections/starprordering'

const allDefinitions: DevElectionDefinition[] = [
    wizardstar,
    emailtracking,
    writeins,
    tiechecks,
    starprordering,
];

async function main() {
    const args = process.argv.slice(2);
    const forceRecreate = args.includes('--force');

    const db = servicelocator.database();

    // Validate all definitions before touching the database
    for (const def of allDefinitions) {
        validateDefinition(def);
    }

    console.info(`makedevelections: ${allDefinitions.length} election(s) to process`);
    console.info(`  --force flag: ${forceRecreate ? 'ON (will delete and recreate existing)' : 'OFF (will leave existing alone)'}`);

    for (const def of allDefinitions) {
        console.info(`\nProcessing: ${def.electionId}`);

        // Check if election already exists
        const existing = await db
            .selectFrom('electionDB')
            .selectAll()
            .where('election_id', '=', def.electionId)
            .where('head', '=', true)
            .executeTakeFirst();

        if (existing) {
            if (!forceRecreate) {
                console.info(`  Election already exists, skipping (use --force to recreate)`);
                continue;
            }
            // Delete existing election data (all versions), ballots, and election roll entries
            console.info(`  Deleting existing election data...`);
            await db.deleteFrom('ballotDB').where('election_id', '=', def.electionId).execute();
            await db.deleteFrom('electionRollDB').where('election_id', '=', def.electionId).execute();
            await db.deleteFrom('emailEventsDB').where('election_id', '=', def.electionId).execute();
            await db.deleteFrom('electionDB').where('election_id', '=', def.electionId).execute();
        }

        // Build a synthetic timeline so the public history endpoint shows
        // realistic events: rows for each state transition, ballots only in
        // the window when voting was actually open, rolls across the full
        // lifetime.
        const now = Date.now();
        const { chain, ballotWindow, earliestMs, liveMs } = makeTimeline(def.election.state, now);
        const baseElection = {
            ...def.election,
            create_date: new Date(earliestMs).toISOString(),
        };

        console.info(`  Inserting ${chain.length} election row(s)...`);
        for (let i = 0; i < chain.length; i++) {
            const { state, updateMs } = chain[i];
            await db.insertInto('electionDB').values({
                ...baseElection,
                state,
                head: i === chain.length - 1,
                update_date: updateMs.toString(),
            }).execute();
        }

        // Check for existing ballots (in case election was deleted but ballots somehow remain, or --force path)
        const existingBallots = await db
            .selectFrom('ballotDB')
            .selectAll()
            .where('election_id', '=', def.electionId)
            .where('head', '=', true)
            .execute();

        if (existingBallots.length > 0) {
            if (!forceRecreate) {
                console.info(`  ${existingBallots.length} ballot(s) already exist, skipping ballot insertion (use --force to recreate)`);
                continue;
            }
            console.info(`  Deleting ${existingBallots.length} existing ballot(s)...`);
            await db.deleteFrom('ballotDB').where('election_id', '=', def.electionId).execute();
        }

        // Insert ballots — only within the legitimate voting window. A
        // 'finalized' election has no window yet; skip ballots if any.
        const ballots = def.makeBallots();
        if (ballots.length > 0 && ballotWindow === null) {
            console.warn(`  Skipping ${ballots.length} ballot(s): state '${def.election.state}' has no voting window`);
        } else if (ballots.length > 0 && ballotWindow !== null) {
            const ballotTimes = spreadTimes(ballots.length, ballotWindow.fromMs, ballotWindow.toMs);
            const timedBallots = ballots.map((b, i) => ({
                ...b,
                create_date: new Date(ballotTimes[i]).toISOString(),
                update_date: ballotTimes[i].toString(),
                date_submitted: ballotTimes[i],
            }));
            console.info(`  Inserting ${timedBallots.length} ballot(s)...`);
            await db.insertInto('ballotDB').values(timedBallots).execute();
        }

        // Insert election rolls (if defined). Rolls can span the full lifetime
        // including pre-finalize — admins routinely pre-load a roll in draft.
        if (def.makeElectionRolls) {
            const rolls = def.makeElectionRolls();
            const rollTimes = spreadTimes(rolls.length, earliestMs, liveMs);
            const timedRolls = rolls.map((r, i) => ({
                ...r,
                create_date: new Date(rollTimes[i]).toISOString(),
                update_date: rollTimes[i].toString(),
            }));
            console.info(`  Inserting ${timedRolls.length} election roll(s)...`);
            await db.insertInto('electionRollDB').values(timedRolls).execute();
        }

        // Insert email events (if defined)
        if (def.makeEmailEvents) {
            const events = def.makeEmailEvents();
            console.info(`  Inserting ${events.length} email event(s)...`);
            for (const event of events) {
                await db.insertInto('emailEventsDB').values(event).execute();
            }
        }

        console.info(`  Done.`);
    }

    console.info('\nAll dev elections processed.');
    await db.destroy();
}

main().catch((err) => {
    console.error('makedevelections failed:', err);
    process.exit(1);
});
