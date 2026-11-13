import { describe, expect, it } from 'vitest';
import { Language, PilgrimSearchMode } from './enums.js';
import {
  aadhaarNumberSchema,
  createAccountInputSchema,
  geoPointSchema,
  maskAadhaar,
  memberUidSchema,
  pilgrimSearchInputSchema,
  reportMissingInputSchema,
} from './schemas.js';

describe('memberUidSchema', () => {
  it('accepts family member UIDs like K7M2-01', () => {
    expect(memberUidSchema.safeParse('K7M2-01').success).toBe(true);
    expect(memberUidSchema.safeParse('K7M2-02').success).toBe(true);
  });

  it('rejects legacy ABC1001 and malformed UIDs', () => {
    expect(memberUidSchema.safeParse('ABC1001').success).toBe(false);
    expect(memberUidSchema.safeParse('k7m2-01').success).toBe(false);
    expect(memberUidSchema.safeParse('K7M2-1').success).toBe(false);
  });
});

describe('aadhaarNumberSchema', () => {
  it('accepts exactly twelve digits', () => {
    expect(aadhaarNumberSchema.safeParse('123456789012').success).toBe(true);
  });

  it('rejects non-12-digit values', () => {
    expect(aadhaarNumberSchema.safeParse('1234').success).toBe(false);
    expect(aadhaarNumberSchema.safeParse('12345678901').success).toBe(false);
  });
});

describe('maskAadhaar', () => {
  it('masks to last four', () => {
    expect(maskAadhaar('123456789012')).toBe('XXXX XXXX 9012');
  });
});

describe('geoPointSchema', () => {
  it('accepts a valid WGS84 point', () => {
    expect(geoPointSchema.safeParse({ lng: 81.78, lat: 16.98 }).success).toBe(true);
  });

  it('rejects out-of-range coordinates', () => {
    expect(geoPointSchema.safeParse({ lng: 200, lat: 16.98 }).success).toBe(false);
    expect(geoPointSchema.safeParse({ lng: 81.78, lat: 100 }).success).toBe(false);
  });
});

describe('createAccountInputSchema', () => {
  const base = {
    name: 'Ravi K.',
    ownPhone: '+919000000001',
    address: 'Rajamahendravaram',
    aadhaarNumber: '123456789012',
    emergencyPhone: '+919000000002',
    photoKey: 'photos/k7m2-01.jpg',
    password: 'strongpass1',
    confirmPassword: 'strongpass1',
    preferredLanguage: Language.TE,
    reunificationConsent: true as const,
  };

  it('accepts a valid registration', () => {
    expect(createAccountInputSchema.safeParse(base).success).toBe(true);
  });

  it('requires matching passwords', () => {
    const result = createAccountInputSchema.safeParse({
      ...base,
      confirmPassword: 'different1',
    });
    expect(result.success).toBe(false);
  });

  it('requires reunification consent to be true', () => {
    const result = createAccountInputSchema.safeParse({
      ...base,
      reunificationConsent: false,
    });
    expect(result.success).toBe(false);
  });
});

describe('reportMissingInputSchema', () => {
  it('requires a UID and last-seen point', () => {
    const ok = reportMissingInputSchema.safeParse({
      memberUid: 'K7M2-03',
      lastSeen: { lng: 81.78, lat: 16.98 },
      lastSeenLabel: 'Ghat 3 steps',
    });
    expect(ok.success).toBe(true);
  });
});

describe('pilgrimSearchInputSchema', () => {
  it('requires mode-specific fields', () => {
    expect(
      pilgrimSearchInputSchema.safeParse({ mode: PilgrimSearchMode.NAME, name: 'Arun' }).success,
    ).toBe(true);
    expect(pilgrimSearchInputSchema.safeParse({ mode: PilgrimSearchMode.NAME }).success).toBe(
      false,
    );
  });
});
