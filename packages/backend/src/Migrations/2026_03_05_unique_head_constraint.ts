import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
    await sql`CREATE UNIQUE INDEX "electionRollDB_one_head" ON "electionRollDB" (election_id, voter_id) WHERE head = true`.execute(db)
}

export async function down(db: Kysely<any>): Promise<void> {
    await sql`DROP INDEX "electionRollDB_one_head"`.execute(db)
}
