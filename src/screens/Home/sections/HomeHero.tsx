import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, FontSizes, Spacing } from '../../../constants/theme';
import { HomeSectionProps } from './types';

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const formatToday = (): string =>
  new Date()
    .toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
    .toUpperCase();

/**
 * Full-bleed teal hero header for the home screen: greeting, a one-line nudge,
 * and three at-a-glance stats (streak / reps this week / points). Uses negative
 * margins to break out of the ScrollView's padding so it reaches the screen
 * edges, and the safe-area top inset to clear the status bar.
 */
export const HomeHero: React.FC<HomeSectionProps> = React.memo(({ data }) => {
  const insets = useSafeAreaInsets();
  const { habits, weeklyCounts, willpowerStats, userName } = data;

  const weeklyReps = useMemo(
    () => habits.reduce((n, h) => n + (weeklyCounts[h.id] ?? 0), 0),
    [weeklyCounts, habits]
  );
  const streak = willpowerStats?.currentStreak ?? 0;
  const points = willpowerStats?.totalPoints ?? 0;

  const sub = 'Do something challenging today.';

  return (
    <View style={[styles.hero, { paddingTop: insets.top + Spacing.md }]}>
      <Text style={styles.date}>{formatToday()}</Text>
      <Text style={styles.greeting}>
        {getGreeting()}
        {userName ? `, ${userName}` : ''}
      </Text>
      <Text style={styles.sub}>{sub}</Text>

      <View style={styles.statRow}>
        <Stat n={`${streak}🔥`} l="Day streak" />
        <Stat n={`${weeklyReps}`} l="Reps this week" />
        <Stat n={`${points}`} l="XP" />
      </View>
    </View>
  );
});

const Stat: React.FC<{ n: string; l: string }> = ({ n, l }) => (
  <View style={styles.stat}>
    <Text style={styles.statNum}>{n}</Text>
    <Text style={styles.statLabel}>{l}</Text>
  </View>
);

const styles = StyleSheet.create({
  hero: {
    backgroundColor: Colors.primary,
    // Break out of the ScrollView's Spacing.lg content padding to go full-bleed.
    marginTop: -Spacing.lg,
    marginHorizontal: -Spacing.lg,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  date: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    letterSpacing: 0.6,
    color: 'rgba(255,255,255,0.85)',
  },
  greeting: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.white,
    marginTop: 4,
  },
  sub: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.9)',
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
  statRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  stat: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 14,
    paddingVertical: Spacing.sm + 1,
    paddingHorizontal: Spacing.sm + 2,
  },
  statNum: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg, color: Colors.white },
  statLabel: {
    fontFamily: Fonts.secondary,
    fontSize: 10.5,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
});
