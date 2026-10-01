import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Language } from '../domain/types';
import { HTML_LANG, isLanguage, resolveLanguage, translate } from './translate';
import type { TranslateParams } from './translate';
import { storage } from '../app/storage';

interface I18nValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string, params?: TranslateParams) => string;
}

const I18nContext = createContext<I18nValue | null>(null);
const STORAGE_KEY = 'trustshield.lang';

function initialLanguage(): Language {
  const saved = storage.get(STORAGE_KEY);
  if (isLanguage(saved)) return saved;
  if (typeof navigator !== 'undefined') return resolveLanguage(navigator.language);
  return 'en';
}

export function I18nProvider({ children, initial }: { children: ReactNode; initial?: Language }) {
  const [lang, setLangState] = useState<Language>(() => initial ?? initialLanguage());

  useEffect(() => {
    document.documentElement.lang = HTML_LANG[lang];
    document.title = `${translate(lang, 'home.title')} · ${translate(lang, 'app.name')}`;
  }, [lang]);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    storage.set(STORAGE_KEY, next);
  }, []);

  const value = useMemo<I18nValue>(
    () => ({ lang, setLang, t: (key, params) => translate(lang, key, params) }),
    [lang, setLang],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
