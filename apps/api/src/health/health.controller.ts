import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface HealthResponse {
  status: 'ok' | 'degraded';
  service: string;
  checks: { database: 'up' | 'down' };
  timestamp: string;
}

@Controller('health')
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  @Get()
  async check(): Promise<HealthResponse> {
    const dbUp = await this.database.ping();
    return {
      status: dbUp ? 'ok' : 'degraded',
      service: 'pushkaralu-api',
      checks: { database: dbUp ? 'up' : 'down' },
      timestamp: new Date().toISOString(),
    };
  }
}
