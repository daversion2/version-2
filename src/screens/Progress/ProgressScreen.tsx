import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Calendar, DateData } from 'react-native-calendars';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import {
  getCompletionLogs,
  getTotalActions,
  getTotalPoints,
  getActiveDaysCount,
  getActivityTrendByWeek,
  WeeklyTrendPoint,
} from '../../services/progress';
import { getWillpowerStats } from '../../services/willpower';
import {
  getPracticeProgress,
  PracticeProgress,
} from '../../services/practiceProgress';
import { getAllPractices } from '../../data/practices';
import { TimeFilterChips, TimeFilter } from '../../components/progress/TimeFilterChips';
import { HeroStatsRow } from '../../components/progress/HeroStatsRow';
import { ActivityTrendChart } from '../../components/progress/ActivityTrendChart';
import { PersonalRecordsCard } from '../../components/progress/PersonalRecordsCard';
import { OverrideScoreCard } from '../../components/progress/OverrideScoreCard';
import { TrainingVolumeSection } from '../../components/progress/TrainingVolumeSection';
import { TrainingQualityCard } from '../../components/progress/TrainingQualityCard';
import { ProgressNavigation } from '../../types/navigation';
import { toLocalDateString } from '../../utils/date';

function getStartDateForFilter(filter: TimeFilter): string | undefined {
  if (filter === 'all') return undefined;
  const days = filter === '7d' ? 7 : filter === '30d' ? 30 : 90;
  const d = new Date();
  d.setDate(d.getDate() - (days - 1));
  return toLocalDateString(d);
}

export const ProgressScreen: React.FC = () => {
  const { user, userProfile } = useAuth();
  const navigation = useNavigation<ProgressNavigation>();

  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TimeFilter>('30d');

  // Practice-protocol aggregation (volume grid, quality, override score, records)
  const [progress, setProgress] = useState<PracticeProgress | null>(null);

  // Hero stats
  const [completions, setCompletions] = useState(0);
  const [points, setPoints] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [daysActive, setDaysActive] = useState(0);

  // Trend
  const [trendData, setTrendData] = useState<WeeklyTrendPoint[]>([]);

  // Calendar
  const [markedDates, setMarkedDates] = useState<Record<string, any>>({});
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const startDate = getStartDateForFilter(filter);

      const [
        actions,
        periodPoints,
        activeDaysResult,
        trend,
        willpower,
        allLogs,
        practiceProgress,
      ] = await Promise.all([
        getTotalActions(user.uid, startDate),
        getTotalPoints(user.uid, startDate),
        getActiveDaysCount(user.uid, startDate),
        getActivityTrendByWeek(user.uid, startDate),
        getWillpowerStats(user.uid),
        getCompletionLogs(user.uid, startDate),
        getPracticeProgress(user.uid, startDate),
      ]);

      setCompletions(actions);
      setPoints(periodPoints);
      setDaysActive(activeDaysResult);
      setTrendData(trend);
      setCurrentStreak(willpower.currentStreak);
      setProgress(practiceProgress);

      // Calendar marks
      const marks: Record<string, any> = {};
      allLogs.forEach((log) => {
        marks[log.date] = { marked: true, dotColor: Colors.secondary };
      });
      setMarkedDates(marks);
    } finally {
      setLoading(false);
    }
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
      {loading ? (
        <ActivityIndicator
          color={Colors.primary}
          size="large"
          style={styles.loader}
        />
      ) : (
        <>
          {/* Override Score (weekly, independent of the time filter) */}
          <OverrideScoreCard
            score={progress?.weekScore ?? 0}
            lastWeekScore={progress?.lastWeekScore ?? 0}
          />

          {/* Time Filter */}
          <TimeFilterChips selected={filter} onSelect={setFilter} />

          {/* Hero Stats */}
          <HeroStatsRow
            completions={completions}
            points={points}
            currentStreak={currentStreak}
            daysActive={daysActive}
            practicesTried={userProfile?.practices_tried ?? 0}
            practicesTotal={
              getAllPractices().filter((p) => p.active !== false && p.group !== 'custom').length
            }
          />

          {/* Training Volume (per-practice card grid + challenges strip) */}
          {progress && (
            <TrainingVolumeSection
              practices={progress.practices}
              challenges={progress.challenges}
              onPracticePress={(habitId) =>
                navigation.navigate('HabitDetail', { habitId })
              }
            />
          )}

          {/* Training Quality */}
          {progress && <TrainingQualityCard quality={progress.quality} />}

          {/* Activity Trend */}
          <ActivityTrendChart data={trendData} />

          {/* Activity Calendar */}
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

          {/* Personal Records */}
          {progress && <PersonalRecordsCard records={progress.records} />}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  loader: { marginTop: 80 },
  sectionTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  calendar: {
    borderRadius: 12,
    marginBottom: Spacing.md,
  },
});
