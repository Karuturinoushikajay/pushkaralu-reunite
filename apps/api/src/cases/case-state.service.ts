import { randomInt } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { sql } from 'kysely';
import { CaseStatus, Role, assertCaseTransition } from '@pushkaralu/shared';
import { writeAudit } from '../audit/audit';
import { CryptoService } from '../crypto/crypto.service';
import type { AuthPrincipal } from '../crypto/token.service';
import { DatabaseService } from '../database/database.service';

export class HandoverError extends Error {
  readonly code: 'NOT_FOUND' | 'CONFLICT' | 'FORBIDDEN' | 'INVALID_CODE';

  constructor(message: string, code: HandoverError['code']) {
    super(message);
    this.name = 'HandoverError';
    this.code = code;
  }
}

@Injectable()
export class CaseStateService {
  constructor(
    private readonly database: DatabaseService,
    private readonly crypto: CryptoService,
  ) {}

  async transition(
    caseId: string,
    to: CaseStatus,
    actor: AuthPrincipal,
  ): Promise<{ id: string; status: CaseStatus }> {
    return this.database.db.transaction().execute(async (trx) => {
      const account = await trx
        .selectFrom('accounts')
        .select(['id', 'role', 'status'])
        .where('id', '=', actor.accountId)
        .where('deleted_at', 'is', null)
        .executeTakeFirst();
      if (!account || account.status !== 'ACTIVE') {
        throw new HandoverError('Account is not active', 'FORBIDDEN');
      }

      const row = await trx
        .selectFrom('cases')
        .select(['id', 'status'])
        .where('id', '=', caseId)
        .forUpdate()
        .executeTakeFirst();
      if (!row) {
        throw new NotFoundException('Case not found');
      }

      const verified = await trx
        .selectFrom('handovers')
        .select('id')
        .where('case_id', '=', caseId)
        .where('verified_at', 'is not', null)
        .executeTakeFirst();

      assertCaseTransition({
        role: account.role as Role,
        from: row.status as CaseStatus,
        to,
        handoverVerified: Boolean(verified),
      });

      await trx
        .updateTable('cases')
        .set({
          status: to,
          updated_at: sql`now()`,
          ...(to === CaseStatus.REUNITED ? { resolved_at: sql`now()` } : {}),
        })
        .where('id', '=', caseId)
        .execute();

      await writeAudit(trx, {
        actorType: account.role,
        actorId: account.id,
        action: 'CASE_TRANSITION',
        entityType: 'case',
        entityId: caseId,
        metadata: { from: row.status, to },
      });

      return { id: caseId, status: to };
    });
  }

  async requestHandoverOtp(
    caseId: string,
    actor: AuthPrincipal,
    ttlSeconds: number,
    exposeDevCode: boolean,
  ): Promise<{ sent: true; devCode?: string }> {
    const account = await this.requirePolice(actor);
    const row = await this.database.db
      .selectFrom('cases')
      .select(['id', 'status', 'member_uid'])
      .where('id', '=', caseId)
      .executeTakeFirst();
    if (!row) throw new NotFoundException('Case not found');
    if (row.status !== CaseStatus.MATCHED) {
      throw new HandoverError('A handover OTP is only issued for a matched case', 'CONFLICT');
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.database.db
      .insertInto('handovers')
      .values({
        case_id: caseId,
        officer_id: account.id,
        guardian_otp_hash: this.crypto.hashOtp(code),
        otp_expires_at: new Date(Date.now() + ttlSeconds * 1000),
      })
      .execute();

    await writeAudit(this.database.db, {
      actorType: 'POLICE',
      actorId: account.id,
      action: 'HANDOVER_OTP_ISSUED',
      entityType: 'case',
      entityId: caseId,
      metadata: { memberUid: row.member_uid },
    });

    if (exposeDevCode) {
      console.log(`[mock-sms] Handover OTP for case ${caseId} is ${code}`);
      return { sent: true, devCode: code };
    }
    return { sent: true };
  }

  async verifyHandoverOtp(
    caseId: string,
    code: string,
    actor: AuthPrincipal,
  ): Promise<{ verified: true }> {
    const account = await this.requirePolice(actor);
    const handover = await this.database.db
      .selectFrom('handovers')
      .select(['id', 'guardian_otp_hash', 'otp_expires_at'])
      .where('case_id', '=', caseId)
      .where('verified_at', 'is', null)
      .where('guardian_otp_hash', 'is not', null)
      .orderBy('created_at', 'desc')
      .executeTakeFirst();

    if (!handover || !handover.guardian_otp_hash || !handover.otp_expires_at) {
      throw new HandoverError('No handover code is waiting for this case', 'CONFLICT');
    }
    if (new Date(handover.otp_expires_at).getTime() <= Date.now()) {
      throw new HandoverError('Handover code has expired', 'INVALID_CODE');
    }
    if (!this.crypto.verifyOtp(code, handover.guardian_otp_hash)) {
      throw new HandoverError('Handover code is incorrect', 'INVALID_CODE');
    }

    await this.database.db
      .updateTable('handovers')
      .set({ verified_at: new Date(), officer_id: account.id })
      .where('id', '=', handover.id)
      .execute();

    await writeAudit(this.database.db, {
      actorType: 'POLICE',
      actorId: account.id,
      action: 'HANDOVER_OTP_VERIFIED',
      entityType: 'case',
      entityId: caseId,
    });

    return { verified: true };
  }

  private async requirePolice(actor: AuthPrincipal): Promise<{ id: string }> {
    const account = await this.database.db
      .selectFrom('accounts')
      .select(['id', 'role', 'status'])
      .where('id', '=', actor.accountId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
    if (!account || account.status !== 'ACTIVE' || account.role !== Role.POLICE) {
      throw new HandoverError('Only a booth officer can issue a handover code', 'FORBIDDEN');
    }
    return account;
  }
}
