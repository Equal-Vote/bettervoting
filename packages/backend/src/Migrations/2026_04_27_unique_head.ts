import { Kysely, sql } from 'kysely'

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's documented migration pattern: migrations must stay decoupled from the current (evolving) Database schema type
export async function up(db: Kysely<any>): Promise<void> {
    await db.schema.createIndex('electionDB_unique_head')
        .on('electionDB')
        .column('election_id')
        .unique()
        .where(sql.ref('head'), '=', true)
        .execute()

    await db.schema.createIndex('ballotDB_unique_head')
        .on('ballotDB')
        .columns(['ballot_id', 'election_id'])
        .unique()
        .where(sql.ref('head'), '=', true)
        .execute()

    await db.schema.createIndex('electionRollDB_unique_head')
        .on('electionRollDB')
        .columns(['election_id', 'voter_id'])
        .unique()
        .where(sql.ref('head'), '=', true)
        .execute()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's documented migration pattern: migrations must stay decoupled from the current (evolving) Database schema type
export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropIndex('electionRollDB_unique_head').execute()
    await db.schema.dropIndex('ballotDB_unique_head').execute()
    await db.schema.dropIndex('electionDB_unique_head').execute()
}
