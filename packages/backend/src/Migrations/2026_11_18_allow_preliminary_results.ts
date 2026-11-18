import { Kysely, sql } from 'kysely'

// settings.allow_preliminary_results decides whether an election's results may be shown
// while it can still take votes. It is off unless set, so without this migration every
// existing election that is showing results while open would stop showing them the
// moment this code deploys. Elections whose results are public today were set up under
// the old rule, where that was allowed, so they keep it. Only the current version of
// each election is touched; older versions are history and are never served.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's documented migration pattern: migrations must stay decoupled from the current (evolving) Database schema type
export async function up(db: Kysely<any>): Promise<void> {
    await sql`
        UPDATE "electionDB"
        SET settings = (settings::jsonb || '{"allow_preliminary_results": true}'::jsonb)::json
        WHERE head = true AND (settings->>'public_results') = 'true'
    `.execute(db)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's documented migration pattern: migrations must stay decoupled from the current (evolving) Database schema type
export async function down(db: Kysely<any>): Promise<void> {
    await sql`
        UPDATE "electionDB"
        SET settings = (settings::jsonb - 'allow_preliminary_results')::json
        WHERE (settings->>'allow_preliminary_results') IS NOT NULL
    `.execute(db)
}
