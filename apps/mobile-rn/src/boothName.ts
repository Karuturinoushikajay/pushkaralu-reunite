import type { Language } from '@pushkaralu/shared';

type NameI18n = Partial<Record<'en' | 'hi' | 'te' | 'ta', string>>;

/** Prefer localized booth place-name; keep booth code separate (never translate). */
export function localizedBoothName(
  booth: { name?: string | null; nameI18n?: NameI18n | null },
  lang: Language,
): string {
  const i18n = booth.nameI18n;
  if (i18n) {
    return i18n[lang] ?? i18n.en ?? booth.name ?? '';
  }
  return booth.name ?? '';
}
