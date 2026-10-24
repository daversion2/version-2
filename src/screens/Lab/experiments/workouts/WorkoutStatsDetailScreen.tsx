import React, { useLayoutEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing } from '../../../../constants/theme';
import { MuscleGroup, StatsRange, WorkoutsStackParamList } from '../../../../types/workouts';
import { MUSCLE_GROUP_LABELS } from '../../../../data/workoutExercises';
import {
  bestSetTrend,
  byExercise,
  filterRows,
  flattenSets,
  rangeStart,
  recentSessionsFor,
  totalsOf,
  volumeBars,
} from '../../../../services/workoutStats';
import { formatSetValues } from '../../../../services/workoutMath';
import { formatDayHeader, toLocalDateString } from '../../../../utils/date';
import { useWorkouts } from './WorkoutsContext';
import {
  BreakdownRow,
  RANGE_PHRASE,
  RangePicker,
  recordLines,
  StatTiles,
  TrendChart,
  VolumeChart,
} from './components/StatsParts';
import { WORKOUTS_ACCENT, ws } from './components/workoutsStyle';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'WorkoutStatsDetail'>;

/**
 * One body part, or one exercise: the same totals and chart, narrowed. A body
 * part lists its exercises; an exercise shows its records and recent sessions.
 */
export const WorkoutStatsDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { kind, id } = route.params;
  const { sessions, exercisesById, exercise, prefs, records } = useWorkouts();
  const [range, setRange] = useState<StatsRange>(route.params.range);
  const unit = prefs.unit;
  const isExercise = kind === 'exercise';
  const ex = isExercise ? exercise(id) : null;
  const title = ex ? ex.name : MUSCLE_GROUP_LABELS[id as MuscleGroup] ?? 'Body part';

  useLayoutEffect(() => navigation.setOptions({ title }), [navigation, title]);

  const scoped = useMemo(
    () =>
      filterRows(flattenSets(sessions, exercisesById), isExercise ? { exerciseId: id } : { muscle: id as MuscleGroup }),
    [sessions, exercisesById, id, isExercise]
  );
  const view = useMemo(() => {
    const now = new Date();
    const rows = filterRows(scoped, { from: rangeStart(range, now) });
    return { totals: totalsOf(rows), bars: volumeBars(scoped, range, now), exercises: byExercise(rows) };
  }, [scoped, range]);

  // Nothing weighted to add up (push-ups, planks): chart how much was done instead.
  const metric = scoped.some((r) => r.weightKg > 0 && r.reps > 0) ? 'volume' : 'sets';
  const recent = useMemo(() => (isExercise ? recentSessionsFor(sessions, id, 8) : []), [sessions, id, isExercise]);
  const records_ = isExercise ? recordLines(records[id], unit) : [];
  // The last 12 sessions whatever the range above: a week holds one or two,
  // too few to show a direction.
  const trend = useMemo(() => (ex ? bestSetTrend(sessions, id, ex.kind) : []), [sessions, id, ex?.kind]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ScrollView style={ws.screen} contentContainerStyle={ws.scroll}>
      <RangePicker value={range} onChange={setRange} />
      <StatTiles totals={view.totals} unit={unit} />
      <VolumeChart bars={view.bars} unit={unit} metric={metric} />

      {isExercise ? (
        <>
          {ex && trend.length >= 2 && <TrendChart points={trend} kind={ex.kind} unit={unit} />}

          {records_.length > 0 && (
            <>
              <Text style={ws.sectionLabel}>Records</Text>
              <View style={[ws.card, styles.records]}>
                {records_.map((line) => (
                  <Text key={line} style={styles.record}>
                    {line}
                  </Text>
                ))}
              </View>
            </>
          )}

          <Text style={ws.sectionLabel}>Recent sessions</Text>
          {recent.length === 0 ? (
            <Text style={ws.muted}>Not logged yet.</Text>
          ) : (
            recent.map((line) => (
              <View key={line.sessionId} style={ws.card}>
                <Text style={ws.title}>
                  {formatDayHeader(toLocalDateString(new Date(line.finishedAt)))}
                  <Text style={ws.muted}>  {line.workoutName}</Text>
                </Text>
                <Text style={styles.sets}>
                  {line.sets.map((s) => formatSetValues(s, ex!.kind, unit)).join('  ·  ')}
                </Text>
              </View>
            ))
          )}
        </>
      ) : view.exercises.length === 0 ? (
        <Text style={ws.muted}>Nothing logged {RANGE_PHRASE[range]}.</Text>
      ) : (
        <>
          <Text style={ws.sectionLabel}>Exercises {RANGE_PHRASE[range]}</Text>
          {view.exercises.map((e) => (
            <BreakdownRow
              key={e.exerciseId}
              title={exercise(e.exerciseId).name}
              totals={e}
              unit={unit}
              maxVolumeKg={view.exercises[0]?.volumeKg ?? 0}
              onPress={() => navigation.push('WorkoutStatsDetail', { kind: 'exercise', id: e.exerciseId, range })}
            />
          ))}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  records: { gap: 4 },
  record: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: WORKOUTS_ACCENT },
  sets: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark, marginTop: Spacing.xs, lineHeight: 20 },
});
