import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../common/Card';
import { GoalStat } from '../../services/progress';

type ViewMode = 'points' | 'completions';

interface Props {
  data: GoalStat[];
}

export const GoalBarChart: React.FC<Props> = ({ data }) => {
  const [mode, setMode] = useState<ViewMode>('points');

  const maxValue = Math.max(
    ...data.map((d) => (mode === 'points' ? d.points : d.completions)),
    1
  );

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>By Goal</Text>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            onPress={() => setMode('points')}
            style={[styles.toggleBtn, mode === 'points' && styles.toggleActive]}
          >
            <Text style={[styles.toggleText, mode === 'points' && styles.toggleActiveText]}>
              Points
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMode('completions')}
            style={[styles.toggleBtn, mode === 'completions' && styles.toggleActive]}
          >
            <Text style={[styles.toggleText, mode === 'completions' && styles.toggleActiveText]}>
              Completions
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {data.length === 0 ? (
        <Text style={styles.empty}>No activity in this period.</Text>
      ) : (
        data.map((item) => {
          const value = mode === 'points' ? item.points : item.completions;
          const barWidth = (value / maxValue) * 100;

          return (
            <View key={item.goalId} style={styles.row}>
              <Text style={styles.label} numberOfLines={1}>
                {item.goalName}
              </Text>
              <View style={styles.barContainer}>
                <View
                  style={[
                    styles.bar,
                    { width: `${barWidth}%`, backgroundColor: item.goalColor },
                  ]}
                />
              </View>
              <Text style={styles.value}>{value}</Text>
            </View>
          );
        })
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { marginBottom: Spacing.lg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
  },
  toggleRow: {
    flexDirection: 'row',
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  toggleBtn: {
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs + 2,
  },
  toggleActive: {
    backgroundColor: Colors.primary,
  },
  toggleText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  toggleActiveText: {
    color: Colors.white,
  },
  empty: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm + 2,
  },
  label: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    width: 90,
  },
  barContainer: {
    flex: 1,
    height: 20,
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.sm,
    marginHorizontal: Spacing.sm,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: BorderRadius.sm,
    minWidth: 4,
  },
  value: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    width: 32,
    textAlign: 'right',
  },
});
