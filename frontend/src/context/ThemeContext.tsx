'use client';

import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  brandYellow: string;
  brandYellowHover: string;
  brandYellowLight: string;
  brandYellowDark: string;
  brandBlack: string;
  brandWhite: string;
  background: string;
  backgroundSecondary: string;
  surface: string;
  surfaceElevated: string;
  surfaceSubtle: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textOnYellow: string;
  textOnDark: string;
  border: string;
  borderSubtle: string;
  borderStrong: string;
  borderFocus: string;
  primary: string;
  primaryHover: string;
  primaryText: string;
  secondary: string;
  secondaryHover: string;
  secondaryText: string;
  accent: string;
  accentText: string;
  navbarBg: string;
  navbarText: string;
  navbarSubtext: string;
  navbarBorder: string;
  navbarActiveIndicator: string;
  cardBg: string;
  cardBorder: string;
  cardShadow: string;
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  danger: string;
  dangerBg: string;
  info: string;
  infoBg: string;
  brandHoney: string;
  brandHoneyLight: string;
  brandHoneyDark: string;
  brandAmber: string;
  brandCream: string;
  surfaceWarm: string;
  honeyBorder: string;
  textCharcoal: string;
  textCharcoalMuted: string;
}

export interface ThemeTokens {
  mode: ThemeMode;
  colors: ThemeColors;
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  radii: {
    sm: number;
    md: number;
    lg: number;
    full: number;
  };
}

export const lightColors: ThemeColors = {
  brandYellow: '#FFC700',
  brandYellowHover: '#E5B300',
  brandYellowLight: '#FFF8E1',
  brandYellowDark: '#C79A00',
  brandBlack: '#121212',
  brandWhite: '#FFFFFF',
  background: '#FFFDF9',
  backgroundSecondary: '#FFF9ED',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceSubtle: '#FFF5DC',
  textPrimary: '#1E1B18',
  textSecondary: '#6B655B',
  textMuted: '#9E988D',
  textOnYellow: '#121212',
  textOnDark: '#FFFFFF',
  border: '#F0E5D0',
  borderSubtle: '#F9F1E2',
  borderStrong: '#D6C8AC',
  borderFocus: '#F59E0B',
  primary: '#F59E0B',
  primaryHover: '#D97706',
  primaryText: '#FFFFFF',
  secondary: '#FFF3D6',
  secondaryHover: '#FDE4A8',
  secondaryText: '#854D0E',
  accent: '#10B981',
  accentText: '#FFFFFF',
  navbarBg: '#18181B',
  navbarText: '#F4F4F5',
  navbarSubtext: '#A1A1AA',
  navbarBorder: '#27272A',
  navbarActiveIndicator: '#F59E0B',
  cardBg: '#FFFFFF',
  cardBorder: '#F0E5D0',
  cardShadow: 'rgba(245, 158, 11, 0.08)',
  success: '#10B981',
  successBg: '#ECFDF5',
  warning: '#F59E0B',
  warningBg: '#FFFBEB',
  danger: '#EF4444',
  dangerBg: '#FEF2F2',
  info: '#3B82F6',
  infoBg: '#EFF6FF',
  brandHoney: '#F59E0B',
  brandHoneyLight: '#FFFBEB',
  brandHoneyDark: '#B45309',
  brandAmber: '#D97706',
  brandCream: '#FFFDF7',
  surfaceWarm: '#FFFBF0',
  honeyBorder: '#FDE68A',
  textCharcoal: '#1E1B18',
  textCharcoalMuted: '#6B655B',
};

export const darkColors: ThemeColors = {
  brandYellow: '#FFC700',
  brandYellowHover: '#E5B300',
  brandYellowLight: '#3D3100',
  brandYellowDark: '#C79A00',
  brandBlack: '#121212',
  brandWhite: '#FFFFFF',
  background: '#0F0E0D',
  backgroundSecondary: '#171513',
  surface: '#1A1816',
  surfaceElevated: '#24211D',
  surfaceSubtle: '#2E2A24',
  textPrimary: '#FAFAF9',
  textSecondary: '#A8A29E',
  textMuted: '#78716C',
  textOnYellow: '#121212',
  textOnDark: '#FFFFFF',
  border: '#38332D',
  borderSubtle: '#292520',
  borderStrong: '#574F46',
  borderFocus: '#F59E0B',
  primary: '#F59E0B',
  primaryHover: '#D97706',
  primaryText: '#121212',
  secondary: '#2E2A24',
  secondaryHover: '#3D372E',
  secondaryText: '#FDE68A',
  accent: '#10B981',
  accentText: '#FFFFFF',
  navbarBg: '#121110',
  navbarText: '#FAFAF9',
  navbarSubtext: '#A8A29E',
  navbarBorder: '#292520',
  navbarActiveIndicator: '#F59E0B',
  cardBg: '#1A1816',
  cardBorder: '#38332D',
  cardShadow: 'rgba(0, 0, 0, 0.5)',
  success: '#34D399',
  successBg: '#064E3B',
  warning: '#FBBF24',
  warningBg: '#78350F',
  danger: '#F87171',
  dangerBg: '#7F1D1D',
  info: '#60A5FA',
  infoBg: '#1E3A8A',
  brandHoney: '#F59E0B',
  brandHoneyLight: '#3E3204',
  brandHoneyDark: '#D97706',
  brandAmber: '#D97706',
  brandCream: '#121110',
  surfaceWarm: '#1C1917',
  honeyBorder: '#3E3204',
  textCharcoal: '#FFFFFF',
  textCharcoalMuted: '#A1A1AA',
};

const commonSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

const commonRadii = {
  sm: 6,
  md: 10,
  lg: 16,
  full: 9999,
};

export const lightTheme: ThemeTokens = {
  mode: 'light',
  colors: lightColors,
  spacing: commonSpacing,
  radii: commonRadii,
};

export const darkTheme: ThemeTokens = {
  mode: 'dark',
  colors: darkColors,
  spacing: commonSpacing,
  radii: commonRadii,
};

export interface ThemeContextValue {
  mode: ThemeMode;
  isDark: boolean;
  theme: ThemeTokens;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
}

const defaultContextValue: ThemeContextValue = {
  mode: 'light',
  isDark: false,
  theme: lightTheme,
  toggleTheme: () => {},
  setMode: () => {},
};

export const ThemeContext = createContext<ThemeContextValue>(defaultContextValue);

export const ThemeProvider: React.FC<{
  children: React.ReactNode;
  initialMode?: ThemeMode;
}> = ({ children, initialMode = 'light' }) => {
  const [mode, setModeState] = useState<ThemeMode>(initialMode);

  const toggleTheme = useCallback(() => {
    setModeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
  }, []);

  const isDark = mode === 'dark';
  const theme = useMemo(() => (isDark ? darkTheme : lightTheme), [isDark]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      isDark,
      theme,
      toggleTheme,
      setMode,
    }),
    [mode, isDark, theme, toggleTheme, setMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  return context ?? defaultContextValue;
};
