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
  getWeekComparison,
  getTotalActions,
  getActiveDaysCount,
  getActivityTrendByWeek,
  getBestStreak,
  getPeriodBreakdown,
  WeeklyTrendPoint,
} from '../../services/progress';
import { getWillpowerStats } from '../../services/willpower';
import { getActiveGoals } from '../../services/goals';
import { GoalsEntryRow } from '../../components/progress/GoalsEntryRow';
import { TimeFilterChips, TimeFilter } from '../../components/progress/TimeFilterChips';
import { HeroStatsRow } from '../../components/progress/HeroStatsRow';
import { ActivityTrendChart } from '../../components/progress/ActivityTrendChart';
import { WeekOverWeekCard } from '../../components/progress/WeekOverWeekCard';
import { PeriodBreakdownCard } from '../../components/progress/PeriodBreakdownCard';
import { PersonalRecordsCard } from '../../components/progress/PersonalRecordsCard';
import { ProgressNavigation } from '../../types/navigation';

function getStartDateForFilter(filter: TimeFilter): string | undefined {
  if (filter === 'all') return undefined;
  const days = filter === '7d' ? 7 : filter === '30d' ? 30 : 90;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

export const ProgressScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<ProgressNavigation>();

  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TimeFilter>('30d');

  // Goals count
  const [activeGoalCount, setActiveGoalCount] = useState(0);

  // Hero stats
  const [totalActionCount, setTotalActionCount] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [daysActive, setDaysActive] = useState(0);

  // Trend
  const [trendData, setTrendData] = useState<WeeklyTrendPoint[]>([]);

  // Week-over-week
  const [thisWeek, setThisWeek] = useState(0);
  const [lastWeek, setLastWeek] = useState(0);

  // Calendar
  const [markedDates, setMarkedDates] = useState<Record<string, any>>({});
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Period breakdown
  const [habitsCompleted, setHabitsCompleted] = useState(0);
  const [challengesCompleted, setChallengesCompleted] = useState(0);

  // Personal records
  const [bestStreak, setBestStreak] = useState(0);
  const [bestWeek, setBestWeek] = useState(0);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const startDate = getStartDateForFilter(filter);

      const [
        goals,
        actions,
        activeDaysResult,
        trend,
        weekComp,
        willpower,
        bestStreakResult,
        breakdown,
        allLogs,
      ] = await Promise.all([
        getActiveGoals(user.uid),
        getTotalActions(user.uid, startDate),
        getActiveDaysCount(user.uid, startDate),
        getActivityTrendByWeek(user.uid, startDate),
        getWeekComparison(user.uid),
        getWillpowerStats(user.uid),
        getBestStreak(user.uid),
        getPeriodBreakdown(user.uid, startDate),
        getCompletionLogs(user.uid, startDate),
      ]);

      setActiveGoalCount(goals.length);
      setTotalActionCount(actions);
      setDaysActive(activeDaysResult);
      setTrendData(trend);
      setThisWeek(weekComp.thisWeek);
      setLastWeek(weekComp.lastWeek);
      setBestWeek(weekComp.bestWeek);
      setCurrentStreak(willpower.currentStreak);
      setTotalXP(willpower.totalPoints);
      setBestStreak(bestStreakResult);
      setHabitsCompleted(breakdown.habits);
      setChallengesCompleted(breakdown.challenges);

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
          {/* Goals Entry */}
          <GoalsEntryRow
            count={activeGoalCount}
            onPress={() => navigation.navigate('GoalsProgress')}
          />

          {/* Time Filter */}
          <TimeFilterChips selected={filter} onSelect={setFilter} />

          {/* Hero Stats */}
          <HeroStatsRow
            totalActions={totalActionCount}
            currentStreak={currentStreak}
            totalXP={totalXP}
            daysActive={daysActive}
          />

          {/* Activity Trend */}
          <ActivityTrendChart data={trendData} />

          {/* Week-over-week (only if positive) */}
          <WeekOverWeekCard thisWeek={thisWeek} lastWeek={lastWeek} />

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

          {/* Period Breakdown */}
          <PeriodBreakdownCard
            habits={habitsCompleted}
            challenges={challengesCompleted}
          />

          {/* Personal Records */}
          <PersonalRecordsCard
            bestStreak={bestStreak}
            bestWeek={bestWeek}
          />
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
