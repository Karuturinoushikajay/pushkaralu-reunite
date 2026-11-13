import {
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  PilgrimSearchMode,
  type PilgrimSearchHit,
  type PilgrimSearchInput,
} from '@pushkaralu/shared';
import { createHash } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import type { JwtPayload } from '../auth/auth.types';
import { APP_CONFIG, type AppConfig } from '../config/env';
import { FieldEncryptionService } from '../crypto/field-encryption.service';
import { DatabaseService } from '../database/database.service';

const MAX_RESULTS = 5;

@Injectable()
export class PilgrimSearchService {
  constructor(
    private readonly database: DatabaseService,
    private readonly encryption: FieldEncryptionService,
    private readonly audit: AuditService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async search(user: JwtPayload, input: PilgrimSearchInput) {
    if (user.role !== 'VOLUNTEER' && user.role !== 'POLICE') {
      throw new ForbiddenException('Search is restricted to volunteers and police');
    }

    if (input.mode === PilgrimSearchMode.PHOTO && !this.config.FACE_MATCH_ENABLED) {
      await this.audit.record({
        actorType: user.role,
        actorId: user.sub,
        action: 'PILGRIM_SEARCH',
        entityType: 'search',
        entityId: null,
        metadata: { mode: input.mode, faceMatchDisabled: true },
      });
      return { faceMatchDisabled: true as const, results: [] as PilgrimSearchHit[] };
    }

    const members = await this.database.db
      .selectFrom('members')
      .selectAll()
      .where('deleted_at', 'is', null)
      .execute();

    const cases = await this.database.db
      .selectFrom('cases')
      .select(['member_uid', 'status'])
      .where('status', '<>', 'REUNITED')
      .execute();
    const caseByUid = new Map(cases.map((c) => [c.member_uid, c.status]));

    type Scored = PilgrimSearchHit & { _score: number };
    const hits: Scored[] = [];

    for (const m of members) {
      const name = m.name_enc
        ? this.encryption.decrypt(Buffer.from(m.name_enc))
        : '';
      const familyCode = m.family_code ?? m.uid.slice(0, 4);

      let include = false;
      let faceMatchScore: number | undefined;
      let score = 0;

      switch (input.mode) {
        case PilgrimSearchMode.NAME: {
          const q = (input.name ?? '').toLowerCase();
          if (q && name.toLowerCase().includes(q)) {
            include = true;
            score = name.toLowerCase().startsWith(q) ? 90 : 70;
            if (input.ageBand && m.age_band === input.ageBand) score += 10;
          }
          break;
        }
        case PilgrimSearchMode.FAMILY_ID: {
          if (input.familyId && familyCode === input.familyId) {
            include = true;
            score = 95;
          }
          break;
        }
        case PilgrimSearchMode.AADHAAR: {
          if (input.aadhaarNumber && m.aadhaar_enc) {
            const full = this.encryption.decrypt(Buffer.from(m.aadhaar_enc));
            if (full === input.aadhaarNumber) {
              include = true;
              score = 100;
            }
          }
          break;
        }
        case PilgrimSearchMode.QR: {
          if (input.qrUid && m.uid === input.qrUid) {
            include = true;
            score = 100;
          }
          break;
        }
        case PilgrimSearchMode.PHOTO: {
          if (m.photo_key && input.photoKey) {
            faceMatchScore = mockFaceScore(input.photoKey, m.uid);
            if (faceMatchScore >= 40) {
              include = true;
              score = faceMatchScore;
            }
          }
          break;
        }
        default:
          break;
      }

      if (include) {
        hits.push({
          uid: m.uid,
          familyCode,
          name,
          ageBand: (m.age_band as PilgrimSearchHit['ageBand']) ?? null,
          caseStatus: (caseByUid.get(m.uid) as PilgrimSearchHit['caseStatus']) ?? null,
          faceMatchScore,
          hasPhoto: Boolean(m.photo_key),
          _score: score,
        });
      }
    }

    hits.sort((a, b) => b._score - a._score);
    const results = hits.slice(0, MAX_RESULTS).map(({ _score: _, ...rest }) => rest);

    await this.audit.record({
      actorType: user.role,
      actorId: user.sub,
      action: 'PILGRIM_SEARCH',
      entityType: 'search',
      entityId: null,
      metadata: { mode: input.mode, resultCount: results.length },
    });

    return { faceMatchDisabled: false as const, results };
  }

  /** Family contacts for a member — phones never returned (call is logged server-side). */
  async familyContacts(user: JwtPayload, memberUid: string) {
    if (user.role !== 'VOLUNTEER' && user.role !== 'POLICE') {
      throw new ForbiddenException();
    }
    const member = await this.database.db
      .selectFrom('members')
      .selectAll()
      .where('uid', '=', memberUid)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
    if (!member?.family_code) {
      return { memberUid, family: [] as { uid: string; name: string; relation: string; hasPhone: boolean }[] };
    }

    const family = await this.database.db
      .selectFrom('members')
      .selectAll()
      .where('family_code', '=', member.family_code)
      .where('deleted_at', 'is', null)
      .orderBy('member_seq', 'asc')
      .execute();

    return {
      memberUid,
      family: family.map((m) => ({
        uid: m.uid,
        name: m.name_enc ? this.encryption.decrypt(Buffer.from(m.name_enc)) : '',
        relation: m.is_self ? 'Self' : m.uid === memberUid ? 'Found' : 'Family',
        hasPhone: Boolean(m.phone_enc || m.emergency_phone_enc),
      })),
    };
  }
}

/** Deterministic mock score 40–99 for feature-flagged face matching. */
function mockFaceScore(photoKey: string, memberUid: string): number {
  const digest = createHash('sha256').update(`${photoKey}:${memberUid}`).digest();
  return 40 + (digest[0]! % 60);
}
