import { Injectable, NotFoundException } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../database/database.service';
import { pointWkt } from '../geo/geo';

type NameI18n = { en?: string; hi?: string; te?: string; ta?: string };

@Injectable()
export class BoothsService {
  constructor(private readonly database: DatabaseService) {}

  async list() {
    const rows = await sql<{
      id: string;
      code: string;
      name: string;
      name_i18n: NameI18n | null;
      officer_name: string | null;
      informant: string | null;
      geojson: string | null;
    }>`
      select id, code, name, name_i18n, officer_name, informant, ST_AsGeoJSON(location) as geojson
      from booths
      order by code
    `.execute(this.database.db);

    return rows.rows.map((b) => this.toDto(b));
  }

  /** Public directory for police credential create (codes + names only). */
  async directory() {
    const rows = await this.database.db
      .selectFrom('booths')
      .select(['code', 'name', 'name_i18n', 'officer_name'])
      .orderBy('code')
      .execute();
    return rows.map((b) => ({
      code: b.code,
      name: b.name,
      nameI18n: b.name_i18n ?? { en: b.name },
      officerName: b.officer_name,
    }));
  }

  async allocatedForAccount(accountId: string) {
    const account = await this.database.db
      .selectFrom('accounts')
      .select(['booth_id', 'login_uid', 'role'])
      .where('id', '=', accountId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
    if (!account || account.role !== 'POLICE') {
      throw new NotFoundException('No allocated booth');
    }

    let boothId = account.booth_id;
    if (!boothId) {
      const fallback = await this.database.db
        .selectFrom('booths')
        .select(['id'])
        .where('code', '=', 'BOOTH-07')
        .executeTakeFirst();
      boothId = fallback?.id ?? null;
    }
    if (!boothId) throw new NotFoundException('No allocated booth');

    const rows = await sql<{
      id: string;
      code: string;
      name: string;
      name_i18n: NameI18n | null;
      officer_name: string | null;
      informant: string | null;
      geojson: string | null;
    }>`
      select id, code, name, name_i18n, officer_name, informant, ST_AsGeoJSON(location) as geojson
      from booths
      where id = ${boothId}::uuid
    `.execute(this.database.db);

    const b = rows.rows[0];
    if (!b) throw new NotFoundException('No allocated booth');
    return {
      ...this.toDto(b),
      officerLoginUid: account.login_uid,
    };
  }

  async nearest(lng: number, lat: number) {
    const rows = await sql<{
      id: string;
      code: string;
      name: string;
      name_i18n: NameI18n | null;
      officer_name: string | null;
      informant: string | null;
      geojson: string | null;
      meters: number;
    }>`
      select id, code, name, name_i18n, officer_name, informant,
             ST_AsGeoJSON(location) as geojson,
             ST_Distance(location, ST_GeogFromText(${pointWkt(lng, lat)})) as meters
      from booths
      where location is not null
      order by location <-> ST_GeogFromText(${pointWkt(lng, lat)})
      limit 1
    `.execute(this.database.db);

    const b = rows.rows[0];
    if (!b) throw new NotFoundException('No booths configured');
    return { ...this.toDto(b), distanceMeters: Math.round(b.meters) };
  }

  private toDto(b: {
    id: string;
    code: string;
    name: string;
    name_i18n?: NameI18n | null;
    officer_name: string | null;
    informant: string | null;
    geojson: string | null;
  }) {
    const geo = b.geojson ? (JSON.parse(b.geojson) as { coordinates: [number, number] }) : null;
    const nameI18n = b.name_i18n ?? { en: b.name };
    return {
      id: b.id,
      code: b.code,
      name: b.name,
      nameI18n,
      officerName: b.officer_name,
      informant: b.informant,
      location: geo ? { lng: geo.coordinates[0], lat: geo.coordinates[1] } : null,
    };
  }
}
