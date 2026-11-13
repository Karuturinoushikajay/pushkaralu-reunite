import { Inject, Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { APP_CONFIG } from '../config/env';
import type { AppConfig } from '../config/env';
import { createDb } from './kysely';
import type { Database } from './schema';

/**
 * Owns the Kysely connection lifecycle and exposes the typed query builder to
 * the rest of the app.
 */
@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  readonly db: Kysely<Database>;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.db = createDb(config.DATABASE_URL);
  }

  async onModuleInit(): Promise<void> {
    // Fail fast if the database is unreachable at boot.
    await sql`select 1`.execute(this.db);
  }

  async onModuleDestroy(): Promise<void> {
    await this.db.destroy();
  }

  /** Lightweight connectivity probe for the health endpoint. */
  async ping(): Promise<boolean> {
    try {
      await sql`select 1`.execute(this.db);
      return true;
    } catch {
      return false;
    }
  }
}
