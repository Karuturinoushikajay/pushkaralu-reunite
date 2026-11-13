import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    // Integration tests talk to a real PostGIS instance; keep them serial and
    // give migrations room to run.
    hookTimeout: 60_000,
    testTimeout: 60_000,
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
  },
});
