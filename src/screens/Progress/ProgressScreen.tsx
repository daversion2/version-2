import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Calendar, DateData } from 'react-native-calendars';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import {
  getCompletionLogs,
  get7DayCompletionRate,
  getWeekComparison,
  getRecoverySpeed,
  getDayOfWeekPattern,
  getHabitHealthScores,
  HabitHealthScore,
} from '../../services/progress';
import { getActiveGoals, computeGoalFollowThrough } from '../../services/goals';
import { getReflections, getReflectionStats } from '../../services/reflections';
import { Goal, GoalFollowThrough, DailyReflection, ReflectionGrade } from '../../types';
import { ReflectionSummaryCard } from '../../components/progress/ReflectionSummaryCard';
import { GradeLineChart } from '../../components/progress/GradeLineChart';
import { GoalHealthCard } from '../../components/progress/GoalHealthCard';
import { ConsistencyCard } from '../../components/progress/ConsistencyCard';
import { HabitHealthList } from '../../components/progress/HabitHealthList';
import { DayOfWeekChart } from '../../components/progress/DayOfWeekChart';
import { useWalkthrough, WALKTHROUGH_STEPS } from '../../context/WalkthroughContext';
import { WalkthroughOverlay } from '../../components/walkthrough/WalkthroughOverlay';

interface GoalCardData {
  goal: Goal;
  followThrough: GoalFollowThrough | null;
}

export const ProgressScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { isWalkthroughActive, currentStep, currentStepConfig, nextStep, skipWalkthrough } = useWalkthrough();
  const isMyStep = isWalkthroughActive && currentStepConfig?.screen === 'Progress';

  const [loading, setLoading] = useState(true);

  // Goal health
  const [goalCards, setGoalCards] = useState<GoalCardData[]>([]);

  // Consistency
  const [activeDays, setActiveDays] = useState(0);
  const [avgDaysToRecover, setAvgDaysToRecover] = useState(0);
  const [totalGaps, setTotalGaps] = useState(0);
  const [thisWeek, setThisWeek] = useState(0);
  const [lastWeek, setLastWeek] = useState(0);

  // Habits
  const [habitScores, setHabitScores] = useState<HabitHealthScore[]>([]);

  // Day-of-week pattern
  const [dowPattern, setDowPattern] = useState<Record<number, number>>({
    0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0,
  });

  // Reflection
  const [reflections, setReflections] = useState<DailyReflection[]>([]);
  const [mostRecentGrade, setMostRecentGrade] = useState<ReflectionGrade | null>(null);
  const [avgGrade, setAvgGrade] = useState<ReflectionGrade | null>(null);
  const [reflectionStreak, setReflectionStreak] = useState(0);

  // Calendar
  const [markedDates, setMarkedDates] = useState<Record<string, any>>({});
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [
        goals,
        rate7,
        weekComp,
        recovery,
        dowPat,
        habits,
        allLogs,
        refs,
      ] = await Promise.all([
        getActiveGoals(user.uid),
        get7DayCompletionRate(user.uid),
        getWeekComparison(user.uid),
        getRecoverySpeed(user.uid),
        getDayOfWeekPattern(user.uid),
        getHabitHealthScores(user.uid),
        getCompletionLogs(user.uid),
        getReflections(user.uid),
      ]);

      // Consistency
      setActiveDays(rate7.activeDays);
      setThisWeek(weekComp.thisWeek);
      setLastWeek(weekComp.lastWeek);
      setAvgDaysToRecover(recovery.avgDaysToRecover);
      setTotalGaps(recovery.totalGaps);

      // Habits
      setHabitScores(habits);

      // Day-of-week
      setDowPattern(dowPat);

      // Reflections
      setReflections(refs);
      if (refs.length > 0) setMostRecentGrade(refs[0].grade);

      // Reflection stats (30 days)
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const rStats = await getReflectionStats(
          user.uid,
          thirtyDaysAgo.toISOString().split('T')[0]
        );
        if (rStats.totalReflections > 0) setAvgGrade(rStats.averageGradeLetter);
        setReflectionStreak(rStats.currentStreak);
      } catch {
        // non-fatal
      }

      // Calendar marks
      const marks: Record<string, any> = {};
      allLogs.forEach((log) => {
        marks[log.date] = { marked: true, dotColor: Colors.secondary };
      });
      setMarkedDates(marks);

      // Goal health — compute follow-through for each active goal
      const cards = await Promise.all(
        goals.map(async (goal) => {
          try {
            const ft = await computeGoalFollowThrough(user.uid, goal.id);
            return { goal, followThrough: ft };
          } catch {
            return { goal, followThrough: null };
          }
        })
      );
      setGoalCards(cards);
    } finally {
      setLoading(false);
    }
  }, [user]);

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
          {/* Section: Your Goals */}
          <Text style={styles.sectionTitle}>Your Goals</Text>
          {goalCards.length === 0 ? (
            <Text style={styles.emptyText}>
              No active goals yet. Head to the Goals tab to set one.
            </Text>
          ) : (
            goalCards.map(({ goal, followThrough }) => (
              <GoalHealthCard
                key={goal.id}
                goal={goal}
                followThrough={followThrough}
                linkedCount={followThrough?.currentWeekCommitments ?? 0}
                linkedDoneThisWeek={followThrough?.currentWeekKept ?? 0}
                onPress={() => navigation.navigate('GoalDashboard', { goalId: goal.id })}
              />
            ))
          )}

          {/* Section: Consistency */}
          <Text style={[styles.sectionTitle, styles.sectionSpacing]}>Consistency</Text>
          <ConsistencyCard
            activeDays={activeDays}
            totalDays={7}
            avgDaysToRecover={avgDaysToRecover}
            totalGaps={totalGaps}
            thisWeek={thisWeek}
            lastWeek={lastWeek}
          />

          {/* Section: Reflection Trend */}
          <Text style={[styles.sectionTitle, styles.sectionSpacing]}>Reflection Trend</Text>
          <ReflectionSummaryCard
            mostRecentGrade={mostRecentGrade}
            averageGradeLetter={avgGrade}
            journalingStreak={reflectionStreak}
            onPress={() => navigation.navigate('ReflectionDetail')}
          />
          <GradeLineChart reflections={reflections} />

          {/* Section: Your Habits */}
          <Text style={[styles.sectionTitle, styles.sectionSpacing]}>Your Habits</Text>
          <HabitHealthList habits={habitScores} />

          {/* Section: When You Show Up */}
          <Text style={[styles.sectionTitle, styles.sectionSpacing]}>When You Show Up</Text>
          <DayOfWeekChart pattern={dowPattern} />

          {/* Activity Calendar */}
          <Text style={[styles.sectionTitle, styles.sectionSpacing]}>Activity Calendar</Text>
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
        </>
      )}

      {isMyStep && (
        <WalkthroughOverlay
          visible
          stepText={currentStepConfig?.text || ''}
          stepNumber={currentStep}
          totalSteps={WALKTHROUGH_STEPS.length}
          isLast={currentStep === WALKTHROUGH_STEPS.length - 1}
          onNext={nextStep}
          onSkip={skipWalkthrough}
        />
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
  sectionSpacing: {
    marginTop: Spacing.lg,
  },
  emptyText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  calendar: {
    borderRadius: 12,
    marginBottom: Spacing.md,
  },
});
