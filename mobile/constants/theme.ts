// Catalyst AI — Premium Design System v2
// Style: iOS / Stripe / Linear — clean, minimal, trustworthy, warm

export const brand = {
  navy:      '#1E3A5F',   // Primary brand color
  navyLight: '#EEF4FF',
  navyMid:   '#DBEAFE',
};

export const colors = {
  // Backgrounds — warm white feel
  background:       '#F8F9FB',   // Very light warm gray
  surface:          '#FFFFFF',
  surfaceSecondary: '#F1F4F8',   // Slightly blue-tinted for cards
  surfaceAccent:    '#EEF4FF',   // Light brand tint for special areas
  card:             '#FFFFFF',

  // Borders & Dividers
  border:      '#E4E8EF',
  borderLight: '#F0F4FA',
  divider:     '#EEF1F6',

  // Text
  text:          '#0F172A',   // Richer dark for headings
  textSecondary: '#64748B',
  textMuted:     '#94A3B8',
  textInverse:   '#FFFFFF',

  // Brand
  brand:      '#1E3A5F',
  brandLight: '#EEF4FF',
  brandMid:   '#DBEAFE',

  // Semantic Colors
  primary:      '#2563EB',   // Blue — informational, CTA
  primaryLight: '#EFF6FF',
  primaryMid:   '#DBEAFE',

  success:      '#059669',   // Green — opportunity, success
  successLight: '#ECFDF5',
  successMid:   '#A7F3D0',

  warning:      '#D97706',   // Amber — warning, medium
  warningLight: '#FFFBEB',
  warningMid:   '#FDE68A',

  danger:      '#DC2626',    // Red — critical, risk
  dangerLight: '#FEF2F2',
  dangerMid:   '#FECACA',

  purple:      '#7C3AED',    // Purple — trace, insights
  purpleLight: '#F5F3FF',
  purpleMid:   '#EDE9FE',

  teal:        '#0891B2',    // Teal — trends, data
  tealLight:   '#ECFEFF',
  tealMid:     '#CFFAFE',

  // Tab bar
  tabActive:   '#1E3A5F',   // Brand navy — authoritative
  tabInactive: '#94A3B8',
  tabBar:      '#FFFFFF',
};

export const spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
};

export const radius = {
  xs:    4,
  sm:    8,
  md:    12,
  lg:    16,
  xl:    20,
  xxl:   28,
  round: 999,
};

export const typography = {
  largeTitle: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  h1:         { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  h2:         { fontSize: 18, fontWeight: '600' as const, letterSpacing: -0.2 },
  h3:         { fontSize: 15, fontWeight: '600' as const },
  body:       { fontSize: 14, fontWeight: '400' as const, lineHeight: 22 },
  bodyMedium: { fontSize: 14, fontWeight: '500' as const },
  caption:    { fontSize: 12, fontWeight: '400' as const, lineHeight: 18 },
  label:      { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.3 },
  micro:      { fontSize: 10, fontWeight: '500' as const, letterSpacing: 0.5 },
};

export const shadows = {
  sm: {
    shadowColor: '#1E3A5F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#1E3A5F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.09,
    shadowRadius: 10,
    elevation: 4,
  },
  lg: {
    shadowColor: '#1E3A5F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  glow: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  card: {
    shadowColor: '#1E3A5F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryGlow: '#EFF6FF',
};

// Legacy compat exports
export const cardBorder = colors.border;
