import React, { useLayoutEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, TextStyles } from '../../../../constants/theme';
import { WorkoutSession, WorkoutsStackParamList } from '../../../../types/workouts';
import {
  blockTitle,
  DONE_IT_MINUTES,
  doneItEnd,
  editLoggedSet,
  estimateWorkoutMinutes,
  fillAsPrescribed,
  roundsDone,
  setRoundsDone,
  withLoggedTimes,
} from '../../../../services/workoutSession';
import { formatSetValues } from '../../../../services/workoutMath';
import { formatRelativeDay, getEditableDates } from '../../../../utils/date';
import { Stepper } from '../../../../components/common/Stepper';
import { useWorkouts } from './WorkoutsContext';
import { useFinishWorkout } from './components/useFinishWorkout';
import { SetEntrySheet } from './components/SetEntrySheet';
import { WORKOUTS_ACCENT, ws } from './components/workoutsStyle';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'WorkoutDoneIt'>;

/** Most rounds a block can be set to here — the same ceiling as adding sets on This week. */
const MAX_ROUNDS = 20;

/**
 * "Done it": a workout already done, without running it in the app. Every
 * planned set is filled in as prescribed (services/workoutSession.ts,
 * fillAsPrescribed); fix what went differently, say when and how long, save.
 * It saves exactly like a finished live workout and goes to Today to be rated.
 *
 * Held on this screen only, never as the app's draft: a live workout that's
 * still in progress stays where it is.
 */
export const WorkoutDoneItScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { workouts, exercise, exercisesById, sessions, prefs, buildSession } = useWorkouts();
  const { saving, finish } = useFinishWorkout();
  const workout = workouts.find((w) => w.id === route.params.workoutId);

  const days = getEditableDates();
  const [date, setDate] = useState(days[0]);
  const [minutes, setMinutes] = useState(() => (workout ? estimateWorkoutMinutes(workout, exercisesById) : 45));
  const [session, setSession] = useState<WorkoutSession | null>(() =>
    workout
      ? fillAsPrescribed(buildSession(workout), { exercisesById, sessions, end: new Date(), durationSec: minutes * 60 })
      : null
  );
  const [editing, setEditing] = useState<{ blockIndex: number; setIndex: number } | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: workout?.name ?? '' });
  }, [navigation, workout?.name]);

  if (!session) {
    return (
      <View style={[ws.screen, styles.center]}>
        <Text style={ws.muted}>This workout no longer exists.</Text>
      </View>
    );
  }

  const unit = session.unit ?? prefs.unit;
  const retime = (nextDate: string, nextMinutes: number) => {
    setDate(nextDate);
    setMinutes(nextMinutes);
    setSession((s) => s && withLoggedTimes(s, doneItEnd(nextDate, new Date()), nextMinutes * 60));
  };
  const anyDone = session.blocks.some((b) => b.sets.length > 0);
  const editingSet = editing ? session.blocks[editing.blockIndex]?.sets[editing.setIndex] : undefined;

  const save = () =>
    finish(withLoggedTimes(session, doneItEnd(date, new Date()), minutes * 60), {
      // Timed out: the save is queued. Keep the same session, so a retry rewrites it.
      onTimedOut: setSession,
    });

  return (
    <View style={ws.screen}>
      <ScrollView contentContainerStyle={[ws.scroll, { paddingBottom: 150 + insets.bottom }]}>
        <Text style={ws.lead}>Filled in as planned. Change anything that went differently, then save.</Text>

        <View style={ws.card}>
          <Text style={ws.title}>When?</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {days.map((d) => {
              const on = d === date;
              return (
                <TouchableOpacity
                  key={d}
                  style={[ws.chip, on && ws.chipActive]}
                  onPress={() => retime(d, minutes)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                >
                  <Text style={[ws.chipText, on && ws.chipTextActive]}>{formatRelativeDay(d)}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View style={[styles.row, styles.howLong]}>
            <Text style={[ws.title, { flex: 1 }]}>How long?</Text>
            <Stepper
              value={minutes}
              onChange={(m) => retime(date, m)}
              min={DONE_IT_MINUTES.min}
              max={DONE_IT_MINUTES.max}
              step={DONE_IT_MINUTES.step}
              format={(m) => `${m} min`}
              accessibilityLabel="How long it took"
              tint={WORKOUTS_ACCENT}
            />
          </View>
        </View>

        {session.blocks.map((block, bi) => {
          const multi = block.items.length > 1;
          const done = roundsDone(block);
          return (
            <View key={block.id} style={ws.panel}>
              <View style={[styles.row, styles.blockHead, done > 0 && ws.separator]}>
                <View style={{ flex: 1 }}>
                  <Text style={[ws.title, done === 0 && styles.muted]}>{blockTitle(block, exercisesById)}</Text>
                  <Text style={ws.muted}>{done === 0 ? 'Not done' : multi ? 'Circuit' : `Planned ${block.plannedRounds}`}</Text>
                </View>
                <Stepper
                  value={done}
                  onChange={(n) => setSession((s) => s && setRoundsDone(s, bi, n, { exercisesById, sessions }))}
                  min={0}
                  max={MAX_ROUNDS}
                  format={(n) => `${n} ${multi ? (n === 1 ? 'round' : 'rounds') : n === 1 ? 'set' : 'sets'}`}
                  accessibilityLabel={`${multi ? 'Rounds' : 'Sets'} of ${blockTitle(block, exercisesById)}`}
                  tint={WORKOUTS_ACCENT}
                />
              </View>
              {block.sets.map((set, si) => {
                const ex = exercise(set.exerciseId);
                const firstOfRound = si % block.items.length === 0;
                const label = multi ? ex.name : `Set ${set.round + 1}`;
                return (
                  <View key={si}>
                    {multi && firstOfRound && <Text style={styles.roundLabel}>Round {set.round + 1}</Text>}
                    <TouchableOpacity
                      style={[styles.row, styles.setRow]}
                      onPress={() => setEditing({ blockIndex: bi, setIndex: si })}
                      accessibilityRole="button"
                      accessibilityLabel={`${multi ? `Round ${set.round + 1}, ` : ''}${label}, ${formatSetValues(set, ex.kind, unit)}. Change`}
                    >
                      <Text style={[ws.body, { flex: 1 }]}>{label}</Text>
                      <Text style={styles.value}>{formatSetValues(set, ex.kind, unit)}</Text>
                      <Ionicons name="chevron-forward" size={16} color={Colors.gray} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>

      <View style={[ws.footer, { paddingBottom: Spacing.sm + insets.bottom }]}>
        <TouchableOpacity
          style={[ws.primaryBtn, (saving || !anyDone) && ws.disabled]}
          onPress={save}
          disabled={saving || !anyDone}
        >
          {saving ? <ActivityIndicator color={Colors.white} /> : <Text style={ws.primaryBtnText}>Save & rate it</Text>}
        </TouchableOpacity>
        <Text style={[ws.muted, styles.footerNote]}>
          Next: rate your override on Today, and it counts toward your week.
        </Text>
      </View>

      <SetEntrySheet
        visible={!!editingSet}
        exercise={editingSet ? exercise(editingSet.exerciseId) : undefined}
        unit={unit}
        mode="edit"
        initial={editingSet ?? {}}
        onSave={async (values) => {
          if (editing) setSession((s) => s && editLoggedSet(s, editing.blockIndex, editing.setIndex, values));
          setEditing(null);
        }}
        onCancel={() => setEditing(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  chips: { gap: Spacing.sm, paddingVertical: Spacing.sm },
  howLong: { marginTop: Spacing.xs },
  blockHead: { paddingHorizontal: Spacing.md, paddingVertical: 12 },
  muted: { color: Colors.gray },
  roundLabel: { ...TextStyles.footnote, color: Colors.gray, paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  setRow: { paddingHorizontal: Spacing.md, minHeight: 44 },
  value: { ...TextStyles.subhead, color: Colors.dark, fontVariant: ['tabular-nums'] },
  footerNote: { textAlign: 'center' },
});
