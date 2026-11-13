import { randomInt } from 'node:crypto';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { APP_CONFIG, type AppConfig } from '../config/env';
import { PasswordService } from '../crypto/password.service';
import { DatabaseService } from '../database/database.service';
import { SMS_PROVIDER, type SmsProvider } from '../sms/sms.provider';

export type OtpPurpose = 'REGISTER' | 'VOLUNTEER_LOGIN' | 'HANDOVER';

export interface CreateOtpInput {
  purpose: OtpPurpose;
  targetHash: string;
  phoneE164: string;
  draftId?: string;
  volunteerId?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateOtpResult {
  challengeId: string;
  expiresAt: Date;
  /** Only populated when SMS_PROVIDER=mock so local/dev can finish the flow. */
  debugCode?: string;
}

/**
 * OTP lifecycle: generate 6-digit code, Argon2-hash it, SMS the plaintext once,
 * verify with attempt caps. Plaintext is never stored.
 */
@Injectable()
export class OtpService {
  constructor(
    private readonly database: DatabaseService,
    private readonly passwords: PasswordService,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /** Pure helper — unit-tested without DB. */
  static generateCode(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, '0');
  }

  async createChallenge(input: CreateOtpInput): Promise<CreateOtpResult> {
    const code = OtpService.generateCode();
    const codeHash = await this.passwords.hash(code);
    const expiresAt = new Date(Date.now() + this.config.OTP_TTL_SECONDS * 1000);

    const row = await this.database.db
      .insertInto('otp_challenges')
      .values({
        purpose: input.purpose,
        target_hash: input.targetHash,
        code_hash: codeHash,
        max_attempts: this.config.OTP_MAX_ATTEMPTS,
        expires_at: expiresAt,
        draft_id: input.draftId ?? null,
        volunteer_id: input.volunteerId ?? null,
        metadata: (input.metadata ?? null) as never,
      })
      .returning(['id', 'expires_at'])
      .executeTakeFirstOrThrow();

    await this.sms.send({
      to: input.phoneE164,
      body: `Pushkaralu Reunite OTP: ${code}. Valid for ${Math.floor(this.config.OTP_TTL_SECONDS / 60)} min. Do not share.`,
    });

    return {
      challengeId: row.id,
      expiresAt: new Date(row.expires_at as unknown as string),
      debugCode: this.config.SMS_PROVIDER === 'mock' ? code : undefined,
    };
  }

  async verify(challengeId: string, code: string): Promise<{
    purpose: OtpPurpose;
    draftId: string | null;
    volunteerId: string | null;
    targetHash: string;
  }> {
    const challenge = await this.database.db
      .selectFrom('otp_challenges')
      .selectAll()
      .where('id', '=', challengeId)
      .executeTakeFirst();

    if (!challenge) {
      throw new BadRequestException('Invalid or expired OTP');
    }
    if (challenge.consumed_at) {
      throw new BadRequestException('OTP already used');
    }
    if (new Date(challenge.expires_at as unknown as string).getTime() < Date.now()) {
      throw new BadRequestException('OTP expired');
    }
    if (challenge.attempts >= challenge.max_attempts) {
      throw new BadRequestException('Too many OTP attempts');
    }

    const ok = await this.passwords.verify(challenge.code_hash, code);
    if (!ok) {
      await this.database.db
        .updateTable('otp_challenges')
        .set({ attempts: sql`attempts + 1` })
        .where('id', '=', challengeId)
        .execute();
      throw new BadRequestException('Incorrect OTP');
    }

    await this.database.db
      .updateTable('otp_challenges')
      .set({ consumed_at: new Date() })
      .where('id', '=', challengeId)
      .execute();

    return {
      purpose: challenge.purpose,
      draftId: challenge.draft_id,
      volunteerId: challenge.volunteer_id,
      targetHash: challenge.target_hash,
    };
  }
}
