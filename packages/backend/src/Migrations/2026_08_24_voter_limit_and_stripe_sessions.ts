import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema.alterTable('electionDB')
        .addColumn('voter_limit', 'integer')
        .execute()

    // Backfill: no election that already has more than 100 voters on its roll
    // today becomes retroactively unable to keep its current voters.
    await sql`
        UPDATE "electionDB" e
        SET voter_limit = GREATEST(100, (
            SELECT COUNT(*)::integer
            FROM "electionRollDB" r
            WHERE r.election_id = e.election_id AND r.head = true
        ))
    `.execute(db)

    await db.schema.alterTable('electionDB')
        .alterColumn('voter_limit', (col) => col.setNotNull())
        .execute()

    await db.schema
        .createTable('stripeCheckoutSessionsDB')
        .addColumn('id', 'serial', (col) => col.primaryKey())
        .addColumn('election_id', 'varchar', (col) => col.notNull())
        .addColumn('user_id', 'varchar', (col) => col.notNull())
        .addColumn('line_items', 'jsonb', (col) => col.notNull())
        .addColumn('voter_count_granted', 'integer')
        .addColumn('stripe_checkout_session_id', 'varchar', (col) => col.notNull().unique())
        .addColumn('stripe_customer_id', 'varchar')
        .addColumn('status', 'varchar', (col) => col.notNull())
        .addColumn('created_date', 'timestamptz', (col) => col.notNull())
        .execute()

    await db.schema
        .createIndex('idx_stripe_checkout_sessions_election_id')
        .on('stripeCheckoutSessionsDB')
        .column('election_id')
        .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('stripeCheckoutSessionsDB').execute()

    await db.schema.alterTable('electionDB')
        .dropColumn('voter_limit')
        .execute()
}
