import { describe, expect, it } from 'vitest';
import { Language } from '../enums.js';
import { I18N_KEYS } from './keys.js';
import { en } from './en.js';
import { hi } from './hi.js';
import { ta } from './ta.js';
import { te } from './te.js';
import { translate, translations } from './index.js';

const catalogs = { en, te, hi, ta };
const allKeys = Object.values(I18N_KEYS);

describe('i18n catalogs', () => {
  it('has a catalog for every supported language', () => {
    expect(Object.keys(translations).sort()).toEqual(
      [Language.EN, Language.TE, Language.HI, Language.TA].sort(),
    );
  });

  it.each(Object.entries(catalogs))(
    'catalog %s defines every key with a non-empty string',
    (_name, catalog) => {
      for (const key of allKeys) {
        expect(catalog[key], `missing key ${key}`).toBeTruthy();
      }
    },
  );

  it.each(Object.entries(catalogs))('catalog %s has no extra keys', (_name, catalog) => {
    expect(Object.keys(catalog).sort()).toEqual([...allKeys].sort());
  });

  it('translate falls back to English, then the key', () => {
    expect(translate(Language.TE, I18N_KEYS.appName)).toBe(te[I18N_KEYS.appName]);
    expect(translate(Language.TA, I18N_KEYS.tabHome)).toBe(ta[I18N_KEYS.tabHome]);
    expect(translate(Language.EN, I18N_KEYS.tabHome)).toBe('Home');
  });
});
