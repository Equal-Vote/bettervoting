import { Kysely } from 'kysely'

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's documented migration pattern: migrations must stay decoupled from the current (evolving) Database schema type
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('electionDB')
    .addColumn('election_id', 'varchar', (col) => col.primaryKey())
    .addColumn('title', 'varchar')
    .addColumn('description', 'text')
    .addColumn('frontend_url', 'varchar')
    .addColumn('start_time', 'varchar')
    .addColumn('end_time', 'varchar')
    .addColumn('support_email', 'varchar')
    .addColumn('owner_id', 'varchar')
    .addColumn('audit_ids', 'json')
    .addColumn('admin_ids', 'json')
    .addColumn('credential_ids', 'json')
    .addColumn('state', 'varchar')
    .addColumn('races', 'json', (col) => col.notNull())
    .addColumn('settings', 'json')
    .addColumn('auth_key', 'varchar')
    .execute()

  await db.schema
    .createTable('electionRollDB')
    .addColumn('voter_id', 'varchar', (col) => col.primaryKey().notNull())
    .addColumn('election_id', 'varchar', (col) => col.notNull())
    .addColumn('email', 'varchar')
    .addColumn('submitted', 'boolean', (col) => col.notNull())
    .addColumn('ballot_id', 'varchar')
    .addColumn('ip_address', 'varchar')
    .addColumn('address', 'varchar')
    .addColumn('state', 'varchar', (col) => col.notNull())
    .addColumn('history', 'json')
    .addColumn('registration', 'json')
    .addColumn('precinct', 'varchar')
    .addColumn('email_data', 'json')
    .execute()

  await db.schema
    .createTable('ballotDB')
    .addColumn('ballot_id', 'varchar', (col) => col.primaryKey().notNull())
    .addColumn('election_id', 'varchar')
    .addColumn('user_id', 'varchar')
    .addColumn('status', 'varchar')
    .addColumn('date_submitted', 'varchar')
    .addColumn('ip_address', 'varchar')
    .addColumn('votes', 'json', (col) => col.notNull())
    .addColumn('history', 'json')
    .addColumn('precinct', 'varchar')
    .execute()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's documented migration pattern: migrations must stay decoupled from the current (evolving) Database schema type
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('electionDB').execute()
  await db.schema.dropTable('electionRollDB').execute()
  await db.schema.dropTable('ballotDB').execute()
}

