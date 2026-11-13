import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../config/env';

/**
 * AES-256-GCM field encryption for phones, Aadhaar last-4, addresses, photo keys.
 * Ciphertext layout (binary): [12-byte IV][16-byte auth tag][ciphertext].
 */
@Injectable()
export class FieldEncryptionService {
  private readonly key: Buffer;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.key = createHash('sha256').update(config.DATA_ENCRYPTION_KEY).digest();
  }

  encrypt(plain: string): Buffer {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]);
  }

  decrypt(payload: Buffer): string {
    if (payload.length < 28) {
      throw new Error('Ciphertext too short');
    }
    const iv = payload.subarray(0, 12);
    const tag = payload.subarray(12, 28);
    const data = payload.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  }

  /** Store encrypted values in text columns (e.g. photo_key) as base64. */
  encryptToBase64(plain: string): string {
    return this.encrypt(plain).toString('base64');
  }

  decryptFromBase64(payload: string): string {
    return this.decrypt(Buffer.from(payload, 'base64'));
  }
}
