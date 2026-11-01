import { StyleSheet } from 'react-native';
import { BorderRadius, Colors, Fonts, FontSizes, Spacing } from '../../../../../constants/theme';
import { RESISTANCE_LEVELS } from '../../../../../constants/resistance';
import { MINI_APPS } from '../../../../../services/miniApps';
import type { Level } from '../../../../../types/avoidance';

/** The one colour Avoidance Training overrides (its manifest accent). */
export const AVOIDANCE_ACCENT = MINI_APPS.avoidance.accent;
export const AVOIDANCE_TINT = AVOIDANCE_ACCENT + '14';

/** A rating as words: "Easy today", "Took everything I had". */
export const levelLabel = (level?: Level): string | undefined =>
  RESISTANCE_LEVELS.find((l) => l.value === level)?.label;

/** Shared bits of the look: the Meals/Meditate light theme, one accent. */
export const avs = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md },
  center: { alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  eyebrow: {
    fontFamily: Fonts.secondaryBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: AVOIDANCE_ACCENT,
  },
  title: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.dark },
  big: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg, color: Colors.dark, lineHeight: 26 },
  body: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark, lineHeight: 20 },
  muted: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray, lineHeight: 17 },
  primaryBtn: {
    backgroundColor: AVOIDANCE_ACCENT,
    borderRadius: BorderRadius.full,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.white },
  textBtn: { alignSelf: 'center', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md },
  textBtnText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray },
  link: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: AVOIDANCE_ACCENT },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  chipOn: { borderColor: AVOIDANCE_ACCENT, backgroundColor: AVOIDANCE_TINT },
  chipText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.dark },
  headerIconBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
});
