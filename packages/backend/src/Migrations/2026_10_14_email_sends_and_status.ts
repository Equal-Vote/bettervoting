import { Kysely } from 'kysely'

// emailSendsDB: one row per admin action that sends email (a blast, a single email, a
// round of invitations).
// emailStatusDB: one row per email we try to send, with where it currently stands.
// emailEventsDB keeps the raw SendGrid events for diagnosis; an index on event_timestamp
// lets the 30-day cleanup find old rows without scanning the table.

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's documented migration pattern: migrations must stay decoupled from the current (evolving) Database schema type
export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
        .createTable('emailSendsDB')
        .addColumn('send_id', 'varchar', (col) => col.primaryKey())
        .addColumn('election_id', 'varchar', (col) => col.notNull())
        .addColumn('kind', 'varchar', (col) => col.notNull())
        .addColumn('audience', 'varchar', (col) => col.notNull())
        .addColumn('subject', 'text')
        .addColumn('body', 'text')
        .addColumn('sent_by', 'varchar', (col) => col.notNull())
        .addColumn('created_at', 'timestamptz', (col) => col.notNull())
        .addColumn('recipient_count', 'integer', (col) => col.notNull())
        .execute()

    await db.schema
        .createIndex('idx_email_sends_election')
        .on('emailSendsDB')
        .columns(['election_id', 'created_at'])
        .execute()

    await db.schema
        .createTable('emailStatusDB')
        .addColumn('id', 'serial', (col) => col.primaryKey())
        .addColumn('send_id', 'varchar', (col) => col.notNull().references('emailSendsDB.send_id'))
        .addColumn('election_id', 'varchar', (col) => col.notNull())
        .addColumn('voter_id', 'varchar', (col) => col.notNull())
        // Null until SendGrid accepts the email and gives it an X-Message-Id.
        .addColumn('message_id', 'varchar')
        .addColumn('status', 'varchar', (col) => col.notNull())
        .addColumn('created_at', 'timestamptz', (col) => col.notNull())
        .addColumn('updated_at', 'timestamptz', (col) => col.notNull())
        .execute()

    // Webhook lookups. Unique so one SendGrid message can't map to two emails; Postgres
    // treats NULLs as distinct, so the many not-yet-sent rows don't collide.
    await db.schema
        .createIndex('idx_email_status_message_id')
        .on('emailStatusDB')
        .column('message_id')
        .unique()
        .execute()

    // Per-send counts for the election's list of sends.
    await db.schema
        .createIndex('idx_email_status_send_status')
        .on('emailStatusDB')
        .columns(['send_id', 'status'])
        .execute()

    // The emails sent to one voter.
    await db.schema
        .createIndex('idx_email_status_election_voter')
        .on('emailStatusDB')
        .columns(['election_id', 'voter_id'])
        .execute()

    await db.schema
        .createIndex('idx_email_events_timestamp')
        .on('emailEventsDB')
        .column('event_timestamp')
        .execute()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's documented migration pattern: migrations must stay decoupled from the current (evolving) Database schema type
export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropIndex('idx_email_events_timestamp').execute()
    await db.schema.dropTable('emailStatusDB').execute()
    await db.schema.dropTable('emailSendsDB').execute()
}
