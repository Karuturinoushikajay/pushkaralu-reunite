import { describe, expect, it } from 'vitest';
import { RateLimitService } from './rate-limit.service';

describe('RateLimitService', () => {
  it('allows up to the limit then blocks', () => {
    const rl = new RateLimitService();
    expect(rl.consume('otp:x', 3, 60)).toBe(true);
    expect(rl.consume('otp:x', 3, 60)).toBe(true);
    expect(rl.consume('otp:x', 3, 60)).toBe(true);
    expect(rl.consume('otp:x', 3, 60)).toBe(false);
  });

  it('isolates keys', () => {
    const rl = new RateLimitService();
    expect(rl.consume('a', 1, 60)).toBe(true);
    expect(rl.consume('a', 1, 60)).toBe(false);
    expect(rl.consume('b', 1, 60)).toBe(true);
  });
});
