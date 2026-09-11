import { Kysely } from 'kysely'

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's documented migration pattern: migrations must stay decoupled from the current (evolving) Database schema type
export async function up(db: Kysely<any>): Promise<void> {
    //Updating Election Rolls, adds new columns, default values, and changes primary key to set of election id, voter id, and update date
    await db.schema.alterTable('electionRollDB')
        .dropConstraint('electionRollDB_pkey')
        .execute()

    await db.schema.alterTable('electionRollDB')
        .addColumn('create_date', 'varchar')
        .addColumn('update_date', 'varchar')
        .addColumn('head', 'boolean')
        .execute()

    await db.updateTable('electionRollDB')
        .set({
            create_date: new Date().toISOString(),
            update_date: Date.now().toString(),
            head: true
        })
        .execute()

    await db.schema.alterTable('electionRollDB')
        .alterColumn('create_date', (col) => col.setNotNull())
        .alterColumn('update_date', (col) => col.setNotNull())
        .alterColumn('head', (col) => col.setNotNull())
        .execute()

    await db.schema.alterTable('electionRollDB')
        .addPrimaryKeyConstraint('electionRollDB_pkey', ['election_id', 'voter_id', 'update_date'])
        .execute()



    //Updating Election, adds new columns, default values, and changes primary key to set of election id, and update date
    await db.schema.alterTable('electionDB')
        .dropConstraint('electionDB_pkey')
        .execute()

    await db.schema.alterTable('electionDB')
        .addColumn('update_date', 'varchar')
        .addColumn('head', 'boolean')
        .execute()

    await db.updateTable('electionDB')
        .set({
            update_date: Date.now().toString(),
            head: true
        })
        .execute()

    await db.schema.alterTable('electionDB')
        .alterColumn('update_date', (col) => col.setNotNull())
        .alterColumn('head', (col) => col.setNotNull())
        .execute()

    await db.schema.alterTable('electionDB')
        .addPrimaryKeyConstraint('electionDB_pkey', ['election_id', 'update_date'])
        .execute()


    //Updating Ballots, adds new column, default values, and changes primary key to set of ballot id, and update date
    await db.schema.alterTable('ballotDB')
        .dropConstraint('ballotDB_pkey')
        .execute()

    await db.schema.alterTable('ballotDB')
        .addColumn('create_date', 'varchar')
        .addColumn('update_date', 'varchar')
        .addColumn('head', 'boolean')
        .execute()

    await db.updateTable('ballotDB')
        .set({
            create_date: new Date().toISOString(),
            update_date: Date.now().toString(),
            head: true
        })
        .execute()

    await db.schema.alterTable('ballotDB')
        .alterColumn('create_date', (col) => col.setNotNull())
        .alterColumn('update_date', (col) => col.setNotNull())
        .alterColumn('head', (col) => col.setNotNull())
        .execute()


    await db.schema.alterTable('ballotDB')
        .addPrimaryKeyConstraint('ballotDB_pkey', ['ballot_id', 'update_date'])
        .execute()

    await db.schema.createIndex('electionDB_head')
        .on('electionDB')
        .column('head')
        .execute()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's documented migration pattern: migrations must stay decoupled from the current (evolving) Database schema type
export async function down(db: Kysely<any>): Promise<void> {
    // Election Rolls
    await db.schema.alterTable('electionRollDB')
        .dropColumn('create_date')
        .dropColumn('update_date')
        .dropColumn('head')
        .execute()

    await db.schema.alterTable('electionRollDB')
        .dropConstraint('electionRollDB_pkey')
        .execute()


    await db.schema.alterTable('electionRollDB')
        .addPrimaryKeyConstraint('electionRollDB_pkey', ['voter_id'])
        .execute()

    // Election
    await db.schema.alterTable('electionDB')
        .dropColumn('update_date')
        .dropColumn('head')
        .execute()

    await db.schema.alterTable('electionDB')
        .dropConstraint('electionDB_pkey')
        .execute()


    await db.schema.alterTable('electionDB')
        .addPrimaryKeyConstraint('electionDB_pkey', ['election_id'])
        .execute()

    await db.schema.alterTable('electionDB')
        .dropIndex('electionDB_head')
        .execute()

    // Ballots
    await db.schema.alterTable('ballotDB')
        .dropColumn('create_date')
        .dropColumn('update_date')
        .dropColumn('head')
        .execute()

    await db.schema.alterTable('ballotDB')
        .dropConstraint('electionRollDB_pkey')
        .execute()

    await db.schema.alterTable('ballotDB')
        .addPrimaryKeyConstraint('ballotDB_pkey', ['ballot_id'])
        .execute()
}