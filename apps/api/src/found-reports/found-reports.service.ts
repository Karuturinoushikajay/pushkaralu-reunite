import { Injectable } from '@nestjs/common';
import type { FoundReportInput } from '@pushkaralu/shared';
import { sql } from 'kysely';
import { AuditService } from '../audit/audit.service';
import type { JwtPayload } from '../auth/auth.types';
import { FieldEncryptionService } from '../crypto/field-encryption.service';
import { DatabaseService } from '../database/database.service';
import { pointWkt } from '../geo/geo';
import { DescriptionCaseSearchService } from '../cases/case-search.service';

@Injectable()
export class FoundReportsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly encryption: FieldEncryptionService,
    private readonly audit: AuditService,
    private readonly search: DescriptionCaseSearchService,
  ) {}

  async create(user: JwtPayload, input: FoundReportInput) {
    const volunteer = await this.database.db
      .selectFrom('volunteers')
      .select(['id'])
      .where('volunteer_code', '=', user.uid)
      .executeTakeFirst();

    const wkt = pointWkt(input.location.lng, input.location.lat);
    const photoKey = input.photoKey
      ? this.encryption.encryptToBase64(input.photoKey)
      : null;

    const inserted = await sql<{ id: string }>`
      insert into found_reports (
        volunteer_id, scanned_uid, age_band, gender, clothing,
        language_spoken, location, photo_key, status
      ) values (
        ${volunteer?.id ?? null},
        ${input.scannedUid ?? null},
        ${input.ageBand},
        ${input.gender},
        ${input.clothing},
        ${input.languageSpoken ?? null},
        ST_GeogFromText(${wkt}),
        ${photoKey},
        'OPEN'
      )
      returning id
    `.execute(this.database.db);

    const id = inserted.rows[0]!.id;
    await this.audit.record({
      actorType: user.role,
      actorId: user.sub,
      action: 'FOUND_REPORT_CREATED',
      entityType: 'found_report',
      entityId: id,
    });

    const matches = input.scannedUid
      ? await this.search.byScannedUid(input.scannedUid)
      : await this.search.search({
          ageBand: input.ageBand,
          gender: input.gender,
          clothing: input.clothing,
          languageSpoken: input.languageSpoken,
          location: input.location,
        });

    return { id, matches };
  }

  async listOpen() {
    const rows = await sql<{
      id: string;
      scanned_uid: string | null;
      age_band: string | null;
      gender: string | null;
      clothing: string | null;
      language_spoken: string | null;
      status: string;
      created_at: Date;
      geojson: string | null;
      volunteer_code: string | null;
    }>`
      select f.id, f.scanned_uid, f.age_band, f.gender, f.clothing, f.language_spoken,
             f.status, f.created_at, ST_AsGeoJSON(f.location) as geojson,
             v.volunteer_code
      from found_reports f
      left join volunteers v on v.id = f.volunteer_id
      where f.status = 'OPEN'
      order by f.created_at desc
      limit 100
    `.execute(this.database.db);

    return rows.rows.map((r) => {
      const geo = r.geojson
        ? (JSON.parse(r.geojson) as { coordinates: [number, number] })
        : null;
      return {
        id: r.id,
        scannedUid: r.scanned_uid,
        ageBand: r.age_band,
        gender: r.gender,
        clothing: r.clothing,
        languageSpoken: r.language_spoken,
        status: r.status,
        createdAt: new Date(r.created_at as unknown as string).toISOString(),
        location: geo ? { lng: geo.coordinates[0], lat: geo.coordinates[1] } : null,
        volunteerCode: r.volunteer_code,
      };
    });
  }

  async matches(id: string) {
    const row = await this.database.db
      .selectFrom('found_reports')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    if (!row) return [];

    if (row.scanned_uid) {
      return this.search.byScannedUid(row.scanned_uid);
    }

    let location: { lng: number; lat: number } | undefined;
    if (row.location) {
      const geo = await sql<{ geojson: string }>`
        select ST_AsGeoJSON(location) as geojson from found_reports where id = ${id}
      `.execute(this.database.db);
      if (geo.rows[0]?.geojson) {
        const g = JSON.parse(geo.rows[0].geojson) as { coordinates: [number, number] };
        location = { lng: g.coordinates[0], lat: g.coordinates[1] };
      }
    }

    return this.search.search({
      ageBand: row.age_band as never,
      gender: row.gender as never,
      clothing: row.clothing ?? undefined,
      languageSpoken: row.language_spoken ?? undefined,
      location,
    });
  }
}
