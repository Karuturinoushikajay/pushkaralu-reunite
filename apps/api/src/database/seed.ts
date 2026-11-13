import { createCipheriv, createHash, randomBytes } from 'node:crypto';
import { Kysely, sql } from 'kysely';
import { loadConfig } from '../config/env';
import { createDb } from './kysely';
import type { Database } from './schema';

/**
 * Idempotent seed: booths, notices, family_code_series, demo family K7M2,
 * volunteer + booth-officer account.
 */

const ENC_KEY_FALLBACK = 'dev-seed-key';

function encryptAes(plain: string, keyMaterial: string): Buffer {
  const key = createHash('sha256').update(keyMaterial).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]);
}

function encryptAesB64(plain: string, keyMaterial: string): string {
  return encryptAes(plain, keyMaterial).toString('base64');
}

const booths = [
  {
    code: 'BOOTH-07',
    name: 'Kotilingala Ghat',
    nameI18n: {
      en: 'Kotilingala Ghat',
      hi: 'कोटिलिंगाला घाट',
      te: 'కోటిలింగాల ఘాట్',
      ta: 'கோடிலிங்கால காட்',
    },
    officer: 'SI K. Prasad',
    informant: 'Volunteer VOL-0214',
    phone: '+918812345607',
    lng: 81.7795,
    lat: 16.9846,
  },
  {
    code: 'BOOTH-03',
    name: 'Pushkar Ghat',
    nameI18n: {
      en: 'Pushkar Ghat',
      hi: 'पुष्कर घाट',
      te: 'పుష్కర ఘాట్',
      ta: 'புஷ்கர காட்',
    },
    officer: 'SI R. Lakshmi',
    informant: 'Volunteer VOL-0109',
    phone: '+918812345603',
    lng: 81.776,
    lat: 16.99,
  },
  {
    code: 'ZONE-PARKING-B',
    name: 'Parking Zone B',
    nameI18n: {
      en: 'Parking Zone B',
      hi: 'पार्किंग ज़ोन बी',
      te: 'పార్కింగ్ జోన్ బి',
      ta: 'பார்க்கிங் மண்டலம் பி',
    },
    officer: 'HC M. Subbarao',
    informant: 'Volunteer VOL-0251',
    phone: '+918812345621',
    lng: 81.77,
    lat: 16.995,
  },
  {
    code: 'SHUTTLE-STOP-1',
    name: 'Shuttle Stop 1',
    nameI18n: {
      en: 'Shuttle Stop 1',
      hi: 'शटल स्टॉप 1',
      te: 'షటిల్ స్టాప్ 1',
      ta: 'ஷட்டில் நிறுத்தம் 1',
    },
    officer: 'HC T. Anitha',
    informant: 'Volunteer VOL-0188',
    phone: '+918812345630',
    lng: 81.782,
    lat: 16.98,
  },
];

const notices = [
  {
    severity: 'INFO' as const,
    boothCode: null as string | null,
    title: {
      en: 'Keep wristbands on',
      te: 'రిస్ట్‌బ్యాండ్‌లను తీయవద్దు',
      hi: 'रिस्टबैंड पहने रखें',
    },
    body: {
      en: 'Children and elders should wear their QR wristband at all times near the ghat.',
      te: 'ఘాట్ సమీపంలో పిల్లలు మరియు వృద్ధులు ఎల్లప్పుడూ తమ QR రిస్ట్‌బ్యాండ్ ధరించాలి.',
      hi: 'घाट के पास बच्चे और बुजुर्ग हर समय अपना QR रिस्टबैंड पहनें.',
    },
  },
  {
    severity: 'WARNING' as const,
    boothCode: 'BOOTH-07',
    title: {
      en: 'Crowd heavy at Kotilingala Ghat',
      te: 'కోటిలింగాల ఘాట్ వద్ద రద్దీ అధికం',
      hi: 'कोटिलिंगाला घाट पर भारी भीड़',
    },
    body: {
      en: 'Please hold hands with your group. Helpline 1800-200-7027 is open 24x7.',
      te: 'దయచేసి మీ బృందంతో చేయి పట్టుకోండి. సహాయవాణి 1800-200-7027 24x7 అందుబాటులో ఉంది.',
      hi: 'कृपया अपने समूह के साथ हाथ पकड़ें. हेल्पलाइन 1800-200-7027 24x7 उपलब्ध है.',
    },
  },
];

async function seedFamilySeries(db: Kysely<Database>): Promise<void> {
  await sql`
    insert into family_code_series (id, last_counter)
    values (true, 100)
    on conflict (id) do nothing
  `.execute(db);
}

async function seedBooths(db: Kysely<Database>, encKey: string): Promise<void> {
  for (const b of booths) {
    const phoneEnc = encryptAes(b.phone, encKey);
    await sql`
      insert into booths (code, name, name_i18n, officer_name, informant, phone_enc, location)
      values (
        ${b.code}, ${b.name}, ${JSON.stringify(b.nameI18n)}::jsonb, ${b.officer}, ${b.informant},
        ${phoneEnc},
        ST_SetSRID(ST_MakePoint(${b.lng}, ${b.lat}), 4326)::geography
      )
      on conflict (code) do update set
        name = excluded.name,
        name_i18n = excluded.name_i18n,
        officer_name = excluded.officer_name,
        informant = excluded.informant,
        phone_enc = excluded.phone_enc,
        location = excluded.location,
        updated_at = now()
    `.execute(db);
  }
}

async function seedVolunteers(db: Kysely<Database>, encKey: string): Promise<void> {
  const nameEnc = encryptAes('S. Naidu', encKey);
  const phoneEnc = encryptAes('+919000000214', encKey);
  await sql`
    insert into volunteers (volunteer_code, name_enc, phone_enc, booth_id, status)
    values (
      'VOL-0214',
      ${nameEnc},
      ${phoneEnc},
      (select id from booths where code = 'BOOTH-07'),
      'ACTIVE'
    )
    on conflict (volunteer_code) do update set
      name_enc = excluded.name_enc,
      phone_enc = excluded.phone_enc,
      booth_id = excluded.booth_id,
      status = excluded.status,
      updated_at = now()
  `.execute(db);
}

async function seedPoliceAccount(db: Kysely<Database>): Promise<void> {
  const argon2 = await import('argon2');
  const passwordHash = await argon2.hash('booth07pass', { type: argon2.argon2id });
  await sql`
    insert into accounts (login_uid, password_hash, role, status, preferred_language, booth_id)
    values (
      'BOOTH07-OFFICER',
      ${passwordHash},
      'POLICE',
      'ACTIVE',
      'en',
      (select id from booths where code = 'BOOTH-07')
    )
    on conflict (login_uid) do update set
      password_hash = excluded.password_hash,
      role = excluded.role,
      status = excluded.status,
      booth_id = coalesce(accounts.booth_id, excluded.booth_id)
  `.execute(db);
}

/** Demo pilgrim family K7M2 — login K7M2-01 / pilgrim123 */
async function seedDemoFamily(db: Kysely<Database>, encKey: string): Promise<void> {
  const argon2 = await import('argon2');
  const passwordHash = await argon2.hash('pilgrim123', { type: argon2.argon2id });
  const retention = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  await sql`
    insert into accounts (login_uid, password_hash, role, status, preferred_language, retention_until)
    values ('K7M2-01', ${passwordHash}, 'USER', 'ACTIVE', 'en', ${retention})
    on conflict (login_uid) do update set
      password_hash = excluded.password_hash,
      status = 'ACTIVE'
  `.execute(db);

  const account = await db
    .selectFrom('accounts')
    .select(['id'])
    .where('login_uid', '=', 'K7M2-01')
    .executeTakeFirstOrThrow();

  const members = [
    {
      uid: 'K7M2-01',
      seq: 1,
      name: 'Ravi K.',
      age: 'ADULT_18_59',
      phone: '+919000000001',
      aadhaar: '123456789012',
      self: true,
    },
    {
      uid: 'K7M2-02',
      seq: 2,
      name: 'Lakshmi',
      age: 'SENIOR_60_PLUS',
      phone: null as string | null,
      aadhaar: '123456789013',
      self: false,
    },
    {
      uid: 'K7M2-03',
      seq: 3,
      name: 'Arun K.',
      age: 'CHILD_6_8',
      phone: null as string | null,
      aadhaar: null as string | null,
      self: false,
    },
  ];

  for (const m of members) {
    await sql`
      insert into members (
        uid, account_id, family_code, member_seq, name_enc, age_band,
        phone_enc, emergency_phone_enc, aadhaar_enc, aadhaar_last4_enc,
        address_enc, photo_key, is_self, retention_until
      )
      values (
        ${m.uid},
        ${account.id},
        'K7M2',
        ${m.seq},
        ${encryptAes(m.name, encKey)},
        ${m.age},
        ${m.phone ? encryptAes(m.phone, encKey) : null},
        ${encryptAes('+919000000002', encKey)},
        ${m.aadhaar ? encryptAes(m.aadhaar, encKey) : null},
        ${m.aadhaar ? encryptAes(m.aadhaar.slice(-4), encKey) : null},
        ${encryptAes('Rajamahendravaram', encKey)},
        ${encryptAesB64(`photos/${m.uid.toLowerCase()}.jpg`, encKey)},
        ${m.self},
        ${retention}
      )
      on conflict (uid) do update set
        name_enc = excluded.name_enc,
        age_band = excluded.age_band,
        family_code = excluded.family_code,
        member_seq = excluded.member_seq,
        updated_at = now()
    `.execute(db);
  }
}

async function seedNotices(db: Kysely<Database>): Promise<void> {
  const { count } = await db
    .selectFrom('notices')
    .select((eb) => eb.fn.countAll<number>().as('count'))
    .executeTakeFirstOrThrow();
  if (Number(count) > 0) {
    console.log('[--] notices already present, skipping');
    return;
  }
  for (const n of notices) {
    await sql`
      insert into notices (title, body, severity, booth_id, active, published_at)
      values (
        ${JSON.stringify(n.title)}::jsonb,
        ${JSON.stringify(n.body)}::jsonb,
        ${n.severity},
        ${n.boothCode ? sql`(select id from booths where code = ${n.boothCode})` : sql`null`},
        true,
        now()
      )
    `.execute(db);
  }
}

async function seedAudit(db: Kysely<Database>): Promise<void> {
  await sql`
    insert into audit_log (actor_type, actor_id, action, entity_type, entity_id, metadata)
    values (
      'SYSTEM', 'seed', 'SEED_APPLIED', 'system', null,
      ${JSON.stringify({ booths: booths.length, notices: notices.length, family: 'K7M2' })}::jsonb
    )
  `.execute(db);
}

export async function seed(db: Kysely<Database>, encKey: string): Promise<void> {
  await seedFamilySeries(db);
  await seedBooths(db, encKey);
  await seedVolunteers(db, encKey);
  await seedPoliceAccount(db);
  await seedDemoFamily(db, encKey);
  await seedNotices(db);
  await seedAudit(db);
}

async function main(): Promise<void> {
  const config = loadConfig();
  const encKey = config.DATA_ENCRYPTION_KEY ?? ENC_KEY_FALLBACK;
  const db = createDb(config.DATABASE_URL);
  try {
    await seed(db, encKey);
    console.log('Seed complete: booths, notices, K7M2 family, volunteer, officer.');
  } finally {
    await db.destroy();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
