import { Injectable } from '@nestjs/common';
import { familyCodeFromCounter, formatMemberUid } from '@pushkaralu/shared';
import { sql } from 'kysely';
import { DatabaseService } from '../database/database.service';

/**
 * Atomic family-code + member-UID allocation (v3: K7M2-01, K7M2-02, …).
 */
@Injectable()
export class UidService {
  constructor(private readonly database: DatabaseService) {}

  /** Allocate a brand-new family and return the self UID (`XXXX-01`). */
  async allocateFamilySelf(): Promise<{ familyCode: string; uid: string }> {
    const familyCode = await this.allocateFamilyCode();
    return { familyCode, uid: formatMemberUid(familyCode, 1) };
  }

  /** Next member UID in an existing family (reads max member_seq). */
  async allocateNextInFamily(familyCode: string): Promise<string> {
    return this.database.db.transaction().execute(async (trx) => {
      // Postgres forbids FOR UPDATE with aggregates — lock rows, then max in JS.
      const rows = await sql<{ member_seq: number | null }>`
        select member_seq
        from members
        where family_code = ${familyCode}
          and deleted_at is null
        for update
      `.execute(trx);

      const last = rows.rows.reduce((max, r) => Math.max(max, r.member_seq ?? 0), 0);
      const next = last + 1;
      if (next > 99) {
        throw new Error(`Family ${familyCode} has no free member slots`);
      }
      return formatMemberUid(familyCode, next);
    });
  }

  private async allocateFamilyCode(): Promise<string> {
    return this.database.db.transaction().execute(async (trx) => {
      const row = await sql<{ last_counter: number }>`
        select last_counter
        from family_code_series
        where id = true
        for update
      `.execute(trx);

      if (!row.rows[0]) {
        throw new Error('family_code_series is not seeded');
      }

      const next = row.rows[0].last_counter + 1;
      await sql`
        update family_code_series
        set last_counter = ${next}, updated_at = now()
        where id = true
      `.execute(trx);

      return familyCodeFromCounter(next);
    });
  }
}
