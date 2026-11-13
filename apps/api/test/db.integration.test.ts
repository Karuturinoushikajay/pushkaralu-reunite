import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import { Kysely, sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb } from '../src/database/kysely';
import { runMigrations } from '../src/database/migrator';
import { seed } from '../src/database/seed';
import type { Database } from '../src/database/schema';

function encryptAes(plain: string, keyMaterial: string): Buffer {
  const key = createHash('sha256').update(keyMaterial).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
}

function decryptAes(payload: Buffer, keyMaterial: string): string {
  const key = createHash('sha256').update(keyMaterial).digest();
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const data = payload.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

/**
 * Integration tests against a real PostGIS instance. Requires DATABASE_URL
 * (CI provides a postgis service; locally run `pnpm db:up` first). If it is not
 * set, the suite is skipped rather than failing an offline unit run.
 */
const DATABASE_URL = process.env.DATABASE_URL;
const ENC_KEY = process.env.DATA_ENCRYPTION_KEY ?? 'dev-seed-key';

const suite = DATABASE_URL ? describe : describe.skip;

suite('database schema + seed (PostGIS)', () => {
  let db: Kysely<Database>;

  beforeAll(async () => {
    // Clean slate, then migrate up and seed.
    await runMigrations('down', DATABASE_URL as string).catch(() => undefined);
    await runMigrations('latest', DATABASE_URL as string);
    db = createDb(DATABASE_URL as string);
    await seed(db, ENC_KEY);
  }, 60_000);

  afterAll(async () => {
    await db?.destroy();
  });

  it('creates the PostGIS extension', async () => {
    const rows = await sql<{ extname: string }>`
      select extname from pg_extension where extname = 'postgis'
    `.execute(db);
    expect(rows.rows).toHaveLength(1);
  });

  it('creates every core table', async () => {
    const expected = [
      'accounts',
      'members',
      'uid_series',
      'cases',
      'found_reports',
      'handovers',
      'volunteers',
      'booths',
      'notices',
      'audit_log',
      'consents',
      'registration_drafts',
      'otp_challenges',
    ];
    const rows = await sql<{ table_name: string }>`
      select table_name from information_schema.tables
      where table_schema = 'public'
    `.execute(db);
    const names = rows.rows.map((r) => r.table_name);
    for (const t of expected) {
      expect(names, `missing table ${t}`).toContain(t);
    }
  });

  it('creates GIST indexes on geography columns', async () => {
    const rows = await sql<{ indexname: string; indexdef: string }>`
      select indexname, indexdef from pg_indexes where schemaname = 'public'
    `.execute(db);
    const gist = rows.rows.filter((r) => /USING gist/i.test(r.indexdef));
    const gistTargets = gist.map((r) => r.indexname);
    expect(gistTargets).toContain('idx_cases_last_seen');
    expect(gistTargets).toContain('idx_found_location');
    expect(gistTargets).toContain('idx_booths_location');
  });

  it('seeds the ABC uid_series at 1000', async () => {
    const row = await db
      .selectFrom('uid_series')
      .select(['prefix', 'last_number'])
      .where('prefix', '=', 'ABC')
      .executeTakeFirst();
    expect(row?.last_number).toBe(1000);
  });

  it('seeds Booth 07 Kotilingala Ghat with a geography point', async () => {
    const row = await sql<{ code: string; name: string; geojson: string }>`
      select code, name, ST_AsGeoJSON(location) as geojson
      from booths where code = 'BOOTH-07'
    `.execute(db);
    expect(row.rows).toHaveLength(1);
    expect(row.rows[0]?.name).toBe('Kotilingala Ghat');
    const geo = JSON.parse(row.rows[0]?.geojson ?? '{}');
    expect(geo.type).toBe('Point');
    expect(geo.coordinates[0]).toBeCloseTo(81.7795, 3);
    expect(geo.coordinates[1]).toBeCloseTo(16.9846, 3);
  });

  it('encrypts booth phone at rest with AES-GCM (app-layer crypto)', async () => {
    const row = await sql<{ phone_enc: Buffer | null }>`
      select phone_enc from booths where code = 'BOOTH-07'
    `.execute(db);
    const enc = row.rows[0]?.phone_enc;
    expect(enc).toBeTruthy();
    expect(Buffer.isBuffer(enc) ? enc : Buffer.from(enc as never))
      .toBeTruthy();
    const buf = Buffer.isBuffer(enc) ? enc : Buffer.from(enc as never);
    expect(buf.toString('utf8')).not.toContain('8812345607');
    expect(decryptAes(buf, ENC_KEY)).toBe('+918812345607');
  });

  it('enforces append-only audit_log (UPDATE and DELETE rejected)', async () => {
    await sql`
      insert into audit_log (actor_type, action, entity_type)
      values ('SYSTEM', 'TEST', 'test')
    `.execute(db);

    await expect(
      sql`update audit_log set action = 'TAMPER' where action = 'TEST'`.execute(db),
    ).rejects.toThrow(/append-only/i);

    await expect(
      sql`delete from audit_log where action = 'TEST'`.execute(db),
    ).rejects.toThrow(/append-only/i);
  });

  it('allows only one active case per member', async () => {
    const encKey = ENC_KEY;
    await sql`
      insert into accounts (login_uid, role, status)
      values ('Z9Y8-01', 'USER', 'ACTIVE')
      on conflict (login_uid) do nothing
    `.execute(db);
    const nameEnc = encryptAes('Test Member', encKey);
    await sql`
      insert into members (uid, account_id, family_code, member_seq, name_enc, is_self)
      values (
        'Z9Y8-01',
        (select id from accounts where login_uid = 'Z9Y8-01'),
        'Z9Y8',
        1,
        ${nameEnc},
        true
      )
      on conflict (uid) do nothing
    `.execute(db);

    await sql`
      insert into cases (member_uid, status) values ('Z9Y8-01', 'MISSING')
      on conflict do nothing
    `.execute(db);

    await expect(
      sql`insert into cases (member_uid, status) values ('Z9Y8-01', 'FOUND')`.execute(db),
    ).rejects.toThrow();
  });
});
