import React, { useLayoutEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Spacing } from '../../../../constants/theme';
import type { WorkoutsStackParamList } from '../../../../types/workouts';
import { formatSeconds, formatSetValues, formatVolume } from '../../../../services/workoutMath';
import { buildWorkoutDay, describeRating, exercisesInSession } from '../../../../services/workoutWeek';
import { useWorkouts } from './WorkoutsContext';
import { WORKOUTS_ACCENT, ws } from './components/workoutsStyle';
import { useWorkoutLogs, weekdayName } from './components/WeekParts';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'WorkoutDay'>;

const clock = (iso: string): string => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

/**
 * One day from the Week screen: each workout with its time, sets, volume,
 * records and both ratings, then every exercise and its sets. An exercise
 * opens its history. A workout logged without details says so.
 */
export const WorkoutDayScreen: React.FC<Props> = ({ navigation, route }) => {
  const { date } = route.params;
  const { sessions, exercisesById, exercise, prefs, userId } = useWorkouts();
  const logs = useWorkoutLogs(userId);
  const unit = prefs.unit;

  useLayoutEffect(() => {
    navigation.setOptions({ title: weekdayName(date) });
  }, [navigation, date]);

  const day = useMemo(
    () => buildWorkoutDay({ sessions, exercisesById, logs, date, now: new Date() }),
    [sessions, exercisesById, logs, date]
  );

  const openExercise = (exerciseId: string) =>
    navigation.navigate('WorkoutStatsDetail', { kind: 'exercise', id: exerciseId, range: 'month' });

  if (day.sessions.length === 0) {
    return (
      <ScrollView style={ws.screen} contentContainerStyle={ws.scroll}>
        <View style={ws.card}>
          <Text style={ws.title}>{day.ahead ? 'Still to come' : 'Rest day'}</Text>
          <Text style={ws.muted}>No workout logged on this day.</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={ws.screen} contentContainerStyle={ws.scroll}>
      {day.sessions.map((d, i) => {
        const s = d.session;
        const ratings = [
          describeRating(d.ratings.start) ? `Getting started ${d.ratings.start}` : null,
          describeRating(d.ratings.stay) ? `Staying with it ${d.ratings.stay}` : null,
        ].filter(Boolean);
        return (
          <View key={s?.id ?? `logged-${i}`} style={[ws.card, styles.session]}>
            <View style={styles.head}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={ws.title}>{d.name}</Text>
                <Text style={ws.muted}>
                  {s
                    ? [
                        s.logged_sets ? 'Sets added to your week' : clock(s.started_at),
                        !s.logged_sets && s.duration_sec > 0 ? formatSeconds(s.duration_sec) : null,
                        `${s.total_sets} ${s.total_sets === 1 ? 'set' : 'sets'}`,
                        s.total_volume_kg > 0 ? formatVolume(s.total_volume_kg, unit) : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')
                    : 'Logged without details'}
                </Text>
              </View>
              {!!s && s.prs.length > 0 && (
                <View style={styles.prBadge} accessible accessibilityLabel={`${s.prs.length} personal records`}>
                  <Ionicons name="trophy" size={12} color={Colors.white} />
                  <Text style={styles.prText}>{s.prs.length}</Text>
                </View>
              )}
            </View>
            {ratings.length > 0 && <Text style={ws.body}>{ratings.join(' · ')}</Text>}
            {!!s &&
              exercisesInSession(s).map((e) => {
                const ex = exercise(e.exerciseId);
                return (
                  <TouchableOpacity
                    key={e.exerciseId}
                    style={styles.exercise}
                    onPress={() => openExercise(e.exerciseId)}
                    accessibilityRole="button"
                    accessibilityHint="Opens this exercise’s history"
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={ws.body}>{ex.name}</Text>
                      <Text style={ws.muted}>{e.sets.map((set) => formatSetValues(set, ex.kind, unit)).join('  ·  ')}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={Colors.gray} />
                  </TouchableOpacity>
                );
              })}
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  session: { gap: Spacing.sm },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  prBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: WORKOUTS_ACCENT,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  prText: { color: Colors.white, fontWeight: '700', fontSize: 12 },
  exercise: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.separator,
  },
});
