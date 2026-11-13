import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../database/database.service';

const DEFAULT_PREFIX = 'ABC';

@Injectable()
export class UidService {
  constructor(private readonly database: DatabaseService) {}

  /**
   * Allocate the next UID in a series, e.g. ABC1001.
   * The counter update is row-locked so two registrations cannot share a UID.
   */
  async allocate(prefix = DEFAULT_PREFIX): Promise<string> {
    return this.database.db.transaction().execute(async (trx) => {
      const result = await sql<{ last_number: number }>`
        update uid_series
        set last_number = last_number + 1, updated_at = now()
        where prefix = ${prefix}
        returning last_number
      `.execute(trx);
      const next = result.rows[0]?.last_number;
      if (next == null) {
        throw new Error(`UID series "${prefix}" is not seeded`);
      }
      return `${prefix}${next}`;
    });
  }
}
