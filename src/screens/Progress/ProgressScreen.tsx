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
import {
  buildResistanceOverview,
  ResistanceOverview,
} from '../../services/practicePerformance';
import { ResistanceCurveCard } from '../../components/progress/ResistanceCurveCard';
import { SkipPatternsCard } from '../../components/progress/SkipPatternsCard';
import { getSkipPatterns } from '../../services/skips';
import { SkipPatterns } from '../../services/skipLogic';
import { TimeFilterChips, TimeFilter } from '../../components/progress/TimeFilterChips';
import { HeroStatsRow } from '../../components/progress/HeroStatsRow';
import { ActivityTrendChart } from '../../components/progress/ActivityTrendChart';
import { PersonalRecordsCard } from '../../components/progress/PersonalRecordsCard';
import { OverrideScoreCard } from '../../components/progress/OverrideScoreCard';
import { TrainingVolumeSection } from '../../components/progress/TrainingVolumeSection';
import { MetricFamiliesSection } from '../../components/progress/MetricFamiliesSection';
import { TrainingQualityCard } from '../../components/progress/TrainingQualityCard';
import { WeeklyRadarCard } from '../../components/progress/WeeklyRadarCard';
import { ProgressNavigation } from '../../types/navigation';
import { CompletionLog } from '../../types';
import { toLocalDateString } from '../../utils/date';
import { useScreenIntro } from '../../hooks/useScreenIntro';
import { ScreenIntro, ScreenIntroButton } from '../../components/common/ScreenIntro';

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
  // First visit explains the screen; the ⓘ in the header brings it back.
  const intro = useScreenIntro('progress', {
    navigation,
    side: 'right',
    renderButton: (onPress) => <ScreenIntroButton onPress={onPress} />,
  });

  const [loading, setLoading] = useState(true);
  const [resistance, setResistance] = useState<ResistanceOverview | null>(null);
  const [skipPatterns, setSkipPatterns] = useState<SkipPatterns | null>(null);
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

  // Every log in the window, kept for the weekly radar. It slices out the
  // current week itself — the smallest filter (7d) always covers the elapsed
  // part of it, so the radar stays filter-independent without a second fetch.
  const [logs, setLogs] = useState<CompletionLog[]>([]);

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

      // Built from allLogs, which is already fetched above — no extra read.
      setResistance(buildResistanceOverview(allLogs));

      // Skip patterns come from their own collection (misses are deliberately
      // not completionLogs). Best-effort: a failure here must not blank the
      // whole Progress screen.
      try {
        setSkipPatterns(await getSkipPatterns(user.uid));
      } catch (err) {
        console.warn('Skip patterns fetch failed:', err);
      }

      setCompletions(actions);
      setPoints(periodPoints);
      setDaysActive(activeDaysResult);
      setTrendData(trend);
      setCurrentStreak(willpower.currentStreak);
      setProgress(practiceProgress);
      setLogs(allLogs);

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
          {/* Resistance leads. Streaks measure attendance; this measures change,
              which is the claim the product is built to make. */}
          {resistance && <ResistanceCurveCard overview={resistance} />}

          {/* Why you skip — the other half of the same story. Sits directly
              under the curve: one card is the days you won, this is the rest. */}
          {skipPatterns && <SkipPatternsCard patterns={skipPatterns} />}

          {/* Override Score (weekly, independent of the time filter) */}
          <OverrideScoreCard
            score={progress?.weekScore ?? 0}
            lastWeekScore={progress?.lastWeekScore ?? 0}
          />

          {/* The week as one shape — habits per day or the XP they earned,
              toggled on the card. Same weekly, filter-independent scope as the
              Override Score above it. */}
          <WeeklyRadarCard logs={logs} />

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

          {/* By Metric — the same reps as Training Volume below, sliced by what
              they measured instead of which habit logged them. Leads because
              "38 miles this month" is the sentence people want first; the grid
              underneath answers which habits carried it. */}
          {progress && (
            <MetricFamiliesSection
              reports={progress.metricFamilies}
              onHabitPress={(habitId) => navigation.navigate('HabitDetail', { habitId })}
            />
          )}

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
      <ScreenIntro intro={intro} />
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
