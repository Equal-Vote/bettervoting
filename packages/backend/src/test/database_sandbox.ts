require('dotenv').config()

import servicelocator from '../ServiceLocator'
import { Election } from '@equal-vote/star-vote-shared/domain_model/Election'
import { ElectionRoll, ElectionRollState } from '@equal-vote/star-vote-shared/domain_model/ElectionRoll'
import { sql } from 'kysely'
import { hashString } from '../Controllers/controllerUtils'
const db = servicelocator.database()

function buildElection(i: string, update_date: string, head: boolean): Election {
    return {
        election_id: i,
        title: i,
        frontend_url: '',
        races: [],
        owner_id: i,
        create_date: i,
        state: 'draft',
        settings: {
            voter_access: 'open',
            voter_authentication: {
                ip_address: true,
            }
        },
        update_date: update_date,
        head: head,
        ballot_source: 'live_election',
    }
}

function buildVoter(voter_id: string, election_id: string): ElectionRoll {
    return {
        election_id: election_id,
        voter_id: voter_id,
        submitted: false,
        state: ElectionRollState.approved,
        head: true,
        create_date: Date.now().toString(),
        update_date: new Date().toISOString(),
    }
}

//reset db
async function ResetDatabases() {
    console.info('Reseting DB')
    await db.deleteFrom('electionDB').execute()
    await db.deleteFrom('ballotDB').execute()
    await db.deleteFrom('electionRollDB').execute()
}

async function PrintQueryExpaination(query: any) {
    const explaination = await query.explain('json', sql`analyze`)
    console.info(JSON.stringify(explaination[0]['QUERY PLAN'], null, 4))
}

async function AddElections(elections: Election | Election[]) {
    return await db.insertInto('electionDB').values(elections).execute()
}
async function AddVoters(voter: ElectionRoll | ElectionRoll[]) {
    await db.insertInto('electionRollDB').values(voter).execute()
}

async function GetLatestAll(i: string) {
    const query = db
        .selectFrom("electionDB")
        .selectAll()
        .where((eb) =>
            eb(
                eb.refTuple("election_id", "update_date"),
                "in",
                eb
                    .selectFrom("electionDB as t2")
                    .select((eb) => [
                        "t2.election_id",
                        eb.fn.max("t2.update_date").as("update_date"),
                    ])
                    .groupBy("t2.election_id")
                    .$asTuple("election_id", "update_date"),
            ),
        )
    await PrintQueryExpaination(query)
}

async function GetLatestAll2() {
    const query = db
        .selectFrom("electionDB")
        .selectAll()
        .where('head', '=', true)

    await PrintQueryExpaination(query)
}

async function addBatchElections() {
    console.info('Adding Elections')
    for (let i = 0; i < 10000; i++) {
        const elections: Election[] = []
        const id = hashString(i.toString())
        for (let j = 0; j < 99; j++) {
            const date = hashString(j.toString())
            elections.push(buildElection(id ?? '', date ?? '', false))
        }
        const date = hashString('100')
        elections.push(buildElection(id ?? '', date ?? '', true))
        console.info('Batch: ' + i)
        await AddElections(elections)
    }
}

async function UpdateElection(election: Election) {

    await db.transaction().execute(async (trx) => {
        await trx.updateTable('electionDB')
            .where('election_id', '=', election.election_id)
            .where('head', '=', true)
            .set('head', false)
            .execute()

        return await trx.insertInto('electionDB')
            .values(election)
            .returningAll()
            .executeTakeFirstOrThrow()
    })
}

async function RunTest() {
    // await ResetDatabases()
    // const id = hashString('id')
    // await AddElections(buildElection(id, '0', true))

    // for (let j = 1; j < 99; j++) {
    //     await UpdateElection(buildElection(id, j.toString(), true))
    // }
    console.info(await db.selectFrom('electionDB').select(['head', 'update_date']).execute())
}



// async function RunTest() {
//     await ResetDatabases()

//     // await GetLatestAll()
//     // await GetLatestAll2()

// }
RunTest()