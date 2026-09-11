import 'dotenv/config'
import { createMigrator, handleMigration } from "./migration-utils"

async function migrateToLatest() {
  const { migrator, db } = createMigrator()
  handleMigration(await migrator.migrateToLatest())

  await db.destroy()
}

migrateToLatest()