import { StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../../../constants/theme';
import { MINI_APPS } from '../../../../../services/miniApps';
import type { ItemState, DayStatus } from '../../../../../services/mealsMath';

/** The one colour the Meals app overrides (its manifest accent: the Fuel category's). */
export const MEALS_ACCENT = MINI_APPS.meals.accent;
export const MEALS_TINT = MEALS_ACCENT + '14';

export const PASS_COLOR = Colors.success;
export const FAIL_COLOR = Colors.fail;

/** Fill for a plate's dot. */
export const itemColor = (state: ItemState): string =>
  state === 'pass' ? PASS_COLOR : state === 'fail' ? FAIL_COLOR : Colors.border;

export const itemGlyph = (state: ItemState): string =>
  state === 'pass' ? '✓' : state === 'fail' ? '✕' : state === 'skipped' ? '–' : '';

export const STATUS_TITLE: Record<DayStatus, string> = {
  on: 'On target',
  off: 'Off target',
  pending: 'In progress',
};

/** Shared bits of the Meals look — the app's own light theme, one accent. */
export const mls = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md },
  sectionLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Colors.gray,
    marginTop: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  title: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.dark },
  body: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark, lineHeight: 20 },
  muted: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray, lineHeight: 17 },
  primaryBtn: {
    backgroundColor: MEALS_ACCENT,
    borderRadius: BorderRadius.full,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.white },
  secondaryBtn: {
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: MEALS_ACCENT,
    backgroundColor: Colors.white,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.sm, color: MEALS_ACCENT },
  textBtn: { alignSelf: 'center', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md },
  textBtnText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray },
  link: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: MEALS_ACCENT },
  disabled: { opacity: 0.45 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  chipActive: { borderColor: MEALS_ACCENT, backgroundColor: MEALS_ACCENT },
  chipText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.dark },
  chipTextActive: { color: Colors.white },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  headerIconBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.white },
});
