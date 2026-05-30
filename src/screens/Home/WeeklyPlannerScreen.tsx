import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { WeekDayCard } from '../../components/home/WeekDayCard';
import { useAuth } from '../../context/AuthContext';
import {
  Challenge,
  Nudge,
  CompletionLog,
  PlannedItem,
  TomorrowChallenge,
  ProgramEnrollment,
  ProgramDay,
} from '../../types';
import { loadWeekData, WeekData } from '../../services/weeklyPlan';
import { saveTomorrowPlan, getTomorrowPlan } from '../../services/dailyPlan';
import { exportToCalendar } from '../../services/calendarExport';
import { getActiveChallenges, getActiveExtendedChallenges, getAllChallenges } from '../../services/challenges';
import { getActiveHabits, getWeeklyCompletionCounts } from '../../services/habits';
import { getGoalColor } from '../../constants/goalColors';
import { getActiveGoals } from '../../services/goals';
import { Goal } from '../../types';
import { getActiveEnrollment, getTodaysProgramContent } from '../../services/programs';
import { convertPlannedChallengesToChallenges } from '../../services/dailyPlan';
import {
  getWeekDates,
  getWeekStart,
  getWeekEnd,
  formatWeekRange,
  toLocalDateString,
  getTodayString,
} from '../../utils/date';

type Props = NativeStackScreenProps<any, 'WeeklyPlanner'>;

export const WeeklyPlannerScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();

  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [weekData, setWeekData] = useState<WeekData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Shared data for building today's plan & day cards
  const [habits, setHabits] = useState<Nudge[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [weeklyCounts, setWeeklyCounts] = useState<Record<string, number>>({});
  const [activeChallenges, setActiveChallenges] = useState<Challenge[]>([]);
  const [extendedChallenges, setExtendedChallenges] = useState<Challenge[]>([]);
  const [activeProgram, setActiveProgram] = useState<ProgramEnrollment | null>(null);
  const [todaysProgramDay, setTodaysProgramDay] = useState<ProgramDay | null>(null);
  const [programDayNumber, setProgramDayNumber] = useState(0);
  const [programCheckedIn, setProgramCheckedIn] = useState(false);
  const [plannedHabitIds, setPlannedHabitIds] = useState<string[]>([]);

  // Name lookup for completion logs
  const [allChallenges, setAllChallenges] = useState<Challenge[]>([]);

  const weekDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + currentWeekOffset * 7);
    return d;
  }, [currentWeekOffset]);

  const weekDates = useMemo(() => getWeekDates(weekDate), [weekDate]);
  const weekStart = weekDates[0];
  const weekEnd = weekDates[6];
  const isCurrentWeek = currentWeekOffset === 0;

  const getItemColor = useCallback(
    (goalIds?: string[]) => getGoalColor(goalIds, goals),
    [goals]
  );

  // Build a name lookup from loaded data
  const getLogName = useCallback(
    (log: CompletionLog): string => {
      if (log.type === 'nudge') {
        const habit = habits.find((h) => h.id === log.reference_id);
        return habit?.name || 'Habit';
      }
      if (log.type === 'challenge') {
        const ch = allChallenges.find((c) => c.id === log.reference_id);
        return ch?.name || 'Challenge';
      }
      if (log.type === 'program') {
        return activeProgram?.program_name || 'Program';
      }
      return 'Activity';
    },
    [habits, allChallenges, activeProgram]
  );

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const todayStr = getTodayString();

      // Load shared data in parallel
      const [
        habitList,
        activeGoals,
        dailyChallenges,
        extChallenges,
        enrollment,
        counts,
        challengeList,
      ] = await Promise.all([
        getActiveHabits(user.uid),
        getActiveGoals(user.uid),
        getActiveChallenges(user.uid),
        getActiveExtendedChallenges(user.uid),
        getActiveEnrollment(user.uid),
        getWeeklyCompletionCounts(user.uid),
        getAllChallenges(user.uid),
      ]);

      setHabits(habitList);
      setGoals(activeGoals);
      setActiveChallenges(dailyChallenges);
      setExtendedChallenges(extChallenges);
      setActiveProgram(enrollment);
      setWeeklyCounts(counts);
      setAllChallenges(challengeList);

      // Load program day content
      let progDay: ProgramDay | null = null;
      let progDayNum = 0;
      let progCheckedIn = false;
      if (enrollment && isCurrentWeek) {
        try {
          const content = await getTodaysProgramContent(user.uid, enrollment.id);
          if (content) {
            progDay = content.programDay;
            progDayNum = content.dayNumber;
            progCheckedIn = content.isCheckedIn;
          }
        } catch {}
      }
      setTodaysProgramDay(progDay);
      setProgramDayNumber(progDayNum);
      setProgramCheckedIn(progCheckedIn);

      // Load planned habit IDs for today
      let todayPlannedHabits: string[] = [];
      if (isCurrentWeek) {
        try {
          const todayPlan = await getTomorrowPlan(user.uid, todayStr);
          todayPlannedHabits = todayPlan?.planned_habit_ids || [];
        } catch {}
      }
      setPlannedHabitIds(todayPlannedHabits);

      // Load week data
      const data = await loadWeekData(
        user.uid,
        weekDates,
        isCurrentWeek
          ? {
              activeChallenges: dailyChallenges,
              extendedChallenges: extChallenges,
              habits: habitList,
              weeklyCounts: counts,
              activeProgram: enrollment,
              todaysProgramDay: progDay,
              programDayNumber: progDayNum,
              programCheckedIn: progCheckedIn,
              getItemColor: (goalIds?: string[]) => getGoalColor(goalIds, activeGoals),
              plannedHabitIds: todayPlannedHabits,
            }
          : undefined
      );
      setWeekData(data);
    } catch (err) {
      console.error('WeeklyPlanner loadData failed:', err);
    } finally {
      setLoading(false);
    }
  }, [user, weekDates, isCurrentWeek]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handlePlanSaved = async (
    date: string,
    habitIds: string[],
    challenges: TomorrowChallenge[]
  ) => {
    if (!user) return;
    try {
      const existing = await getTomorrowPlan(user.uid, date);
      await saveTomorrowPlan(user.uid, {
        user_id: user.uid,
        date,
        planned_habit_ids: habitIds,
        planned_challenges: challenges,
        dismissed_habit_ids: existing?.dismissed_habit_ids || [],
        created_at: existing?.created_at || new Date().toISOString(),
        source: 'manual',
      });
      // Reload
      await loadData();
    } catch (err) {
      console.warn('Failed to save plan:', err);
    }
  };

  const handleCalendarExport = async (item: PlannedItem) => {
    await exportToCalendar({
      title: item.calendarTitle || item.title,
      notes: item.calendarNotes,
      startDate: item.calendarStartDate,
      endDate: item.calendarEndDate,
    });
  };

  const handleItemPress = (item: PlannedItem) => {
    switch (item.type) {
      case 'daily_challenge': {
        const challenge = item.sourceData.challenge;
        if (challenge) navigation.navigate('CompleteChallenge' as any, { challenge });
        break;
      }
      case 'extended_milestone': {
        const challenge = item.sourceData.challenge;
        if (challenge) navigation.navigate('ExtendedChallengeProgress' as any, { challengeId: challenge.id });
        break;
      }
      case 'program_checkin': {
        const program = item.sourceData.program;
        if (program) navigation.navigate('ProgramDashboard' as any, { enrollmentId: program.id });
        break;
      }
    }
  };

  // Weekly habit progress for the summary card
  const habitProgress = useMemo(() => {
    if (!isCurrentWeek) return [];
    return habits
      .filter((h) => h.is_active)
      .map((h) => ({
        id: h.id,
        name: h.name,
        done: weeklyCounts[h.id] || 0,
        target: h.target_count_per_week,
        color: getItemColor(h.goal_ids),
      }));
  }, [habits, weeklyCounts, getItemColor, isCurrentWeek]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Week Navigation */}
        <View style={styles.weekNav}>
          <TouchableOpacity
            onPress={() => setCurrentWeekOffset((o) => o - 1)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <View style={styles.weekNavCenter}>
            <Text style={styles.weekNavTitle}>
              {formatWeekRange(weekStart, weekEnd)}
            </Text>
            {isCurrentWeek && (
              <View style={styles.currentWeekBadge}>
                <Text style={styles.currentWeekText}>This Week</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={() => setCurrentWeekOffset((o) => o + 1)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-forward" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Weekly Habit Progress (current week only) */}
        {isCurrentWeek && habitProgress.length > 0 && (
          <Card style={styles.habitProgressCard}>
            <Text style={styles.habitProgressTitle}>Weekly Habit Progress</Text>
            {habitProgress.map((h) => (
              <View key={h.id} style={styles.habitProgressRow}>
                <Text style={styles.habitProgressName} numberOfLines={1}>
                  {h.name}
                </Text>
                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${Math.min(100, (h.done / h.target) * 100)}%`,
                        backgroundColor: h.color,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.habitProgressCount}>
                  {h.done}/{h.target}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {/* Day Cards */}
        {weekData?.days.map((day) => (
          <WeekDayCard
            key={day.date}
            summary={day}
            habits={habits}
            weeklyCounts={weeklyCounts}
            getItemColor={getItemColor}
            getLogName={getLogName}
            onPlanSaved={handlePlanSaved}
            scheduledChallenges={allChallenges.filter(
              (c) => c.status === 'scheduled' && c.date === day.date
            )}
            onNavigate={(screen, params) => navigation.navigate(screen as any, params)}
            onItemPress={handleItemPress}
            onCalendarExport={handleCalendarExport}
            defaultExpanded={day.isToday}
          />
        ))}

        {/* Back to today shortcut */}
        {!isCurrentWeek && (
          <TouchableOpacity
            style={styles.backToTodayBtn}
            onPress={() => setCurrentWeekOffset(0)}
            activeOpacity={0.7}
          >
            <Ionicons name="today-outline" size={18} color={Colors.primary} />
            <Text style={styles.backToTodayText}>Back to This Week</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.lightGray,
  },
  // Week navigation
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  weekNavCenter: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  weekNavTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
  },
  currentWeekBadge: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  currentWeekText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs - 1,
    color: Colors.primary,
  },
  // Habit progress card
  habitProgressCard: {
    marginBottom: Spacing.md,
  },
  habitProgressTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  habitProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  habitProgressName: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    width: 100,
  },
  progressBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.lightGray,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  habitProgressCount: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    width: 32,
    textAlign: 'right',
  },
  // Back to today
  backToTodayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  backToTodayText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
});
