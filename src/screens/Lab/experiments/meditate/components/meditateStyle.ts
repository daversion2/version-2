import { StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../../../constants/theme';
import { MINI_APPS } from '../../../../../services/miniApps';

/** The one colour the Meditate app overrides (its manifest accent). */
export const MEDITATE_ACCENT = MINI_APPS.meditate.accent;
export const MEDITATE_TINT = MEDITATE_ACCENT + '14';

/** Shared bits of the Meditate look — the app's own light theme, one accent. */
export const ms = StyleSheet.create({
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
    backgroundColor: MEDITATE_ACCENT,
    borderRadius: BorderRadius.full,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.white },
  secondaryBtn: {
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: MEDITATE_ACCENT,
    backgroundColor: Colors.white,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.sm, color: MEDITATE_ACCENT },
  textBtn: { alignSelf: 'center', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md },
  textBtnText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray },
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
  chipActive: { borderColor: MEDITATE_ACCENT, backgroundColor: MEDITATE_ACCENT },
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
});
