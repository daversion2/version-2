import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';

interface HeroStatsRowProps {
  completions: number;
  points: number;
  currentStreak: number;
  daysActive: number;
}

export const HeroStatsRow: React.FC<HeroStatsRowProps> = ({
  completions,
  points,
  currentStreak,
  daysActive,
}) => {
  const stats = [
    { value: completions, label: 'Completions' },
    { value: points, label: 'Points' },
    { value: currentStreak, label: 'Streak' },
    { value: daysActive, label: 'Active Days' },
  ];

  return (
    <View style={styles.container}>
      {stats.map((stat) => (
        <View key={stat.label} style={styles.statCard}>
          <Text style={styles.value}>
            {stat.value >= 1000 ? `${(stat.value / 1000).toFixed(1)}k` : stat.value}
          </Text>
          <Text style={styles.label}>{stat.label}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
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
    fontSize: FontSizes.xs - 1,
    color: Colors.gray,
    textAlign: 'center',
  },
});
