import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../common/Card';
import { ReflectionGrade } from '../../types';
import { GRADE_COLORS } from '../home/GradeSelector';

interface GradeDistributionChartProps {
  distribution: Record<ReflectionGrade, number>;
}

const GRADE_ORDER: ReflectionGrade[] = ['A', 'B', 'C', 'D', 'F'];

export const GradeDistributionChart: React.FC<GradeDistributionChartProps> = ({ distribution }) => {
  const maxCount = Math.max(...Object.values(distribution), 1);
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);

  if (total === 0) {
    return (
      <Card>
        <Text style={styles.title}>Grade Distribution</Text>
        <Text style={styles.emptyText}>No data yet</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Grade Distribution</Text>
      {GRADE_ORDER.map((grade) => {
        const count = distribution[grade];
        const width = (count / maxCount) * 100;
        const color = GRADE_COLORS[grade];

        return (
          <View key={grade} style={styles.row}>
            <View style={[styles.gradeBadge, { backgroundColor: color }]}>
              <Text style={styles.gradeText}>{grade}</Text>
            </View>
            <View style={styles.barContainer}>
              <View
                style={[
                  styles.bar,
                  { width: `${Math.max(width, count > 0 ? 4 : 0)}%`, backgroundColor: color },
                ]}
              />
            </View>
            <Text style={styles.countText}>{count}</Text>
          </View>
        );
      })}
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
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  gradeBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xs,
    color: Colors.white,
  },
  barContainer: {
    flex: 1,
    height: 20,
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: BorderRadius.sm,
    opacity: 0.8,
  },
  countText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    width: 28,
    textAlign: 'right',
  },
});
