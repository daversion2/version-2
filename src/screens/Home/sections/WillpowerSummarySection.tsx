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
          <Text style={styles.levelLabel}>Level {willpowerStats.level}</Text>
          <Text style={styles.titleValue}>{willpowerStats.title}</Text>
        </View>
        <View style={styles.streakInfo}>
          <Text style={styles.streakValue}>{willpowerStats.currentStreak}</Text>
          <Text style={styles.streakLabel}>day streak</Text>
          {willpowerStats.multiplier > 1 && (
            <Text style={styles.multiplierBadge}>{willpowerStats.multiplier}x</Text>
          )}
        </View>
      </View>
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${willpowerStats.progressToNextLevel * 100}%` },
            ]}
          />
        </View>
        <View style={styles.progressLabels}>
          <Text style={styles.pointsText}>
            {willpowerStats.totalPoints} WP
          </Text>
          {willpowerStats.pointsToNextLevel !== null && (
            <Text style={styles.nextLevelText}>
              {willpowerStats.pointsToNextLevel} to next level
            </Text>
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
  levelLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.white,
    opacity: 0.8,
  },
  titleValue: {
    fontFamily: Fonts.accent,
    fontSize: FontSizes.xl,
    color: Colors.white,
    marginTop: 2,
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
  progressContainer: {
    marginTop: Spacing.md,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.secondary,
    borderRadius: 3,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  pointsText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xs,
    color: Colors.white,
    opacity: 0.8,
  },
  nextLevelText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.white,
    opacity: 0.8,
  },
});
