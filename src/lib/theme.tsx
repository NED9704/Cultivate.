import 'expo-sqlite/localStorage/install';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance } from 'react-native';

import { palettes, type ColorScheme, type ThemeColors } from '../../constants/theme';

/** Picked manually in Settings; the iPhone's own setting is not used. */
export type ThemePreference = ColorScheme;

const STORAGE_KEY = 'cultivate.themePreference';
/** The look before anyone picks: the original chocolate dark mode. */
const DEFAULT_SCHEME: ColorScheme = 'dark';

type ThemeState = {
  scheme: ColorScheme;
  colors: ThemeColors;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeState | null>(null);

function readSavedPreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Storage unavailable: use the default.
  }
  return DEFAULT_SCHEME;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readSavedPreference);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    try {
      localStorage.setItem(STORAGE_KEY, p);
    } catch {
      // Not saved, but the change still applies for this session.
    }
  }, []);

  // Make the system parts (pop-up alerts, keyboard) match the chosen mode too.
  useEffect(() => {
    Appearance.setColorScheme(preference);
  }, [preference]);

  const value = useMemo(
    () => ({ scheme: preference, colors: palettes[preference], preference, setPreference }),
    [preference, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

/** Builds a screen's styles from the current colours, rebuilt only when the mode changes. */
export function useThemedStyles<T>(factory: (colors: ThemeColors, scheme: ColorScheme) => T): T {
  const { colors, scheme } = useTheme();
  return useMemo(() => factory(colors, scheme), [colors, scheme]);
}
