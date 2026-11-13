import { describe, expect, it } from 'vitest';
import {
  AgeBand,
  CASE_STATE_TRANSITIONS,
  CaseStatus,
  CaseTransitionError,
  Language,
  Role,
  SUPPORTED_LANGUAGES,
  assertCaseTransition,
  canTransitionCase,
  isMinorAgeBand,
} from './enums.js';

describe('case state machine', () => {
  it('allows the full happy path MISSING -> FOUND -> MATCHED -> REUNITED', () => {
    expect(canTransitionCase(CaseStatus.MISSING, CaseStatus.FOUND)).toBe(true);
    expect(canTransitionCase(CaseStatus.FOUND, CaseStatus.MATCHED)).toBe(true);
    expect(canTransitionCase(CaseStatus.MATCHED, CaseStatus.REUNITED)).toBe(true);
  });

  it('rejects skipping states', () => {
    expect(canTransitionCase(CaseStatus.MISSING, CaseStatus.MATCHED)).toBe(false);
    expect(canTransitionCase(CaseStatus.MISSING, CaseStatus.REUNITED)).toBe(false);
    expect(canTransitionCase(CaseStatus.FOUND, CaseStatus.REUNITED)).toBe(false);
  });

  it('rejects moving backwards', () => {
    expect(canTransitionCase(CaseStatus.FOUND, CaseStatus.MISSING)).toBe(false);
    expect(canTransitionCase(CaseStatus.REUNITED, CaseStatus.MATCHED)).toBe(false);
  });

  it('treats REUNITED as terminal', () => {
    expect(CASE_STATE_TRANSITIONS[CaseStatus.REUNITED]).toHaveLength(0);
  });

  it('covers every status in the transition map', () => {
    for (const status of Object.values(CaseStatus)) {
      expect(CASE_STATE_TRANSITIONS[status]).toBeDefined();
    }
  });
});

describe('case transition guards', () => {
  it('lets a volunteer mark a missing person found', () => {
    expect(() =>
      assertCaseTransition({
        role: Role.VOLUNTEER,
        from: CaseStatus.MISSING,
        to: CaseStatus.FOUND,
      }),
    ).not.toThrow();
  });

  it('lets police walk the lifecycle, and blocks reunite until the OTP is verified', () => {
    expect(() =>
      assertCaseTransition({
        role: Role.POLICE,
        from: CaseStatus.FOUND,
        to: CaseStatus.MATCHED,
      }),
    ).not.toThrow();

    expect(() =>
      assertCaseTransition({
        role: Role.POLICE,
        from: CaseStatus.MATCHED,
        to: CaseStatus.REUNITED,
      }),
    ).toThrow(CaseTransitionError);

    expect(() =>
      assertCaseTransition({
        role: Role.POLICE,
        from: CaseStatus.MATCHED,
        to: CaseStatus.REUNITED,
        handoverVerified: true,
      }),
    ).not.toThrow();
  });

  it('rejects a pilgrim moving a case', () => {
    expect(() =>
      assertCaseTransition({
        role: Role.USER,
        from: CaseStatus.MISSING,
        to: CaseStatus.FOUND,
      }),
    ).toThrow(CaseTransitionError);
  });

  it('rejects a volunteer skipping ahead', () => {
    try {
      assertCaseTransition({
        role: Role.VOLUNTEER,
        from: CaseStatus.MISSING,
        to: CaseStatus.MATCHED,
      });
      throw new Error('expected a transition error');
    } catch (err) {
      expect(err).toBeInstanceOf(CaseTransitionError);
      expect((err as CaseTransitionError).code).toBe('ILLEGAL');
    }
  });
});

describe('age bands', () => {
  it('marks under-18 bands as minors', () => {
    expect(isMinorAgeBand(AgeBand.INFANT_0_2)).toBe(true);
    expect(isMinorAgeBand(AgeBand.CHILD_6_8)).toBe(true);
    expect(isMinorAgeBand(AgeBand.TEEN_13_17)).toBe(true);
  });

  it('does not mark adults/seniors as minors', () => {
    expect(isMinorAgeBand(AgeBand.ADULT_18_59)).toBe(false);
    expect(isMinorAgeBand(AgeBand.SENIOR_60_PLUS)).toBe(false);
  });
});

describe('languages', () => {
  it('supports English, Telugu, and Hindi', () => {
    expect(SUPPORTED_LANGUAGES).toEqual([
      Language.EN,
      Language.TE,
      Language.HI,
      Language.TA,
    ]);
  });
});
