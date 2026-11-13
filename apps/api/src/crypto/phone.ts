/** Canonical E.164-style phone used for lookup and storage. */
export function normalizePhone(input: string): string {
  const compact = input.trim().replace(/[\s-]/g, '');
  if (/^[0-9]{10}$/.test(compact)) return `+91${compact}`;
  if (/^91[0-9]{10}$/.test(compact)) return `+${compact}`;
  if (/^\+[0-9]{10,15}$/.test(compact)) return compact;
  return compact;
}
