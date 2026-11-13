import type { AgeBand, Gender } from './enums.js';
import type { GeoPoint } from './schemas.js';

/**
 * Extension point for matching found persons to open cases.
 *
 * PHASE 1 SCOPE: description + location + time only. There is intentionally NO
 * implementation of CCTV, drone, or face-recognition search in Phase 1, and none
 * must be added here. This interface is the single, clean seam where a future
 * (separately governed and consented) search provider could plug in.
 *
 * Any implementation MUST NOT perform biometric or facial matching. Photos are
 * for human viewing only.
 */

export interface CaseSearchQuery {
  /** Approximate age band of the found person. */
  ageBand?: AgeBand;
  gender?: Gender;
  /** Free-text clothing / distinguishing marks (human-entered). */
  clothing?: string;
  /** Spoken language, if known. */
  languageSpoken?: string;
  /** Where the person was found. */
  location?: GeoPoint;
  /** Search radius in metres around `location`. */
  radiusMeters?: number;
  /** Only consider cases reported within this many minutes. */
  withinMinutes?: number;
  /** Max results to return. */
  limit?: number;
}

export interface CaseSearchResult {
  /** UID of the candidate missing member. */
  memberUid: string;
  /** Opaque case identifier. */
  caseId: string;
  /**
   * Confidence bucket for the human reviewer. Derived from description/location/
   * time overlap only — never from biometrics.
   */
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  /** Human-readable reasons, e.g. "Red shirt", "Within 200 m", "Reported 8 min ago". */
  reasons: string[];
}

export interface CaseSearchService {
  /**
   * Return candidate open cases ranked for a human officer to confirm.
   * Implementations must be side-effect free and must not mutate case state.
   */
  search(query: CaseSearchQuery): Promise<CaseSearchResult[]>;
}
