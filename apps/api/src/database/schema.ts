import type { ColumnType, Generated, JSONColumnType } from 'kysely';

/**
 * Kysely table typings. These mirror the raw SQL migrations. Geography columns
 * are represented as strings at the type level: we read them via ST_AsGeoJSON and
 * write them via ST_GeogFromText, so the DB never exposes raw WKB to the app.
 */

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;

export interface AccountsTable {
  id: Generated<string>;
  login_uid: string;
  password_hash: string | null;
  role: 'USER' | 'VOLUNTEER' | 'POLICE';
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED';
  preferred_language: 'en' | 'te' | 'hi' | 'ta';
  booth_id: string | null;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
  deleted_at: Timestamp | null;
  retention_until: Timestamp | null;
}

export interface MembersTable {
  uid: string;
  account_id: string;
  family_code: string | null;
  member_seq: number | null;
  name_enc: Buffer | null;
  age_band: string | null;
  phone_enc: Buffer | null;
  emergency_phone_enc: Buffer | null;
  /** Full 12-digit Aadhaar ciphertext (v3). */
  aadhaar_enc: Buffer | null;
  /** Derived last-4 ciphertext for legacy display helpers. */
  aadhaar_last4_enc: Buffer | null;
  address_enc: Buffer | null;
  /** Encrypted at rest (AES-GCM base64). Signed URL material only after decrypt. */
  photo_key: string | null;
  face_consent_at: Timestamp | null;
  is_self: Generated<boolean>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
  deleted_at: Timestamp | null;
  retention_until: Timestamp | null;
}

export interface RegistrationDraftsTable {
  id: Generated<string>;
  phone_hash: string;
  phone_enc: Buffer;
  password_hash: string;
  preferred_language: 'en' | 'te' | 'hi' | 'ta';
  payload_enc: Buffer;
  expires_at: Timestamp;
  created_at: Generated<Timestamp>;
}

export interface OtpChallengesTable {
  id: Generated<string>;
  purpose: 'REGISTER' | 'VOLUNTEER_LOGIN' | 'HANDOVER';
  target_hash: string;
  code_hash: string;
  attempts: Generated<number>;
  max_attempts: Generated<number>;
  expires_at: Timestamp;
  consumed_at: Timestamp | null;
  draft_id: string | null;
  volunteer_id: string | null;
  metadata: JSONColumnType<Record<string, unknown>> | null;
  created_at: Generated<Timestamp>;
}

export interface UidSeriesTable {
  prefix: string;
  last_number: number;
  updated_at: Generated<Timestamp>;
}

export interface FamilyCodeSeriesTable {
  id: Generated<boolean>;
  last_counter: number;
  updated_at: Generated<Timestamp>;
}

export interface FamilyCallsTable {
  id: Generated<string>;
  case_id: string | null;
  member_uid: string | null;
  actor_type: 'VOLUNTEER' | 'POLICE';
  actor_id: string | null;
  outcome: 'RESPONDED' | 'NO_RESPONSE';
  created_at: Generated<Timestamp>;
}

export interface CasesTable {
  id: Generated<string>;
  member_uid: string;
  status: 'MISSING' | 'FOUND' | 'MATCHED' | 'REUNITED';
  last_seen: string | null;
  last_seen_label: string | null;
  note: string | null;
  reported_by_account_id: string | null;
  reported_at: Generated<Timestamp>;
  resolved_at: Timestamp | null;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface FoundReportsTable {
  id: Generated<string>;
  volunteer_id: string | null;
  scanned_uid: string | null;
  age_band: string | null;
  gender: string | null;
  clothing: string | null;
  language_spoken: string | null;
  location: string | null;
  photo_key: string | null;
  status: 'OPEN' | 'MATCHED' | 'CLOSED';
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface HandoversTable {
  id: Generated<string>;
  case_id: string;
  found_report_id: string | null;
  officer_id: string | null;
  guardian_otp_hash: string | null;
  otp_expires_at: Timestamp | null;
  verified_at: Timestamp | null;
  closed_manually: Generated<boolean>;
  manual_close_reason: string | null;
  id_verified: boolean | null;
  guardian_name: string | null;
  guardian_phone_enc: Buffer | null;
  officer_note: string | null;
  supervisor_id: string | null;
  created_at: Generated<Timestamp>;
}

export interface VolunteersTable {
  id: Generated<string>;
  volunteer_code: string;
  name_enc: Buffer | null;
  phone_enc: Buffer | null;
  booth_id: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
  deleted_at: Timestamp | null;
}

export interface BoothsTable {
  id: Generated<string>;
  code: string;
  name: string;
  /** Localized display names: { en, hi, te, ta }. */
  name_i18n: JSONColumnType<{ en?: string; hi?: string; te?: string; ta?: string }> | null;
  officer_name: string | null;
  informant: string | null;
  phone_enc: Buffer | null;
  location: string | null;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface NoticesTable {
  id: Generated<string>;
  title: JSONColumnType<{ en: string; te: string; hi: string }>;
  body: JSONColumnType<{ en: string; te: string; hi: string }>;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  booth_id: string | null;
  active: Generated<boolean>;
  published_at: Generated<Timestamp>;
  created_at: Generated<Timestamp>;
}

export interface AuditLogTable {
  id: Generated<string>;
  actor_type: 'USER' | 'VOLUNTEER' | 'POLICE' | 'SYSTEM';
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: JSONColumnType<Record<string, unknown>> | null;
  created_at: Generated<Timestamp>;
}

export interface ConsentsTable {
  id: Generated<string>;
  account_id: string;
  member_uid: string | null;
  type: 'REUNIFICATION' | 'MINOR_GUARDIAN' | 'FACE_RECOGNITION';
  granted: boolean;
  version: string;
  granted_at: Generated<Timestamp>;
  revoked_at: Timestamp | null;
}

export interface Database {
  accounts: AccountsTable;
  members: MembersTable;
  uid_series: UidSeriesTable;
  family_code_series: FamilyCodeSeriesTable;
  family_calls: FamilyCallsTable;
  cases: CasesTable;
  found_reports: FoundReportsTable;
  handovers: HandoversTable;
  volunteers: VolunteersTable;
  booths: BoothsTable;
  notices: NoticesTable;
  audit_log: AuditLogTable;
  consents: ConsentsTable;
  registration_drafts: RegistrationDraftsTable;
  otp_challenges: OtpChallengesTable;
}
