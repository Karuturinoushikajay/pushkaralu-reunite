import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

/**
 * Argon2id password hashing. Used for account passwords and OTP code hashes.
 */
@Injectable()
export class PasswordService {
  async hash(plain: string): Promise<string> {
    return argon2.hash(plain, {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });
  }

  async verify(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }
}
