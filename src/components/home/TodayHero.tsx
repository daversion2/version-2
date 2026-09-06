import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { WeekGlance } from '../../services/habitPace';

interface Props {
  glance: WeekGlance;
  /** First name, when we have one. */
  name?: string;
  /**
   * The one habit worth naming right now, resolved to its display name.
   * Null when every habit is either done for the week or already logged today.
   */
  nextAction?: { habitName: string; reps: number; recovers: boolean } | null;
}

/** "once" / "twice" / "3×" — a count you'd say out loud. */
const timesLabel = (reps: number): string =>
  reps === 1 ? 'once' : reps === 2 ? 'twice' : `${reps}×`;

/**
 * The one line above the list: what to do next, and where the week stands.
 *
 * Deliberately about the WEEK, not the day — every target in the app is weekly,
 * so a daily framing would be measuring something the product doesn't track.
 * Deliberately not streaks or points: attendance was the old headline.
 *
 * The headline is now an ACTION rather than a score. "2 of 6 on pace" is a
 * grade, and a grade is a thing to feel rather than a thing to do; the pace
 * summary is still there, demoted to the line underneath where it belongs.
 */
export const TodayHero: React.FC<Props> = ({ glance, name, nextAction }) => {
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

  // Something is owed today — lead with it. The pace summary moves to the sub
  // line so the screen still says where the week stands, just second.
  if (nextAction) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.eyebrow}>{name ? `Next up, ${name}` : 'Next up'}</Text>
        <Text style={styles.big}>
          {nextAction.habitName} {timesLabel(nextAction.reps)} today
        </Text>
        <Text style={styles.sub}>
          {nextAction.recovers ? 'Puts it back on pace. ' : ''}
          {onPace} of {total} on pace
          {behind > 0 ? ` · ${behind} behind` : ''}
        </Text>
      </View>
    );
  }

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
