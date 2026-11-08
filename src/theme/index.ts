import { Platform } from 'react-native';

/**
 * Dialed is dark-first: a late-night, "phone glowing in the dark" feel that makes the hot
 * pink to tangerine "signal" gradient pop. Every color the UI uses lives here.
 */
export const Colors = {
  background: '#0B0A12',
  backgroundRaised: '#121019',
  surface: '#17151F',
  surfaceHigh: '#201D2B',
  border: '#2A2735',
  borderStrong: '#3A3648',

  text: '#F5F3FF',
  textMuted: '#A09CB8',
  textFaint: '#6E6A84',
  textOnAccent: '#FFFFFF',

  accent: '#FF4D8D',
  accentPressed: '#E63D7B',
  accentSoft: 'rgba(255, 77, 141, 0.14)',
  violet: '#8B5CFF',
  tangerine: '#FF8A3D',

  success: '#3DDC97',
  successSoft: 'rgba(61, 220, 151, 0.14)',
  warning: '#FFC145',
  danger: '#FF5A6A',
  dangerSoft: 'rgba(255, 90, 106, 0.14)',
} as const;

/** The signature gradient: buttons, highlights and celebration moments. */
export const SignalGradient = [Colors.accent, Colors.tangerine] as const;
/** A cooler variant for backgrounds and glows. */
export const DuskGradient = [Colors.violet, Colors.accent] as const;

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const Radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

/** Bricolage Grotesque for display type, the platform font for body copy. */
export const FontFamily = {
  display: 'BricolageGrotesque_800ExtraBold',
  displayBold: 'BricolageGrotesque_700Bold',
  displayMedium: 'BricolageGrotesque_500Medium',
  body: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
} as const;

export const Type = {
  hero: { fontFamily: FontFamily.display, fontSize: 56, lineHeight: 60, letterSpacing: -1.5 },
  title: { fontFamily: FontFamily.display, fontSize: 34, lineHeight: 38, letterSpacing: -0.8 },
  heading: {
    fontFamily: FontFamily.displayBold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  body: { fontSize: 16, lineHeight: 23 },
  bodyStrong: { fontSize: 16, lineHeight: 23, fontWeight: '600' as const },
  small: { fontSize: 14, lineHeight: 20 },
  caption: { fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
  button: { fontFamily: FontFamily.displayBold, fontSize: 17, letterSpacing: 0.1 },
} as const;

/** Content never stretches wider than this (tablets, web previews). */
export const MaxContentWidth = 480;
