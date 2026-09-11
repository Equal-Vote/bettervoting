import 'dotenv/config'
import { createMigrator, handleMigration } from "./migration-utils"

async function migrateDown() {
    const { migrator, db } = createMigrator()
    handleMigration(await migrator.migrateDown())

    await db.destroy()
  }
  
  migrateDown()