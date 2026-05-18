export const colors = {
  background: '#0B0F14',
  surface: '#151B24',
  surfaceElevated: '#1E2733',
  primary: '#FF6B35',
  primaryMuted: '#FF6B3540',
  accent: '#00D9A5',
  accentMuted: '#00D9A540',
  text: '#F5F7FA',
  textSecondary: '#8B95A8',
  textTertiary: '#5C677D',
  border: '#2A3544',
  danger: '#FF4757',
  dangerMuted: '#FF475740',
  warning: '#FFB020',
  warningMuted: '#FFB02040',
  success: '#00D9A5',
  successMuted: '#00D9A540',
  info: '#3B82F6',
  infoMuted: '#3B82F640',
  mapRunner: '#00D9A5',
  mapCrew: '#FF6B35',
  mapEvent: '#7B68EE',
  mapPartner: '#FFB020',
};

export const gradients = {
  primary: ['#FF6B35', '#FF8F65'] as const,
  sos: ['#FF4757', '#FF6B81'] as const,
  accent: ['#00D9A5', '#00E6B3'] as const,
  premium: ['#FFD700', '#FFA500'] as const,
};

export const spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
};

export const radius = {
  sm: 8, md: 12, lg: 16, xl: 24, full: 9999,
};

export const elevation = {
  low: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  high: {
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
};

export const animation = {
  spring: { damping: 15, stiffness: 150, mass: 0.8 },
  springLight: { damping: 20, stiffness: 200, mass: 0.5 },
  timing: { duration: 250 },
  fast: { duration: 150 },
};

export const typography = {
  display: { fontSize: 34, fontWeight: '800' as const, letterSpacing: -1 },
  title: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  heading: { fontSize: 20, fontWeight: '600' as const, letterSpacing: -0.3 },
  subheading: { fontSize: 17, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 22 },
  bodySmall: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '500' as const },
  label: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 0.5, textTransform: 'uppercase' as const },
};