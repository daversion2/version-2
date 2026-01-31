import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Calendar, DateData } from 'react-native-calendars';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { useAuth } from '../../context/AuthContext';
import {
  calculateWPQ,
  calculateStreak,
  getTotalPoints,
  getCompletionLogs,
  getCategoryBreakdown,
  CategoryStat,
} from '../../services/progress';
import { CategoryBarChart } from '../../components/progress/CategoryBarChart';

const TIME_FILTERS = ['Today', '7 Days', '30 Days', 'All Time'] as const;

export const ProgressScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [wpq, setWpq] = useState(0);
  const [streak, setStreak] = useState(0);
  const [points, setPoints] = useState(0);
  const [filter, setFilter] = useState<(typeof TIME_FILTERS)[number]>('7 Days');
  const [markedDates, setMarkedDates] = useState<Record<string, any>>({});
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [categoryData, setCategoryData] = useState<CategoryStat[]>([]);

  const getStartDate = (f: string) => {
    const d = new Date();
    if (f === 'Today') return d.toISOString().split('T')[0];
    if (f === '7 Days') {
      d.setDate(d.getDate() - 7);
      return d.toISOString().split('T')[0];
    }
    if (f === '30 Days') {
      d.setDate(d.getDate() - 30);
      return d.toISOString().split('T')[0];
    }
    return undefined;
  };

  const loadData = useCallback(async () => {
    if (!user) return;
    const [w, s, allLogs] = await Promise.all([
      calculateWPQ(user.uid),
      calculateStreak(user.uid),
      getCompletionLogs(user.uid),
    ]);
    setWpq(w);
    setStreak(s);

    // Points and category breakdown for selected filter
    const start = getStartDate(filter);
    const [p, cats] = await Promise.all([
      getTotalPoints(user.uid, start),
      getCategoryBreakdown(user.uid, start),
    ]);
    setPoints(p);
    setCategoryData(cats);

    // Mark calendar
    const marks: Record<string, any> = {};
    allLogs.forEach((log) => {
      marks[log.date] = {
        marked: true,
        dotColor: Colors.secondary,
      };
    });
    setMarkedDates(marks);
  }, [user, filter]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onDayPress = (day: DateData) => {
    setSelectedDay(day.dateString);
    navigation.navigate('DayDetail', { date: day.dateString });
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* WPQ Card */}
      <Card style={styles.wpqCard}>
        <Text style={styles.wpqLabel}>Willpower Quotient</Text>
        <Text style={styles.wpqValue}>{wpq.toFixed(1)}</Text>
        <Text style={styles.wpqSub}>Average difficulty over last 10 days</Text>
      </Card>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{streak}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{points}</Text>
          <Text style={styles.statLabel}>Points</Text>
        </Card>
      </View>

      {/* Time Filter */}
      <View style={styles.filterRow}>
        {TIME_FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.filterChip, filter === f && styles.filterActive]}
          >
            <Text
              style={[styles.filterText, filter === f && styles.filterActiveText]}
            >
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Category Breakdown */}
      <CategoryBarChart data={categoryData} />

      {/* Calendar */}
      <Text style={styles.sectionTitle}>Activity Calendar</Text>
      <Calendar
        markedDates={{
          ...markedDates,
          ...(selectedDay
            ? {
                [selectedDay]: {
                  ...markedDates[selectedDay],
                  selected: true,
                  selectedColor: Colors.primary,
                },
              }
            : {}),
        }}
        onDayPress={onDayPress}
        theme={{
          todayTextColor: Colors.secondary,
          arrowColor: Colors.primary,
          textDayFontFamily: Fonts.secondary,
          textMonthFontFamily: Fonts.primaryBold,
          textDayHeaderFontFamily: Fonts.secondary,
        }}
        style={styles.calendar}
      />

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  wpqCard: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  wpqLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.white,
    opacity: 0.8,
  },
  wpqValue: {
    fontFamily: Fonts.accent,
    fontSize: 48,
    color: Colors.white,
  },
  wpqSub: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.white,
    opacity: 0.7,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  statCard: { flex: 1, alignItems: 'center' },
  statValue: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.primary,
  },
  statLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  filterActiveText: { color: Colors.white },
  sectionTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  calendar: {
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
});
