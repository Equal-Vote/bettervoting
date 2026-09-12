import { Kysely } from 'kysely'

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's documented migration pattern: migrations must stay decoupled from the current (evolving) Database schema type
export async function up(db: Kysely<any>): Promise<void> {
    await db.schema.alterTable('electionDB')
        /* ballot_source types
        live_election: Ballots submitted by voters during election
        prior_election: Election admin uploaded ballots from a previous election
        */
        .addColumn('ballot_source', 'varchar', (col) => col.notNull().defaultTo('live_election'))
        // unique identifier for mapping public archive elections to their real elections
        // ex. Genola_11022021_CityCouncil
        .addColumn('public_archive_id', 'varchar' )
        // support_email is obsolete, it has been superceded by settings.contact_email
        .dropColumn('support_email')
        .execute()

    await db.updateTable('electionDB')
        .set({
            ballot_source: 'live_election',
            public_archive_id: null,
        })
        .execute()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's documented migration pattern: migrations must stay decoupled from the current (evolving) Database schema type
export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.alterTable('electionDB')
        .dropColumn('ballot_source')
        .dropColumn('public_archive_id')
        .addColumn('support_email', 'varchar')
        .execute()
}