import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  I18N_KEYS,
  LANGUAGE_LABELS,
  Language,
  SUPPORTED_LANGUAGES,
  translate,
  type I18nKey,
} from '@pushkaralu/shared';

const STORAGE_KEY = 'pushkaralu.language';

type I18nContextValue = {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: I18nKey) => string;
  languages: readonly Language[];
  labels: Record<Language, string>;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(Language.EN);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved && (SUPPORTED_LANGUAGES as readonly string[]).includes(saved)) {
          setLangState(saved as Language);
        }
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setLang = (next: Language) => {
    setLangState(next);
    void AsyncStorage.setItem(STORAGE_KEY, next);
  };

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      setLang,
      t: (key) => translate(lang, key),
      languages: SUPPORTED_LANGUAGES,
      labels: LANGUAGE_LABELS,
    }),
    [lang],
  );

  if (!ready) return null;

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within LanguageProvider');
  return ctx;
}

export { I18N_KEYS, Language };
