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
import { getWillpowerStats, getSuckFactorTier } from '../../services/willpower';
import { CategoryBarChart } from '../../components/progress/CategoryBarChart';
import { useWalkthrough, WALKTHROUGH_STEPS } from '../../context/WalkthroughContext';
import { WalkthroughOverlay } from '../../components/walkthrough/WalkthroughOverlay';
import { ScreenHeader } from '../../components/common/ScreenHeader';

const TIME_FILTERS = ['Today', '7 Days', '30 Days', 'All Time'] as const;

export const ProgressScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { isWalkthroughActive, currentStep, currentStepConfig, nextStep, skipWalkthrough } = useWalkthrough();
  const isMyStep = isWalkthroughActive && currentStepConfig?.screen === 'Progress';
  const [wpq, setWpq] = useState(0);
  const [streak, setStreak] = useState(0);
  const [points, setPoints] = useState(0);
  const [filter, setFilter] = useState<(typeof TIME_FILTERS)[number]>('7 Days');
  const [markedDates, setMarkedDates] = useState<Record<string, any>>({});
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [categoryData, setCategoryData] = useState<CategoryStat[]>([]);

  // Willpower Bank state
  const [willpowerStats, setWillpowerStats] = useState({
    totalPoints: 0,
    currentStreak: 0,
    multiplier: 1,
    level: 1,
    title: 'Beginner Mind',
    progressToNextLevel: 0,
    pointsToNextLevel: 50 as number | null,
  });

  // Suck Factor state
  const [suckFactor, setSuckFactor] = useState({
    tier: 'Comfort Zone',
    description: 'Starting with manageable challenges',
  });

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
    const [w, s, allLogs, wpStats] = await Promise.all([
      calculateWPQ(user.uid),
      calculateStreak(user.uid),
      getCompletionLogs(user.uid),
      getWillpowerStats(user.uid),
    ]);
    setWpq(w);
    setStreak(s);
    setWillpowerStats(wpStats);
    setSuckFactor(getSuckFactorTier(w));

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
      <ScreenHeader />

      {/* Willpower Bank Card */}
      <Card style={styles.willpowerCard}>
        <Text style={styles.levelLabel}>Level {willpowerStats.level}</Text>
        <Text style={styles.titleValue}>{willpowerStats.title}</Text>
        <Text style={styles.pointsLabel}>
          {willpowerStats.totalPoints} Willpower Points
        </Text>
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${willpowerStats.progressToNextLevel * 100}%` },
              ]}
            />
          </View>
          {willpowerStats.pointsToNextLevel !== null && (
            <Text style={styles.progressText}>
              {willpowerStats.pointsToNextLevel} pts to next level
            </Text>
          )}
        </View>
      </Card>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{willpowerStats.currentStreak}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
          {willpowerStats.multiplier > 1 && (
            <Text style={styles.multiplierBadge}>
              {willpowerStats.multiplier}x bonus
            </Text>
          )}
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{wpq.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Suck Factor</Text>
          <Text style={styles.suckFactorTier}>{suckFactor.tier}</Text>
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
  willpowerCard: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  levelLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.white,
    opacity: 0.8,
  },
  titleValue: {
    fontFamily: Fonts.accent,
    fontSize: FontSizes.xxl,
    color: Colors.white,
    marginTop: Spacing.xs,
  },
  pointsLabel: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.white,
    marginTop: Spacing.sm,
  },
  progressContainer: {
    width: '100%',
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.secondary,
    borderRadius: 4,
  },
  progressText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.white,
    opacity: 0.8,
    marginTop: Spacing.xs,
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
  multiplierBadge: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xs,
    color: Colors.secondary,
    marginTop: Spacing.xs,
  },
  suckFactorTier: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.primary,
    textAlign: 'center',
  },
  suckFactorDesc: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.xs,
    opacity: 0.8,
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
