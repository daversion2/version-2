import { StyleSheet } from 'react-native';
import { AppColors, BorderRadius, CategoryColors, Colors, Spacing, TextStyles } from '../../../../../constants/theme';
import type { DayStatus } from '../../../../../services/mealsMath';
import type { NutrientId } from '../../../../../types/meals';

/**
 * The one colour the Meals app overrides. Meals' blue since the Apple-style
 * redesign (2026-11-01), so the app matches its ring on Today; it was the Fuel
 * category's amber (still the manifest accent, MINI_APPS.meals.accent).
 */
export const MEALS_ACCENT = AppColors.meals;
export const MEALS_TINT = MEALS_ACCENT + '14';

export const PASS_COLOR = Colors.success;
export const FAIL_COLOR = Colors.fail;

/**
 * Nutrient tags borrow category colours (Sleep, Money, Mind, Fuel) so they can
 * never be read as pass (teal) or fail (orange).
 */
export const NUTRIENT_COLOR: Record<NutrientId, string> = {
  protein: CategoryColors.sleep,
  fiber: CategoryColors.money,
  fats: CategoryColors.mind,
  carbs: CategoryColors.fuel,
};

/** Lives in utils so Today's servings treemap can use it without loading the Lab. */
export { scoreColor } from '../../../../../utils/scoreColor';

export const STATUS_TITLE: Record<DayStatus, string> = {
  on: 'On target',
  off: 'Off target',
  pending: 'In progress',
  none: 'No plates',
};

/**
 * Shared bits of the Meals look, in the Apple-style redesign (canvas "Inside
 * Meals", 2026-10-31): white rounded panels on iOS grey, Apple's text styles
 * in the brand font, one accent. Grouped lists, the segmented control and the
 * stepper come from components/common.
 */
export const mls = StyleSheet.create({
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
  /** A plain line of explanation between panels. */
  lead: { ...TextStyles.subhead, color: Colors.label2, paddingHorizontal: 4 },
  primaryBtn: {
    backgroundColor: MEALS_ACCENT,
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
  secondaryBtnText: { ...TextStyles.headline, color: MEALS_ACCENT },
  textBtn: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.md },
  textBtnText: { ...TextStyles.body, color: Colors.gray },
  link: { ...TextStyles.subhead, color: MEALS_ACCENT },
  /** A centred accent link standing on its own, e.g. "What counts as what?". */
  linkBtn: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.sm },
  destructiveText: { ...TextStyles.body, color: Colors.danger },
  disabled: { opacity: 0.45 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: 14,
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: Colors.cardBg,
  },
  chipActive: { backgroundColor: MEALS_ACCENT },
  chipText: { ...TextStyles.subhead, color: Colors.dark },
  chipTextActive: { color: Colors.white, fontWeight: '600' },
  input: {
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    minHeight: 48,
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
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotText: { ...TextStyles.footnote, fontWeight: '600', color: Colors.white },
});
