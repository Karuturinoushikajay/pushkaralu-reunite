import { describe, expect, it } from 'vitest';
import { OtpService } from './otp.service';

describe('OtpService.generateCode', () => {
  it('returns a 6-digit zero-padded code', () => {
    for (let i = 0; i < 20; i += 1) {
      const code = OtpService.generateCode();
      expect(code).toMatch(/^[0-9]{6}$/);
    }
  });

  it('produces more than one distinct value across draws', () => {
    const set = new Set(Array.from({ length: 30 }, () => OtpService.generateCode()));
    expect(set.size).toBeGreaterThan(1);
  });
});
