import createContextHook from '@nkzw/create-context-hook';
import { useMemo } from 'react';

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

const defaultThemeValue = {
  colors: darkColors,
};

export const [ThemeProvider, useTheme] = createContextHook(() => {
  const colors = useMemo<ThemeColors>(() => darkColors, []);
  return { colors };
}, defaultThemeValue);

export const useThemeColors = (): ThemeColors => {
  const theme = useTheme();
  return theme?.colors || darkColors;
};

export const getSafeColors = (): ThemeColors => darkColors;
