/**
 * Core domain enums shared across API, dashboard, and (mirrored) mobile.
 * Keep values stable: they are persisted in the database and encoded in QR/UIDs.
 */

/** Account / actor roles. One app, three roles. */
export enum Role {
  USER = 'USER',
  VOLUNTEER = 'VOLUNTEER',
  POLICE = 'POLICE',
}

/**
 * Case lifecycle. The only legal transitions are:
 * MISSING -> FOUND -> MATCHED -> REUNITED.
 * `assertCaseTransition` adds the role and handover guards on top of that map.
 */
export enum CaseStatus {
  MISSING = 'MISSING',
  FOUND = 'FOUND',
  MATCHED = 'MATCHED',
  REUNITED = 'REUNITED',
}

/**
 * Coarse age bands. We never store exact ages/DOB for found persons; bands keep
 * matching human-friendly and privacy-preserving.
 */
export enum AgeBand {
  INFANT_0_2 = 'INFANT_0_2',
  CHILD_3_5 = 'CHILD_3_5',
  CHILD_6_8 = 'CHILD_6_8',
  CHILD_9_12 = 'CHILD_9_12',
  TEEN_13_17 = 'TEEN_13_17',
  ADULT_18_59 = 'ADULT_18_59',
  SENIOR_60_PLUS = 'SENIOR_60_PLUS',
}

/** Minors (require extra guardian consent) are everyone below 18. */
export const MINOR_AGE_BANDS: ReadonlySet<AgeBand> = new Set([
  AgeBand.INFANT_0_2,
  AgeBand.CHILD_3_5,
  AgeBand.CHILD_6_8,
  AgeBand.CHILD_9_12,
  AgeBand.TEEN_13_17,
]);

export function isMinorAgeBand(band: AgeBand): boolean {
  return MINOR_AGE_BANDS.has(band);
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
  UNKNOWN = 'UNKNOWN',
}

/** Supported app languages from day one. */
export enum Language {
  EN = 'en',
  TE = 'te',
  HI = 'hi',
  /** Tamil — common for South Indian pilgrim crowds. */
  TA = 'ta',
}

export const SUPPORTED_LANGUAGES: readonly Language[] = [
  Language.EN,
  Language.TE,
  Language.HI,
  Language.TA,
];

export const LANGUAGE_LABELS: Record<Language, string> = {
  [Language.EN]: 'English',
  [Language.TE]: 'తెలుగు',
  [Language.HI]: 'हिन्दी',
  [Language.TA]: 'தமிழ்',
};

/** Severity for police notices shown on Home / News. */
export enum NoticeSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

/** Consent types recorded for DPDP compliance. */
export enum ConsentType {
  REUNIFICATION = 'REUNIFICATION',
  MINOR_GUARDIAN = 'MINOR_GUARDIAN',
  /** Live-photo face matching — only active when FACE_MATCH_ENABLED. */
  FACE_RECOGNITION = 'FACE_RECOGNITION',
}

/** How a volunteer/officer contacted the family when registering a find. */
export enum CallOutcome {
  RESPONDED = 'RESPONDED',
  NO_RESPONSE = 'NO_RESPONSE',
}

/** Pilgrim search modes (volunteer / police find-person). */
export enum PilgrimSearchMode {
  NAME = 'name',
  FAMILY_ID = 'familyId',
  AADHAAR = 'aadhaar',
  PHOTO = 'photo',
  QR = 'qr',
}

/** Who performed an audited action. */
export enum ActorType {
  USER = 'USER',
  VOLUNTEER = 'VOLUNTEER',
  POLICE = 'POLICE',
  SYSTEM = 'SYSTEM',
}

/**
 * Allowed case-state transitions. `assertCaseTransition` is the guard the API
 * calls before it writes a new status.
 */
export const CASE_STATE_TRANSITIONS: Readonly<Record<CaseStatus, readonly CaseStatus[]>> = {
  [CaseStatus.MISSING]: [CaseStatus.FOUND],
  [CaseStatus.FOUND]: [CaseStatus.MATCHED],
  [CaseStatus.MATCHED]: [CaseStatus.REUNITED],
  [CaseStatus.REUNITED]: [],
};

export function canTransitionCase(from: CaseStatus, to: CaseStatus): boolean {
  return CASE_STATE_TRANSITIONS[from].includes(to);
}

export type CaseTransitionErrorCode = 'ILLEGAL' | 'FORBIDDEN' | 'HANDOVER_REQUIRED';

/** Thrown when a role tries a transition the lifecycle does not allow. */
export class CaseTransitionError extends Error {
  readonly code: CaseTransitionErrorCode;

  constructor(message: string, code: CaseTransitionErrorCode) {
    super(message);
    this.name = 'CaseTransitionError';
    this.code = code;
  }
}

/**
 * Role guards for the case lifecycle.
 * - VOLUNTEER may record MISSING -> FOUND only.
 * - POLICE may record MISSING -> FOUND and FOUND -> MATCHED.
 * - POLICE may record MATCHED -> REUNITED only after the guardian OTP is verified.
 * - USER cannot move a case.
 */
export function assertCaseTransition(input: {
  role: Role;
  from: CaseStatus;
  to: CaseStatus;
  handoverVerified?: boolean;
}): void {
  if (!canTransitionCase(input.from, input.to)) {
    throw new CaseTransitionError(
      `Cannot move a case from ${input.from} to ${input.to}`,
      'ILLEGAL',
    );
  }

  const volunteerFound =
    input.role === Role.VOLUNTEER &&
    input.from === CaseStatus.MISSING &&
    input.to === CaseStatus.FOUND;
  const policeMove = input.role === Role.POLICE;

  if (!volunteerFound && !policeMove) {
    throw new CaseTransitionError(
      `${input.role} cannot move a case from ${input.from} to ${input.to}`,
      'FORBIDDEN',
    );
  }

  if (input.to === CaseStatus.REUNITED && input.handoverVerified !== true) {
    throw new CaseTransitionError(
      'Reunification requires a verified guardian OTP',
      'HANDOVER_REQUIRED',
    );
  }
}
