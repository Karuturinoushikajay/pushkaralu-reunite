import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { FieldEncryptionService } from '../crypto/field-encryption.service';
import { DatabaseService } from '../database/database.service';
import { pointWkt } from '../geo/geo';

/**
 * Missing-person alerts for volunteers — name, UID, optional photo.
 * No phones / Aadhaar.
 */
@Injectable()
export class VolunteerService {
  constructor(
    private readonly database: DatabaseService,
    private readonly encryption: FieldEncryptionService,
  ) {}

  async nearbyAlerts(lng: number, lat: number, _radiusMeters: number) {
    // Show all open MISSING cases on volunteer duty (sorted by distance when known).
    const rows = await sql<{
      case_id: string;
      member_uid: string;
      age_band: string | null;
      note: string | null;
      last_seen_label: string | null;
      meters: number | null;
      name_enc: Buffer | null;
      photo_key: string | null;
    }>`
      select c.id as case_id,
             c.member_uid,
             m.age_band,
             c.note,
             c.last_seen_label,
             case
               when c.last_seen is null then null
               else ST_Distance(c.last_seen, ST_GeogFromText(${pointWkt(lng, lat)}))
             end as meters,
             m.name_enc,
             m.photo_key
      from cases c
      join members m on m.uid = c.member_uid
      where c.status = 'MISSING'
        and m.deleted_at is null
      order by
        case when c.last_seen is null then 1 else 0 end,
        meters asc nulls last,
        c.reported_at desc
      limit 50
    `.execute(this.database.db);

    return rows.rows.map((r) => {
      const fullName = r.name_enc
        ? this.encryption.decrypt(Buffer.from(r.name_enc))
        : null;
      let photoUrl: string | null = null;
      if (r.photo_key) {
        try {
          const key = this.encryption.decryptFromBase64(r.photo_key);
          if (/^https?:\/\//i.test(key)) photoUrl = key;
        } catch {
          photoUrl = null;
        }
      }
      return {
        caseId: r.case_id,
        memberUid: r.member_uid,
        displayName: fullName,
        ageBand: r.age_band,
        description: r.note,
        lastSeenLabel: r.last_seen_label,
        distanceMeters: r.meters == null ? null : Math.round(r.meters),
        hasPhoto: Boolean(r.photo_key),
        photoUrl,
      };
    });
  }
}
