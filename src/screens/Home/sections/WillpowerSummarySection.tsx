import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../../../components/common/Card';
import { Colors, Fonts, FontSizes, Spacing } from '../../../constants/theme';
import { HomeSectionProps } from './types';

export const WillpowerSummarySection: React.FC<HomeSectionProps> = ({ data, callbacks }) => {
  const { willpowerStats } = data;
  if (!willpowerStats) return null;

  return (
    <Card
      style={styles.card}
      onPress={() => callbacks.onNavigate('__progressTab')}
    >
      <View style={styles.topRow}>
        <View style={styles.levelInfo}>
          <Text style={styles.pointsText}>{willpowerStats.totalPoints} WP</Text>
        </View>
        <View style={styles.streakInfo}>
          <Text style={styles.streakValue}>{willpowerStats.currentStreak}</Text>
          <Text style={styles.streakLabel}>day streak</Text>
          {willpowerStats.multiplier > 1 && (
            <Text style={styles.multiplierBadge}>{willpowerStats.multiplier}x</Text>
          )}
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.primary,
    marginBottom: Spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  levelInfo: {
    flex: 1,
  },
  streakInfo: {
    alignItems: 'center',
  },
  streakValue: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.white,
  },
  streakLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.white,
    opacity: 0.8,
  },
  multiplierBadge: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xs,
    color: Colors.secondary,
    marginTop: 2,
  },
  pointsText: {
    fontFamily: Fonts.accent,
    fontSize: FontSizes.xl,
    color: Colors.white,
  },
});
