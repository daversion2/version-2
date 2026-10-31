// Neuro-Nudge Brand Theme
// Colors from brand guidelines
export const Colors = {
  primary: '#217180',       // Teal
  secondary: '#FF5B02',     // Orange
  dark: '#2B2B2B',          // Near-black
  gray: '#656565',          // Medium gray
  white: '#FFFFFF',         // White
  lightGray: '#F2F2F2',     // Background gray
  overlay: 'rgba(0,0,0,0.5)',
  success: '#217180',
  fail: '#FF5B02',
  danger: '#C62828',        // Destructive actions only (account deletion)
  cardBg: '#FFFFFF',
  border: '#E0E0E0',
  /** Secondary text a step darker than `gray` (subtitles, legend labels). */
  label2: '#4A4A4A',
  /** Hairlines between rows in a grouped list. */
  separator: '#E0E0E0',
  /** Track behind a ring or bar, a segmented control's background. */
  fill: '#EEEEEE',
  /** Stack header background. */
  headerBg: '#FBFBFB',
  /** Background of full-screen step flows (StepFlowShell). */
  surfaceSubtle: '#FAFBFC',
};

// One colour per mini-app: rings, icons and that app's charts. Six-digit hex
// only, like CategoryColors. Meals' blue is the founder's pick (2026-10-31).
export const AppColors = {
  meditate: '#217180',
  workouts: '#F2600C',
  meals: '#1F4FA8',
};

// Habit-category accents. Six-digit hex only: screens append an alpha suffix
// (`color + '1A'`) for tinted chip backgrounds.
export const CategoryColors = {
  move: '#217180',
  fuel: '#B7791F',
  sleep: '#3949AB',
  mind: '#7B1FA2',
  focus: '#FF5B02',
  money: '#2E7D32',
};

// Font families from brand guidelines
// Primary: Garet, Secondary: Avenir, Complementary: Racing Sans One
export const Fonts = {
  primary: 'Garet',
  primaryBold: 'Garet-Bold',
  secondary: 'Avenir',
  secondaryBold: 'Avenir-Bold',
  accent: 'RacingSansOne',
};

export const FontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  hero: 34,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

// Apple's text styles, for the redesign's shared pieces (ListGroup,
// SegmentedControl, …), in the brand font. The redesign keeps the brand fonts
// (founder, 2026-10-31). Avenir is a real iOS family, so fontWeight picks the
// matching face (700 → Avenir Heavy).
const brand = Fonts.secondary;
export const TextStyles = {
  largeTitle: { fontFamily: brand, fontSize: 34, lineHeight: 41, fontWeight: '700' },
  title1: { fontFamily: brand, fontSize: 28, lineHeight: 34, fontWeight: '700' },
  title2: { fontFamily: brand, fontSize: 22, lineHeight: 28, fontWeight: '700' },
  title3: { fontFamily: brand, fontSize: 20, lineHeight: 25, fontWeight: '600' },
  headline: { fontFamily: brand, fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontFamily: brand, fontSize: 17, lineHeight: 22, fontWeight: '400' },
  callout: { fontFamily: brand, fontSize: 16, lineHeight: 21, fontWeight: '400' },
  subhead: { fontFamily: brand, fontSize: 15, lineHeight: 20, fontWeight: '400' },
  footnote: { fontFamily: brand, fontSize: 13, lineHeight: 18, fontWeight: '400' },
  caption: { fontFamily: brand, fontSize: 12, lineHeight: 16, fontWeight: '400' },
} as const;

// =============================================================================
// THE REDESIGN (Admin → Lab → "Apple-style redesign"; design canvas
// https://claude.ai/artifact/AR5aQji6PnQTb7zmLLxryG).
//
// Every screen reads Colors/BorderRadius when its module first loads, so the
// switch can't flip live. utils/redesign.ts writes these values over the
// objects above at startup, before any screen loads (App.tsx), and only for an
// admin who has the switch on. Everyone else never sees them. Fonts stay the
// brand's: the founder tried the system font and reverted it (2026-10-31).
// =============================================================================

export const REDESIGN = {
  colors: {
    dark: '#000000',
    gray: '#6C6C70',
    lightGray: '#F2F2F7',
    border: '#E5E5EA',
    label2: '#3A3A3C',
    separator: '#C6C6C8',
    fill: '#E3E3E8',
    headerBg: '#F2F2F7',
    surfaceSubtle: '#F2F2F7',
  } satisfies Partial<typeof Colors>,
  radius: {
    sm: 10,
    md: 14,
    lg: 22,
    xl: 28,
  } satisfies Partial<typeof BorderRadius>,
};
