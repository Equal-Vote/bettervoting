import 'dotenv/config'
import { createMigrator, handleMigration } from "./migration-utils"

async function migrateUp() {
    const { migrator, db } = createMigrator()
    handleMigration(await migrator.migrateUp())
  
    await db.destroy()
  }
  
  migrateUp()