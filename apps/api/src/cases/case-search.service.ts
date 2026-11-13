import { Injectable } from '@nestjs/common';
import {
  type CaseSearchQuery,
  type CaseSearchResult,
  type CaseSearchService,
} from '@pushkaralu/shared';
import { sql } from 'kysely';
import { FieldEncryptionService } from '../crypto/field-encryption.service';
import { DatabaseService } from '../database/database.service';

/**
 * Description + location + time matching only.
 * Intentionally NO facial recognition / CCTV / biometric matching.
 * This is the Phase 1 CaseSearchService implementation / extension point.
 */
@Injectable()
export class DescriptionCaseSearchService implements CaseSearchService {
  constructor(
    private readonly database: DatabaseService,
    private readonly encryption: FieldEncryptionService,
  ) {}

  async search(query: CaseSearchQuery): Promise<CaseSearchResult[]> {
    const limit = query.limit ?? 10;
    const radius = query.radiusMeters ?? 1500;

    const rows = await sql<{
      case_id: string;
      member_uid: string;
      age_band: string | null;
      note: string | null;
      name_enc: Buffer | null;
      lng: number | null;
      lat: number | null;
    }>`
      select c.id as case_id, c.member_uid, m.age_band, c.note, m.name_enc,
             ST_X(c.last_seen::geometry) as lng,
             ST_Y(c.last_seen::geometry) as lat
      from cases c
      join members m on m.uid = c.member_uid
      where c.status in ('MISSING', 'FOUND')
      order by c.reported_at desc
      limit 80
    `.execute(this.database.db);

    const results: CaseSearchResult[] = [];
    for (const row of rows.rows) {
      const reasons: string[] = [];
      let score = 0;

      if (query.ageBand && row.age_band === query.ageBand) {
        score += 3;
        reasons.push('Same age band');
      }
      if (query.clothing && row.note) {
        const overlap = tokenOverlap(query.clothing, row.note);
        if (overlap > 0) {
          score += overlap >= 2 ? 3 : 1;
          reasons.push('Clothing/description overlap');
        }
      }
      if (
        query.languageSpoken &&
        row.note?.toLowerCase().includes(query.languageSpoken.toLowerCase())
      ) {
        score += 1;
        reasons.push('Language mentioned');
      }
      if (query.location && row.lng != null && row.lat != null) {
        const meters = haversineMeters(
          query.location.lat,
          query.location.lng,
          row.lat,
          row.lng,
        );
        if (meters <= radius) {
          score += meters <= 200 ? 3 : 1;
          reasons.push(`Within ${Math.round(meters)} m`);
        }
      }

      if (score === 0) continue;

      const confidence: CaseSearchResult['confidence'] =
        score >= 6 ? 'HIGH' : score >= 3 ? 'MEDIUM' : 'LOW';
      const name = row.name_enc
        ? this.encryption.decrypt(Buffer.from(row.name_enc))
        : 'Unknown';

      results.push({
        memberUid: row.member_uid,
        caseId: row.case_id,
        confidence,
        reasons: reasons.length ? reasons : [`Candidate ${name}`],
      });
    }

    return results
      .sort((a, b) => confidenceRank(b.confidence) - confidenceRank(a.confidence))
      .slice(0, limit);
  }

  /** Exact match when a wristband QR UID was scanned — still not biometrics. */
  async byScannedUid(uid: string): Promise<CaseSearchResult[]> {
    const row = await sql<{ case_id: string; member_uid: string }>`
      select c.id as case_id, c.member_uid
      from cases c
      where c.member_uid = ${uid} and c.status in ('MISSING','FOUND')
      limit 1
    `.execute(this.database.db);
    if (!row.rows[0]) return [];
    return [
      {
        memberUid: row.rows[0].member_uid,
        caseId: row.rows[0].case_id,
        confidence: 'HIGH',
        reasons: ['Wristband QR UID match'],
      },
    ];
  }
}

function tokenOverlap(a: string, b: string): number {
  const ta = new Set(a.toLowerCase().split(/\W+/).filter((t) => t.length > 2));
  const tb = new Set(b.toLowerCase().split(/\W+/).filter((t) => t.length > 2));
  let n = 0;
  for (const t of ta) if (tb.has(t)) n += 1;
  return n;
}

function confidenceRank(c: CaseSearchResult['confidence']): number {
  return c === 'HIGH' ? 3 : c === 'MEDIUM' ? 2 : 1;
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
