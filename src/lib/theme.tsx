import 'expo-sqlite/localStorage/install';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { palettes, type ColorScheme, type ThemeColors } from '../../constants/theme';

/** "system" follows the iPhone's own Light/Dark setting. */
export type ThemePreference = 'system' | ColorScheme;

const STORAGE_KEY = 'cultivate.themePreference';

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
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
  } catch {
    // Storage unavailable: fall back to the system setting.
  }
  return 'system';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>(readSavedPreference);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    try {
      localStorage.setItem(STORAGE_KEY, p);
    } catch {
      // Not saved, but the change still applies for this session.
    }
  }, []);

  // Dark is the default look when the system gives no answer.
  const scheme: ColorScheme =
    preference === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : preference;

  const value = useMemo(
    () => ({ scheme, colors: palettes[scheme], preference, setPreference }),
    [scheme, preference, setPreference],
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
