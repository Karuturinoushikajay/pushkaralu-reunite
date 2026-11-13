# @pushkaralu/dashboard

Police / booth officer web dashboard (Step 6).

## Run

```bash
# From repo root (API must be on :3000)
pnpm --filter @pushkaralu/api start:dev
pnpm --filter @pushkaralu/dashboard dev
```

Open http://localhost:5173

Dev login (after `pnpm seed`):

- Officer ID: `BOOTH07-OFFICER`
- Password: `booth07pass`

Vite proxies `/api` → `http://localhost:3000`.
