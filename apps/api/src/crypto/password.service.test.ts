import { describe, expect, it } from 'vitest';
import { PasswordService } from './password.service';

describe('PasswordService (Argon2id)', () => {
  const passwords = new PasswordService();

  it('hashes and verifies a password', async () => {
    const hash = await passwords.hash('strongpass1');
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(await passwords.verify(hash, 'strongpass1')).toBe(true);
    expect(await passwords.verify(hash, 'wrong-password')).toBe(false);
  });
});
