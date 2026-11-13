import { describe, expect, it } from 'vitest';
import { CryptoService } from './crypto.service';
import { hashPassword, verifyPassword } from './password';
import { normalizePhone } from './phone';
import { TokenService } from './token.service';
import { Role } from '@pushkaralu/shared';

const SECRET = 'test-encryption-secret';

describe('CryptoService', () => {
  const crypto = new CryptoService(SECRET);

  it('round-trips personal data and hides the plaintext', () => {
    const phone = '+919876543210';
    const blob = crypto.encrypt(phone);
    expect(blob.toString('utf8')).not.toContain('9876543210');
    expect(crypto.decrypt(blob)).toBe(phone);
  });

  it('rejects a tampered ciphertext', () => {
    const blob = crypto.encrypt('Sita');
    blob[blob.length - 1] = blob[blob.length - 1]! ^ 0xff;
    expect(() => crypto.decrypt(blob)).toThrow();
  });

  it('builds a stable phone lookup that is not the phone itself', () => {
    const a = crypto.phoneLookup('9876543210');
    const b = crypto.phoneLookup('+91 98765 43210');
    expect(a).toBe(b);
    expect(a).not.toContain('9876543210');
    expect(crypto.verifyOtp('123456', crypto.hashOtp('123456'))).toBe(true);
    expect(crypto.verifyOtp('000000', crypto.hashOtp('123456'))).toBe(false);
  });
});

describe('normalizePhone', () => {
  it('adds the India country code to a 10-digit mobile', () => {
    expect(normalizePhone('9876543210')).toBe('+919876543210');
    expect(normalizePhone('919876543210')).toBe('+919876543210');
    expect(normalizePhone('+91 98765-43210')).toBe('+919876543210');
  });
});

describe('passwords', () => {
  it('verifies the password that was hashed and rejects a different one', async () => {
    const stored = await hashPassword('Pushkaralu-07');
    expect(stored.startsWith('scrypt$')).toBe(true);
    expect(await verifyPassword('Pushkaralu-07', stored)).toBe(true);
    expect(await verifyPassword('wrong-password', stored)).toBe(false);
  });
});

describe('TokenService', () => {
  const tokens = new TokenService('dev-only-jwt-secret-change');

  it('round-trips a principal and rejects an expired token', () => {
    const principal = { accountId: 'acc-1', role: Role.POLICE, loginUid: 'BOOTH07-OFFICER' };
    const token = tokens.sign(principal);
    expect(tokens.verify(token)).toEqual(principal);
    expect(() => tokens.verify(tokens.sign(principal, -10))).toThrow(/expired/i);
    expect(() => tokens.verify(`${token}x`)).toThrow();
  });
});
