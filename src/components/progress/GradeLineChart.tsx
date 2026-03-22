import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../common/Card';
import { DailyReflection, ReflectionGrade } from '../../types';
import { gradeToNumber } from '../../services/reflections';
import { GRADE_COLORS } from '../home/GradeSelector';

interface GradeLineChartProps {
  reflections: DailyReflection[];
}

const CHART_HEIGHT = 160;
const GRADES_Y: ReflectionGrade[] = ['A', 'B', 'C', 'D', 'F'];

export const GradeLineChart: React.FC<GradeLineChartProps> = ({ reflections }) => {
  if (reflections.length === 0) {
    return (
      <Card>
        <Text style={styles.emptyText}>No data yet</Text>
      </Card>
    );
  }

  // Sort oldest to newest, take last 30 entries max for readability
  const sorted = [...reflections].sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
  const maxPoints = sorted.length;

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Grade Trend</Text>
      <View style={styles.chartContainer}>
        {/* Y-axis labels */}
        <View style={styles.yAxis}>
          {GRADES_Y.map((grade) => (
            <Text key={grade} style={styles.yLabel}>{grade}</Text>
          ))}
        </View>

        {/* Chart area */}
        <View style={styles.chartArea}>
          {/* Grid lines */}
          {GRADES_Y.map((_, i) => (
            <View
              key={i}
              style={[
                styles.gridLine,
                { top: (i / (GRADES_Y.length - 1)) * CHART_HEIGHT },
              ]}
            />
          ))}

          {/* Data points and connecting lines */}
          <View style={styles.dataLayer}>
            {sorted.map((r, i) => {
              const x = maxPoints <= 1 ? 0.5 : i / (maxPoints - 1);
              // A=5 maps to top (0%), F=1 maps to bottom (100%)
              const y = 1 - (gradeToNumber(r.grade) - 1) / 4;
              const color = GRADE_COLORS[r.grade];

              return (
                <View
                  key={r.date}
                  style={[
                    styles.dot,
                    {
                      left: `${x * 100}%`,
                      top: y * CHART_HEIGHT - 5,
                      backgroundColor: color,
                    },
                  ]}
                />
              );
            })}
          </View>

          {/* X-axis labels (first, middle, last) */}
          <View style={styles.xAxis}>
            <Text style={styles.xLabel}>{formatDate(sorted[0].date)}</Text>
            {sorted.length > 2 && (
              <Text style={styles.xLabel}>
                {formatDate(sorted[Math.floor(sorted.length / 2)].date)}
              </Text>
            )}
            {sorted.length > 1 && (
              <Text style={styles.xLabel}>{formatDate(sorted[sorted.length - 1].date)}</Text>
            )}
          </View>
        </View>
      </View>
    </Card>
  );
};

function formatDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${parseInt(m)}/${parseInt(d)}`;
}

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
    paddingVertical: Spacing.lg,
  },
  chartContainer: {
    flexDirection: 'row',
    height: CHART_HEIGHT + 30,
  },
  yAxis: {
    width: 24,
    height: CHART_HEIGHT,
    justifyContent: 'space-between',
  },
  yLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textAlign: 'right',
  },
  chartArea: {
    flex: 1,
    height: CHART_HEIGHT,
    marginLeft: Spacing.sm,
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: Colors.border,
  },
  dataLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: -5,
  },
  xAxis: {
    position: 'absolute',
    bottom: -22,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xLabel: {
    fontFamily: Fonts.secondary,
    fontSize: 10,
    color: Colors.gray,
  },
});
