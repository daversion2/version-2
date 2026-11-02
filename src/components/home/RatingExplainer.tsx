import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BorderRadius, Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { Copy } from '../common/Copy';

/**
 * Shown once, on the first rating sheet after a real session. Onboarding
 * deliberately doesn't demo the rating (founder, 2026-11-01): it explains
 * itself here, the first time the answer is about something that happened.
 * HomeScreen decides when (seen_intros.rating).
 */
export const RatingExplainer: React.FC = () => (
  <View style={styles.box}>
    <Copy id="today.override.explainer" style={styles.text} boldStyle={styles.strong}>
      {'**This is your override, the one question the app asks.** 1 means starting was easy, 3 means it took everything you had. Rate the start, not the session. Be honest: the hard starts are the training, and watching them turn easy is your progress.'}
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
