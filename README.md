# Pushkaralu Reunite

Lost-person reporting and reunification app for **Godavari Pushkaralu 2027** (Rajamahendravaram).
One app, three roles: **USER** (pilgrim), **VOLUNTEER** (police-approved), **POLICE** (booth officer, web dashboard).

> **Privacy by design:** Full Aadhaar encrypted at rest (masked in UI). Face-match search
> is feature-flagged (`FACE_MATCH_ENABLED`, default off) until legal approval. QR encodes
> UID only. Built for DPDP Act 2023 principles (consent, purpose limitation, deletion).

This repository implements **Phase 1 + v3 screens** (User / Volunteer / Police phone + dashboard).

## Monorepo layout

```
apps/
  api/          NestJS + TypeScript API (Kysely + PostGIS)
  dashboard/    React + Vite police booth dashboard
  mobile-rn/    Expo React Native app (primary mobile — USER / VOLUNTEER / POLICE)
  mobile/       Legacy Flutter app (superseded by mobile-rn)
packages/
  shared/       Shared types, enums, i18n keys, zod schemas, CaseSearch interface
infra/
  docker-compose.yml   PostGIS, Redis, MinIO, Adminer (optional)
.github/workflows/ci.yml
```

Tooling: **pnpm workspaces + Turborepo**. Mobile: **Expo React Native**. Data: **Kysely** + raw SQL migrations.

## Prerequisites

- Node.js >= 20
- pnpm 9 (`npm install -g pnpm@9.15.0`)
- Android Studio / Expo Go for the React Native app
- Native PostgreSQL 17 + PostGIS (or Docker Compose)

### Local database (no Docker)

This PC uses **native PostgreSQL 17 + PostGIS** (Docker is optional and not required).

```bash
# Service should already be running: postgresql-x64-17
# DB: pushkaralu / user: pushkaralu / password: pushkaralu_dev_pw  (see .env)

pnpm install
pnpm migrate:up
pnpm seed
pnpm --filter @pushkaralu/api start:dev   # http://localhost:3000/health
pnpm --filter @pushkaralu/dashboard dev   # http://localhost:5173
```

Demo logins after seed:
- Pilgrim: `K7M2-01` / `pilgrim123`
- Police: `BOOTH07-OFFICER` / `booth07pass`
- Volunteer: `VOL-0214` + OTP (mock SMS prints `debugCode`)

`pnpm db:up` (Docker Compose) can be ignored on this machine.

## Setup (with Docker)

```bash
# 1. Install dependencies
pnpm install

# 2. Create your local env file
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env

# 3. Start infra (PostGIS, Redis, MinIO, Adminer)
pnpm db:up

# 4. Run database migrations
pnpm migrate:up

# 5. Seed booths, notices, UID series, demo volunteer
pnpm seed
```

## Run & verify

```bash
# Start the API in dev (health check at http://localhost:3000/health)
pnpm --filter @pushkaralu/api start:dev

# React Native (Expo) — primary mobile app
pnpm mobile                 # Expo start
# pnpm mobile:android       # Android emulator / device
# pnpm mobile:web           # quick UI check in browser

# Police dashboard
pnpm --filter @pushkaralu/dashboard dev

# Full gate (what CI runs)
pnpm lint
pnpm test
pnpm build
```

Set `EXPO_PUBLIC_API_BASE` if the API is not on `http://10.0.2.2:3000` (Android emulator) / `http://localhost:3000` (iOS/web).

Useful local URLs (after `pnpm db:up`):

| Service        | URL                          | Notes                              |
| -------------- | ---------------------------- | ---------------------------------- |
| API health     | http://localhost:3000/health | NestJS                             |
| Adminer (DB)   | http://localhost:8080        | System: PostgreSQL, server: `db`   |
| MinIO console  | http://localhost:9001        | Login from `.env` S3 credentials   |

## Database schema

Tables: `accounts`, `members` (family UIDs `K7M2-01`), `family_code_series`, `family_calls`,
`cases`, `found_reports`, `handovers`, `volunteers`, `booths`, `notices`, `audit_log`,
`consents`, `registration_drafts`, `otp_challenges`.

- `geography(Point,4326)` columns on `cases`, `found_reports`, `booths` with GIST indexes.
- Soft-delete (`deleted_at`) and retention (`retention_until`) on personal-data tables.
- Phones, full Aadhaar, address, and photo keys encrypted at rest (AES-256-GCM).
- `audit_log` is append-only (a trigger blocks UPDATE/DELETE).
- Case state machine: `MISSING -> FOUND -> MATCHED -> REUNITED`.

## Auth API (Step 2)

| Method | Path | Purpose |
| ------ | ---- | ------- |
| `POST` | `/auth/register` | Create registration draft + send phone OTP |
| `POST` | `/auth/verify-otp` | Verify OTP → mint UID (ABC1001…), QR, JWT |
| `POST` | `/auth/login` | Unique ID + password → JWT + wristband QR |
| `POST` | `/auth/volunteer/request-otp` | Police-issued VOL-ID → OTP (no self sign-up) |
| `POST` | `/auth/volunteer/verify-otp` | Volunteer OTP → JWT |

With `SMS_PROVIDER=mock`, register/volunteer OTP responses include `debugCode` for local testing.
QR `payload` is the **UID only** (no personal data). Passwords use Argon2id. OTP and login are rate-limited.

## Scripts

| Command             | Description                                  |
| ------------------- | -------------------------------------------- |
| `pnpm db:up`        | Start Docker infra                           |
| `pnpm db:down`      | Stop Docker infra                            |
| `pnpm migrate:up`   | Apply all migrations                         |
| `pnpm migrate:down` | Roll back the last migration                 |
| `pnpm seed`         | Insert seed data                             |
| `pnpm lint`         | Lint all packages                            |
| `pnpm test`         | Run unit + integration tests                 |
| `pnpm build`        | Build all buildable packages                 |

## License

Internal project for Godavari Pushkaralu 2027. Not for public distribution.
