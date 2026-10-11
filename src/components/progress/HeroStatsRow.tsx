import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Copy } from '../common/Copy';

interface HeroStatsRowProps {
  completions: number;
  points: number;
  currentStreak: number;
  daysActive: number;
}

const formatValue = (value: number): string =>
  value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value);

export const HeroStatsRow: React.FC<HeroStatsRowProps> = ({
  completions,
  points,
  currentStreak,
  daysActive,
}) => {
  const stats: { id: string; value: string; label: string }[] = [
    { id: 'progress.hero.completions', value: formatValue(completions), label: 'Completions' },
    { id: 'progress.hero.xp', value: formatValue(points), label: 'XP' },
    { id: 'progress.hero.streak', value: formatValue(currentStreak), label: 'Streak' },
    { id: 'progress.hero.activedays', value: formatValue(daysActive), label: 'Active Days' },
  ];

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.statCard}>
            <Text style={styles.value}>{stat.value}</Text>
            {/* Four cards share the row. Keep the longest label ("Completions")
              on one line and let it shrink rather than wrap mid-word. */}
            <Copy
              id={stat.id}
              style={styles.label}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {stat.label}
            </Copy>
          </View>
        ))}
      </View>
      {/* Streak comes from the profile, not the log window, so it can't follow
          the filter — say so rather than let it look stuck. */}
      <Copy id="progress.hero.note" style={styles.note}>
        Streak is your current streak. Not affected by the time filter.
      </Copy>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.lg,
  },
  container: {
    flexDirection: 'row',
    gap: Spacing.xs + 1,
  },
  note: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: Spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: 2,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  value: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.primary,
    marginBottom: 2,
  },
  label: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs - 2,
    color: Colors.gray,
    textAlign: 'center',
  },
});
