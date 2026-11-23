import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../../../../constants/theme';
import { clampWeeklyGoal } from '../../../../../services/appCheckins';
import { buildWorkoutWeek, DEFAULT_WEEK_VIEW, describeWorkouts, weekWindow, windowTitle } from '../../../../../services/workoutWeek';
import { useWorkouts } from '../WorkoutsContext';
import { ws } from './workoutsStyle';
import { useWorkoutLogs, WeekStrip } from './WeekParts';

/**
 * The week at a glance on the Workouts home, in the user's chosen frame: how
 * it's going and the strip. A tap opens the Week screen for everything else.
 */
export const WeekCard: React.FC<{ onOpen: () => void }> = ({ onOpen }) => {
  const { sessions, exercisesById, prefs, userId } = useWorkouts();
  const logs = useWorkoutLogs(userId);
  const view = prefs.week_view ?? DEFAULT_WEEK_VIEW;
  const goal = clampWeeklyGoal(prefs.weekly_goal, 'workouts');

  const week = useMemo(() => {
    const now = new Date();
    return buildWorkoutWeek({ sessions, exercisesById, logs, window: weekWindow(view, now, 0), now });
  }, [sessions, exercisesById, logs, view]);

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
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: { gap: Spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center' },
});
