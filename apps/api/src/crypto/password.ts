import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 32;

/** Password hash stored on accounts.password_hash. Format: scrypt$N$r$p$salt$hash */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return [
    'scrypt',
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString('base64url'),
    hash.toString('base64url'),
  ].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const salt = parts[4];
  const expected = parts[5];
  if (!n || !r || !p || !salt || !expected) return false;

  const actual = scryptSync(password, Buffer.from(salt, 'base64url'), KEY_LENGTH, {
    N: n,
    r,
    p,
  });
  const expectedBuf = Buffer.from(expected, 'base64url');
  if (actual.length !== expectedBuf.length) return false;
  return timingSafeEqual(actual, expectedBuf);
}

/** Local/dev officer password. Production seed must set SEED_OFFICER_PASSWORD. */
export function devOfficerPassword(): string | null {
  if (process.env.SEED_OFFICER_PASSWORD) return process.env.SEED_OFFICER_PASSWORD;
  if (process.env.NODE_ENV === 'production') return null;
  return 'Pushkaralu-07';
}
