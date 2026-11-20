import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../../../../constants/theme';
import { clampWeeklyGoal } from '../../../../../services/appCheckins';
import { buildWorkoutWeek, DEFAULT_WEEK_VIEW, describeWorkouts, weekWindow, windowTitle } from '../../../../../services/workoutWeek';
import { useWorkouts } from '../WorkoutsContext';
import { ws } from './workoutsStyle';
import { useWorkoutLogs, WeekStrip, weekTotalsLine } from './WeekParts';

/**
 * The top of the Workouts home: the week's strip and its numbers, in the
 * user's chosen frame. A tap opens the Week screen. Monday to Sunday with
 * nothing done yet this week, last week's strip shows under it, so the card
 * is never just seven empty days.
 */
export const WeekCard: React.FC<{ onOpen: () => void }> = ({ onOpen }) => {
  const { sessions, exercisesById, prefs, userId } = useWorkouts();
  const logs = useWorkoutLogs(userId);
  const view = prefs.week_view ?? DEFAULT_WEEK_VIEW;
  const goal = clampWeeklyGoal(prefs.weekly_goal, 'workouts');

  const { week, lastWeek } = useMemo(() => {
    const now = new Date();
    const build = (offset: number) =>
      buildWorkoutWeek({ sessions, exercisesById, logs, window: weekWindow(view, now, offset), now });
    const current = build(0);
    return { week: current, lastWeek: view === 'calendar' && current.workouts === 0 ? build(1) : null };
  }, [sessions, exercisesById, logs, view]);

  const totals = weekTotalsLine(week, prefs.unit);

  return (
    <TouchableOpacity
      style={[ws.card, styles.card]}
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityHint="Opens your week, day by day"
    >
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={ws.eyebrow}>{windowTitle(week.window)}</Text>
          <Text style={ws.title}>{describeWorkouts(week, goal)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
      </View>
      <WeekStrip days={week.days} size={28} />
      {!!totals && <Text style={ws.muted}>{totals}</Text>}
      {lastWeek && lastWeek.workouts > 0 && (
        <View style={styles.last}>
          <Text style={ws.muted}>Last week · {describeWorkouts(lastWeek, goal)}</Text>
          <WeekStrip days={lastWeek.days} size={22} captions={false} />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: { gap: Spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center' },
  last: {
    gap: Spacing.xs,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.separator,
  },
});
