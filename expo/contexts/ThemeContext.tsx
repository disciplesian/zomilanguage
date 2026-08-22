import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Appearance, Platform } from 'react-native';

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  secondaryLight: string;
  secondaryDark: string;
  accent: string;
  accentLight: string;
  accentDark: string;
  tertiary: string;
  tertiaryLight: string;
  tertiaryDark: string;
  success: string;
  successLight: string;
  warning: string;
  error: string;
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  surface: string;
  surfaceLight: string;
  surfaceMedium: string;
  glass: string;
  glassBorder: string;
  glassHighlight: string;
  glassCyan: string;
  glassCyanBorder: string;
  glassCyanGlow: string;
  glassPink: string;
  glassPinkBorder: string;
  glassPinkGlow: string;
  glassYellow: string;
  glassYellowBorder: string;
  glassYellowGlow: string;
  glassPurple: string;
  glassPurpleBorder: string;
  glassPurpleGlow: string;
  glassGreen: string;
  glassGreenBorder: string;
  glassGreenGlow: string;
  glassCard?: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textDark: string;
  tabBar: string;
  tabBarBorder: string;
  gradientCyan?: string[];
  gradientPink?: string[];
  gradientYellow?: string[];
  gradientPurple?: string[];
  gradientGreen?: string[];
  gradientMixed?: string[];
}

const darkColors: ThemeColors = {
  primary: "#00E5FF",
  primaryLight: "#76EEFF",
  primaryDark: "#00B8D4",
  secondary: "#FF4081",
  secondaryLight: "#FF80AB",
  secondaryDark: "#F50057",
  accent: "#FFEA00",
  accentLight: "#FFF59D",
  accentDark: "#FFD600",
  tertiary: "#7C4DFF",
  tertiaryLight: "#B388FF",
  tertiaryDark: "#651FFF",
  success: "#00E676",
  successLight: "#69F0AE",
  warning: "#FFC400",
  error: "#FF5252",
  background: "#1A1F2E",
  backgroundSecondary: "#242B3D",
  backgroundTertiary: "#2D3548",
  surface: "rgba(255, 255, 255, 0.08)",
  surfaceLight: "rgba(255, 255, 255, 0.12)",
  surfaceMedium: "rgba(255, 255, 255, 0.16)",
  glass: "rgba(255, 255, 255, 0.12)",
  glassBorder: "rgba(255, 255, 255, 0.2)",
  glassHighlight: "rgba(255, 255, 255, 0.3)",
  glassCyan: "rgba(0, 229, 255, 0.2)",
  glassCyanBorder: "rgba(0, 229, 255, 0.4)",
  glassCyanGlow: "rgba(0, 229, 255, 0.5)",
  glassPink: "rgba(255, 64, 129, 0.2)",
  glassPinkBorder: "rgba(255, 64, 129, 0.4)",
  glassPinkGlow: "rgba(255, 64, 129, 0.5)",
  glassYellow: "rgba(255, 234, 0, 0.2)",
  glassYellowBorder: "rgba(255, 234, 0, 0.4)",
  glassYellowGlow: "rgba(255, 234, 0, 0.5)",
  glassPurple: "rgba(124, 77, 255, 0.2)",
  glassPurpleBorder: "rgba(124, 77, 255, 0.4)",
  glassPurpleGlow: "rgba(124, 77, 255, 0.5)",
  glassGreen: "rgba(0, 230, 118, 0.2)",
  glassGreenBorder: "rgba(0, 230, 118, 0.4)",
  glassGreenGlow: "rgba(0, 230, 118, 0.5)",
  text: "#FFFFFF",
  textSecondary: "rgba(255, 255, 255, 0.85)",
  textMuted: "rgba(255, 255, 255, 0.55)",
  textDark: "rgba(0, 0, 0, 0.85)",
  tabBar: "rgba(26, 31, 46, 0.95)",
  tabBarBorder: "rgba(255, 255, 255, 0.15)",
};

const lightColors: ThemeColors = {
  primary: "#0099B8",
  primaryLight: "#33B5CF",
  primaryDark: "#006D85",
  secondary: "#E91E63",
  secondaryLight: "#FF5C8D",
  secondaryDark: "#AD1457",
  accent: "#F9A825",
  accentLight: "#FFD54F",
  accentDark: "#F57F17",
  tertiary: "#5E35B1",
  tertiaryLight: "#9162E4",
  tertiaryDark: "#4527A0",
  success: "#00A152",
  successLight: "#4CAF50",
  warning: "#F9A825",
  error: "#D32F2F",
  background: "#F4F6FB",
  backgroundSecondary: "#E9EEF7",
  backgroundTertiary: "#DCE3F0",
  surface: "rgba(20, 28, 48, 0.04)",
  surfaceLight: "rgba(20, 28, 48, 0.06)",
  surfaceMedium: "rgba(20, 28, 48, 0.10)",
  glass: "rgba(255, 255, 255, 0.65)",
  glassBorder: "rgba(20, 28, 48, 0.10)",
  glassHighlight: "rgba(255, 255, 255, 0.85)",
  glassCyan: "rgba(0, 153, 184, 0.12)",
  glassCyanBorder: "rgba(0, 153, 184, 0.35)",
  glassCyanGlow: "rgba(0, 153, 184, 0.45)",
  glassPink: "rgba(233, 30, 99, 0.12)",
  glassPinkBorder: "rgba(233, 30, 99, 0.35)",
  glassPinkGlow: "rgba(233, 30, 99, 0.45)",
  glassYellow: "rgba(249, 168, 37, 0.18)",
  glassYellowBorder: "rgba(249, 168, 37, 0.40)",
  glassYellowGlow: "rgba(249, 168, 37, 0.50)",
  glassPurple: "rgba(94, 53, 177, 0.12)",
  glassPurpleBorder: "rgba(94, 53, 177, 0.35)",
  glassPurpleGlow: "rgba(94, 53, 177, 0.45)",
  glassGreen: "rgba(0, 161, 82, 0.12)",
  glassGreenBorder: "rgba(0, 161, 82, 0.35)",
  glassGreenGlow: "rgba(0, 161, 82, 0.45)",
  text: "#0F1626",
  textSecondary: "rgba(15, 22, 38, 0.82)",
  textMuted: "rgba(15, 22, 38, 0.55)",
  textDark: "rgba(0, 0, 0, 0.85)",
  tabBar: "rgba(244, 246, 251, 0.95)",
  tabBarBorder: "rgba(20, 28, 48, 0.10)",
};

export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_KEY = '@zomi_theme_mode';

let asyncStorageModule: typeof import('@react-native-async-storage/async-storage').default | null = null;
const getAsyncStorage = async () => {
  if (asyncStorageModule) return asyncStorageModule;
  try {
    const m = await import('@react-native-async-storage/async-storage');
    asyncStorageModule = m.default;
    return asyncStorageModule;
  } catch {
    return null;
  }
};

const defaultThemeValue = {
  colors: darkColors,
  mode: 'dark' as ThemeMode,
  isDark: true,
  setMode: (_m: ThemeMode) => {},
  toggle: () => {},
};

export const [ThemeProvider, useTheme] = createContextHook(() => {
  const initialSystemDark = Platform.OS === 'web'
    ? (typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : true)
    : (Appearance.getColorScheme?.() ?? 'dark') === 'dark';

  const [mode, setModeState] = useState<ThemeMode>('system');
  const [systemIsDark, setSystemIsDark] = useState<boolean>(initialSystemDark);

  // Load persisted mode once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const storage = await getAsyncStorage();
      if (!storage) return;
      try {
        const v = await storage.getItem(THEME_KEY);
        if (!cancelled && (v === 'light' || v === 'dark' || v === 'system')) {
          setModeState(v);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  // Track system appearance changes.
  useEffect(() => {
    const sub = Appearance.addChangeListener?.(({ colorScheme }) => {
      setSystemIsDark((colorScheme ?? 'dark') === 'dark');
    });
    return () => { try { sub?.remove?.(); } catch {} };
  }, []);

  // Track system appearance changes on web (cross-browser).
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (event: MediaQueryListEvent) => setSystemIsDark(event.matches);
    query.addEventListener('change', handler);
    return () => query.removeEventListener('change', handler);
  }, []);

  const isDark = useMemo(() => {
    if (mode === 'system') return systemIsDark;
    return mode === 'dark';
  }, [mode, systemIsDark]);

  const colors = useMemo<ThemeColors>(() => (isDark ? darkColors : lightColors), [isDark]);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    (async () => {
      const storage = await getAsyncStorage();
      try { await storage?.setItem(THEME_KEY, m); } catch {}
    })();
  }, []);

  const toggle = useCallback(() => {
    setMode(isDark ? 'light' : 'dark');
  }, [isDark, setMode]);

  return { colors, mode, isDark, setMode, toggle };
}, defaultThemeValue);

export const useThemeColors = (): ThemeColors => {
  const theme = useTheme();
  return theme?.colors || darkColors;
};

export const getSafeColors = (): ThemeColors => darkColors;
