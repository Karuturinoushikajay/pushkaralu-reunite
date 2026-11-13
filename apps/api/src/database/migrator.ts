import { Migrator, type MigrationResultSet } from 'kysely';
import { loadConfig } from '../config/env';
import { createDb } from './kysely';
import { StaticMigrationProvider } from './migrations';
import type { Database } from './schema';
import type { Kysely } from 'kysely';

type Command = 'up' | 'down' | 'latest';

export function createMigrator(db: Kysely<Database>): Migrator {
  return new Migrator({ db, provider: new StaticMigrationProvider() });
}

function report(label: string, results: MigrationResultSet): void {
  const { error, results: steps } = results;
  for (const r of steps ?? []) {
    const status = r.status === 'Success' ? 'OK ' : r.status === 'Error' ? 'ERR' : '...';
    console.log(`[${status}] ${label}: ${r.migrationName}`);
  }
  if (!steps?.length) {
    console.log(`[--] ${label}: nothing to do`);
  }
  if (error) {
    console.error(`Migration ${label} failed:`, error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}

export async function runMigrations(command: Command, connectionString: string): Promise<void> {
  const db = createDb(connectionString);
  const migrator = createMigrator(db);
  try {
    if (command === 'down') {
      report('down', await migrator.migrateDown());
    } else {
      // 'up' and 'latest' both migrate forward to the newest migration.
      report('up', await migrator.migrateToLatest());
    }
  } finally {
    await db.destroy();
  }
}

async function main(): Promise<void> {
  const command = (process.argv[2] ?? 'latest') as Command;
  if (!['up', 'down', 'latest'].includes(command)) {
    console.error(`Unknown command "${command}". Use: up | down | latest`);
    process.exit(1);
  }
  const config = loadConfig();
  await runMigrations(command, config.DATABASE_URL);
}

// Run only when invoked directly (not when imported by tests).
if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
