import { StyleSheet } from 'react-native';
import type { Ionicons } from '@expo/vector-icons';
import { BorderRadius, Colors, Fonts, FontSizes, Spacing, ThermalColors } from '../../../../../constants/theme';
import { MINI_APPS } from '../../../../../services/miniApps';
import type { ThermalKind } from '../../../../../types/hotcold';
import { RESISTANCE_LEVELS } from '../../../../../constants/resistance';

/** A session's rating as words ("Easy today"), for a row's subtitle. */
export const ratingLabel = (r?: 1 | 2 | 3): string | undefined =>
  RESISTANCE_LEVELS.find((l) => l.value === r)?.label;

/** The one colour Hot & Cold overrides (its manifest accent). */
export const HOTCOLD_ACCENT = MINI_APPS.hotcold.accent;

export const KIND_COLOR: Record<ThermalKind, string> = ThermalColors;
export const KIND_ICON: Record<ThermalKind, keyof typeof Ionicons.glyphMap> = {
  cold: 'snow-outline',
  heat: 'flame-outline',
};

/** Shared bits of the Hot & Cold look: the Meals/Meditate light theme, one accent. */
export const hcs = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md },
  center: { alignItems: 'center', justifyContent: 'center' },
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
    backgroundColor: HOTCOLD_ACCENT,
    borderRadius: BorderRadius.full,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.white },
  secondaryBtn: {
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: HOTCOLD_ACCENT,
    backgroundColor: Colors.white,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  secondaryBtnText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.sm, color: HOTCOLD_ACCENT },
  textBtn: { alignSelf: 'center', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md },
  textBtnText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray },
  link: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: HOTCOLD_ACCENT },
  headerIconBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
});
