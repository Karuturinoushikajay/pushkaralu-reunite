import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isMinorAgeBand, maskAadhaar, type AddMemberInput } from '@pushkaralu/shared';
import { AuditService } from '../audit/audit.service';
import type { JwtPayload } from '../auth/auth.types';
import { FieldEncryptionService } from '../crypto/field-encryption.service';
import { HashingService } from '../crypto/hashing.service';
import { DatabaseService } from '../database/database.service';
import { QrService } from '../qr/qr.service';
import { UidService } from '../uid/uid.service';

function maskPhone(phone: string | null): string | null {
  if (!phone || phone.length < 4) return phone;
  return `${phone.slice(0, 3)}*****${phone.slice(-2)}`;
}

@Injectable()
export class MembersService {
  constructor(
    private readonly database: DatabaseService,
    private readonly encryption: FieldEncryptionService,
    private readonly hashing: HashingService,
    private readonly uid: UidService,
    private readonly qrService: QrService,
    private readonly audit: AuditService,
  ) {}

  async listForAccount(user: JwtPayload) {
    const rows = await this.database.db
      .selectFrom('members')
      .selectAll()
      .where('account_id', '=', user.sub)
      .where('deleted_at', 'is', null)
      .orderBy('member_seq', 'asc')
      .execute();

    const cases = await this.database.db
      .selectFrom('cases')
      .select(['member_uid', 'status', 'id'])
      .where(
        'member_uid',
        'in',
        rows.length ? rows.map((r) => r.uid) : ['__none__'],
      )
      .where('status', '<>', 'REUNITED')
      .execute();
    const caseByUid = new Map(cases.map((c) => [c.member_uid, c]));

    return rows.map((m) => this.toDto(m, user.role, caseByUid.get(m.uid)));
  }

  async getOne(user: JwtPayload, memberUid: string) {
    const m = await this.requireOwnedMember(user.sub, memberUid);
    const active = await this.database.db
      .selectFrom('cases')
      .select(['id', 'status'])
      .where('member_uid', '=', memberUid)
      .where('status', '<>', 'REUNITED')
      .executeTakeFirst();
    return this.toDto(m, user.role, active);
  }

  async add(user: JwtPayload, input: AddMemberInput) {
    if (user.role !== 'USER') {
      throw new ForbiddenException('Only pilgrim accounts can add members');
    }
    if (isMinorAgeBand(input.ageBand) && input.minorGuardianConsent !== true) {
      throw new ForbiddenException('Guardian consent is required for minors');
    }

    const self = await this.database.db
      .selectFrom('members')
      .select(['family_code'])
      .where('account_id', '=', user.sub)
      .where('is_self', '=', true)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
    if (!self?.family_code) {
      throw new NotFoundException('Family account not found');
    }

    const nextUid = await this.uid.allocateNextInFamily(self.family_code);
    const seq = Number.parseInt(nextUid.split('-')[1]!, 10);
    const retentionUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    const aadhaarLast4 = input.aadhaarNumber ? input.aadhaarNumber.slice(-4) : null;

    await this.database.db
      .insertInto('members')
      .values({
        uid: nextUid,
        account_id: user.sub,
        family_code: self.family_code,
        member_seq: seq,
        name_enc: this.encryption.encrypt(input.name),
        age_band: input.ageBand,
        phone_enc: input.ownPhone
          ? this.encryption.encrypt(this.hashing.normalizePhone(input.ownPhone))
          : null,
        emergency_phone_enc: input.emergencyPhone
          ? this.encryption.encrypt(this.hashing.normalizePhone(input.emergencyPhone))
          : null,
        aadhaar_enc: input.aadhaarNumber
          ? this.encryption.encrypt(input.aadhaarNumber)
          : null,
        aadhaar_last4_enc: aadhaarLast4 ? this.encryption.encrypt(aadhaarLast4) : null,
        address_enc: input.address ? this.encryption.encrypt(input.address) : null,
        photo_key: input.photoKey
          ? this.encryption.encryptToBase64(input.photoKey)
          : null,
        is_self: false,
        retention_until: retentionUntil,
      })
      .execute();

    if (isMinorAgeBand(input.ageBand)) {
      await this.database.db
        .insertInto('consents')
        .values({
          account_id: user.sub,
          member_uid: nextUid,
          type: 'MINOR_GUARDIAN',
          granted: true,
          version: 'v1',
        })
        .execute();
    }

    await this.audit.record({
      actorType: 'USER',
      actorId: user.sub,
      action: 'MEMBER_ADDED',
      entityType: 'member',
      entityId: nextUid,
    });

    return this.getOne(user, nextUid);
  }

  async wristbandQr(user: JwtPayload, memberUid: string) {
    await this.requireOwnedMember(user.sub, memberUid);
    return this.qrService.forUid(memberUid);
  }

  private async requireOwnedMember(accountId: string, memberUid: string) {
    const m = await this.database.db
      .selectFrom('members')
      .selectAll()
      .where('uid', '=', memberUid)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
    if (!m || m.account_id !== accountId) {
      throw new NotFoundException('Member not found');
    }
    return m;
  }

  private toDto(
    m: {
      uid: string;
      account_id: string;
      family_code: string | null;
      member_seq: number | null;
      name_enc: Buffer | null;
      age_band: string | null;
      phone_enc: Buffer | null;
      emergency_phone_enc: Buffer | null;
      aadhaar_enc: Buffer | null;
      aadhaar_last4_enc: Buffer | null;
      photo_key: string | null;
      is_self: boolean;
    },
    role: string,
    activeCase?: { id: string; status: string } | null,
  ) {
    const name = m.name_enc
      ? this.encryption.decrypt(Buffer.from(m.name_enc))
      : null;
    const phone = m.phone_enc
      ? this.encryption.decrypt(Buffer.from(m.phone_enc))
      : null;
    const emergency = m.emergency_phone_enc
      ? this.encryption.decrypt(Buffer.from(m.emergency_phone_enc))
      : null;

    let aadhaarMasked: string | null = null;
    let aadhaarFull: string | null = null;
    if (m.aadhaar_enc) {
      const full = this.encryption.decrypt(Buffer.from(m.aadhaar_enc));
      aadhaarMasked = maskAadhaar(full);
      if (role === 'POLICE') {
        aadhaarFull = full;
      }
    } else if (m.aadhaar_last4_enc) {
      aadhaarMasked = maskAadhaar(
        this.encryption.decrypt(Buffer.from(m.aadhaar_last4_enc)),
      );
    }

    return {
      uid: m.uid,
      familyCode: m.family_code,
      memberSeq: m.member_seq,
      name,
      ageBand: m.age_band,
      phoneMasked: maskPhone(phone),
      emergencyPhoneMasked: maskPhone(emergency),
      aadhaarMasked,
      ...(aadhaarFull ? { aadhaarNumber: aadhaarFull } : {}),
      hasPhoto: Boolean(m.photo_key),
      isSelf: m.is_self,
      caseStatus: activeCase?.status ?? null,
      caseId: activeCase?.id ?? null,
    };
  }
}
