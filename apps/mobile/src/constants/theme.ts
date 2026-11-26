export const COLORS = {
  // Google Stitch "Smart Neighborhood Community App" Theme Tokens
  primary: '#2563EB',
  primaryLight: '#EFF6FF',
  primarySoft: '#DBEAFE',
  primaryDark: '#1D4ED8',
  secondary: '#0D9488',
  secondaryLight: '#F0FDFA',
  accent: '#F59E0B',

  success: '#0D9488',
  successLight: '#CCFBF1',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEF2F2',

  background: '#FAF8FF',
  surface: '#FFFFFF',
  surfaceAlt: '#F2F3FF',

  textPrimary: '#131B2E',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textInverse: '#FFFFFF',

  border: '#E2E8F0',
  divider: '#F1F5F9',
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const RADIUS = {
  sm: 6,
  md: 8,   // ROUND_EIGHT from Google Stitch
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const TYPOGRAPHY = {
  h1: { fontSize: 24, lineHeight: 32, fontWeight: '700' as const },
  h2: { fontSize: 20, lineHeight: 28, fontWeight: '600' as const },
  h3: { fontSize: 18, lineHeight: 26, fontWeight: '600' as const },
  bodyLarge: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  body: { fontSize: 14, lineHeight: 22, fontWeight: '400' as const },
  caption: { fontSize: 12, lineHeight: 18, fontWeight: '400' as const },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '600' as const },
} as const;
