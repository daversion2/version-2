import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../common/Card';
import { ReflectionGrade } from '../../types';
import { GRADE_COLORS } from '../home/GradeSelector';

interface ReflectionSummaryCardProps {
  mostRecentGrade: ReflectionGrade | null;
  averageGradeLetter: ReflectionGrade | null;
  journalingStreak: number;
  onPress: () => void;
}

export const ReflectionSummaryCard: React.FC<ReflectionSummaryCardProps> = ({
  mostRecentGrade,
  averageGradeLetter,
  journalingStreak,
  onPress,
}) => (
  <Card style={styles.card} onPress={onPress}>
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Ionicons name="journal-outline" size={20} color={Colors.primary} />
        <Text style={styles.title}>Reflection</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
    </View>

    {mostRecentGrade === null ? (
      <Text style={styles.emptyText}>No reflections yet. Start journaling tonight!</Text>
    ) : (
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <View style={[styles.gradeBadge, { backgroundColor: GRADE_COLORS[mostRecentGrade] }]}>
            <Text style={styles.gradeText}>{mostRecentGrade}</Text>
          </View>
          <Text style={styles.statLabel}>Latest</Text>
        </View>

        {averageGradeLetter && (
          <View style={styles.stat}>
            <View style={[styles.gradeBadge, { backgroundColor: GRADE_COLORS[averageGradeLetter] + 'CC' }]}>
              <Text style={styles.gradeText}>{averageGradeLetter}</Text>
            </View>
            <Text style={styles.statLabel}>Avg (30d)</Text>
          </View>
        )}

        <View style={styles.stat}>
          <View style={styles.streakWrap}>
            {journalingStreak > 0 && (
              <Ionicons name="flame" size={16} color={Colors.secondary} />
            )}
            <Text style={styles.streakValue}>{journalingStreak}</Text>
          </View>
          <Text style={styles.statLabel}>Streak</Text>
        </View>
      </View>
    )}
  </Card>
);

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
  },
  emptyText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  stat: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  gradeBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.white,
  },
  statLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  streakWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    gap: 2,
  },
  streakValue: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.primary,
  },
});
