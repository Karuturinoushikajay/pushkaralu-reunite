import { type Kysely, sql } from 'kysely';

/**
 * Step 2: auth / OTP / registration drafts.
 *
 * - registration_drafts holds PII until phone OTP succeeds (then UID is minted).
 * - otp_challenges stores hashed OTPs for register, volunteer login, and (later) handover.
 * - members.address_enc stores the pilgrim address (encrypted).
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table members
      add column if not exists address_enc bytea
  `.execute(db);

  await sql`
    create table registration_drafts (
      id uuid primary key default gen_random_uuid(),
      phone_hash text not null,
      phone_enc bytea not null,
      password_hash text not null,
      preferred_language text not null default 'en'
        check (preferred_language in ('en','te','hi')),
      payload_enc bytea not null,
      expires_at timestamptz not null,
      created_at timestamptz not null default now()
    )
  `.execute(db);
  await sql`create index idx_reg_drafts_phone on registration_drafts(phone_hash)`.execute(db);
  await sql`create index idx_reg_drafts_expires on registration_drafts(expires_at)`.execute(db);

  await sql`
    create table otp_challenges (
      id uuid primary key default gen_random_uuid(),
      purpose text not null
        check (purpose in ('REGISTER','VOLUNTEER_LOGIN','HANDOVER')),
      target_hash text not null,
      code_hash text not null,
      attempts integer not null default 0,
      max_attempts integer not null default 5,
      expires_at timestamptz not null,
      consumed_at timestamptz,
      draft_id uuid references registration_drafts(id) on delete cascade,
      volunteer_id uuid references volunteers(id) on delete cascade,
      metadata jsonb,
      created_at timestamptz not null default now()
    )
  `.execute(db);
  await sql`create index idx_otp_target on otp_challenges(purpose, target_hash)`.execute(db);
  await sql`create index idx_otp_expires on otp_challenges(expires_at)`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`drop table if exists otp_challenges`.execute(db);
  await sql`drop table if exists registration_drafts`.execute(db);
  await sql`alter table members drop column if exists address_enc`.execute(db);
}
