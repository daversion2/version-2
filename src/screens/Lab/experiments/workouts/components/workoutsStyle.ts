import { StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../../../constants/theme';
import { MINI_APPS } from '../../../../../services/miniApps';

/** The one colour the Workouts app overrides (its manifest accent). */
export const WORKOUTS_ACCENT = MINI_APPS.workouts.accent;
export const WORKOUTS_TINT = WORKOUTS_ACCENT + '14';

/** Shared bits of the Workouts look, so seven screens don't drift apart. */
export const ws = StyleSheet.create({
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
  body: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark },
  muted: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray },
  primaryBtn: {
    backgroundColor: WORKOUTS_ACCENT,
    borderRadius: BorderRadius.full,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.white },
  secondaryBtn: {
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: WORKOUTS_ACCENT,
    backgroundColor: Colors.white,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.sm, color: WORKOUTS_ACCENT },
  disabled: { opacity: 0.45 },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  chipActive: { borderColor: WORKOUTS_ACCENT, backgroundColor: WORKOUTS_ACCENT },
  chipText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.dark },
  chipTextActive: { color: Colors.white },
  headerIconBtn: { paddingHorizontal: 6, paddingVertical: 4 },
});
