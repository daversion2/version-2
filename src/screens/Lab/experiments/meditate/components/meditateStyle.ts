import { StyleSheet } from 'react-native';
import { BorderRadius, Colors, Spacing, TextStyles } from '../../../../../constants/theme';
import { MINI_APPS } from '../../../../../services/miniApps';

/** The one colour the Meditate app overrides (its manifest accent). */
export const MEDITATE_ACCENT = MINI_APPS.meditate.accent;
export const MEDITATE_TINT = MEDITATE_ACCENT + '14';

/**
 * Shared bits of the Meditate look, in the Apple-style redesign (canvas
 * "Inside Meditate", 2026-10-31): white rounded panels on iOS grey, Apple's
 * text styles in the brand font, one accent. Grouped lists and the segmented
 * control come from components/common (ListGroup, SegmentedControl, Stepper).
 */
export const ms = StyleSheet.create({
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
  title: { ...TextStyles.headline, color: Colors.dark },
  body: { ...TextStyles.body, color: Colors.dark },
  muted: { ...TextStyles.footnote, color: Colors.gray },
  /** One line under a control, e.g. the mode's blurb. */
  lead: { ...TextStyles.subhead, color: Colors.label2, paddingHorizontal: 4 },
  primaryBtn: {
    backgroundColor: MEDITATE_ACCENT,
    borderRadius: 26,
    height: 52,
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
  secondaryBtnText: { ...TextStyles.headline, color: MEDITATE_ACCENT },
  textBtn: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.md },
  textBtnText: { ...TextStyles.body, color: Colors.gray },
  /** An accent text link, e.g. "Log a past session". */
  link: { ...TextStyles.subhead, color: MEDITATE_ACCENT },
  destructiveText: { ...TextStyles.body, color: Colors.danger },
  disabled: { opacity: 0.45 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: 14,
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: Colors.fill,
  },
  chipActive: { backgroundColor: MEDITATE_ACCENT },
  chipText: { ...TextStyles.subhead, fontWeight: '500', color: Colors.dark },
  chipTextActive: { color: Colors.white, fontWeight: '600' },
  input: {
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 12,
    minHeight: 44,
    ...TextStyles.body,
    color: Colors.dark,
  },
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
