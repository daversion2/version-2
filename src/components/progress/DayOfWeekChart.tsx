import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../common/Card';

interface DayOfWeekChartProps {
  pattern: Record<number, number>;
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const CHART_HEIGHT = 80;

export const DayOfWeekChart: React.FC<DayOfWeekChartProps> = ({ pattern }) => {
  const values = [0, 1, 2, 3, 4, 5, 6].map((d) => pattern[d] || 0);
  const max = Math.max(...values, 1);
  const bestDay = values.indexOf(Math.max(...values));

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>When You Show Up</Text>
      <View style={styles.chart}>
        {values.map((count, i) => {
          const height = Math.max(4, (count / max) * CHART_HEIGHT);
          const isBest = i === bestDay && count > 0;
          return (
            <View key={i} style={styles.barCol}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    { height, backgroundColor: isBest ? Colors.secondary : Colors.primary },
                    !count && styles.barEmpty,
                  ]}
                />
              </View>
              <Text style={[styles.dayLabel, isBest && styles.dayLabelBest]}>
                {DAY_LABELS[i]}
              </Text>
            </View>
          );
        })}
      </View>
      {bestDay >= 0 && values[bestDay] > 0 && (
        <Text style={styles.caption}>
          {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][bestDay]} is your strongest day
        </Text>
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
    marginBottom: Spacing.md,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: CHART_HEIGHT + 24,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: '70%',
    height: CHART_HEIGHT,
    justifyContent: 'flex-end',
  },
  bar: {
    borderRadius: BorderRadius.sm,
    width: '100%',
  },
  barEmpty: {
    backgroundColor: Colors.border,
  },
  dayLabel: {
    marginTop: 6,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  dayLabelBest: {
    fontFamily: Fonts.secondaryBold,
    color: Colors.secondary,
  },
  caption: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});
