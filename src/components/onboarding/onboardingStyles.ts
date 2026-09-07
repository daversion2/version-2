import { StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';

/**
 * Type and surface styles shared by the five onboarding beats, so the flow reads
 * as one screen rather than five that happen to be adjacent. Beat-specific
 * styling stays in the beat's own file.
 */
export const ob = StyleSheet.create({
  eyebrow: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.primary,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: Spacing.md,
  },
  headline: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.dark,
    lineHeight: 34,
    marginBottom: Spacing.md,
  },
  headlineAccent: { color: Colors.secondary },
  body: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    lineHeight: 24,
    marginBottom: Spacing.md,
  },
  bodyStrong: { fontFamily: Fonts.secondaryBold, color: Colors.dark },
  label: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  helper: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    lineHeight: 18,
  },
  /** A settings block within a beat, divided from the one above it. */
  field: {
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  fieldFirst: { borderTopWidth: 0, paddingTop: Spacing.xs },
  /** Selectable row/chip in its resting state. */
  choice: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
  },
  choiceOn: { borderColor: Colors.primary, backgroundColor: Colors.primary + '0D' },
});
