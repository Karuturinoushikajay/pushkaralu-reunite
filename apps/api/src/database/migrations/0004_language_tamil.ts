import { type Kysely, sql } from 'kysely';

/** Allow Tamil (ta) in preferred_language checks. */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table accounts drop constraint if exists accounts_preferred_language_check
  `.execute(db);
  await sql`
    alter table accounts
      add constraint accounts_preferred_language_check
      check (preferred_language in ('en','te','hi','ta'))
  `.execute(db);

  await sql`
    alter table registration_drafts drop constraint if exists registration_drafts_preferred_language_check
  `.execute(db);
  await sql`
    alter table registration_drafts
      add constraint registration_drafts_preferred_language_check
      check (preferred_language in ('en','te','hi','ta'))
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    update accounts set preferred_language = 'en' where preferred_language = 'ta'
  `.execute(db);
  await sql`
    update registration_drafts set preferred_language = 'en' where preferred_language = 'ta'
  `.execute(db);

  await sql`
    alter table accounts drop constraint if exists accounts_preferred_language_check
  `.execute(db);
  await sql`
    alter table accounts
      add constraint accounts_preferred_language_check
      check (preferred_language in ('en','te','hi'))
  `.execute(db);

  await sql`
    alter table registration_drafts drop constraint if exists registration_drafts_preferred_language_check
  `.execute(db);
  await sql`
    alter table registration_drafts
      add constraint registration_drafts_preferred_language_check
      check (preferred_language in ('en','te','hi'))
  `.execute(db);
}
