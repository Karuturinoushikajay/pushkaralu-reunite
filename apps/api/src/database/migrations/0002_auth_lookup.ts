import { type Kysely, sql } from 'kysely';

/**
 * Step 2 auth support:
 *  - phone_lookup is an HMAC of the normalized phone so OTP login can find an
 *    account without storing the phone in plaintext.
 *  - address_enc holds the account address as ciphertext.
 *  - otp_challenges stores hashed login codes with an expiry.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`alter table members add column if not exists address_enc bytea`.execute(db);
  await sql`alter table members add column if not exists phone_lookup text`.execute(db);
  await sql`
    create unique index if not exists idx_members_phone_lookup
      on members (phone_lookup)
      where phone_lookup is not null and deleted_at is null
  `.execute(db);

  await sql`
    create table if not exists otp_challenges (
      id uuid primary key default gen_random_uuid(),
      phone_lookup text not null,
      code_hash text not null,
      purpose text not null default 'LOGIN' check (purpose in ('LOGIN')),
      expires_at timestamptz not null,
      consumed_at timestamptz,
      created_at timestamptz not null default now()
    )
  `.execute(db);
  await sql`
    create index if not exists idx_otp_challenges_lookup
      on otp_challenges (phone_lookup, created_at desc)
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`drop table if exists otp_challenges`.execute(db);
  await sql`drop index if exists idx_members_phone_lookup`.execute(db);
  await sql`alter table members drop column if exists phone_lookup`.execute(db);
  await sql`alter table members drop column if exists address_enc`.execute(db);
}
