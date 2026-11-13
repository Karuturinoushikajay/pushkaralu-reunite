import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { normalizePhone } from './phone';

const VERSION = 1;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

/**
 * App-layer encryption for personal fields (name, phone, address, Aadhaar last-4).
 *
 * Ciphertext layout: version (1) || iv (12) || tag (16) || ciphertext.
 * A base64 32-byte DATA_ENCRYPTION_KEY is used directly. Any other secret is
 * hashed with SHA-256 so the dev placeholder still produces a stable AES key.
 */
@Injectable()
export class CryptoService {
  private readonly key: Buffer;

  constructor(secret: string) {
    if (!secret) {
      throw new Error('Encryption secret is empty');
    }
    this.key = deriveAesKey(secret);
  }

  encrypt(plain: string): Buffer {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([Buffer.from([VERSION]), iv, tag, ciphertext]);
  }

  decrypt(payload: Buffer): string {
    if (payload.length < 1 + IV_LENGTH + TAG_LENGTH) {
      throw new Error('Ciphertext is too short');
    }
    if (payload[0] !== VERSION) {
      throw new Error('Unsupported ciphertext version');
    }
    const iv = payload.subarray(1, 1 + IV_LENGTH);
    const tag = payload.subarray(1 + IV_LENGTH, 1 + IV_LENGTH + TAG_LENGTH);
    const ciphertext = payload.subarray(1 + IV_LENGTH + TAG_LENGTH);
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  }

  /** Stable lookup key. Not reversible, so the phone is not stored in the clear. */
  phoneLookup(phone: string): string {
    return createHmac('sha256', this.key).update(normalizePhone(phone), 'utf8').digest('hex');
  }

  hashOtp(code: string): string {
    return createHmac('sha256', this.key).update(`otp:${code}`, 'utf8').digest('hex');
  }

  verifyOtp(code: string, hash: string): boolean {
    const actual = Buffer.from(this.hashOtp(code), 'hex');
    const expected = Buffer.from(hash, 'hex');
    if (actual.length !== expected.length) return false;
    return timingSafeEqual(actual, expected);
  }
}

export function deriveAesKey(secret: string): Buffer {
  const decoded = Buffer.from(secret, 'base64');
  if (
    decoded.length === 32 &&
    decoded.toString('base64url') !== '' &&
    isCanonicalBase64Key(secret, decoded)
  ) {
    return decoded;
  }
  return createHash('sha256').update(secret, 'utf8').digest();
}

function isCanonicalBase64Key(secret: string, decoded: Buffer): boolean {
  const padded = secret.replace(/\s/g, '');
  return decoded.toString('base64') === padded || decoded.toString('base64url') === padded;
}
