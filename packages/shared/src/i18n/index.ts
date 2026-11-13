import { Language } from '../enums.js';
import { en } from './en.js';
import { hi } from './hi.js';
import { type I18nKey } from './keys.js';
import { ta } from './ta.js';
import { te } from './te.js';

export { I18N_KEYS, type I18nKey } from './keys.js';
export { en } from './en.js';
export { te } from './te.js';
export { hi } from './hi.js';
export { ta } from './ta.js';

/** All bundled catalogs, keyed by language. */
export const translations: Record<Language, Record<I18nKey, string>> = {
  [Language.EN]: en,
  [Language.TE]: te,
  [Language.HI]: hi,
  [Language.TA]: ta,
};

/** Resolve a key for a language, falling back to English then the key itself. */
export function translate(lang: Language, key: I18nKey): string {
  return translations[lang]?.[key] ?? en[key] ?? key;
}
