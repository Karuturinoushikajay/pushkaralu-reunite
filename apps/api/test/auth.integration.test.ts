import { Kysely, sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AuthService } from '../src/auth/auth.service';
import { UidService } from '../src/auth/uid.service';
import { CaseStateService } from '../src/cases/case-state.service';
import type { AppConfig } from '../src/config/env';
import { CryptoService } from '../src/crypto/crypto.service';
import { devOfficerPassword } from '../src/crypto/password';
import { TokenService } from '../src/crypto/token.service';
import { createDb } from '../src/database/kysely';
import { runMigrations } from '../src/database/migrator';
import { seed } from '../src/database/seed';
import type { Database } from '../src/database/schema';
import type { DatabaseService } from '../src/database/database.service';
import { CaseStatus, CaseTransitionError, Language, Role } from '@pushkaralu/shared';

const DATABASE_URL = process.env.DATABASE_URL;
const ENC_KEY = process.env.DATA_ENCRYPTION_KEY ?? 'dev-seed-key';
const suite = DATABASE_URL ? describe : describe.skip;

suite('auth, otp, and case guards', () => {
  let db: Kysely<Database>;
  let auth: AuthService;
  let cases: CaseStateService;

  beforeAll(async () => {
    await runMigrations('latest', DATABASE_URL as string);
    db = createDb(DATABASE_URL as string);
    await seed(db, ENC_KEY);
    const database = { db } as DatabaseService;
    const crypto = new CryptoService(ENC_KEY);
    const config = {
      NODE_ENV: 'test',
      SMS_PROVIDER: 'mock',
      OTP_TTL_SECONDS: 300,
    } as AppConfig;
    auth = new AuthService(
      database,
      crypto,
      new TokenService('dev-only-jwt-secret-change'),
      new UidService(database),
      config,
    );
    cases = new CaseStateService(database, crypto);
  }, 60_000);

  afterAll(async () => {
    await db?.destroy();
  });

  it('registers a pilgrim, logs in with OTP, and refuses a bad code', async () => {
    const suffix = String(Date.now()).slice(-8);
    const phone = `98${suffix}`;
    const session = await auth.register({
      name: 'Test Pilgrim',
      ownPhone: phone,
      address: 'Kotilingala Ghat road',
      emergencyPhone: '9800000001',
      photoKey: 'photos/self.jpg',
      password: 'pilgrim-pass',
      confirmPassword: 'pilgrim-pass',
      preferredLanguage: Language.EN,
      reunificationConsent: true,
    });

    expect(session.account.loginUid).toMatch(/^ABC[0-9]{4,}$/);
    expect(session.account.role).toBe(Role.USER);
    expect(session.token).toBeTruthy();

    const stored = await db
      .selectFrom('members')
      .select(['name_enc', 'phone_lookup'])
      .where('uid', '=', session.account.memberUid)
      .executeTakeFirstOrThrow();
    expect(stored.name_enc?.toString('utf8')).not.toContain('Test Pilgrim');
    expect(stored.phone_lookup).not.toContain(suffix);

    const otp = await auth.requestOtp(phone);
    expect(otp.devCode).toMatch(/^[0-9]{6}$/);
    await expect(auth.verifyOtp(phone, '000000')).rejects.toThrow(/invalid or expired/i);
    const again = await auth.verifyOtp(phone, otp.devCode as string);
    expect(again.account.id).toBe(session.account.id);
  });

  it('lets the seeded officer move a case and blocks reunite until the OTP is verified', async () => {
    const password = devOfficerPassword();
    expect(password).toBeTruthy();
    const officer = await auth.login('BOOTH07-OFFICER', password as string);
    expect(officer.account.role).toBe(Role.POLICE);

    const pilgrim = await auth.register({
      name: 'Lost Elder',
      ownPhone: `97${String(Date.now()).slice(-8)}`,
      address: 'Pushkar Ghat',
      emergencyPhone: '9700000002',
      photoKey: 'photos/elder.jpg',
      password: 'pilgrim-pass',
      confirmPassword: 'pilgrim-pass',
      preferredLanguage: Language.TE,
      reunificationConsent: true,
    });

    const inserted = await sql<{ id: string }>`
      insert into cases (member_uid, status, reported_by_account_id)
      values (${pilgrim.account.memberUid}, 'MISSING', ${pilgrim.account.id}::uuid)
      returning id
    `.execute(db);
    const caseId = inserted.rows[0]?.id as string;

    const userActor = {
      accountId: pilgrim.account.id,
      role: Role.USER,
      loginUid: pilgrim.account.loginUid,
    };
    await expect(cases.transition(caseId, CaseStatus.FOUND, userActor)).rejects.toBeInstanceOf(
      CaseTransitionError,
    );

    const officerActor = {
      accountId: officer.account.id,
      role: Role.POLICE,
      loginUid: officer.account.loginUid,
    };
    expect((await cases.transition(caseId, CaseStatus.FOUND, officerActor)).status).toBe(
      CaseStatus.FOUND,
    );
    expect((await cases.transition(caseId, CaseStatus.MATCHED, officerActor)).status).toBe(
      CaseStatus.MATCHED,
    );
    await expect(
      cases.transition(caseId, CaseStatus.REUNITED, officerActor),
    ).rejects.toBeInstanceOf(CaseTransitionError);

    const handover = await cases.requestHandoverOtp(caseId, officerActor, 300, true);
    expect(handover.devCode).toMatch(/^[0-9]{6}$/);
    await cases.verifyHandoverOtp(caseId, handover.devCode as string, officerActor);
    expect((await cases.transition(caseId, CaseStatus.REUNITED, officerActor)).status).toBe(
      CaseStatus.REUNITED,
    );
  });
});
