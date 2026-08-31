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
  const { onPace, total, behind, untracked } = glance;

  // No habits at all.
  if (total === 0 && untracked === 0) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.big}>Nothing tracked yet</Text>
        <Text style={styles.sub}>Add a habit from the library to get started.</Text>
      </View>
    );
  }

  // Habits exist but none carries a weekly goal — the state a new account is in,
  // since curated practices are seeded without one. Saying "0 of 0 on pace"
  // would be meaningless, so it asks for the missing piece instead.
  if (total === 0) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.eyebrow}>This week</Text>
        <Text style={styles.big}>
          {untracked} {untracked === 1 ? 'habit' : 'habits'}, no goals yet
        </Text>
        <Text style={styles.sub}>
          Set how many times a week on any habit to start tracking your pace.
        </Text>
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
          : behind === 1
            ? 'One is behind — it’s at the top.'
            : `${behind} are behind — they’re at the top.`}
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
