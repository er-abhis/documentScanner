import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getPrefs, setPref, type ThemePref } from '../services/prefs';

type Ctx = { preference: ThemePref; setPreference: (p: ThemePref) => void };

const ThemePrefContext = createContext<Ctx>({ preference: 'system', setPreference: () => {} });

/** Holds the user's theme preference (System/Light/Dark), persisted to prefs. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPrefState] = useState<ThemePref>('system');

  useEffect(() => {
    getPrefs().then(p => setPrefState(p.themeMode)).catch(() => {});
  }, []);

  const setPreference = (p: ThemePref) => {
    setPrefState(p);
    setPref('themeMode', p).catch(() => {});
  };

  return <ThemePrefContext.Provider value={{ preference, setPreference }}>{children}</ThemePrefContext.Provider>;
}

export const useThemePref = () => useContext(ThemePrefContext);
