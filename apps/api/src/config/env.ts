import { config as loadDotenv } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

/**
 * Environment schema. The process fails fast at boot if anything is missing or
 * malformed, so misconfiguration never reaches runtime. No secrets live in code.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z.string().url(),

  REDIS_URL: z.string().url().optional(),

  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_BUCKET: z.string().default('pushkaralu-photos'),

  /** Base64 key material; hashed to 32 bytes for AES-256-GCM. Required for auth. */
  DATA_ENCRYPTION_KEY: z.string().min(16),

  /** HMAC pepper for phone/target hashes (indexing without storing plaintext). */
  HASH_PEPPER: z.string().min(16).default('dev-only-hash-pepper-change-me'),

  JWT_SECRET: z.string().min(32).default('dev-only-jwt-secret-change-me-please!!'),
  JWT_TTL_SECONDS: z.coerce.number().int().positive().default(60 * 60 * 12),

  SMS_PROVIDER: z.enum(['mock', 'twilio', 'msg91']).default('mock'),
  OTP_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),

  /** Sliding-window rate limits (in-memory; Redis later). */
  RATE_LIMIT_OTP_PER_PHONE: z.coerce.number().int().positive().default(5),
  RATE_LIMIT_OTP_WINDOW_SECONDS: z.coerce.number().int().positive().default(600),
  RATE_LIMIT_LOGIN_PER_UID: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_LOGIN_WINDOW_SECONDS: z.coerce.number().int().positive().default(600),

  /** When false, photo pilgrim-search returns faceMatchDisabled (no scores). */
  FACE_MATCH_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

export type AppConfig = z.infer<typeof envSchema>;

/** Load the monorepo-root `.env` once (if present). Never overrides existing env. */
function hydrateEnvFromFile(): void {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '../../.env'),
  ];
  for (const path of candidates) {
    if (existsSync(path)) {
      loadDotenv({ path, override: false });
      return;
    }
  }
}

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  if (source === process.env) {
    hydrateEnvFromFile();
  }
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}

/** Nest DI token for the validated config object. */
export const APP_CONFIG = Symbol('APP_CONFIG');
