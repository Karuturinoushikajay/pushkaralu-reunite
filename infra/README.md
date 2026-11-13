# Local infrastructure

Docker Compose stack for Step 1 development:

| Service  | Image                     | Ports        | Purpose                          |
| -------- | ------------------------- | ------------ | -------------------------------- |
| `db`     | `postgis/postgis:16-3.4`  | `5432`       | PostgreSQL + PostGIS             |
| `redis`  | `redis:7-alpine`          | `6379`       | Cache / rate-limit / queues      |
| `minio`  | `minio/minio`             | `9000`/`9001`| S3-compatible photo storage      |
| `adminer`| `adminer`                 | `8080`       | DB browser                       |

## Start / stop

From the repo root (requires Docker Desktop running):

```bash
pnpm db:up
pnpm db:down
```

Credentials come from the root `.env` (copy from `.env.example`).

If Docker Desktop is not available on this machine, unit tests and builds still work.
PostGIS integration tests and migrations need either this stack or the GitHub Actions
`postgis` service (see `.github/workflows/ci.yml`).
