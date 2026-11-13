import { type Kysely, sql } from 'kysely';

/**
 * Initial schema for Pushkaralu Reunite.
 *
 * Privacy/retention conventions:
 *  - Personal-data tables carry `deleted_at` (soft delete) and `retention_until`
 *    (DPDP retention window) columns.
 *  - Sensitive fields are stored as ciphertext (`*_enc`, bytea), written by the
 *    app's crypto layer (Step 2). Aadhaar is last-4 only.
 *  - `audit_log` is append-only, enforced by a trigger that blocks UPDATE/DELETE.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`create extension if not exists postgis`.execute(db);
  await sql`create extension if not exists pgcrypto`.execute(db);

  // ---- accounts -----------------------------------------------------------
  await sql`
    create table accounts (
      id uuid primary key default gen_random_uuid(),
      login_uid text not null unique,
      password_hash text,
      role text not null default 'USER' check (role in ('USER','VOLUNTEER','POLICE')),
      status text not null default 'PENDING' check (status in ('PENDING','ACTIVE','SUSPENDED')),
      preferred_language text not null default 'en' check (preferred_language in ('en','te','hi')),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      deleted_at timestamptz,
      retention_until timestamptz
    )
  `.execute(db);

  // ---- uid_series ---------------------------------------------------------
  await sql`
    create table uid_series (
      prefix text primary key check (prefix ~ '^[A-Z]{3}$'),
      last_number integer not null default 1000 check (last_number >= 0),
      updated_at timestamptz not null default now()
    )
  `.execute(db);

  // ---- members ------------------------------------------------------------
  await sql`
    create table members (
      uid text primary key check (uid ~ '^[A-Z]{3}[0-9]{4,}$'),
      account_id uuid not null references accounts(id) on delete cascade,
      name_enc bytea,
      age_band text,
      phone_enc bytea,
      emergency_phone_enc bytea,
      aadhaar_last4_enc bytea,
      photo_key text,
      is_self boolean not null default false,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      deleted_at timestamptz,
      retention_until timestamptz
    )
  `.execute(db);
  await sql`create index idx_members_account on members(account_id)`.execute(db);
  await sql`create index idx_members_not_deleted on members(account_id) where deleted_at is null`.execute(
    db,
  );

  // ---- booths -------------------------------------------------------------
  await sql`
    create table booths (
      id uuid primary key default gen_random_uuid(),
      code text not null unique,
      name text not null,
      officer_name text,
      informant text,
      phone_enc bytea,
      location geography(Point, 4326),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `.execute(db);
  await sql`create index idx_booths_location on booths using gist (location)`.execute(db);

  // ---- volunteers ---------------------------------------------------------
  await sql`
    create table volunteers (
      id uuid primary key default gen_random_uuid(),
      volunteer_code text not null unique,
      name_enc bytea,
      phone_enc bytea,
      booth_id uuid references booths(id) on delete set null,
      status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE')),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      deleted_at timestamptz
    )
  `.execute(db);
  await sql`create index idx_volunteers_booth on volunteers(booth_id)`.execute(db);

  // ---- cases --------------------------------------------------------------
  await sql`
    create table cases (
      id uuid primary key default gen_random_uuid(),
      member_uid text not null references members(uid) on delete cascade,
      status text not null default 'MISSING'
        check (status in ('MISSING','FOUND','MATCHED','REUNITED')),
      last_seen geography(Point, 4326),
      last_seen_label text,
      note text,
      reported_by_account_id uuid references accounts(id) on delete set null,
      reported_at timestamptz not null default now(),
      resolved_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `.execute(db);
  await sql`create index idx_cases_member on cases(member_uid)`.execute(db);
  await sql`create index idx_cases_status on cases(status)`.execute(db);
  await sql`create index idx_cases_last_seen on cases using gist (last_seen)`.execute(db);
  // At most one active (non-reunited) case per member.
  await sql`
    create unique index idx_cases_one_active_per_member
      on cases(member_uid) where status <> 'REUNITED'
  `.execute(db);

  // ---- found_reports ------------------------------------------------------
  await sql`
    create table found_reports (
      id uuid primary key default gen_random_uuid(),
      volunteer_id uuid references volunteers(id) on delete set null,
      scanned_uid text references members(uid) on delete set null,
      age_band text,
      gender text check (gender in ('MALE','FEMALE','OTHER','UNKNOWN')),
      clothing text,
      language_spoken text,
      location geography(Point, 4326),
      photo_key text,
      status text not null default 'OPEN' check (status in ('OPEN','MATCHED','CLOSED')),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `.execute(db);
  await sql`create index idx_found_status on found_reports(status)`.execute(db);
  await sql`create index idx_found_location on found_reports using gist (location)`.execute(db);

  // ---- handovers ----------------------------------------------------------
  await sql`
    create table handovers (
      id uuid primary key default gen_random_uuid(),
      case_id uuid not null references cases(id) on delete cascade,
      found_report_id uuid references found_reports(id) on delete set null,
      officer_id uuid references accounts(id) on delete set null,
      guardian_otp_hash text,
      otp_expires_at timestamptz,
      verified_at timestamptz,
      created_at timestamptz not null default now()
    )
  `.execute(db);
  await sql`create index idx_handovers_case on handovers(case_id)`.execute(db);

  // ---- notices ------------------------------------------------------------
  await sql`
    create table notices (
      id uuid primary key default gen_random_uuid(),
      title jsonb not null,
      body jsonb not null,
      severity text not null default 'INFO' check (severity in ('INFO','WARNING','CRITICAL')),
      booth_id uuid references booths(id) on delete set null,
      active boolean not null default true,
      published_at timestamptz not null default now(),
      created_at timestamptz not null default now()
    )
  `.execute(db);
  await sql`create index idx_notices_active on notices(active, published_at desc)`.execute(db);

  // ---- consents -----------------------------------------------------------
  await sql`
    create table consents (
      id uuid primary key default gen_random_uuid(),
      account_id uuid not null references accounts(id) on delete cascade,
      member_uid text references members(uid) on delete cascade,
      type text not null check (type in ('REUNIFICATION','MINOR_GUARDIAN')),
      granted boolean not null default true,
      version text not null default 'v1',
      granted_at timestamptz not null default now(),
      revoked_at timestamptz
    )
  `.execute(db);
  await sql`create index idx_consents_account on consents(account_id)`.execute(db);

  // ---- audit_log (append-only) -------------------------------------------
  await sql`
    create table audit_log (
      id uuid primary key default gen_random_uuid(),
      actor_type text not null check (actor_type in ('USER','VOLUNTEER','POLICE','SYSTEM')),
      actor_id text,
      action text not null,
      entity_type text not null,
      entity_id text,
      metadata jsonb,
      created_at timestamptz not null default now()
    )
  `.execute(db);
  await sql`create index idx_audit_entity on audit_log(entity_type, entity_id)`.execute(db);
  await sql`create index idx_audit_created on audit_log(created_at desc)`.execute(db);

  // Enforce append-only: block UPDATE and DELETE on audit_log.
  await sql`
    create or replace function reject_audit_mutation() returns trigger as $$
    begin
      raise exception 'audit_log is append-only; % is not permitted', tg_op;
    end;
    $$ language plpgsql
  `.execute(db);
  await sql`
    create trigger audit_log_no_update_delete
      before update or delete on audit_log
      for each row execute function reject_audit_mutation()
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`drop trigger if exists audit_log_no_update_delete on audit_log`.execute(db);
  await sql`drop function if exists reject_audit_mutation()`.execute(db);
  await sql`drop table if exists audit_log`.execute(db);
  await sql`drop table if exists consents`.execute(db);
  await sql`drop table if exists notices`.execute(db);
  await sql`drop table if exists handovers`.execute(db);
  await sql`drop table if exists found_reports`.execute(db);
  await sql`drop table if exists cases`.execute(db);
  await sql`drop table if exists volunteers`.execute(db);
  await sql`drop table if exists booths`.execute(db);
  await sql`drop table if exists members`.execute(db);
  await sql`drop table if exists uid_series`.execute(db);
  await sql`drop table if exists accounts`.execute(db);
}
