import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { Card } from '../common/Card';
import { HabitHealthScore } from '../../services/progress';

interface HabitHealthListProps {
  habits: HabitHealthScore[];
}

function scoreColor(score: number): string {
  if (score >= 0.7) return '#34C759';
  if (score >= 0.4) return '#FF9500';
  return '#FF3B30';
}

export const HabitHealthList: React.FC<HabitHealthListProps> = ({ habits }) => {
  if (habits.length === 0) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>Your Habits</Text>
        <Text style={styles.emptyText}>No active habits yet. Add habits to see how you're doing.</Text>
      </Card>
    );
  }

  const sticky = habits.filter((h) => h.score >= 0.7);
  const needsAttention = habits.filter((h) => h.score < 0.7);

  const renderHabit = (h: HabitHealthScore) => {
    const color = scoreColor(h.score);
    return (
      <View key={h.id} style={styles.habitRow}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={styles.habitName} numberOfLines={1}>{h.name}</Text>
        <View style={styles.habitRight}>
          <Text style={styles.habitCount}>
            {h.weekCompletions}/{h.weekTarget}
          </Text>
          {h.currentStreak > 0 && (
            <View style={styles.streakBadge}>
              <Ionicons name="flame" size={11} color={Colors.secondary} />
              <Text style={styles.streakText}>{h.currentStreak}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Your Habits</Text>

      {sticky.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Staying Strong</Text>
          {sticky.map(renderHabit)}
        </>
      )}

      {needsAttention.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, sticky.length > 0 && styles.sectionLabelSpaced]}>
            Needs Attention
          </Text>
          {needsAttention.map(renderHabit)}
        </>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  sectionLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  sectionLabelSpaced: {
    marginTop: Spacing.md,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  habitName: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    flex: 1,
  },
  habitRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  habitCount: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  streakText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xs,
    color: Colors.secondary,
  },
  emptyText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
});
