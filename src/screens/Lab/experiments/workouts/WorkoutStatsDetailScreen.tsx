import React, { useLayoutEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
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
import { recordSources } from '../../../../services/workoutEdit';
import { formatDayHeader, toLocalDateString } from '../../../../utils/date';
import { Copy } from '../../../../components/common/Copy';
import { useCopy } from '../../../../context/CopyContext';
import { useWorkouts } from './WorkoutsContext';
import {
  BreakdownRow,
  rangePhrase,
  RangePicker,
  StatTiles,
  TrendChart,
  VolumeChart,
} from './components/StatsParts';
import { WORKOUTS_ACCENT, ws } from './components/workoutsStyle';
import { TestHistoryRows } from './components/TestHistory';
import { testHistory } from '../../../../services/exerciseTests';
import { insteadOfLine, SessionSwap, sessionSwaps, swappedForLine, swapsAwayFrom } from '../../../../services/exerciseSwap';
import { testTypeFor } from '../../../../services/trainingPhases';
import { hasHowTo } from './components/exerciseHowTo';
import { ExerciseDemoCard } from './components/ExerciseDemoCard';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'WorkoutStatsDetail'>;

/**
 * One body part, or one exercise: the same totals and chart, narrowed. A body
 * part lists its exercises; an exercise shows its records and recent sessions.
 */
export const WorkoutStatsDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { kind, id } = route.params;
  const t = useCopy();
  const { sessions, exercisesById, exercise, prefs, records, tests, phases } = useWorkouts();
  const [range, setRange] = useState<StatsRange>(route.params.range);
  const unit = prefs.unit;
  const isExercise = kind === 'exercise';
  const ex = isExercise ? exercise(id) : null;
  const title = ex ? ex.name : MUSCLE_GROUP_LABELS[id as MuscleGroup] ?? t('workouts.stats.bodyPart', 'Body part');

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
  const records_ = useMemo(
    () => (isExercise && records[id] ? recordSources(records[id], sessions, unit) : []),
    [isExercise, records, id, sessions, unit]
  );
  // The last 12 sessions whatever the range above: a week holds one or two,
  // too few to show a direction.
  const testsOf = useMemo(() => (ex ? testHistory(ex, tests, phases) : []), [ex, tests, phases]);
  const trend = useMemo(() => (ex ? bestSetTrend(sessions, id, ex.kind) : []), [sessions, id, ex?.kind]); // eslint-disable-line react-hooks/exhaustive-deps
  // Swaps (2026-11-20): sessions where this exercise stood in for another, and
  // days it was swapped out for something else.
  // Session id → the swaps this exercise stood in for there (it can be more than one).
  const swapIns = useMemo(() => {
    const map = new Map<string, SessionSwap[]>();
    for (const s of sessions) {
      const mine = sessionSwaps(s).filter((w) => w.toId === id);
      if (mine.length) map.set(s.id, mine);
    }
    return map;
  }, [sessions, id]);
  const swappedIds = useMemo(() => new Set(swapIns.keys()), [swapIns]);
  const swapAways = useMemo(() => (isExercise ? swapsAwayFrom(sessions, id).slice(0, 8) : []), [sessions, id, isExercise]);
  const workoutNameOf = (sessionId: string) => sessions.find((s) => s.id === sessionId)?.workout_name ?? '';
  const recentRows = [
    ...recent.map((line) => ({ kind: 'done' as const, at: line.finishedAt, line })),
    ...swapAways.map((away) => ({ kind: 'away' as const, at: away.finishedAt, away })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8);

  return (
    <ScrollView style={ws.screen} contentContainerStyle={ws.scroll}>
      {isExercise && hasHowTo(id) && (
        <>
          <Copy id="workouts.stats.howTo" style={ws.sectionLabel}>
            How to do it
          </Copy>
          <ExerciseDemoCard exerciseId={id} />
        </>
      )}
      <RangePicker value={range} onChange={setRange} />
      <StatTiles totals={view.totals} unit={unit} />
      <VolumeChart bars={view.bars} unit={unit} metric={metric} />

      {isExercise ? (
        <>
          {ex && trend.length >= 2 && <TrendChart points={trend} kind={ex.kind} unit={unit} swappedIds={swappedIds} />}

          {records_.length > 0 && (
            <>
              <Copy id="workouts.stats.records" style={ws.sectionLabel}>
                Records
              </Copy>
              <View style={[ws.card, styles.records]}>
                {records_.map(({ line, sessionId }) =>
                  sessionId ? (
                    <TouchableOpacity
                      key={line}
                      style={styles.recordLine}
                      onPress={() => navigation.navigate('WorkoutEditSession', { sessionId, exerciseId: id })}
                      accessibilityRole="button"
                      accessibilityLabel={`${line}. Open the workout that set it`}
                    >
                      <Text style={styles.record}>{line}</Text>
                      <Ionicons name="chevron-forward" size={14} color={Colors.gray} />
                    </TouchableOpacity>
                  ) : (
                    <Text key={line} style={styles.record}>
                      {line}
                    </Text>
                  )
                )}
              </View>
            </>
          )}

          <View style={styles.testsHead}>
            <Copy id="workouts.stats.tests" style={ws.sectionLabel}>
              Tests
            </Copy>
            <TouchableOpacity
              onPress={() => navigation.navigate('ExerciseTest', { exerciseId: id })}
              accessibilityRole="button"
              hitSlop={8}
            >
              <Copy id="workouts.stats.testThis" style={styles.testLink}>
                Test this
              </Copy>
            </TouchableOpacity>
          </View>
          {ex && testsOf.length > 0 ? (
            <TestHistoryRows entries={testsOf} type={testTypeFor(ex.kind)} unit={unit} />
          ) : (
            <Copy id="workouts.stats.notTested" style={ws.muted}>
              Not tested yet. A test shows whether you’re getting better, even without a program.
            </Copy>
          )}

          <Copy id="workouts.stats.recent" style={ws.sectionLabel}>
            Recent sessions
          </Copy>
          {recentRows.length === 0 ? (
            <Copy id="workouts.stats.notLogged" style={ws.muted}>
              Not logged yet.
            </Copy>
          ) : (
            recentRows.map((row) =>
              row.kind === 'away' ? (
                <View key={`away-${row.away.sessionId}`} style={ws.card}>
                  <Text style={ws.title}>
                    {formatDayHeader(toLocalDateString(new Date(row.away.finishedAt)))}
                    <Text style={ws.muted}>  {workoutNameOf(row.away.sessionId)}</Text>
                  </Text>
                  <Text style={styles.swapLine}>{swappedForLine(exercise(row.away.toId).name, row.away.reason)}</Text>
                </View>
              ) : (
                <TouchableOpacity
                  key={row.line.sessionId}
                  style={ws.card}
                  onPress={() => navigation.navigate('WorkoutEditSession', { sessionId: row.line.sessionId, exerciseId: id })}
                  accessibilityRole="button"
                  accessibilityHint="Opens this workout to edit it"
                >
                  <View style={styles.recentHead}>
                    <Text style={[ws.title, { flex: 1 }]}>
                      {formatDayHeader(toLocalDateString(new Date(row.line.finishedAt)))}
                      <Text style={ws.muted}>  {row.line.workoutName}</Text>
                    </Text>
                    <Copy id="workouts.stats.edit" style={styles.testLink}>
                      Edit
                    </Copy>
                  </View>
                  <Text style={styles.sets}>
                    {row.line.sets.map((s) => formatSetValues(s, ex!.kind, unit)).join('  ·  ')}
                  </Text>
                  {(swapIns.get(row.line.sessionId) ?? []).map((w) => (
                    <Text key={`${w.blockId}-${w.itemIndex}`} style={styles.swapLine}>
                      {insteadOfLine(exercise(w.fromId).name, w.reason)}
                    </Text>
                  ))}
                </TouchableOpacity>
              )
            )
          )}
        </>
      ) : view.exercises.length === 0 ? (
        <Copy id="workouts.stats.nothing" style={ws.muted} vars={{ when: rangePhrase(range) }}>
          {'Nothing logged {when}.'}
        </Copy>
      ) : (
        <>
          <Copy id="workouts.stats.exercises" style={ws.sectionLabel} vars={{ when: rangePhrase(range) }}>
            {'Exercises {when}'}
          </Copy>
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
  testsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  testLink: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: WORKOUTS_ACCENT },
  record: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: WORKOUTS_ACCENT },
  recordLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 36 },
  recentHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sets: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark, marginTop: Spacing.xs, lineHeight: 20 },
  swapLine: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: WORKOUTS_ACCENT, marginTop: Spacing.xs },
});
