import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class NoticesService {
  constructor(private readonly database: DatabaseService) {}

  async listActive() {
    const rows = await this.database.db
      .selectFrom('notices')
      .selectAll()
      .where('active', '=', true)
      .orderBy('published_at', 'desc')
      .execute();

    return rows.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      severity: n.severity,
      boothId: n.booth_id,
      active: n.active,
      publishedAt: new Date(n.published_at as unknown as string).toISOString(),
    }));
  }
}
