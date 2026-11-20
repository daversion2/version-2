import { StyleSheet } from 'react-native';
import { BorderRadius, Colors, Fonts, FontSizes, Spacing } from '../../../../../constants/theme';
import { MINI_APPS } from '../../../../../services/miniApps';
import { RESISTANCE_LEVELS } from '../../../../../constants/resistance';
import { PAIN_ITEM } from '../../../../../data/painPlan';
import type { PainItemId } from '../../../../../types/pain';

/** The one colour Back Pain overrides (its manifest accent). */
export const PAIN_ACCENT = MINI_APPS.pain.accent;

/** A day's rating as words ("Easy today"), for a row's subtitle. */
export const ratingLabel = (r?: 1 | 2 | 3): string | undefined => RESISTANCE_LEVELS.find((l) => l.value === r)?.label;

/** "Walk, Core strength". */
export const itemTitles = (ids: PainItemId[]): string => ids.map((id) => PAIN_ITEM[id].title).join(', ');

/** Shared bits of the Back Pain look: the Meals/Meditate light theme, one accent. */
export const ps = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md },
  center: { alignItems: 'center', justifyContent: 'center' },
  centerText: { textAlign: 'center' },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flex: { flex: 1 },
  title: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.dark },
  bigTitle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xl, color: Colors.dark },
  body: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark, lineHeight: 20 },
  muted: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray, lineHeight: 17 },
  label: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.gray },
  primaryBtn: {
    backgroundColor: PAIN_ACCENT,
    borderRadius: BorderRadius.full,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnOff: { opacity: 0.4 },
  primaryBtnText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.white },
  secondaryBtn: {
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: PAIN_ACCENT,
    backgroundColor: Colors.white,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.sm, color: PAIN_ACCENT },
  textBtn: { alignSelf: 'center', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md },
  textBtnText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray },
  link: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: PAIN_ACCENT },
  headerIconBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  tag: {
    alignSelf: 'flex-start',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    backgroundColor: PAIN_ACCENT + '1A',
  },
  tagText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: PAIN_ACCENT },
});
