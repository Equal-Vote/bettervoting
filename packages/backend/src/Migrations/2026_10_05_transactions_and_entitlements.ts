import { Kysely } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
    await db.schema
        .createTable('transactionsDB')
        .addColumn('id', 'serial', (col) => col.primaryKey())
        .addColumn('election_id', 'varchar', (col) => col.notNull())
        .addColumn('user_id', 'varchar', (col) => col.notNull())
        .addColumn('line_items', 'jsonb', (col) => col.notNull())
        .addColumn('stripe_checkout_session_id', 'varchar', (col) => col.notNull().unique())
        .addColumn('stripe_customer_id', 'varchar')
        .addColumn('status', 'varchar', (col) => col.notNull())
        .addColumn('created_date', 'timestamptz', (col) => col.notNull())
        .addColumn('completed_date', 'timestamptz')
        .execute()

    await db.schema
        .createIndex('idx_transactions_election_id')
        .on('transactionsDB')
        .column('election_id')
        .execute()

    await db.schema
        .createTable('entitlementsDB')
        .addColumn('id', 'serial', (col) => col.primaryKey())
        .addColumn('election_id', 'varchar', (col) => col.notNull())
        // Nullable: entitlements granted without a payment (e.g. admin grants) have no transaction
        .addColumn('transaction_id', 'integer', (col) => col.references('transactionsDB.id'))
        .addColumn('type', 'varchar', (col) => col.notNull())
        // Signed: refunds/revocations are recorded as negative rows rather than mutating history
        .addColumn('amount', 'integer', (col) => col.notNull())
        .addColumn('source', 'varchar', (col) => col.notNull())
        .addColumn('created_date', 'timestamptz', (col) => col.notNull())
        .execute()

    await db.schema
        .createIndex('idx_entitlements_election_type')
        .on('entitlementsDB')
        .columns(['election_id', 'type'])
        .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
    await db.schema.dropTable('entitlementsDB').execute()
    await db.schema.dropTable('transactionsDB').execute()
}
