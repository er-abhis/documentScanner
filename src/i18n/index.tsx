import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { getPrefs, setPref, type LangPref } from '../services/prefs';
import { STRINGS, type StringKey } from './strings';

type Ctx = {
  lang: LangPref;
  setLang: (l: LangPref) => void;
  t: (key: StringKey) => string;
};

const I18nContext = createContext<Ctx>({
  lang: 'en',
  setLang: () => {},
  t: (key: StringKey) => STRINGS.en[key] ?? String(key),
});

/** Lightweight i18n (English + Hindi), persisted to prefs. */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangPref>('en');

  useEffect(() => {
    getPrefs().then(p => setLangState(p.language));
  }, []);

  const setLang = useCallback((l: LangPref) => {
    setLangState(l);
    setPref('language', l);
  }, []);

  const t = useCallback(
    (key: StringKey) => (STRINGS[lang] as Record<string, string>)[key] ?? STRINGS.en[key] ?? String(key),
    [lang],
  );

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
export const useT = () => useContext(I18nContext).t;
