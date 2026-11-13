import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  canTransitionCase,
  CaseStatus,
  type BoothHandoverSuccessInput,
  type HandoverVerifyInput,
  type ManualCloseInput,
  type MatchCaseInput,
  type RegisterFromFindInput,
  type ReportMissingInput,
} from '@pushkaralu/shared';
import { sql } from 'kysely';
import { AuditService } from '../audit/audit.service';
import type { JwtPayload } from '../auth/auth.types';
import { FieldEncryptionService } from '../crypto/field-encryption.service';
import { DatabaseService } from '../database/database.service';
import { pointWkt } from '../geo/geo';
import { OtpService } from '../otp/otp.service';
import { BoothsService } from '../booths/booths.service';
import { HashingService } from '../crypto/hashing.service';

@Injectable()
export class CasesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly encryption: FieldEncryptionService,
    private readonly hashing: HashingService,
    private readonly audit: AuditService,
    private readonly otp: OtpService,
    private readonly booths: BoothsService,
  ) {}

  async reportMissing(user: JwtPayload, input: ReportMissingInput) {
    const member = await this.database.db
      .selectFrom('members')
      .selectAll()
      .where('uid', '=', input.memberUid)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
    if (!member || member.account_id !== user.sub) {
      throw new NotFoundException('Member not found');
    }

    const existing = await this.database.db
      .selectFrom('cases')
      .select(['id', 'status'])
      .where('member_uid', '=', input.memberUid)
      .where('status', '<>', 'REUNITED')
      .executeTakeFirst();
    if (existing) {
      throw new BadRequestException('An open case already exists for this member');
    }

    const wkt = pointWkt(input.lastSeen.lng, input.lastSeen.lat);
    const inserted = await sql<{ id: string }>`
      insert into cases (member_uid, status, last_seen, last_seen_label, note, reported_by_account_id)
      values (
        ${input.memberUid},
        'MISSING',
        ST_GeogFromText(${wkt}),
        ${input.lastSeenLabel ?? null},
        ${input.note ?? null},
        ${user.sub}
      )
      returning id
    `.execute(this.database.db);

    const caseId = inserted.rows[0]!.id;
    await this.audit.record({
      actorType: 'USER',
      actorId: user.sub,
      action: 'CASE_REPORTED_MISSING',
      entityType: 'case',
      entityId: caseId,
      metadata: { memberUid: input.memberUid },
    });

    return this.getById(caseId, user);
  }

  async listMine(user: JwtPayload) {
    const rows = await sql<{
      id: string;
      member_uid: string;
      status: string;
      last_seen_label: string | null;
      note: string | null;
      reported_at: Date;
      geojson: string | null;
    }>`
      select c.id, c.member_uid, c.status, c.last_seen_label, c.note, c.reported_at,
             ST_AsGeoJSON(c.last_seen) as geojson
      from cases c
      join members m on m.uid = c.member_uid
      where m.account_id = ${user.sub}
      order by c.reported_at desc
    `.execute(this.database.db);

    return rows.rows.map((r) => this.mapCase(r));
  }

  async listAll(status?: string) {
    const rows = await sql<{
      id: string;
      member_uid: string;
      status: string;
      last_seen_label: string | null;
      note: string | null;
      reported_at: Date;
      geojson: string | null;
      name_enc: Buffer | null;
      age_band: string | null;
    }>`
      select c.id, c.member_uid, c.status, c.last_seen_label, c.note, c.reported_at,
             ST_AsGeoJSON(c.last_seen) as geojson, m.name_enc, m.age_band
      from cases c
      join members m on m.uid = c.member_uid
      where (${status ?? null}::text is null or c.status = ${status ?? null})
      order by c.reported_at desc
      limit 200
    `.execute(this.database.db);

    return rows.rows.map((r) => ({
      ...this.mapCase(r),
      name: r.name_enc ? this.encryption.decrypt(Buffer.from(r.name_enc)) : null,
      ageBand: r.age_band,
    }));
  }

  async getById(caseId: string, user?: JwtPayload) {
    const row = await sql<{
      id: string;
      member_uid: string;
      status: string;
      last_seen_label: string | null;
      note: string | null;
      reported_at: Date;
      geojson: string | null;
      account_id: string;
      name_enc: Buffer | null;
      age_band: string | null;
      emergency_phone_enc: Buffer | null;
    }>`
      select c.id, c.member_uid, c.status, c.last_seen_label, c.note, c.reported_at,
             ST_AsGeoJSON(c.last_seen) as geojson,
             m.account_id, m.name_enc, m.age_band, m.emergency_phone_enc
      from cases c
      join members m on m.uid = c.member_uid
      where c.id = ${caseId}
    `.execute(this.database.db);

    const r = row.rows[0];
    if (!r) throw new NotFoundException('Case not found');

    if (user?.role === 'USER' && r.account_id !== user.sub) {
      throw new ForbiddenException();
    }

    let nearestBooth = null;
    if (r.geojson) {
      const geo = JSON.parse(r.geojson) as { coordinates: [number, number] };
      nearestBooth = await this.booths.nearest(geo.coordinates[0], geo.coordinates[1]);
    }

    const base = this.mapCase(r);
    const isVolunteer = user?.role === 'VOLUNTEER';
    return {
      ...base,
      name: r.name_enc ? this.encryption.decrypt(Buffer.from(r.name_enc)) : null,
      ageBand: r.age_band,
      guardianPhoneMasked: isVolunteer
        ? null
        : r.emergency_phone_enc
          ? mask(
              this.encryption.decrypt(Buffer.from(r.emergency_phone_enc)),
            )
          : null,
      nearestBooth,
    };
  }

  async match(user: JwtPayload, caseId: string, input: MatchCaseInput) {
    const c = await this.requireCase(caseId);
    const status = c.status as CaseStatus;
    if (status === CaseStatus.REUNITED || status === CaseStatus.MATCHED) {
      throw new BadRequestException(`Cannot match from status ${status}`);
    }
    // Police may confirm a match from MISSING or FOUND; advance MISSING -> FOUND first.
    if (status === CaseStatus.MISSING) {
      await sql`update cases set status = 'FOUND', updated_at = now() where id = ${caseId}`.execute(
        this.database.db,
      );
    }
    if (
      status !== CaseStatus.FOUND &&
      status !== CaseStatus.MISSING &&
      !canTransitionCase(status, CaseStatus.MATCHED)
    ) {
      throw new BadRequestException(`Cannot match from status ${status}`);
    }

    await sql`update cases set status = 'MATCHED', updated_at = now() where id = ${caseId}`.execute(
      this.database.db,
    );

    await sql`update found_reports set status = 'MATCHED', updated_at = now() where id = ${input.foundReportId}`.execute(
      this.database.db,
    );

    await this.audit.record({
      actorType: user.role,
      actorId: user.sub,
      action: 'CASE_MATCHED',
      entityType: 'case',
      entityId: caseId,
      metadata: { foundReportId: input.foundReportId },
    });

    return this.getById(caseId, user);
  }

  async markFound(user: JwtPayload, caseId: string) {
    const c = await this.requireCase(caseId);
    if (!canTransitionCase(c.status as CaseStatus, CaseStatus.FOUND)) {
      throw new BadRequestException(`Cannot mark found from ${c.status}`);
    }
    await sql`update cases set status = 'FOUND', updated_at = now() where id = ${caseId}`.execute(
      this.database.db,
    );
    await this.audit.record({
      actorType: user.role,
      actorId: user.sub,
      action: 'CASE_FOUND',
      entityType: 'case',
      entityId: caseId,
    });
    return this.getById(caseId, user);
  }

  async alertVolunteers(user: JwtPayload, caseId: string) {
    await this.requireCase(caseId);
    const count = await this.database.db
      .selectFrom('volunteers')
      .select((eb) => eb.fn.countAll<number>().as('count'))
      .where('status', '=', 'ACTIVE')
      .where('deleted_at', 'is', null)
      .executeTakeFirstOrThrow();

    await this.audit.record({
      actorType: user.role,
      actorId: user.sub,
      action: 'ALERT_SENT',
      entityType: 'case',
      entityId: caseId,
      metadata: { volunteerCount: Number(count.count) },
    });

    return { ok: true, volunteersAlerted: Number(count.count) };
  }

  async startHandover(user: JwtPayload, caseId: string) {
    const detail = await sql<{
      id: string;
      status: string;
      emergency_phone_enc: Buffer | null;
      member_uid: string;
      account_id: string;
    }>`
      select c.id, c.status, m.emergency_phone_enc, c.member_uid, m.account_id
      from cases c
      join members m on m.uid = c.member_uid
      where c.id = ${caseId}
    `.execute(this.database.db);

    const row = detail.rows[0];
    if (!row) throw new NotFoundException('Case not found');
    if (user.role === 'USER' && row.account_id !== user.sub) {
      throw new ForbiddenException();
    }
    // OTP only after booth confirmation (MATCHED). FOUND alone is not enough.
    if (row.status !== 'MATCHED') {
      throw new BadRequestException(
        'Case must be MATCHED at a booth before collection OTP (FOUND → booth first)',
      );
    }
    if (!row.emergency_phone_enc) {
      throw new BadRequestException('No guardian phone on file');
    }

    const phone = this.encryption.decrypt(Buffer.from(row.emergency_phone_enc));
    const phoneHash = this.hashing.hashPhone(phone);

    const found = await this.database.db
      .selectFrom('found_reports')
      .select(['id'])
      .where('scanned_uid', '=', row.member_uid)
      .orderBy('created_at', 'desc')
      .executeTakeFirst();

    const handover = await this.database.db
      .insertInto('handovers')
      .values({
        case_id: caseId,
        found_report_id: found?.id ?? null,
        officer_id: user.sub,
      })
      .returning(['id'])
      .executeTakeFirstOrThrow();

    const challenge = await this.otp.createChallenge({
      purpose: 'HANDOVER',
      targetHash: phoneHash,
      phoneE164: phone,
      metadata: { caseId, handoverId: handover.id },
    });

    await this.database.db
      .updateTable('handovers')
      .set({
        guardian_otp_hash: challenge.challengeId,
        otp_expires_at: challenge.expiresAt,
      })
      .where('id', '=', handover.id)
      .execute();

    await this.audit.record({
      actorType: user.role,
      actorId: user.sub,
      action: 'HANDOVER_OTP_SENT',
      entityType: 'handover',
      entityId: handover.id,
    });

    return {
      handoverId: handover.id,
      challengeId: challenge.challengeId,
      maskedPhone: mask(phone),
      debugCode: challenge.debugCode,
    };
  }

  async verifyHandover(user: JwtPayload, caseId: string, input: HandoverVerifyInput) {
    // Family (USER) may only close their own case after OTP.
    if (user.role === 'USER') {
      await this.getById(caseId, user);
    }

    const handover = await this.database.db
      .selectFrom('handovers')
      .selectAll()
      .where('case_id', '=', caseId)
      .orderBy('created_at', 'desc')
      .executeTakeFirst();

    if (!handover) throw new NotFoundException('No handover in progress');
    if (input.handoverId && input.handoverId !== handover.id) {
      throw new BadRequestException('Handover mismatch');
    }
    if (!handover.guardian_otp_hash) {
      throw new BadRequestException('OTP challenge missing');
    }

    await this.otp.verify(handover.guardian_otp_hash, input.code);

    await this.database.db
      .updateTable('handovers')
      .set({ verified_at: new Date() })
      .where('id', '=', handover.id)
      .execute();

    await sql`update cases set status = 'REUNITED', resolved_at = now(), updated_at = now() where id = ${caseId}`.execute(
      this.database.db,
    );

    await this.audit.record({
      actorType: user.role,
      actorId: user.sub,
      action: 'HANDOVER_COMPLETED',
      entityType: 'case',
      entityId: caseId,
      metadata: { handoverId: handover.id },
    });

    return this.getById(caseId, user);
  }

  async auditForCase(caseId: string) {
    return this.database.db
      .selectFrom('audit_log')
      .selectAll()
      .where('entity_type', 'in', ['case', 'handover'])
      .where('entity_id', '=', caseId)
      .orderBy('created_at', 'asc')
      .execute();
  }

  /**
   * Volunteer/police find flow: log call outcome and always register the case
   * (MISSING → FOUND if already open, else create FOUND).
   */
  async registerFromFind(user: JwtPayload, input: RegisterFromFindInput) {
    if (user.role !== 'VOLUNTEER' && user.role !== 'POLICE') {
      throw new ForbiddenException();
    }

    const member = await this.database.db
      .selectFrom('members')
      .selectAll()
      .where('uid', '=', input.memberUid)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
    if (!member) throw new NotFoundException('Member not found');

    const wkt = pointWkt(input.location.lng, input.location.lat);
    let caseId: string;

    const existing = await this.database.db
      .selectFrom('cases')
      .select(['id', 'status'])
      .where('member_uid', '=', input.memberUid)
      .where('status', '<>', 'REUNITED')
      .executeTakeFirst();

    if (existing) {
      caseId = existing.id;
      if (existing.status === 'MISSING' && canTransitionCase(CaseStatus.MISSING, CaseStatus.FOUND)) {
        await sql`
          update cases
          set status = 'FOUND',
              last_seen = ST_GeogFromText(${wkt}),
              last_seen_label = ${input.locationLabel ?? null},
              note = coalesce(${input.clothing ?? null}, note),
              updated_at = now()
          where id = ${caseId}
        `.execute(this.database.db);
      }
    } else {
      const inserted = await sql<{ id: string }>`
        insert into cases (member_uid, status, last_seen, last_seen_label, note, reported_by_account_id)
        values (
          ${input.memberUid},
          'FOUND',
          ST_GeogFromText(${wkt}),
          ${input.locationLabel ?? null},
          ${input.clothing ?? null},
          ${user.sub}
        )
        returning id
      `.execute(this.database.db);
      caseId = inserted.rows[0]!.id;
    }

    await this.database.db
      .insertInto('family_calls')
      .values({
        case_id: caseId,
        member_uid: input.memberUid,
        actor_type: user.role === 'POLICE' ? 'POLICE' : 'VOLUNTEER',
        actor_id: user.sub,
        outcome: input.callOutcome,
      })
      .execute();

    // JWT `sub` is accounts.id; found_reports.volunteer_id references volunteers.id.
    let volunteerId: string | null = null;
    if (user.role === 'VOLUNTEER') {
      const volunteer = await this.database.db
        .selectFrom('volunteers')
        .select(['id'])
        .where('volunteer_code', '=', user.uid)
        .where('deleted_at', 'is', null)
        .executeTakeFirst();
      volunteerId = volunteer?.id ?? null;
    }

    const found = await sql<{ id: string }>`
      insert into found_reports (
        volunteer_id, scanned_uid, age_band, clothing, language_spoken, location, photo_key, status
      )
      values (
        ${volunteerId},
        ${input.memberUid},
        ${member.age_band},
        ${input.clothing ?? null},
        ${input.languageSpoken ?? null},
        ST_GeogFromText(${wkt}),
        ${input.photoKey ? this.encryption.encryptToBase64(input.photoKey) : null},
        'OPEN'
      )
      returning id
    `.execute(this.database.db);

    await this.audit.record({
      actorType: user.role,
      actorId: user.sub,
      action: 'CASE_REGISTERED_FROM_FIND',
      entityType: 'case',
      entityId: caseId,
      metadata: {
        memberUid: input.memberUid,
        callOutcome: input.callOutcome,
        foundReportId: found.rows[0]?.id,
        boothCode: input.boothCode ?? null,
      },
    });

    const booth = await this.booths.nearest(input.location.lng, input.location.lat);
    return {
      caseId,
      memberUid: input.memberUid,
      status: 'FOUND',
      callOutcome: input.callOutcome,
      booth,
      message: 'Case registered. Family app shows a highlighted alert.',
    };
  }

  /** Volunteer confirms person handed to booth → MATCHED. */
  async boothHandoverSuccess(
    user: JwtPayload,
    caseId: string,
    input: BoothHandoverSuccessInput,
  ) {
    if (user.role !== 'VOLUNTEER' && user.role !== 'POLICE') {
      throw new ForbiddenException();
    }
    const c = await this.requireCase(caseId);
    if (c.status !== 'FOUND' && c.status !== 'MISSING') {
      throw new BadRequestException('Case must be FOUND before booth handover');
    }
    if (c.status === 'MISSING') {
      await sql`update cases set status = 'FOUND', updated_at = now() where id = ${caseId}`.execute(
        this.database.db,
      );
    }
    await sql`update cases set status = 'MATCHED', updated_at = now() where id = ${caseId}`.execute(
      this.database.db,
    );
    await this.audit.record({
      actorType: user.role,
      actorId: user.sub,
      action: 'BOOTH_HANDOVER_SUCCESS',
      entityType: 'case',
      entityId: caseId,
      metadata: { note: input.note ?? null },
    });
    return this.getById(caseId, user);
  }

  /** Police manual close when OTP/signal unavailable — audited, not erased. */
  async manualClose(user: JwtPayload, caseId: string, input: ManualCloseInput) {
    if (user.role !== 'POLICE') throw new ForbiddenException();
    await this.requireCase(caseId);

    const handover = await this.database.db
      .insertInto('handovers')
      .values({
        case_id: caseId,
        officer_id: user.sub,
        closed_manually: true,
        manual_close_reason: input.reason,
        id_verified: input.idVerified,
        guardian_name: input.guardianName,
        guardian_phone_enc: this.encryption.encrypt(
          this.hashing.normalizePhone(input.guardianPhone),
        ),
        officer_note: input.officerNote ?? null,
        supervisor_id: input.supervisorId ?? null,
        verified_at: new Date(),
      })
      .returning(['id'])
      .executeTakeFirstOrThrow();

    await sql`update cases set status = 'REUNITED', resolved_at = now(), updated_at = now() where id = ${caseId}`.execute(
      this.database.db,
    );

    await this.audit.record({
      actorType: 'POLICE',
      actorId: user.sub,
      action: 'HANDOVER_MANUAL_CLOSE',
      entityType: 'case',
      entityId: caseId,
      metadata: {
        handoverId: handover.id,
        reason: input.reason,
        idVerified: input.idVerified,
        supervisorId: input.supervisorId ?? null,
      },
    });

    return this.getById(caseId, user);
  }

  private async requireCase(caseId: string) {
    const c = await this.database.db
      .selectFrom('cases')
      .selectAll()
      .where('id', '=', caseId)
      .executeTakeFirst();
    if (!c) throw new NotFoundException('Case not found');
    return c;
  }

  private mapCase(r: {
    id: string;
    member_uid: string;
    status: string;
    last_seen_label: string | null;
    note: string | null;
    reported_at: Date;
    geojson: string | null;
  }) {
    const geo = r.geojson
      ? (JSON.parse(r.geojson) as { coordinates: [number, number] })
      : null;
    return {
      id: r.id,
      memberUid: r.member_uid,
      status: r.status,
      lastSeenLabel: r.last_seen_label,
      note: r.note,
      reportedAt: new Date(r.reported_at as unknown as string).toISOString(),
      lastSeen: geo ? { lng: geo.coordinates[0], lat: geo.coordinates[1] } : null,
    };
  }
}

function mask(phone: string): string {
  if (phone.length < 4) return '****';
  return `${phone.slice(0, 3)}*****${phone.slice(-2)}`;
}
