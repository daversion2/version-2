import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { Card } from '../common/Card';
import { WeeklyTrendPoint } from '../../services/progress';

interface ActivityTrendChartProps {
  data: WeeklyTrendPoint[];
}

const CHART_HEIGHT = 140;

export const ActivityTrendChart: React.FC<ActivityTrendChartProps> = ({ data }) => {
  if (data.length === 0) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>Activity Trend</Text>
        <Text style={styles.emptyText}>Complete some actions to see your trend</Text>
      </Card>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const points = data.length;

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Activity Trend</Text>
      <Text style={styles.subtitle}>Actions per week</Text>
      <View style={styles.chartContainer}>
        {/* Y-axis labels */}
        <View style={styles.yAxis}>
          <Text style={styles.yLabel}>{maxCount}</Text>
          <Text style={styles.yLabel}>{Math.round(maxCount / 2)}</Text>
          <Text style={styles.yLabel}>0</Text>
        </View>

        {/* Chart area */}
        <View style={styles.chartArea}>
          {/* Grid lines */}
          {[0, 0.5, 1].map((ratio, i) => (
            <View
              key={i}
              style={[styles.gridLine, { top: ratio * CHART_HEIGHT }]}
            />
          ))}

          {/* Bars */}
          <View style={styles.barsContainer}>
            {data.map((point, i) => {
              const height = (point.count / maxCount) * CHART_HEIGHT;
              return (
                <View key={point.weekStart} style={styles.barWrapper}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height,
                        backgroundColor: i === points - 1 ? Colors.primary : `${Colors.primary}80`,
                      },
                    ]}
                  />
                </View>
              );
            })}
          </View>

          {/* X-axis labels */}
          <View style={styles.xAxis}>
            {data.length > 0 && (
              <Text style={styles.xLabel}>{formatWeek(data[0].weekStart)}</Text>
            )}
            {data.length > 2 && (
              <Text style={styles.xLabel}>
                {formatWeek(data[Math.floor(data.length / 2)].weekStart)}
              </Text>
            )}
            {data.length > 1 && (
              <Text style={styles.xLabel}>{formatWeek(data[data.length - 1].weekStart)}</Text>
            )}
          </View>
        </View>
      </View>
    </Card>
  );
};

function formatWeek(dateStr: string): string {
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
  },
  subtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
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
    width: 28,
    height: CHART_HEIGHT,
    justifyContent: 'space-between',
  },
  yLabel: {
    fontFamily: Fonts.secondary,
    fontSize: 10,
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
  barsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-evenly',
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  bar: {
    width: '60%',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    minHeight: 2,
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
