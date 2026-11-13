import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  type CreateAccountInput,
  type CreatePoliceCredentialsInput,
  type CreateVolunteerCredentialsInput,
  type LoginInput,
  type VerifyOtpInput,
  type VolunteerRequestOtpInput,
} from '@pushkaralu/shared';
import { AuditService } from '../audit/audit.service';
import { APP_CONFIG, type AppConfig } from '../config/env';
import { FieldEncryptionService } from '../crypto/field-encryption.service';
import { HashingService } from '../crypto/hashing.service';
import { PasswordService } from '../crypto/password.service';
import { DatabaseService } from '../database/database.service';
import { OtpService } from '../otp/otp.service';
import { QrService } from '../qr/qr.service';
import { RateLimitService } from '../rate-limit/rate-limit.service';
import { UidService } from '../uid/uid.service';
import type {
  AccountReadyResponse,
  AuthTokens,
  JwtPayload,
  RegistrationPendingResponse,
} from './auth.types';

interface DraftPayload {
  name: string;
  address: string;
  aadhaarNumber: string;
  emergencyPhone: string;
  photoKey: string;
  faceConsentAccepted: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly database: DatabaseService,
    private readonly passwords: PasswordService,
    private readonly encryption: FieldEncryptionService,
    private readonly hashing: HashingService,
    private readonly otp: OtpService,
    private readonly uid: UidService,
    private readonly qr: QrService,
    private readonly rateLimit: RateLimitService,
    private readonly audit: AuditService,
    private readonly jwt: JwtService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async register(input: CreateAccountInput): Promise<RegistrationPendingResponse> {
    const phone = this.hashing.normalizePhone(input.ownPhone);
    const phoneHash = this.hashing.hashPhone(phone);

    if (
      !this.rateLimit.consume(
        `otp:register:${phoneHash}`,
        this.config.RATE_LIMIT_OTP_PER_PHONE,
        this.config.RATE_LIMIT_OTP_WINDOW_SECONDS,
      )
    ) {
      throw new HttpException('Too many OTP requests. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }

    // Block re-registration of an already-active phone (hash match on members is
    // not feasible without scanning; we check drafts + require unique login after).
    const existingDraft = await this.database.db
      .selectFrom('registration_drafts')
      .select(['id'])
      .where('phone_hash', '=', phoneHash)
      .where('expires_at', '>', new Date())
      .executeTakeFirst();
    if (existingDraft) {
      await this.database.db
        .deleteFrom('registration_drafts')
        .where('id', '=', existingDraft.id)
        .execute();
    }

    const passwordHash = await this.passwords.hash(input.password);
    const payload: DraftPayload = {
      name: input.name,
      address: input.address,
      aadhaarNumber: input.aadhaarNumber,
      emergencyPhone: this.hashing.normalizePhone(input.emergencyPhone),
      photoKey: input.photoKey,
      faceConsentAccepted: input.faceConsentAccepted === true,
    };

    const expiresAt = new Date(Date.now() + this.config.OTP_TTL_SECONDS * 1000);
    const draft = await this.database.db
      .insertInto('registration_drafts')
      .values({
        phone_hash: phoneHash,
        phone_enc: this.encryption.encrypt(phone),
        password_hash: passwordHash,
        preferred_language: input.preferredLanguage,
        payload_enc: this.encryption.encrypt(JSON.stringify(payload)),
        expires_at: expiresAt,
      })
      .returning(['id'])
      .executeTakeFirstOrThrow();

    const challenge = await this.otp.createChallenge({
      purpose: 'REGISTER',
      targetHash: phoneHash,
      phoneE164: phone,
      draftId: draft.id,
    });

    await this.audit.record({
      actorType: 'SYSTEM',
      action: 'REGISTER_OTP_SENT',
      entityType: 'registration_draft',
      entityId: draft.id,
      metadata: { phoneHash },
    });

    return {
      challengeId: challenge.challengeId,
      expiresAt: challenge.expiresAt.toISOString(),
      maskedPhone: maskPhone(phone),
      debugCode: challenge.debugCode,
    };
  }

  async verifyOtp(input: VerifyOtpInput): Promise<AccountReadyResponse> {
    const verified = await this.otp.verify(input.challengeId, input.code);

    if (verified.purpose === 'REGISTER') {
      return this.completeRegistration(verified.draftId!);
    }
    if (verified.purpose === 'VOLUNTEER_LOGIN') {
      return this.completeVolunteerLogin(verified.volunteerId!);
    }
    throw new BadRequestException('Unsupported OTP purpose for this endpoint');
  }

  async login(input: LoginInput): Promise<AccountReadyResponse> {
    const key = `login:${input.loginUid.toUpperCase()}`;
    if (
      !this.rateLimit.consume(
        key,
        this.config.RATE_LIMIT_LOGIN_PER_UID,
        this.config.RATE_LIMIT_LOGIN_WINDOW_SECONDS,
      )
    ) {
      throw new HttpException('Too many login attempts. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const account = await this.database.db
      .selectFrom('accounts')
      .selectAll()
      .where('login_uid', '=', input.loginUid.toUpperCase())
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    if (!account || !account.password_hash || account.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid Unique ID or password');
    }

    const ok = await this.passwords.verify(account.password_hash, input.password);
    if (!ok) {
      await this.audit.record({
        actorType: account.role,
        actorId: account.id,
        action: 'LOGIN_FAILED',
        entityType: 'account',
        entityId: account.id,
      });
      throw new UnauthorizedException('Invalid Unique ID or password');
    }

    // Wristband QR is member-UID-only; police/volunteer login IDs are not UIDs.
    const wristbandQr =
      account.role === 'USER'
        ? await this.qr.forUid(account.login_uid)
        : { payload: account.login_uid, pngBase64: '' };
    const tokens = await this.issueTokens({
      sub: account.id,
      role: account.role,
      uid: account.login_uid,
    });

    await this.audit.record({
      actorType: account.role,
      actorId: account.id,
      action: 'LOGIN_SUCCESS',
      entityType: 'account',
      entityId: account.id,
    });

    return {
      accountId: account.id,
      uid: account.login_uid,
      role: account.role,
      tokens,
      wristbandQr,
    };
  }

  async requestVolunteerOtp(
    input: VolunteerRequestOtpInput,
  ): Promise<RegistrationPendingResponse> {
    const code = input.volunteerCode.toUpperCase();
    const targetHash = this.hashing.hashTarget(code);

    if (
      !this.rateLimit.consume(
        `otp:volunteer:${targetHash}`,
        this.config.RATE_LIMIT_OTP_PER_PHONE,
        this.config.RATE_LIMIT_OTP_WINDOW_SECONDS,
      )
    ) {
      throw new HttpException('Too many OTP requests. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const volunteer = await this.database.db
      .selectFrom('volunteers')
      .selectAll()
      .where('volunteer_code', '=', code)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    if (!volunteer || volunteer.status !== 'ACTIVE' || !volunteer.phone_enc) {
      // Same response shape whether missing or inactive — avoid ID enumeration.
      throw new BadRequestException('Unable to send OTP for this Volunteer ID');
    }

    const phone = this.encryption.decrypt(Buffer.from(volunteer.phone_enc));
    const challenge = await this.otp.createChallenge({
      purpose: 'VOLUNTEER_LOGIN',
      targetHash,
      phoneE164: phone,
      volunteerId: volunteer.id,
    });

    await this.audit.record({
      actorType: 'SYSTEM',
      action: 'VOLUNTEER_OTP_SENT',
      entityType: 'volunteer',
      entityId: volunteer.id,
    });

    return {
      challengeId: challenge.challengeId,
      expiresAt: challenge.expiresAt.toISOString(),
      maskedPhone: maskPhone(phone),
      debugCode: challenge.debugCode,
    };
  }

  private async completeRegistration(draftId: string): Promise<AccountReadyResponse> {
    const draft = await this.database.db
      .selectFrom('registration_drafts')
      .selectAll()
      .where('id', '=', draftId)
      .executeTakeFirst();

    if (!draft) {
      throw new BadRequestException('Registration session expired. Start again.');
    }
    if (new Date(draft.expires_at as unknown as string).getTime() < Date.now()) {
      throw new BadRequestException('Registration session expired. Start again.');
    }

    const phone = this.encryption.decrypt(Buffer.from(draft.phone_enc));
    const payload = JSON.parse(
      this.encryption.decrypt(Buffer.from(draft.payload_enc)),
    ) as DraftPayload;

    // Allocate family + self UID before the write transaction.
    const { familyCode, uid } = await this.uid.allocateFamilySelf();
    const aadhaarLast4 = payload.aadhaarNumber.slice(-4);

    const result = await this.database.db.transaction().execute(async (trx) => {
      const conflict = await trx
        .selectFrom('accounts')
        .select(['id'])
        .where('login_uid', '=', uid)
        .executeTakeFirst();
      if (conflict) {
        throw new ConflictException('UID collision — retry');
      }

      // Event retention window: soft default of 90 days after creation (Step 8 hardens).
      const retentionUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

      const account = await trx
        .insertInto('accounts')
        .values({
          login_uid: uid,
          password_hash: draft.password_hash,
          role: 'USER',
          status: 'ACTIVE',
          preferred_language: draft.preferred_language,
          retention_until: retentionUntil,
        })
        .returning(['id', 'login_uid', 'role'])
        .executeTakeFirstOrThrow();

      await trx
        .insertInto('members')
        .values({
          uid,
          account_id: account.id,
          family_code: familyCode,
          member_seq: 1,
          name_enc: this.encryption.encrypt(payload.name),
          phone_enc: this.encryption.encrypt(phone),
          emergency_phone_enc: this.encryption.encrypt(payload.emergencyPhone),
          aadhaar_enc: this.encryption.encrypt(payload.aadhaarNumber),
          aadhaar_last4_enc: this.encryption.encrypt(aadhaarLast4),
          address_enc: this.encryption.encrypt(payload.address),
          photo_key: this.encryption.encryptToBase64(payload.photoKey),
          face_consent_at: payload.faceConsentAccepted ? new Date() : null,
          is_self: true,
          retention_until: retentionUntil,
        })
        .execute();

      await trx
        .insertInto('consents')
        .values({
          account_id: account.id,
          member_uid: uid,
          type: 'REUNIFICATION',
          granted: true,
          version: 'v1',
        })
        .execute();

      if (payload.faceConsentAccepted) {
        await trx
          .insertInto('consents')
          .values({
            account_id: account.id,
            member_uid: uid,
            type: 'FACE_RECOGNITION',
            granted: true,
            version: 'v3',
          })
          .execute();
      }

      await trx.deleteFrom('registration_drafts').where('id', '=', draftId).execute();

      return account;
    });

    const wristbandQr = await this.qr.forUid(result.login_uid);
    const tokens = await this.issueTokens({
      sub: result.id,
      role: result.role,
      uid: result.login_uid,
    });

    await this.audit.record({
      actorType: 'USER',
      actorId: result.id,
      action: 'ACCOUNT_CREATED',
      entityType: 'account',
      entityId: result.id,
      metadata: { uid: result.login_uid },
    });

    return {
      accountId: result.id,
      uid: result.login_uid,
      role: result.role,
      tokens,
      wristbandQr,
    };
  }

  private async completeVolunteerLogin(volunteerId: string): Promise<AccountReadyResponse> {
    const volunteer = await this.database.db
      .selectFrom('volunteers')
      .selectAll()
      .where('id', '=', volunteerId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    if (!volunteer || volunteer.status !== 'ACTIVE') {
      throw new UnauthorizedException('Volunteer account is not active');
    }

    // Volunteers authenticate via OTP; ensure a POLICE/VOLUNTEER-linked account row
    // exists for JWT subject stability (created on first login).
    let account = await this.database.db
      .selectFrom('accounts')
      .selectAll()
      .where('login_uid', '=', volunteer.volunteer_code)
      .executeTakeFirst();

    if (!account) {
      account = await this.database.db
        .insertInto('accounts')
        .values({
          login_uid: volunteer.volunteer_code,
          role: 'VOLUNTEER',
          status: 'ACTIVE',
          preferred_language: 'en',
          password_hash: null,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
    }

    const tokens = await this.issueTokens({
      sub: account.id,
      role: 'VOLUNTEER',
      uid: volunteer.volunteer_code,
    });

    await this.audit.record({
      actorType: 'VOLUNTEER',
      actorId: account.id,
      action: 'VOLUNTEER_LOGIN_SUCCESS',
      entityType: 'volunteer',
      entityId: volunteer.id,
    });

    // Volunteers do not wear pilgrim wristbands; return an empty QR shell.
    return {
      accountId: account.id,
      uid: volunteer.volunteer_code,
      role: 'VOLUNTEER',
      tokens,
      wristbandQr: { payload: volunteer.volunteer_code, pngBase64: '' },
    };
  }

  /** Volunteer creates credentials linked to a booth; then login with OTP. */
  async createVolunteerCredentials(
    input: CreateVolunteerCredentialsInput,
  ): Promise<AccountReadyResponse & { volunteerCode: string }> {
    const boothCode = input.boothCode.trim().toUpperCase();
    const phone = this.hashing.normalizePhone(input.phone);

    const booth = await this.database.db
      .selectFrom('booths')
      .select(['id', 'code'])
      .where('code', '=', boothCode)
      .executeTakeFirst();
    if (!booth) {
      throw new BadRequestException('Unknown booth code');
    }

    let volunteerCode = input.volunteerCode?.trim().toUpperCase();
    if (!volunteerCode) {
      const rows = await this.database.db
        .selectFrom('volunteers')
        .select(['volunteer_code'])
        .where('volunteer_code', 'like', 'VOL-%')
        .execute();
      let max = 214;
      for (const r of rows) {
        const n = Number(r.volunteer_code.replace(/^VOL-/u, ''));
        if (Number.isFinite(n) && n > max) max = n;
      }
      volunteerCode = `VOL-${String(max + 1).padStart(4, '0')}`;
    }

    const existing = await this.database.db
      .selectFrom('volunteers')
      .select(['id'])
      .where('volunteer_code', '=', volunteerCode)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
    if (existing) {
      throw new ConflictException('Volunteer ID already exists');
    }

    const volunteer = await this.database.db
      .insertInto('volunteers')
      .values({
        volunteer_code: volunteerCode,
        name_enc: this.encryption.encrypt(input.name.trim()),
        phone_enc: this.encryption.encrypt(phone),
        booth_id: booth.id,
        status: 'ACTIVE',
      })
      .returning(['id', 'volunteer_code'])
      .executeTakeFirstOrThrow();

    const account = await this.database.db
      .insertInto('accounts')
      .values({
        login_uid: volunteer.volunteer_code,
        password_hash: null,
        role: 'VOLUNTEER',
        status: 'ACTIVE',
        preferred_language: 'en',
        booth_id: booth.id,
      })
      .returning(['id', 'login_uid', 'role'])
      .executeTakeFirstOrThrow();

    const tokens = await this.issueTokens({
      sub: account.id,
      role: 'VOLUNTEER',
      uid: volunteer.volunteer_code,
    });

    await this.audit.record({
      actorType: 'VOLUNTEER',
      actorId: account.id,
      action: 'VOLUNTEER_CREDENTIALS_CREATED',
      entityType: 'volunteer',
      entityId: volunteer.id,
      metadata: { boothCode: booth.code, volunteerCode: volunteer.volunteer_code },
    });

    return {
      accountId: account.id,
      uid: volunteer.volunteer_code,
      volunteerCode: volunteer.volunteer_code,
      role: 'VOLUNTEER',
      tokens,
      wristbandQr: { payload: volunteer.volunteer_code, pngBase64: '' },
    };
  }

  /** Booth officer creates login credentials linked to an allocated booth. */
  async createPoliceCredentials(input: CreatePoliceCredentialsInput): Promise<AccountReadyResponse> {
    const loginUid = input.officerId.trim().toUpperCase();
    const boothCode = input.boothCode.trim().toUpperCase();

    const booth = await this.database.db
      .selectFrom('booths')
      .select(['id', 'code', 'name'])
      .where('code', '=', boothCode)
      .executeTakeFirst();
    if (!booth) {
      throw new BadRequestException('Unknown booth code');
    }

    const existing = await this.database.db
      .selectFrom('accounts')
      .select(['id'])
      .where('login_uid', '=', loginUid)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
    if (existing) {
      throw new ConflictException('Officer ID already exists');
    }

    const passwordHash = await this.passwords.hash(input.password);
    const account = await this.database.db
      .insertInto('accounts')
      .values({
        login_uid: loginUid,
        password_hash: passwordHash,
        role: 'POLICE',
        status: 'ACTIVE',
        preferred_language: 'en',
        booth_id: booth.id,
      })
      .returning(['id', 'login_uid', 'role'])
      .executeTakeFirstOrThrow();

    const tokens = await this.issueTokens({
      sub: account.id,
      role: 'POLICE',
      uid: account.login_uid,
    });

    await this.audit.record({
      actorType: 'POLICE',
      actorId: account.id,
      action: 'POLICE_CREDENTIALS_CREATED',
      entityType: 'account',
      entityId: account.id,
      metadata: { boothCode: booth.code, officerName: input.officerName.trim() },
    });

    return {
      accountId: account.id,
      uid: account.login_uid,
      role: 'POLICE',
      tokens,
      wristbandQr: { payload: account.login_uid, pngBase64: '' },
    };
  }

  private async issueTokens(payload: JwtPayload): Promise<AuthTokens> {
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.JWT_SECRET,
      expiresIn: this.config.JWT_TTL_SECONDS,
    });
    return { accessToken, expiresIn: this.config.JWT_TTL_SECONDS };
  }
}

function maskPhone(phone: string): string {
  if (phone.length < 4) return '****';
  return `${phone.slice(0, 3)}*****${phone.slice(-2)}`;
}
