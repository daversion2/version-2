import { StyleSheet } from 'react-native';
import { BorderRadius, Colors, Spacing, TextStyles } from '../../../../../constants/theme';
import { MINI_APPS } from '../../../../../services/miniApps';

/**
 * The one colour the Workouts app overrides (its manifest accent). It stays
 * teal in the redesign, as the canvas has it: white text on Workouts' orange
 * ring colour doesn't pass contrast for buttons.
 */
export const WORKOUTS_ACCENT = MINI_APPS.workouts.accent;
export const WORKOUTS_TINT = WORKOUTS_ACCENT + '14';

/**
 * Shared bits of the Workouts look, so thirty screens don't drift apart. In
 * the Apple-style redesign (canvas "Inside Workouts", 2026-10-31): white
 * rounded panels on iOS grey, Apple's text styles in the brand font, one
 * accent. Grouped lists, the segmented control and the stepper come from
 * components/common.
 */
export const ws = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.xxl, gap: Spacing.md },
  /** A small grey header sitting just above a panel, like ListGroup's title. */
  sectionLabel: {
    ...TextStyles.footnote,
    color: Colors.gray,
    paddingHorizontal: Spacing.md,
    marginBottom: -(Spacing.md - 6),
  },
  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  /** A white panel of rows with hairlines between them (rows bring their own padding). */
  panel: { backgroundColor: Colors.cardBg, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  separator: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.separator },
  title: { ...TextStyles.headline, color: Colors.dark },
  body: { ...TextStyles.subhead, color: Colors.dark },
  muted: { ...TextStyles.footnote, color: Colors.gray },
  /** A plain line of explanation between panels. */
  lead: { ...TextStyles.subhead, color: Colors.label2, paddingHorizontal: 4 },
  /** Small coloured label above a title, e.g. "Strength · week 3 of 6". */
  eyebrow: { ...TextStyles.footnote, fontWeight: '600', color: WORKOUTS_ACCENT },
  primaryBtn: {
    backgroundColor: WORKOUTS_ACCENT,
    borderRadius: 26,
    height: 52,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { ...TextStyles.headline, color: Colors.white },
  secondaryBtn: {
    borderRadius: 26,
    height: 52,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { ...TextStyles.headline, color: WORKOUTS_ACCENT },
  /** A small filled pill, e.g. the "Start" on a workout card. */
  smallBtn: {
    alignSelf: 'flex-start',
    height: 36,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: WORKOUTS_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallBtnText: { ...TextStyles.subhead, fontWeight: '600', color: Colors.white },
  smallBtnQuiet: { backgroundColor: Colors.lightGray },
  smallBtnQuietText: { color: Colors.dark, fontWeight: '500' },
  textBtn: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.md },
  link: { ...TextStyles.subhead, color: WORKOUTS_ACCENT },
  destructiveText: { ...TextStyles.body, color: Colors.danger },
  disabled: { opacity: 0.45 },
  chip: {
    paddingHorizontal: 14,
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: 18,
    // Grey fill, not white: chips sit on both grey screens and white cards.
    backgroundColor: Colors.fill,
  },
  chipActive: { backgroundColor: WORKOUTS_ACCENT },
  chipText: { ...TextStyles.subhead, color: Colors.dark },
  chipTextActive: { color: Colors.white, fontWeight: '600' },
  headerIconBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  /** The pinned bottom area holding a screen's main button. */
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    gap: Spacing.xs,
    backgroundColor: Colors.lightGray,
  },
});
