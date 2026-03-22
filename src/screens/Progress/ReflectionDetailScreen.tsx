import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Calendar, DateData } from 'react-native-calendars';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { useAuth } from '../../context/AuthContext';
import { DailyReflection, ReflectionGrade, ReflectionStats } from '../../types';
import { getReflections, getReflectionStats, gradeToNumber } from '../../services/reflections';
import { GradeLineChart } from '../../components/progress/GradeLineChart';
import { GradeDistributionChart } from '../../components/progress/GradeDistributionChart';
import { GRADE_COLORS } from '../../components/home/GradeSelector';

const TIME_FILTERS = ['7 Days', '30 Days', '90 Days', 'All Time'] as const;

export const ReflectionDetailScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const [filter, setFilter] = useState<(typeof TIME_FILTERS)[number]>('30 Days');
  const [stats, setStats] = useState<ReflectionStats | null>(null);
  const [reflections, setReflections] = useState<DailyReflection[]>([]);
  const [allReflections, setAllReflections] = useState<DailyReflection[]>([]);
  const [markedDates, setMarkedDates] = useState<Record<string, any>>({});

  const getStartDate = (f: string): string | undefined => {
    const d = new Date();
    if (f === '7 Days') {
      d.setDate(d.getDate() - 7);
      return d.toISOString().split('T')[0];
    }
    if (f === '30 Days') {
      d.setDate(d.getDate() - 30);
      return d.toISOString().split('T')[0];
    }
    if (f === '90 Days') {
      d.setDate(d.getDate() - 90);
      return d.toISOString().split('T')[0];
    }
    return undefined;
  };

  const loadData = useCallback(async () => {
    if (!user) return;
    const start = getStartDate(filter);

    const [statsData, filtered, all] = await Promise.all([
      getReflectionStats(user.uid, start),
      getReflections(user.uid, start),
      getReflections(user.uid),
    ]);

    setStats(statsData);
    setReflections(filtered);
    setAllReflections(all);

    // Build calendar marks from all reflections
    const marks: Record<string, any> = {};
    all.forEach(r => {
      marks[r.date] = {
        marked: true,
        dotColor: GRADE_COLORS[r.grade],
        selectedColor: GRADE_COLORS[r.grade],
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
    const reflection = allReflections.find(r => r.date === day.dateString);
    if (reflection) {
      navigation.navigate('ReflectionEntry', { reflection });
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Time Filter */}
      <View style={styles.filterRow}>
        {TIME_FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.filterChip, filter === f && styles.filterActive]}
          >
            <Text style={[styles.filterText, filter === f && styles.filterActiveText]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats Row */}
      {stats && (
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalReflections}</Text>
            <Text style={styles.statLabel}>Reflections</Text>
          </Card>
          <Card style={styles.statCard}>
            {stats.totalReflections > 0 ? (
              <View style={[styles.miniGrade, { backgroundColor: GRADE_COLORS[stats.averageGradeLetter] }]}>
                <Text style={styles.miniGradeText}>{stats.averageGradeLetter}</Text>
              </View>
            ) : (
              <Text style={styles.statValue}>-</Text>
            )}
            <Text style={styles.statLabel}>Avg Grade</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{stats.currentStreak}</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{stats.longestStreak}</Text>
            <Text style={styles.statLabel}>Best</Text>
          </Card>
        </View>
      )}

      {/* Grade Distribution */}
      {stats && <GradeDistributionChart distribution={stats.gradeDistribution} />}

      {/* Grade Trend */}
      <GradeLineChart reflections={reflections} />

      {/* Calendar */}
      <Text style={styles.sectionTitle}>Reflection Calendar</Text>
      <Calendar
        markedDates={markedDates}
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

      {/* Recent Entries */}
      <Text style={styles.sectionTitle}>Recent Entries</Text>
      {reflections.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>No reflections for this period</Text>
        </Card>
      ) : (
        reflections.slice(0, 20).map((r) => (
          <Card
            key={r.date}
            style={styles.entryCard}
            onPress={() => navigation.navigate('ReflectionEntry', { reflection: r })}
          >
            <View style={styles.entryRow}>
              <View style={[styles.entryGrade, { backgroundColor: GRADE_COLORS[r.grade] }]}>
                <Text style={styles.entryGradeText}>{r.grade}</Text>
              </View>
              <View style={styles.entryContent}>
                <Text style={styles.entryDate}>
                  {new Date(r.date + 'T12:00:00').toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
                {r.prompt_went_well && (
                  <Text style={styles.entryPreview} numberOfLines={1}>
                    {r.prompt_went_well}
                  </Text>
                )}
              </View>
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  filterChip: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
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
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  statValue: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.primary,
  },
  statLabel: {
    fontFamily: Fonts.secondary,
    fontSize: 10,
    color: Colors.gray,
    marginTop: 2,
    textAlign: 'center',
  },
  miniGrade: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniGradeText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  sectionTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  calendar: {
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  entryCard: {
    marginBottom: Spacing.sm,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  entryGrade: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryGradeText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  entryContent: {
    flex: 1,
  },
  entryDate: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  entryPreview: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 2,
  },
  emptyText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
  },
});
