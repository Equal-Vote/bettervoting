import { Kysely } from 'kysely'

// Optional admin explanation attached to the election version a state-changing
// action produced (finalize, open/close, archive, publish results). Read back by
// the public audit log. Nullable: every existing row and every write that
// doesn't supply one stores NULL. Roll and ballot actions carry their note
// inside their existing JSON history arrays, so only electionDB needs a column.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's documented migration pattern: migrations must stay decoupled from the current (evolving) Database schema type
export async function up(db: Kysely<any>): Promise<void> {
    await db.schema.alterTable('electionDB')
        .addColumn('audit_note', 'text')
        .execute()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's documented migration pattern: migrations must stay decoupled from the current (evolving) Database schema type
export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.alterTable('electionDB')
        .dropColumn('audit_note')
        .execute()
}
