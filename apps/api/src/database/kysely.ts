import { Kysely, PostgresDialect } from 'kysely';
import { Pool, types } from 'pg';
import type { Database } from './schema';

// Parse PG numeric/int8 as JS numbers where it is safe for our volumes.
types.setTypeParser(types.builtins.INT8, (v) => Number.parseInt(v, 10));

export function createPool(connectionString: string): Pool {
  return new Pool({ connectionString, max: 10 });
}

export function createDb(connectionString: string): Kysely<Database> {
  return new Kysely<Database>({
    dialect: new PostgresDialect({ pool: createPool(connectionString) }),
  });
}
