export const COLORS = {
  // Google Stitch "Espresso Dark & Vibrant" Theme Tokens (project 15749099382889688163)
  primary: '#22D3EE',       // Vibrant Cyan
  primaryLight: '#102A33',  // Deep Cyan tint for pills/active tabs
  primarySoft: '#164E63',
  primaryDark: '#0891B2',
  secondary: '#10B981',     // Vibrant Emerald
  secondaryLight: '#0E2E26',
  accent: '#F59E0B',        // Warm Amber/Gold

  success: '#10B981',
  successLight: '#0E2E26',
  warning: '#F59E0B',
  warningLight: '#33240F',
  danger: '#F43F5E',        // Vibrant Rose/Red
  dangerLight: '#36131D',

  background: '#120F0D',    // Espresso Dark Background
  surface: '#1D1815',       // Espresso Card Surface
  surfaceAlt: '#27201C',    // Espresso Input / Inner Card

  textPrimary: '#F5F5F4',   // Crisp Warm White
  textSecondary: '#C4BBB4', // Soft Warm Gray
  textMuted: '#8C827B',     // Muted Espresso Gray
  textInverse: '#0B1115',   // Dark text on bright cyan buttons

  border: '#322924',        // Subtle Espresso Border
  divider: '#29221E',
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
  md: 8,
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
