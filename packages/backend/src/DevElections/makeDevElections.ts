import * as path from 'path'
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })

import servicelocator from '../ServiceLocator'
import { DevElectionDefinition, validateDefinition } from './types'

// Import all dev election definitions here
import wizardstar from './elections/wizardstar'
import emailtracking from './elections/emailtracking'
import writeins from './elections/writeins'
import tiechecks from './elections/tiechecks'

const allDefinitions: DevElectionDefinition[] = [
    wizardstar,
    emailtracking,
    writeins,
    tiechecks,
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

        // Insert election
        console.info(`  Inserting election...`);
        const election = { ...def.election };
        election.create_date = new Date().toISOString();
        election.update_date = Date.now().toString();
        election.head = true;
        await db.insertInto('electionDB').values(election).execute();

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

        // Insert ballots
        const ballots = def.makeBallots();
        console.info(`  Inserting ${ballots.length} ballot(s)...`);
        await db.insertInto('ballotDB').values(ballots).execute();

        // Insert election rolls (if defined)
        if (def.makeElectionRolls) {
            const rolls = def.makeElectionRolls();
            console.info(`  Inserting ${rolls.length} election roll(s)...`);
            await db.insertInto('electionRollDB').values(rolls).execute();
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
