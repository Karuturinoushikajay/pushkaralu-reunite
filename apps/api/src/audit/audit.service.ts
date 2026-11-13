import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface AuditEntry {
  actorType: 'USER' | 'VOLUNTEER' | 'POLICE' | 'SYSTEM';
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(private readonly database: DatabaseService) {}

  async record(entry: AuditEntry): Promise<void> {
    await this.database.db
      .insertInto('audit_log')
      .values({
        actor_type: entry.actorType,
        actor_id: entry.actorId ?? null,
        action: entry.action,
        entity_type: entry.entityType,
        entity_id: entry.entityId ?? null,
        metadata: (entry.metadata ?? null) as never,
      })
      .execute();
  }
}
