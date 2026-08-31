import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { WeekGlance } from '../../services/habitPace';

interface Props {
  glance: WeekGlance;
  /** First name, when we have one. */
  name?: string;
}

/**
 * The one line above the list: where this week stands.
 *
 * Deliberately about the WEEK, not the day — every target in the app is weekly,
 * so a daily framing would be measuring something the product doesn't track.
 * Deliberately not streaks or points: attendance was the old headline.
 */
export const TodayHero: React.FC<Props> = ({ glance, name }) => {
  const { onPace, total, atRisk } = glance;

  if (total === 0) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.big}>Nothing tracked yet</Text>
        <Text style={styles.sub}>Add a habit from the library to get started.</Text>
      </View>
    );
  }

  const allGood = onPace === total;

  return (
    <View style={styles.wrap}>
      <Text style={styles.eyebrow}>{name ? `This week, ${name}` : 'This week'}</Text>
      <Text style={styles.big}>
        {onPace} of {total} on pace
      </Text>
      <Text style={styles.sub}>
        {allGood
          ? 'Everything is where it should be.'
          : atRisk > 0
            ? `${atRisk} can’t reach its target this week.`
            : 'The ones needing attention are at the top.'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginBottom: Spacing.lg },
  eyebrow: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: 2,
  },
  big: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xxl, color: Colors.dark },
  sub: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: 2,
  },
});
