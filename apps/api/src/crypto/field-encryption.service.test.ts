import { describe, expect, it } from 'vitest';
import type { AppConfig } from '../config/env';
import { FieldEncryptionService } from './field-encryption.service';

const config = {
  DATA_ENCRYPTION_KEY: 'ZGV2LW9ubHktMzItYnl0ZS1rZXktcGxhY2Vob2xkZXItMDE=',
} as AppConfig;

describe('FieldEncryptionService', () => {
  const crypto = new FieldEncryptionService(config);

  it('round-trips phone / aadhaar plaintext', () => {
    const phone = '+919000000001';
    const enc = crypto.encrypt(phone);
    expect(enc.equals(Buffer.from(phone))).toBe(false);
    expect(crypto.decrypt(enc)).toBe(phone);
  });

  it('encrypts photo keys to base64 for text columns', () => {
    const key = 'photos/abc1001.jpg';
    const enc = crypto.encryptToBase64(key);
    expect(enc).not.toContain('photos/');
    expect(crypto.decryptFromBase64(enc)).toBe(key);
  });

  it('rejects tampered ciphertext', () => {
    const enc = crypto.encrypt('secret');
    enc[enc.length - 1] ^= 0xff;
    expect(() => crypto.decrypt(enc)).toThrow();
  });
});
