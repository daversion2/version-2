import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BorderRadius, Colors, Spacing, TextStyles } from '../../../../constants/theme';
import { ListGroup, ListRow } from '../../../../components/common/ListGroup';
import { SegmentedControl } from '../../../../components/common/SegmentedControl';
import type { MuscleGroup, WorkoutsStackParamList } from '../../../../types/workouts';
import { MUSCLE_GROUP_LABELS } from '../../../../data/workoutExercises';
import { clampWeeklyGoal } from '../../../../services/appCheckins';
import { describeCardioCredit } from '../../../../services/cardio';
import { formatSeconds, formatVolume } from '../../../../services/workoutMath';
import {
  buildWorkoutWeek,
  DEFAULT_WEEK_VIEW,
  describeRating,
  describeWorkouts,
  WEEK_VIEW_LABELS,
  WeekView,
  weekWindow,
  windowSpan,
  windowTitle,
} from '../../../../services/workoutWeek';
import { useWorkouts } from './WorkoutsContext';
import { WORKOUTS_ACCENT, ws } from './components/workoutsStyle';
import { CardioWeekCard } from './components/CardioWeekCard';
import { useWorkoutLogs, WeekStrip, weekdayName } from './components/WeekParts';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'WorkoutWeek'>;

const VIEWS: { value: WeekView; label: string }[] = [
  { value: 'rolling', label: WEEK_VIEW_LABELS.rolling },
  { value: 'calendar', label: WEEK_VIEW_LABELS.calendar },
];

/**
 * Your week at a glance (founder, 2026-11-20): the days you trained, the
 * totals, which muscles got the work, and the two ratings. Every part opens
 * what's behind it — a day its sessions and sets, a muscle its exercises, an
 * exercise its history. Last 7 days or Monday to Sunday, the user's choice,
 * remembered; ‹ › page back through earlier windows. Logic in
 * services/workoutWeek.ts.
 */
export const WorkoutWeekScreen: React.FC<Props> = ({ navigation }) => {
  const { sessions, exercisesById, exercise, prefs, updatePrefs, userId } = useWorkouts();
  const logs = useWorkoutLogs(userId);
  const view: WeekView = prefs.week_view ?? DEFAULT_WEEK_VIEW;
  const [offset, setOffset] = useState(0);
  const [openMuscle, setOpenMuscle] = useState<MuscleGroup | null>(null);
  const unit = prefs.unit;
  const goal = clampWeeklyGoal(prefs.weekly_goal, 'workouts');

  const week = useMemo(() => {
    const now = new Date();
    return buildWorkoutWeek({ sessions, exercisesById, logs, window: weekWindow(view, now, offset), now });
  }, [sessions, exercisesById, logs, view, offset]);

  const changeView = (next: WeekView) => {
    setOffset(0);
    setOpenMuscle(null);
    updatePrefs({ week_view: next }).catch(() => {});
  };

  const openDay = (date: string) => navigation.navigate('WorkoutDay', { date });
  const openExercise = (exerciseId: string) =>
    navigation.navigate('WorkoutStatsDetail', { kind: 'exercise', id: exerciseId, range: 'month' });

  const topMuscleSets = Math.max(1, ...week.muscles.map((m) => m.sets));
  // Newest first, workouts logged with no details included.
  const daySessions = [...week.days].reverse().flatMap((d) => [...d.sessions].reverse().map((s) => ({ day: d, s })));
  const change =
    week.volumeChangePct === null ? null : `${week.volumeChangePct >= 0 ? '↑' : '↓'} ${Math.abs(week.volumeChangePct)}%`;

  return (
    <ScrollView style={ws.screen} contentContainerStyle={ws.scroll}>
      <SegmentedControl options={VIEWS} value={view} onChange={changeView} accessibilityLabel="Show the week as" />

      <View style={ws.card}>
        <View style={styles.windowHead}>
          <TouchableOpacity
            onPress={() => setOffset((o) => o + 1)}
            style={styles.pager}
            accessibilityRole="button"
            accessibilityLabel="Earlier"
          >
            <Ionicons name="chevron-back" size={22} color={WORKOUTS_ACCENT} />
          </TouchableOpacity>
          <View style={styles.windowTitles}>
            <Text style={ws.title}>{windowTitle(week.window)}</Text>
            <Text style={ws.muted}>{windowSpan(week.window)}</Text>
          </View>
          <TouchableOpacity
            onPress={() => setOffset((o) => Math.max(0, o - 1))}
            disabled={offset === 0}
            style={[styles.pager, offset === 0 && ws.disabled]}
            accessibilityRole="button"
            accessibilityLabel="Later"
            accessibilityState={{ disabled: offset === 0 }}
          >
            <Ionicons name="chevron-forward" size={22} color={WORKOUTS_ACCENT} />
          </TouchableOpacity>
        </View>
        <Text style={styles.headline}>{describeWorkouts(week, goal)}</Text>
        <WeekStrip days={week.days} onOpenDay={openDay} />
      </View>

      <View style={styles.tiles}>
        <Tile label="Time" value={week.durationSec > 0 ? formatSeconds(week.durationSec) : '–'} />
        <Tile label="Sets" value={String(week.sets)} />
        <Tile
          label="Volume"
          value={week.volumeKg > 0 ? formatVolume(week.volumeKg, unit) : '–'}
          note={change ? `${change} on ${view === 'calendar' ? 'the week before' : 'the 7 days before'}` : undefined}
        />
        <Tile label="PRs" value={String(week.prs)} />
      </View>

      {week.cardio.totalMin >= 1 && (
        <>
          <Text style={ws.sectionLabel}>Cardio · {describeCardioCredit(week.cardio)}</Text>
          <CardioWeekCard week={week.cardio} />
        </>
      )}

      <View style={ws.card}>
        <Text style={ws.title}>Muscles</Text>
        <Text style={ws.muted}>Sets per muscle group. Tap one for its exercises.</Text>
        <View style={styles.muscles}>
          {week.muscles.map((m) => {
            const open = openMuscle === m.muscle;
            return (
              <View key={m.muscle}>
                <TouchableOpacity
                  style={styles.muscleRow}
                  onPress={() => setOpenMuscle(open ? null : m.muscle)}
                  disabled={m.sets === 0}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open, disabled: m.sets === 0 }}
                  accessibilityLabel={`${MUSCLE_GROUP_LABELS[m.muscle]}, ${m.sets} ${m.sets === 1 ? 'set' : 'sets'}`}
                >
                  <Text style={[styles.muscleName, m.sets === 0 && styles.muscleNone]}>{MUSCLE_GROUP_LABELS[m.muscle]}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${(m.sets / topMuscleSets) * 100}%` }]} />
                  </View>
                  <Text style={[styles.muscleCount, m.sets === 0 && styles.muscleNone]}>{m.sets}</Text>
                  <Ionicons
                    name={open ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color={m.sets === 0 ? 'transparent' : Colors.gray}
                  />
                </TouchableOpacity>
                {open &&
                  m.exercises.map((e) => (
                    <TouchableOpacity
                      key={e.exerciseId}
                      style={styles.exerciseRow}
                      onPress={() => openExercise(e.exerciseId)}
                      accessibilityRole="button"
                    >
                      <Text style={ws.body}>{exercise(e.exerciseId).name}</Text>
                      <Text style={ws.muted}>
                        {e.sets} {e.sets === 1 ? 'set' : 'sets'} ›
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>
            );
          })}
        </View>
      </View>

      {daySessions.length > 0 ? (
        <ListGroup title="Sessions">
          {daySessions.map(({ day, s }, i) => (
            <ListRow
              key={s.session?.id ?? `${day.date}-${i}`}
              title={s.name}
              subtitle={[
                weekdayName(day.date),
                s.session && !s.session.logged_sets && s.session.duration_sec > 0 ? formatSeconds(s.session.duration_sec) : null,
                s.session ? `${s.session.total_sets} sets` : 'logged without details',
                s.session && s.session.total_volume_kg > 0 ? formatVolume(s.session.total_volume_kg, unit) : null,
              ]
                .filter(Boolean)
                .join(' · ')}
              onPress={() => openDay(day.date)}
            />
          ))}
        </ListGroup>
      ) : (
        <Text style={ws.lead}>Nothing logged {week.window.offset === 0 && view === 'rolling' ? 'in the last 7 days' : 'in these 7 days'}.</Text>
      )}

      <ListGroup title="Your override">
        <ListRow title="Getting started" value={describeRating(week.ratings.start) ?? 'Not rated'} />
        <ListRow title="Staying with it" value={describeRating(week.ratings.stay) ?? 'Not rated'} />
      </ListGroup>

      <ListGroup footer="Every exercise since Monday, with your weekly targets. Add or edit sets there.">
        <ListRow
          title="Sets by exercise"
          subtitle="On This week"
          icon={{ name: 'barbell', color: WORKOUTS_ACCENT }}
          onPress={() => navigation.navigate('WeeklyVolume')}
        />
      </ListGroup>
    </ScrollView>
  );
};

const Tile: React.FC<{ label: string; value: string; note?: string }> = ({ label, value, note }) => (
  <View style={styles.tile} accessible accessibilityLabel={`${label}: ${value}${note ? `, ${note}` : ''}`}>
    <Text style={ws.muted}>{label}</Text>
    <Text style={styles.tileValue}>{value}</Text>
    {!!note && <Text style={ws.muted}>{note}</Text>}
  </View>
);

const styles = StyleSheet.create({
  windowHead: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xs },
  windowTitles: { flex: 1, alignItems: 'center' },
  pager: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headline: { ...TextStyles.title3, color: Colors.dark, textAlign: 'center', marginBottom: Spacing.sm },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: 2,
  },
  tileValue: { ...TextStyles.title2, color: Colors.dark },
  muscles: { marginTop: Spacing.sm, gap: 2 },
  muscleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 40 },
  muscleName: { ...TextStyles.subhead, color: Colors.dark, width: 84 },
  muscleNone: { color: Colors.gray },
  barTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: Colors.fill, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4, backgroundColor: WORKOUTS_ACCENT },
  muscleCount: { ...TextStyles.subhead, color: Colors.dark, width: 28, textAlign: 'right' },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 40,
    paddingLeft: 84 + Spacing.sm,
    paddingRight: Spacing.xs,
  },
});
