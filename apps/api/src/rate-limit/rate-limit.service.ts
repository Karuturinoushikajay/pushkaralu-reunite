import { Injectable } from '@nestjs/common';

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * In-memory sliding fixed-window rate limiter. Swap for Redis in Step 7 without
 * changing callers — keep the same method signatures.
 */
@Injectable()
export class RateLimitService {
  private readonly buckets = new Map<string, Bucket>();

  /**
   * @returns true if the call is allowed, false if the limit was exceeded.
   */
  consume(key: string, limit: number, windowSeconds: number): boolean {
    const now = Date.now();
    const existing = this.buckets.get(key);
    if (!existing || existing.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
      return true;
    }
    if (existing.count >= limit) {
      return false;
    }
    existing.count += 1;
    return true;
  }

  /** Test helper. */
  reset(): void {
    this.buckets.clear();
  }
}
