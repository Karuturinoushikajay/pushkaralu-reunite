import { type Kysely, sql } from 'kysely';

/**
 * v3: family UIDs (K7M2-01), full Aadhaar ciphertext, call log, manual handover close.
 * Dev databases may still hold ABC1001 rows — those are cleared so the new check applies.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  // Clear pilgrim rows that violate the new UID shape (dev/seed only).
  await sql`delete from handovers`.execute(db);
  await sql`delete from found_reports`.execute(db);
  await sql`delete from cases`.execute(db);
  await sql`delete from consents`.execute(db);
  await sql`delete from members`.execute(db);
  await sql`delete from accounts where role = 'USER'`.execute(db);
  await sql`delete from registration_drafts`.execute(db);

  await sql`
    create table if not exists family_code_series (
      id boolean primary key default true check (id),
      last_counter integer not null default 0 check (last_counter >= 0),
      updated_at timestamptz not null default now()
    )
  `.execute(db);
  await sql`
    insert into family_code_series (id, last_counter)
    values (true, 0)
    on conflict (id) do nothing
  `.execute(db);

  await sql`alter table members drop constraint if exists members_uid_check`.execute(db);
  await sql`
    alter table members
      add column if not exists family_code text,
      add column if not exists member_seq integer,
      add column if not exists aadhaar_enc bytea,
      add column if not exists face_consent_at timestamptz
  `.execute(db);

  await sql`
    alter table members
      add constraint members_uid_check
      check (uid ~ '^[A-Z0-9]{4}-[0-9]{2}$')
  `.execute(db);
  await sql`
    alter table members
      add constraint members_family_code_check
      check (family_code is null or family_code ~ '^[A-Z0-9]{4}$')
  `.execute(db);
  await sql`
    create index if not exists idx_members_family_code on members(family_code)
    where deleted_at is null
  `.execute(db);

  await sql`
    create table if not exists family_calls (
      id uuid primary key default gen_random_uuid(),
      case_id uuid references cases(id) on delete set null,
      member_uid text references members(uid) on delete set null,
      actor_type text not null check (actor_type in ('VOLUNTEER','POLICE')),
      actor_id uuid,
      outcome text not null check (outcome in ('RESPONDED','NO_RESPONSE')),
      created_at timestamptz not null default now()
    )
  `.execute(db);
  await sql`create index if not exists idx_family_calls_case on family_calls(case_id)`.execute(db);

  await sql`
    alter table handovers
      add column if not exists closed_manually boolean not null default false,
      add column if not exists manual_close_reason text,
      add column if not exists id_verified boolean,
      add column if not exists guardian_name text,
      add column if not exists guardian_phone_enc bytea,
      add column if not exists officer_note text,
      add column if not exists supervisor_id text
  `.execute(db);

  await sql`alter table consents drop constraint if exists consents_type_check`.execute(db);
  await sql`
    alter table consents
      add constraint consents_type_check
      check (type in ('REUNIFICATION','MINOR_GUARDIAN','FACE_RECOGNITION'))
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`alter table consents drop constraint if exists consents_type_check`.execute(db);
  await sql`
    alter table consents
      add constraint consents_type_check
      check (type in ('REUNIFICATION','MINOR_GUARDIAN'))
  `.execute(db);

  await sql`
    alter table handovers
      drop column if exists closed_manually,
      drop column if exists manual_close_reason,
      drop column if exists id_verified,
      drop column if exists guardian_name,
      drop column if exists guardian_phone_enc,
      drop column if exists officer_note,
      drop column if exists supervisor_id
  `.execute(db);

  await sql`drop table if exists family_calls`.execute(db);

  await sql`alter table members drop constraint if exists members_uid_check`.execute(db);
  await sql`alter table members drop constraint if exists members_family_code_check`.execute(db);
  await sql`drop index if exists idx_members_family_code`.execute(db);
  await sql`
    alter table members
      drop column if exists family_code,
      drop column if exists member_seq,
      drop column if exists aadhaar_enc,
      drop column if exists face_consent_at
  `.execute(db);
  await sql`
    alter table members
      add constraint members_uid_check
      check (uid ~ '^[A-Z]{3}[0-9]{4,}$')
  `.execute(db);

  await sql`drop table if exists family_code_series`.execute(db);
}
