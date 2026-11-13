import { z } from 'zod';
import {
  ActorType,
  AgeBand,
  CallOutcome,
  CaseStatus,
  ConsentType,
  Gender,
  Language,
  NoticeSeverity,
  PilgrimSearchMode,
  Role,
} from './enums.js';

/**
 * Zod schemas are the single source of truth for cross-boundary payloads.
 * The API validates with these; the dashboard infers types from them.
 */

/** Indian mobile number in E.164-ish form (+91XXXXXXXXXX). Kept lenient for seed/dev. */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{10,15}$/u, 'Invalid phone number');

/** Full Aadhaar (12 digits). Stored encrypted; UI shows masked. */
export const aadhaarNumberSchema = z
  .string()
  .regex(/^[0-9]{12}$/u, 'Aadhaar must be exactly 12 digits');

/** Display/last-4 helper (derived server-side from full number). */
export const aadhaarLast4Schema = z
  .string()
  .regex(/^[0-9]{4}$/u, 'Aadhaar last-4 must be exactly 4 digits');

/** Mask for non-police clients: XXXX XXXX 1234 */
export function maskAadhaar(fullOrLast4: string): string {
  const digits = fullOrLast4.replace(/\D/gu, '');
  const last4 = digits.slice(-4).padStart(4, '0');
  return `XXXX XXXX ${last4}`;
}

/** WGS84 point. lng first in GeoJSON order; stored as geography(Point,4326). */
export const geoPointSchema = z.object({
  lng: z.number().min(-180).max(180),
  lat: z.number().min(-90).max(90),
});
export type GeoPoint = z.infer<typeof geoPointSchema>;

/** Family code e.g. K7M2 */
export const familyCodeSchema = z
  .string()
  .regex(/^[A-Z0-9]{4}$/u, 'Invalid family code');

/** Member UID e.g. K7M2-01 */
export const memberUidSchema = z
  .string()
  .regex(/^[A-Z0-9]{4}-[0-9]{2}$/u, 'Invalid member UID');

/** @deprecated alias — prefer memberUidSchema */
export const uidSchema = memberUidSchema;

export const uidSeriesSchema = z.object({
  familyCode: familyCodeSchema,
  lastSeq: z.number().int().nonnegative(),
});

export const roleSchema = z.nativeEnum(Role);
export const languageSchema = z.nativeEnum(Language);
export const ageBandSchema = z.nativeEnum(AgeBand);
export const genderSchema = z.nativeEnum(Gender);
export const caseStatusSchema = z.nativeEnum(CaseStatus);
export const noticeSeveritySchema = z.nativeEnum(NoticeSeverity);
export const consentTypeSchema = z.nativeEnum(ConsentType);
export const actorTypeSchema = z.nativeEnum(ActorType);
export const callOutcomeSchema = z.nativeEnum(CallOutcome);
export const pilgrimSearchModeSchema = z.nativeEnum(PilgrimSearchMode);

/** Create-account input (pre-crypto; API encrypts sensitive fields). */
export const createAccountInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    ownPhone: phoneSchema,
    address: z.string().trim().min(1).max(300),
    aadhaarNumber: aadhaarNumberSchema,
    emergencyPhone: phoneSchema,
    photoKey: z.string().min(1),
    password: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
    preferredLanguage: languageSchema.default(Language.EN),
    reunificationConsent: z.literal(true),
    faceConsentAccepted: z.boolean().default(false),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type CreateAccountInput = z.infer<typeof createAccountInputSchema>;

/** Complete OTP + live photo + face consent (v3 onboarding step 3). */
export const verifyOtpWithPhotoInputSchema = z.object({
  challengeId: z.string().uuid(),
  code: z.string().regex(/^[0-9]{6}$/u, 'OTP must be 6 digits'),
  photoKey: z.string().min(1).optional(),
  faceConsentAccepted: z.boolean().optional(),
});
export type VerifyOtpWithPhotoInput = z.infer<typeof verifyOtpWithPhotoInputSchema>;

/** Add a family member to an existing account. */
export const addMemberInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  ageBand: ageBandSchema,
  address: z.string().trim().min(1).max(300).optional(),
  ownPhone: phoneSchema.optional(),
  emergencyPhone: phoneSchema.optional(),
  /** Optional for children. */
  aadhaarNumber: aadhaarNumberSchema.optional(),
  photoKey: z.string().min(1).optional(),
  minorGuardianConsent: z.boolean().optional(),
});
export type AddMemberInput = z.infer<typeof addMemberInputSchema>;

/** Family taps REPORT MISSING with last-seen GPS. */
export const reportMissingInputSchema = z.object({
  memberUid: memberUidSchema,
  lastSeen: geoPointSchema,
  lastSeenLabel: z.string().trim().max(160).optional(),
  note: z.string().trim().max(500).optional(),
});
export type ReportMissingInput = z.infer<typeof reportMissingInputSchema>;

/** Volunteer logs a found person (description / scanned UID). */
export const foundReportInputSchema = z.object({
  scannedUid: memberUidSchema.optional(),
  ageBand: ageBandSchema,
  gender: genderSchema,
  clothing: z.string().trim().min(1).max(300),
  languageSpoken: z.string().trim().max(60).optional(),
  location: geoPointSchema,
  photoKey: z.string().min(1).optional(),
});
export type FoundReportInput = z.infer<typeof foundReportInputSchema>;

/** Booth, as seen by the dashboard and the routing UI. */
export const boothSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1),
  name: z.string().min(1),
  officerName: z.string().min(1).nullable(),
  informant: z.string().min(1).nullable(),
  location: geoPointSchema,
});
export type Booth = z.infer<typeof boothSchema>;

/** Multi-lingual notice content (en required; others optional for gradual rollout). */
export const localizedTextSchema = z.object({
  [Language.EN]: z.string(),
  [Language.TE]: z.string().optional(),
  [Language.HI]: z.string().optional(),
  [Language.TA]: z.string().optional(),
});
export type LocalizedText = z.infer<typeof localizedTextSchema>;

export const noticeSchema = z.object({
  id: z.string().uuid(),
  title: localizedTextSchema,
  body: localizedTextSchema,
  severity: noticeSeveritySchema,
  active: z.boolean(),
  publishedAt: z.string().datetime(),
});
export type Notice = z.infer<typeof noticeSchema>;

/** Login with Unique ID + password (pilgrim / police accounts). */
export const loginInputSchema = z.object({
  loginUid: memberUidSchema.or(z.string().min(3).max(40)),
  password: z.string().min(1).max(128),
});
export type LoginInput = z.infer<typeof loginInputSchema>;

/** Police / booth officer self-create credentials (demo / booth provisioning). */
export const createPoliceCredentialsInputSchema = z
  .object({
    officerId: z
      .string()
      .trim()
      .min(3)
      .max(40)
      .regex(/^[A-Za-z0-9_-]+$/u, 'Officer ID: letters, numbers, _ or - only'),
    password: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
    boothCode: z.string().trim().min(3).max(40),
    officerName: z.string().trim().min(1).max(120),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type CreatePoliceCredentialsInput = z.infer<typeof createPoliceCredentialsInputSchema>;

/** Complete phone OTP after registration (or volunteer OTP login). */
export const verifyOtpInputSchema = z.object({
  challengeId: z.string().uuid(),
  code: z.string().regex(/^[0-9]{6}$/u, 'OTP must be 6 digits'),
});
export type VerifyOtpInput = z.infer<typeof verifyOtpInputSchema>;

export const resendOtpInputSchema = z.object({
  challengeId: z.string().uuid(),
});
export type ResendOtpInput = z.infer<typeof resendOtpInputSchema>;

/** Volunteer login: volunteer ID + OTP. */
export const volunteerRequestOtpInputSchema = z.object({
  volunteerCode: z
    .string()
    .trim()
    .regex(/^VOL-[0-9]{4,}$/u, 'Volunteer ID must look like VOL-0214'),
});
export type VolunteerRequestOtpInput = z.infer<typeof volunteerRequestOtpInputSchema>;

/** Volunteer self-create credentials (demo / booth provisioning). */
export const createVolunteerCredentialsInputSchema = z.object({
  volunteerCode: z
    .string()
    .trim()
    .regex(/^VOL-[0-9]{4,}$/u, 'Volunteer ID must look like VOL-0214')
    .optional(),
  name: z.string().trim().min(1).max(120),
  phone: phoneSchema,
  boothCode: z.string().trim().min(3).max(40),
});
export type CreateVolunteerCredentialsInput = z.infer<typeof createVolunteerCredentialsInputSchema>;

/**
 * Wristband QR payload is the member UID only — never personal data.
 */
export function qrPayloadFromUid(uid: string): string {
  const parsed = memberUidSchema.safeParse(uid);
  if (!parsed.success) {
    throw new Error('QR payload must be a valid member UID');
  }
  return parsed.data;
}

export const matchCaseInputSchema = z.object({
  foundReportId: z.string().uuid(),
});
export type MatchCaseInput = z.infer<typeof matchCaseInputSchema>;

export const handoverVerifyInputSchema = z.object({
  code: z.string().regex(/^[0-9]{6}$/u, 'OTP must be 6 digits'),
  handoverId: z.string().uuid().optional(),
});
export type HandoverVerifyInput = z.infer<typeof handoverVerifyInputSchema>;

/** Manual close when no signal / OTP did not arrive (police booth). */
export const manualCloseInputSchema = z.object({
  reason: z.string().trim().min(1).max(200),
  idVerified: z.boolean(),
  guardianName: z.string().trim().min(1).max(120),
  guardianPhone: phoneSchema,
  officerNote: z.string().trim().max(500).optional(),
  supervisorId: z.string().trim().max(80).optional(),
});
export type ManualCloseInput = z.infer<typeof manualCloseInputSchema>;

export const nearbyQuerySchema = z.object({
  lng: z.coerce.number().min(-180).max(180),
  lat: z.coerce.number().min(-90).max(90),
  radiusMeters: z.coerce.number().positive().max(10_000).default(2000),
});
export type NearbyQuery = z.infer<typeof nearbyQuerySchema>;

/** Find-person search (volunteer / police). Max 5 results enforced by API. */
export const pilgrimSearchInputSchema = z
  .object({
    mode: pilgrimSearchModeSchema,
    name: z.string().trim().min(1).max(120).optional(),
    ageBand: ageBandSchema.optional(),
    familyId: familyCodeSchema.optional(),
    aadhaarNumber: aadhaarNumberSchema.optional(),
    photoKey: z.string().min(1).optional(),
    qrUid: memberUidSchema.optional(),
  })
  .superRefine((v, ctx) => {
    if (v.mode === PilgrimSearchMode.NAME && !v.name) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'name required', path: ['name'] });
    }
    if (v.mode === PilgrimSearchMode.FAMILY_ID && !v.familyId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'familyId required', path: ['familyId'] });
    }
    if (v.mode === PilgrimSearchMode.AADHAAR && !v.aadhaarNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'aadhaarNumber required',
        path: ['aadhaarNumber'],
      });
    }
    if (v.mode === PilgrimSearchMode.PHOTO && !v.photoKey) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'photoKey required', path: ['photoKey'] });
    }
    if (v.mode === PilgrimSearchMode.QR && !v.qrUid) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'qrUid required', path: ['qrUid'] });
    }
  });
export type PilgrimSearchInput = z.infer<typeof pilgrimSearchInputSchema>;

export const pilgrimSearchHitSchema = z.object({
  uid: memberUidSchema,
  familyCode: familyCodeSchema,
  name: z.string(),
  ageBand: ageBandSchema.nullable(),
  caseStatus: caseStatusSchema.nullable(),
  faceMatchScore: z.number().min(0).max(100).optional(),
  hasPhoto: z.boolean(),
});
export type PilgrimSearchHit = z.infer<typeof pilgrimSearchHitSchema>;

/**
 * After find: call family (numbers stay server-side) and always register the case.
 */
export const registerFromFindInputSchema = z.object({
  memberUid: memberUidSchema,
  callOutcome: callOutcomeSchema,
  location: geoPointSchema,
  locationLabel: z.string().trim().max(160).optional(),
  clothing: z.string().trim().max(300).optional(),
  languageSpoken: z.string().trim().max(60).optional(),
  photoKey: z.string().min(1).optional(),
  boothCode: z.string().trim().min(1).max(40).optional(),
});
export type RegisterFromFindInput = z.infer<typeof registerFromFindInputSchema>;

export const boothHandoverSuccessInputSchema = z.object({
  note: z.string().trim().max(300).optional(),
});
export type BoothHandoverSuccessInput = z.infer<typeof boothHandoverSuccessInputSchema>;
