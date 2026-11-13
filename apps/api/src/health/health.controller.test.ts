import { describe, expect, it } from 'vitest';
import { HealthController } from './health.controller';
import type { DatabaseService } from '../database/database.service';

function controllerWith(dbUp: boolean): HealthController {
  const fake = { ping: async () => dbUp } as unknown as DatabaseService;
  return new HealthController(fake);
}

describe('HealthController', () => {
  it('reports ok when the database is reachable', async () => {
    const res = await controllerWith(true).check();
    expect(res.status).toBe('ok');
    expect(res.checks.database).toBe('up');
    expect(res.service).toBe('pushkaralu-api');
    expect(() => new Date(res.timestamp).toISOString()).not.toThrow();
  });

  it('reports degraded when the database is down', async () => {
    const res = await controllerWith(false).check();
    expect(res.status).toBe('degraded');
    expect(res.checks.database).toBe('down');
  });
});
