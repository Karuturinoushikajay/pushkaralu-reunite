import { describe, expect, it } from 'vitest';
import {
  familyCodeFromCounter,
  formatMemberUid,
  nextMemberSeqs,
  parseMemberUid,
} from './uid.js';
import { qrPayloadFromUid } from './schemas.js';

describe('formatMemberUid', () => {
  it('formats K7M2-01 style IDs', () => {
    expect(formatMemberUid('K7M2', 1)).toBe('K7M2-01');
    expect(formatMemberUid('K7M2', 3)).toBe('K7M2-03');
    expect(formatMemberUid('ABCD', 12)).toBe('ABCD-12');
  });

  it('rejects bad family codes or seq', () => {
    expect(() => formatMemberUid('K7', 1)).toThrow(/Family code/);
    expect(() => formatMemberUid('K7M2', 0)).toThrow(/sequence/);
    expect(() => formatMemberUid('K7M2', 100)).toThrow(/sequence/);
  });
});

describe('parseMemberUid', () => {
  it('round-trips with formatMemberUid', () => {
    expect(parseMemberUid('K7M2-01')).toEqual({ familyCode: 'K7M2', seq: 1 });
    expect(parseMemberUid(formatMemberUid('T9B4', 2))).toEqual({
      familyCode: 'T9B4',
      seq: 2,
    });
  });
});

describe('familyCodeFromCounter', () => {
  it('emits stable 4-char codes', () => {
    expect(familyCodeFromCounter(0)).toHaveLength(4);
    expect(familyCodeFromCounter(1)).not.toBe(familyCodeFromCounter(0));
  });
});

describe('nextMemberSeqs', () => {
  it('allocates the next member numbers', () => {
    expect(nextMemberSeqs(0, 1)).toEqual([1]);
    expect(nextMemberSeqs(1, 3)).toEqual([2, 3, 4]);
  });
});

describe('qrPayloadFromUid', () => {
  it('encodes the UID only (no personal data)', () => {
    expect(qrPayloadFromUid('K7M2-01')).toBe('K7M2-01');
  });

  it('rejects non-UID payloads', () => {
    expect(() => qrPayloadFromUid('Ravi K.|+919000000001')).toThrow();
    expect(() => qrPayloadFromUid('ABC1001')).toThrow();
  });
});
