import * as path from 'path'
import { promises as fs } from 'fs'
import {
  Migrator,
  FileMigrationProvider,
  MigrationResultSet,
} from 'kysely'

import servicelocator from '../ServiceLocator'

export function createMigrator() {
  const db = servicelocator.database()
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      // This needs to be an absolute path.
      migrationFolder: path.join(__dirname, '../Migrations'),
    }),
  })
  return {
    migrator,
    db
  }
}

export async function handleMigration(migrationResult: MigrationResultSet) {
  // TODO: I need to figure out how to convert these to a Logger calls without having req
  migrationResult.results?.forEach((it) => {
      if (it.status === 'Success') {
        console.info(`migration "${it.migrationName}" was executed successfully`)
      } else if (it.status === 'Error') {
        console.error(`failed to execute migration "${it.migrationName}"`)
      }
    })

    if (migrationResult.error) {
      console.error('failed to migrate')
      console.error(migrationResult.error)
      process.exit(1)
    }
}