import { createHmac } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../config/env';

/**
 * Deterministic HMAC hashes for lookups (phone, volunteer code) without storing
 * plaintext. Not for passwords — use PasswordService (Argon2) for those.
 */
@Injectable()
export class HashingService {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  normalizePhone(phone: string): string {
    const digits = phone.replace(/[^\d+]/g, '');
    if (digits.startsWith('+')) return digits;
    if (digits.length === 10) return `+91${digits}`;
    return digits.startsWith('91') && digits.length === 12 ? `+${digits}` : `+${digits}`;
  }

  hashPhone(phone: string): string {
    return this.hmac(this.normalizePhone(phone));
  }

  hashTarget(value: string): string {
    return this.hmac(value.trim().toUpperCase());
  }

  private hmac(value: string): string {
    return createHmac('sha256', this.config.HASH_PEPPER).update(value).digest('hex');
  }
}
