import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  // Beeline brand colors (Yellow / Black / White identity)
  brandYellow: string;
  brandYellowHover: string;
  brandYellowLight: string;
  brandYellowDark: string;
  brandBlack: string;
  brandWhite: string;

  // Semantic surfaces & backgrounds
  background: string;
  backgroundSecondary: string;
  surface: string;
  surfaceElevated: string;
  surfaceSubtle: string;

  // Text tokens
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textOnYellow: string;
  textOnDark: string;

  // Borders & Dividers
  border: string;
  borderSubtle: string;
  borderStrong: string;
  borderFocus: string;

  // Buttons & Interactive
  primary: string;
  primaryHover: string;
  primaryText: string;
  secondary: string;
  secondaryHover: string;
  secondaryText: string;
  accent: string;
  accentText: string;

  // Navbar tokens
  navbarBg: string;
  navbarText: string;
  navbarSubtext: string;
  navbarBorder: string;
  navbarActiveIndicator: string;

  // Cards
  cardBg: string;
  cardBorder: string;
  cardShadow: string;

  // Status / Feedback
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  danger: string;
  dangerBg: string;
  info: string;
  infoBg: string;
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
  brandYellowHover: '#E5B200',
  brandYellowLight: '#FEF9C3',
  brandYellowDark: '#CA8A04',
  brandBlack: '#000000',
  brandWhite: '#FFFFFF',

  background: '#FFFFFF',
  backgroundSecondary: '#F8F9FA',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceSubtle: '#F4F4F5',

  textPrimary: '#000000',
  textSecondary: '#3F3F46',
  textMuted: '#71717A',
  textOnYellow: '#000000',
  textOnDark: '#FFFFFF',

  border: '#E4E4E7',
  borderSubtle: '#F4F4F5',
  borderStrong: '#000000',
  borderFocus: '#FFC700',

  primary: '#FFC700',
  primaryHover: '#E5B200',
  primaryText: '#000000',
  secondary: '#000000',
  secondaryHover: '#27272A',
  secondaryText: '#FFFFFF',
  accent: '#FFC700',
  accentText: '#000000',

  navbarBg: '#09090B',
  navbarText: '#FFFFFF',
  navbarSubtext: '#A1A1AA',
  navbarBorder: '#27272A',
  navbarActiveIndicator: '#FFC700',

  cardBg: '#FFFFFF',
  cardBorder: '#E4E4E7',
  cardShadow: 'rgba(0, 0, 0, 0.06)',

  success: '#10B981',
  successBg: '#DCFCE7',
  warning: '#F59E0B',
  warningBg: '#FEF3C7',
  danger: '#EF4444',
  dangerBg: '#FEE2E2',
  info: '#3B82F6',
  infoBg: '#DBEAFE',
};

export const darkColors: ThemeColors = {
  brandYellow: '#FFC700',
  brandYellowHover: '#FFD233',
  brandYellowLight: '#3E3204',
  brandYellowDark: '#EAB308',
  brandBlack: '#000000',
  brandWhite: '#FFFFFF',

  background: '#09090B',
  backgroundSecondary: '#121215',
  surface: '#18181B',
  surfaceElevated: '#242428',
  surfaceSubtle: '#1F1F23',

  textPrimary: '#FFFFFF',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  textOnYellow: '#000000',
  textOnDark: '#FFFFFF',

  border: '#27272A',
  borderSubtle: '#1F1F23',
  borderStrong: '#FFC700',
  borderFocus: '#FFC700',

  primary: '#FFC700',
  primaryHover: '#FFD233',
  primaryText: '#000000',
  secondary: '#27272A',
  secondaryHover: '#3F3F46',
  secondaryText: '#FFFFFF',
  accent: '#FFC700',
  accentText: '#000000',

  navbarBg: '#000000',
  navbarText: '#FFFFFF',
  navbarSubtext: '#A1A1AA',
  navbarBorder: '#27272A',
  navbarActiveIndicator: '#FFC700',

  cardBg: '#18181B',
  cardBorder: '#27272A',
  cardShadow: 'rgba(0, 0, 0, 0.4)',

  success: '#34D399',
  successBg: '#064E3B',
  warning: '#FBBF24',
  warningBg: '#78350F',
  danger: '#F87171',
  dangerBg: '#7F1D1D',
  info: '#60A5FA',
  infoBg: '#1E3A8A',
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

export interface ThemeProviderProps {
  children: React.ReactNode;
  initialMode?: ThemeMode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  initialMode = 'light',
}) => {
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
