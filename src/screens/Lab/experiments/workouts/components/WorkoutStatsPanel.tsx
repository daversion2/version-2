import React, { useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Spacing } from '../../../../../constants/theme';
import { StatsRange, WorkoutsStackParamList } from '../../../../../types/workouts';
import { MUSCLE_GROUP_LABELS } from '../../../../../data/workoutExercises';
import {
  byExercise,
  byMuscle,
  filterRows,
  flattenSets,
  rangeStart,
  totalsOf,
  volumeBars,
} from '../../../../../services/workoutStats';
import { useWorkouts } from '../WorkoutsContext';
import { BreakdownRow, rangePhrase, RangePicker, StatTiles, VolumeChart } from './StatsParts';
import { Copy } from '../../../../../components/common/Copy';
import { useCopy } from '../../../../../context/CopyContext';
import { ws } from './workoutsStyle';

/** History → Stats: totals for a span, the trend, then body parts and exercises to drill into. */
export const WorkoutStatsPanel: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<WorkoutsStackParamList>>();
  const { sessions, exercisesById, exercise, prefs } = useWorkouts();
  const [range, setRange] = useState<StatsRange>('month');
  const unit = prefs.unit;

  const all = useMemo(() => flattenSets(sessions, exercisesById), [sessions, exercisesById]);
  const view = useMemo(() => {
    const now = new Date();
    const rows = filterRows(all, { from: rangeStart(range, now) });
    return {
      totals: totalsOf(rows),
      bars: volumeBars(all, range, now),
      muscles: byMuscle(rows),
      exercises: byExercise(rows),
    };
  }, [all, range]);

  if (all.length === 0) {
    return (
      <Copy id="workouts.statsPanel.empty" style={ws.muted}>
        Finish a workout and your totals start here — volume, sets and reps, by exercise and body part.
      </Copy>
    );
  }

  const open = (kind: 'exercise' | 'muscle', id: string) =>
    navigation.navigate('WorkoutStatsDetail', { kind, id, range });

  return (
    <View style={{ gap: Spacing.md }}>
      <RangePicker value={range} onChange={setRange} />
      <StatTiles totals={view.totals} unit={unit} />
      <VolumeChart bars={view.bars} unit={unit} metric="volume" />

      {view.totals.sets === 0 ? (
        <Copy id="workouts.statsPanel.nothing" style={ws.muted} vars={{ when: rangePhrase(range) }}>
          {'Nothing logged {when} yet.'}
        </Copy>
      ) : (
        <>
          <Copy id="workouts.statsPanel.byBody" style={ws.sectionLabel}>
            By body part
          </Copy>
          {view.muscles.map((m) => (
            <BreakdownRow
              key={m.muscle}
              title={MUSCLE_GROUP_LABELS[m.muscle]}
              totals={m}
              unit={unit}
              maxVolumeKg={view.muscles[0]?.volumeKg ?? 0}
              onPress={() => open('muscle', m.muscle)}
            />
          ))}

          <Copy id="workouts.statsPanel.byExercise" style={ws.sectionLabel}>
            By exercise
          </Copy>
          {view.exercises.map((e) => (
            <BreakdownRow
              key={e.exerciseId}
              title={exercise(e.exerciseId).name}
              totals={e}
              unit={unit}
              maxVolumeKg={view.exercises[0]?.volumeKg ?? 0}
              onPress={() => open('exercise', e.exerciseId)}
            />
          ))}
        </>
      )}
    </View>
  );
};
