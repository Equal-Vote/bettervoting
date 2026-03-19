import { Kysely } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
        .createTable('emailEventsDB')
        .addColumn('id', 'serial', (col) => col.primaryKey())
        .addColumn('message_id', 'varchar', (col) => col.notNull())
        .addColumn('election_id', 'varchar', (col) => col.notNull())
        .addColumn('voter_id', 'varchar', (col) => col.notNull())
        .addColumn('event_type', 'varchar', (col) => col.notNull())
        .addColumn('event_timestamp', 'bigint', (col) => col.notNull())
        .addColumn('details', 'json')
        .execute()

    await db.schema
        .createIndex('idx_email_events_election_voter')
        .on('emailEventsDB')
        .columns(['election_id', 'voter_id'])
        .execute()

    await db.schema
        .createIndex('idx_email_events_message_id')
        .on('emailEventsDB')
        .column('message_id')
        .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('emailEventsDB').execute()
}
