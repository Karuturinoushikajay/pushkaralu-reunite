/**
 * Family-code UID model (v3): family K7M2 → members K7M2-01, K7M2-02, …
 * The database owns atomic allocation; this module formats and validates.
 */

const FAMILY_CODE_RE = /^[A-Z0-9]{4}$/;
const MEMBER_UID_RE = /^([A-Z0-9]{4})-([0-9]{2})$/;

/** Alphabet for generating 4-char family codes (no ambiguous I/O/0/1). */
const FAMILY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function formatMemberUid(familyCode: string, seq: number): string {
  if (!FAMILY_CODE_RE.test(familyCode)) {
    throw new Error('Family code must be exactly 4 uppercase alphanumeric chars');
  }
  if (!Number.isInteger(seq) || seq < 1 || seq > 99) {
    throw new Error('Member sequence must be an integer from 1 to 99');
  }
  return `${familyCode}-${seq.toString().padStart(2, '0')}`;
}

export function parseMemberUid(uid: string): { familyCode: string; seq: number } {
  const match = MEMBER_UID_RE.exec(uid);
  if (!match) {
    throw new Error(`Invalid member UID: ${uid}`);
  }
  return { familyCode: match[1]!, seq: Number.parseInt(match[2]!, 10) };
}

/** Encode a monotonic counter into a 4-char family code (base-32-ish). */
export function familyCodeFromCounter(n: number): string {
  if (!Number.isInteger(n) || n < 0) {
    throw new Error('counter must be a non-negative integer');
  }
  const base = FAMILY_ALPHABET.length;
  let value = n;
  let out = '';
  for (let i = 0; i < 4; i++) {
    out = FAMILY_ALPHABET[value % base]! + out;
    value = Math.floor(value / base);
  }
  return out;
}

/** Next member sequence numbers after `lastSeq` (0 → first is 1). */
export function nextMemberSeqs(lastSeq: number, count = 1): number[] {
  if (!Number.isInteger(lastSeq) || lastSeq < 0) {
    throw new Error('lastSeq must be a non-negative integer');
  }
  if (!Number.isInteger(count) || count < 1) {
    throw new Error('count must be a positive integer');
  }
  return Array.from({ length: count }, (_, i) => lastSeq + i + 1);
}

/** @deprecated Use formatMemberUid — kept briefly for migration of call sites. */
export function formatUid(prefix: string, number: number): string {
  return formatMemberUid(prefix.length === 4 ? prefix : `${prefix}X`.slice(0, 4), number);
}

/** @deprecated Use parseMemberUid */
export function parseUid(uid: string): { prefix: string; number: number } {
  const parsed = parseMemberUid(uid);
  return { prefix: parsed.familyCode, number: parsed.seq };
}

/** @deprecated Use nextMemberSeqs */
export function nextUidNumbers(lastNumber: number, count = 1): number[] {
  return nextMemberSeqs(lastNumber, count);
}
