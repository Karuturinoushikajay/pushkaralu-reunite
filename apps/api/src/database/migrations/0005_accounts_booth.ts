import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table accounts
      add column if not exists booth_id uuid references booths(id) on delete set null
  `.execute(db);

  await sql`
    create index if not exists idx_accounts_booth on accounts(booth_id)
  `.execute(db);

  await sql`
    update accounts a
    set booth_id = b.id
    from booths b
    where a.login_uid = 'BOOTH07-OFFICER'
      and b.code = 'BOOTH-07'
      and a.booth_id is null
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`drop index if exists idx_accounts_booth`.execute(db);
  await sql`alter table accounts drop column if exists booth_id`.execute(db);
}
