import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BorderRadius, Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { Copy } from '../common/Copy';

/**
 * Shown once, on the first rating sheet after a real session (not a Meals
 * day — this explains the two session ratings). Onboarding
 * deliberately doesn't demo the rating (founder, 2026-11-01): it explains
 * itself here, the first time the answer is about something that happened.
 * HomeScreen decides when (seen_intros.rating).
 */
export const RatingExplainer: React.FC = () => (
  <View style={styles.box}>
    <Copy id="today.override.explainerTwo" style={styles.text} boldStyle={styles.strong}>
      {'**Two honest numbers.** Your **override** is how hard it was to start: 1 easy, 3 took everything. **Push** is how hard you pushed once you were going. Watching hard starts turn easy is your progress; pushing once you’re in is where the work goes.'}
    </Copy>
  </View>
);

const styles = StyleSheet.create({
  box: {
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  text: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark, lineHeight: 20 },
  strong: { fontFamily: Fonts.secondaryBold },
});
