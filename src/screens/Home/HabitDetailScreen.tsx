import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { HomeScreenProps } from '../../types/navigation';
import { useFocusEffect } from '@react-navigation/native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { WeeklyTrendChart } from '../../components/habits/WeeklyTrendChart';
import { useAuth } from '../../context/AuthContext';
import { getHabitById, getHabitStats, getHabitCompletionLogs } from '../../services/habits';
import { Nudge, HabitStats, CompletionLog, HabitActionPlan } from '../../types';

type Props = HomeScreenProps<'HabitDetail'>;

const ACTION_PLAN_LABELS: { key: keyof HabitActionPlan; label: string; icon: string }[] = [
  { key: 'cue', label: 'When & where', icon: 'time-outline' },
  { key: 'environment_change', label: 'Environment tweak', icon: 'home-outline' },
  { key: 'obstacle_plan', label: 'Obstacle plan', icon: 'shield-outline' },
  { key: 'minimum_version', label: 'Minimum version', icon: 'trending-down-outline' },
  { key: 'accountability_person', label: 'Accountability', icon: 'people-outline' },
];

export const HabitDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { habitId } = route.params;
  const { user } = useAuth();

  const [habit, setHabit] = useState<Nudge | null>(null);
  const [stats, setStats] = useState<HabitStats | null>(null);
  const [logs, setLogs] = useState<CompletionLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [h, s, l] = await Promise.all([
        getHabitById(user.uid, habitId),
        getHabitStats(user.uid, habitId),
        getHabitCompletionLogs(user.uid, habitId),
      ]);
      setHabit(h);
      setStats(s);
      setLogs(l);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user, habitId]);

  // Reload every time this screen gains focus — handles initial load and return from HabitActionPlanScreen
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );


  // Generate marked dates for calendar heat map
  const markedDates = useMemo(() => {
    if (!stats) return {};

    const marks: Record<string, any> = {};
    const primaryColor = Colors.primary;

    Object.entries(stats.completionsByDate).forEach(([date, count]) => {
      // 3 intensity levels: 1 completion = 30%, 2 = 60%, 3+ = 100%
      let opacity = 0.3;
      if (count === 2) opacity = 0.6;
      else if (count >= 3) opacity = 1;

      marks[date] = {
        selected: true,
        selectedColor: `rgba(33, 113, 128, ${opacity})`,
      };
    });

    return marks;
  }, [stats]);

  // Get notes with dates, sorted newest first
  const notesWithDates = useMemo(() => {
    return logs
      .filter((l) => l.notes && l.notes.trim())
      .sort((a, b) => {
        const dateA = a.completed_at || a.date;
        const dateB = b.completed_at || b.date;
        return dateB.localeCompare(dateA);
      });
  }, [logs]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!habit || !stats) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Habit not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.habitName}>{habit.name}</Text>
      </View>

      {/* Stats Card - 2x2 Grid */}
      <Card style={styles.statsCard}>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <View style={styles.statIcon}>
              <Ionicons name="flame" size={24} color={Colors.secondary} />
            </View>
            <Text style={styles.statValue}>{stats.currentStreak}</Text>
            <Text style={styles.statLabel}>Current Streak</Text>
          </View>
          <View style={styles.statItem}>
            <View style={styles.statIcon}>
              <Ionicons name="trophy" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.statValue}>{stats.longestStreak}</Text>
            <Text style={styles.statLabel}>Longest Streak</Text>
          </View>
          <View style={styles.statItem}>
            <View style={styles.statIcon}>
              <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
            </View>
            <Text style={styles.statValue}>{stats.totalCompletions}</Text>
            <Text style={styles.statLabel}>Total Completions</Text>
          </View>
          <View style={styles.statItem}>
            <View style={styles.statIcon}>
              <Ionicons name="flash" size={24} color="#FFD700" />
            </View>
            <Text style={styles.statValue}>{stats.totalPoints}</Text>
            <Text style={styles.statLabel}>Total Points</Text>
          </View>
        </View>
      </Card>

      {/* Active Since */}
      {stats.firstCompletionDate && (
        <Card style={styles.activeSinceCard}>
          <View style={styles.activeSinceRow}>
            <Ionicons name="calendar-outline" size={20} color={Colors.gray} />
            <Text style={styles.activeSinceText}>
              Active since {formatDate(stats.firstCompletionDate)}
            </Text>
          </View>
        </Card>
      )}

      {/* Calendar Heat Map */}
      <Text style={styles.sectionTitle}>Completion History</Text>
      <Card style={styles.calendarCard}>
        <Calendar
          markedDates={markedDates}
          theme={{
            backgroundColor: Colors.white,
            calendarBackground: Colors.white,
            textSectionTitleColor: Colors.gray,
            selectedDayBackgroundColor: Colors.primary,
            selectedDayTextColor: Colors.white,
            todayTextColor: Colors.secondary,
            dayTextColor: Colors.dark,
            textDisabledColor: Colors.gray + '50',
            arrowColor: Colors.primary,
            monthTextColor: Colors.dark,
            textMonthFontFamily: Fonts.primaryBold,
            textDayFontFamily: Fonts.secondary,
            textDayHeaderFontFamily: Fonts.secondary,
          }}
          hideExtraDays
          enableSwipeMonths
        />
        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: `rgba(33, 113, 128, 0.3)` }]} />
            <Text style={styles.legendText}>1</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: `rgba(33, 113, 128, 0.6)` }]} />
            <Text style={styles.legendText}>2</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
            <Text style={styles.legendText}>3+</Text>
          </View>
        </View>
      </Card>

      {/* Weekly Trend */}
      <Text style={styles.sectionTitle}>Weekly Trend</Text>
      <Card>
        <WeeklyTrendChart
          data={stats.weeklyTrend}
          maxTarget={habit.target_count_per_week}
        />
      </Card>

      {/* Notes */}
      {notesWithDates.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Notes</Text>
          {notesWithDates.map((log) => (
            <Card key={log.id} style={styles.noteCard}>
              <Text style={styles.noteDate}>
                {formatDate(log.completed_at || log.date)}
              </Text>
              <Text style={styles.noteText}>{log.notes}</Text>
            </Card>
          ))}
        </>
      )}

      {/* Action Plan */}
      <View style={styles.actionPlanHeader}>
        <Text style={styles.sectionTitle}>Action Plan</Text>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('HabitActionPlan', {
              habitId,
              prefilled: habit.action_plan,
            })
          }
          style={styles.editPlanBtn}
        >
          <Ionicons name="pencil-outline" size={14} color={Colors.primary} />
          <Text style={styles.editPlanText}>
            {habit.action_plan ? 'Edit' : 'Set up'}
          </Text>
        </TouchableOpacity>
      </View>

      {habit.action_plan &&
      ACTION_PLAN_LABELS.some(({ key }) => !!habit.action_plan![key]) ? (
        ACTION_PLAN_LABELS.map(({ key, label, icon }) => {
          const value = habit.action_plan![key];
          if (!value) return null;
          return (
            <Card key={key} style={styles.planCard}>
              <View style={styles.planLabelRow}>
                <Ionicons name={icon as any} size={14} color={Colors.primary} />
                <Text style={styles.planLabel}>{label}</Text>
              </View>
              <Text style={styles.planValue}>{value}</Text>
            </Card>
          );
        })
      ) : (
        <Card style={styles.planEmptyCard}>
          <Text style={styles.planEmptyText}>
            Set yourself up for success — create an action plan for this habit.
          </Text>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('HabitActionPlan', { habitId })
            }
            style={styles.planEmptyBtn}
          >
            <Text style={styles.planEmptyBtnText}>Get started →</Text>
          </TouchableOpacity>
        </Card>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
  },
  errorText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  habitName: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.dark,
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  categoryText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
  },
  statsCard: {
    marginBottom: Spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statItem: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  statIcon: {
    marginBottom: Spacing.xs,
  },
  statValue: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.dark,
  },
  statLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 2,
  },
  activeSinceCard: {
    marginBottom: Spacing.lg,
  },
  activeSinceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  activeSinceText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  sectionTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
  },
  calendarCard: {
    paddingBottom: Spacing.sm,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  legendText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  noteCard: {
    marginBottom: Spacing.sm,
  },
  noteDate: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginBottom: Spacing.xs,
  },
  noteText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    lineHeight: 22,
  },
  actionPlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  editPlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  editPlanText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.primary,
  },
  planCard: {
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  planLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  planLabel: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  planValue: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    lineHeight: 20,
  },
  planEmptyCard: {
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  planEmptyText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
  },
  planEmptyBtn: {
    alignSelf: 'flex-start',
  },
  planEmptyBtnText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
});
