import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';

interface WeeklyTrendChartProps {
  data: number[]; // 8 weeks of completion counts (oldest to newest)
  maxTarget?: number; // Optional max value for scaling (e.g., target_count_per_week)
}

export const WeeklyTrendChart: React.FC<WeeklyTrendChartProps> = ({
  data,
  maxTarget = 7,
}) => {
  // Calculate max value for scaling
  const maxValue = Math.max(...data, maxTarget, 1);

  // Week labels (relative)
  const labels = ['8w', '7w', '6w', '5w', '4w', '3w', '2w', 'Now'];

  return (
    <View style={styles.container}>
      <View style={styles.chartArea}>
        {data.map((value, index) => {
          const heightPercent = (value / maxValue) * 100;
          return (
            <View key={index} style={styles.barContainer}>
              <View style={styles.barWrapper}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${Math.max(heightPercent, 2)}%`,
                      backgroundColor:
                        index === data.length - 1
                          ? Colors.secondary
                          : Colors.primary,
                      opacity: value === 0 ? 0.3 : 1,
                    },
                  ]}
                />
              </View>
              <Text style={styles.barValue}>{value}</Text>
              <Text style={styles.barLabel}>{labels[index]}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.md,
  },
  chartArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
  },
  barWrapper: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  bar: {
    width: '70%',
    borderRadius: 4,
    minHeight: 4,
  },
  barValue: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.dark,
    marginTop: Spacing.xs,
  },
  barLabel: {
    fontFamily: Fonts.secondary,
    fontSize: 10,
    color: Colors.gray,
    marginTop: 2,
  },
});
