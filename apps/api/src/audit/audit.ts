import { sql, type Kysely } from 'kysely';
import type { Database } from '../database/schema';

export async function writeAudit(
  db: Kysely<Database>,
  entry: {
    actorType: 'USER' | 'VOLUNTEER' | 'POLICE' | 'SYSTEM';
    actorId: string | null;
    action: string;
    entityType: string;
    entityId: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await sql`
    insert into audit_log (actor_type, actor_id, action, entity_type, entity_id, metadata)
    values (
      ${entry.actorType},
      ${entry.actorId},
      ${entry.action},
      ${entry.entityType},
      ${entry.entityId},
      ${JSON.stringify(entry.metadata ?? {})}::jsonb
    )
  `.execute(db);
}
