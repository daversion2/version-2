import React, { useLayoutEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, TextStyles } from '../../../../constants/theme';
import { WorkoutSession, WorkoutsStackParamList } from '../../../../types/workouts';
import {
  addDoneItBlock,
  blockTitle,
  DONE_IT_MINUTES,
  doneItEnd,
  editLoggedSet,
  estimateWorkoutMinutes,
  fillAsPrescribed,
  makeId,
  newBlockShape,
  roundsDone,
  setRoundsDone,
  swapItem,
  swapRelogValues,
  withLoggedTimes,
} from '../../../../services/workoutSession';
import { insteadOfLine } from '../../../../services/exerciseSwap';
import { SwapExerciseSheet } from './components/SwapExerciseSheet';
import { DEFAULT_TARGET, formatSetValues } from '../../../../services/workoutMath';
import { formatRelativeDay, getEditableDates } from '../../../../utils/date';
import { showConfirm } from '../../../../utils/alert';
import { Stepper } from '../../../../components/common/Stepper';
import { Copy } from '../../../../components/common/Copy';
import { useCopy } from '../../../../context/CopyContext';
import { useWorkouts } from './WorkoutsContext';
import { useFinishWorkout } from './components/useFinishWorkout';
import { SetEntrySheet } from './components/SetEntrySheet';
import { ExercisePickerModal } from './components/ExercisePickerModal';
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
 * With no workoutId it logs a workout that was never saved ("Log a past
 * workout" on the home): it starts empty and exercises are added here, each
 * filled in as prescribed (addDoneItBlock). Either way more can be added.
 *
 * Held on this screen only, never as the app's draft: a live workout that's
 * still in progress stays where it is.
 */
export const WorkoutDoneItScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const t = useCopy();
  const { workouts, exercise, exercisesById, sessions, prefs, buildSession } = useWorkouts();
  const { saving, finish } = useFinishWorkout();
  const workoutId = route.params?.workoutId;
  const workout = workoutId ? workouts.find((w) => w.id === workoutId) : undefined;
  const adHoc = !workoutId;

  const days = getEditableDates();
  const [date, setDate] = useState(days[0]);
  const [minutes, setMinutes] = useState(() => (workout ? estimateWorkoutMinutes(workout, exercisesById) : 45));
  const [session, setSession] = useState<WorkoutSession | null>(() =>
    workout || adHoc
      ? fillAsPrescribed({ ...buildSession(workout), ...(adHoc ? { workoutName: 'Workout' } : {}) }, {
          exercisesById,
          sessions,
          end: new Date(),
          durationSec: minutes * 60,
        })
      : null
  );
  // Switching workouts starts over, so it asks first once anything here has changed.
  const untouched = useRef(session);
  const switchable = workouts.filter((w) => w.blocks.length > 0);
  // undefined = a workout that was never saved.
  const switchTo = (nextId: string | undefined) => {
    if (nextId === workoutId) return;
    const go = () => navigation.replace('WorkoutDoneIt', nextId ? { workoutId: nextId } : {});
    if (session === untouched.current) return go();
    showConfirm(
      t('workouts.doneIt.switchTitle', 'Switch workout?'),
      t('workouts.doneIt.switchMsg', 'Your changes to this one won’t be saved.'),
      go,
      t('workouts.doneIt.switch', 'Switch')
    );
  };
  const [picking, setPicking] = useState(false);
  const [editing, setEditing] = useState<{ blockIndex: number; setIndex: number } | null>(null);
  // "Swap for today" on one item (2026-11-20): its filled-in sets are re-prescribed for the new exercise.
  const [swapping, setSwapping] = useState<{ blockIndex: number; itemIndex: number } | null>(null);
  const swapItemNow = swapping && session ? session.blocks[swapping.blockIndex]?.items[swapping.itemIndex] : undefined;

  useLayoutEffect(() => {
    navigation.setOptions({ title: adHoc ? t('workouts.doneIt.title', 'Log a past workout') : workout?.name ?? '' });
  }, [navigation, adHoc, workout?.name, t]);

  if (!session) {
    return (
      <View style={[ws.screen, styles.center]}>
        <Copy id="workouts.doneIt.gone" style={ws.muted}>
          This workout no longer exists.
        </Copy>
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
        {adHoc ? (
          <Copy id="workouts.doneIt.leadAdHoc" style={ws.lead}>
            Add each exercise you did. Sets fill in from last time; change anything that went differently, then save.
          </Copy>
        ) : (
          <Copy id="workouts.doneIt.lead" style={ws.lead}>
            Filled in as planned. Change anything that went differently, then save.
          </Copy>
        )}

        {switchable.length > (adHoc ? 0 : 1) && (
          <View style={ws.card}>
            <Copy id="workouts.doneIt.which" style={ws.title}>
              Which workout?
            </Copy>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {switchable.map((w) => {
                const on = w.id === workout?.id;
                return (
                  <TouchableOpacity
                    key={w.id}
                    style={[ws.chip, on && ws.chipActive]}
                    onPress={() => switchTo(w.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                  >
                    <Text style={[ws.chipText, on && ws.chipTextActive]}>{w.name}</Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={[ws.chip, adHoc && ws.chipActive]}
                onPress={() => switchTo(undefined)}
                accessibilityRole="radio"
                accessibilityState={{ checked: adHoc }}
              >
                <Copy id="workouts.doneIt.somethingElse" style={[ws.chipText, adHoc && ws.chipTextActive]}>
                  Something else
                </Copy>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        <View style={ws.card}>
          <Copy id="workouts.doneIt.when" style={ws.title}>
            When?
          </Copy>
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
            <Copy id="workouts.doneIt.howLong" style={[ws.title, { flex: 1 }]}>
              How long?
            </Copy>
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
                  <Text style={ws.muted}>
                    {done === 0
                      ? t('workouts.doneIt.notDone', 'Not done')
                      : multi
                        ? t('workouts.doneIt.circuit', 'Circuit')
                        : t('workouts.doneIt.planned', 'Planned {n}', { n: block.plannedRounds })}
                  </Text>
                </View>
                <Stepper
                  value={done}
                  onChange={(n) => setSession((s) => s && setRoundsDone(s, bi, n, { exercisesById, sessions }))}
                  min={0}
                  max={MAX_ROUNDS}
                  format={(n) =>
                    multi
                      ? n === 1
                        ? t('workouts.doneIt.oneRound', '{n} round', { n })
                        : t('workouts.doneIt.nRounds', '{n} rounds', { n })
                      : n === 1
                        ? t('workouts.doneIt.oneSet', '{n} set', { n })
                        : t('workouts.doneIt.nSets', '{n} sets', { n })
                  }
                  accessibilityLabel={`${multi ? 'Rounds' : 'Sets'} of ${blockTitle(block, exercisesById)}`}
                  tint={WORKOUTS_ACCENT}
                />
              </View>
              {block.items.map((item, ii) => (
                <TouchableOpacity
                  key={`swap-${ii}`}
                  style={[styles.row, styles.swapRow, ws.separator]}
                  onPress={() => setSwapping({ blockIndex: bi, itemIndex: ii })}
                  accessibilityRole="button"
                  accessibilityLabel={`Swap ${exercise(item.exerciseId).name} for today`}
                >
                  <Ionicons name="swap-horizontal" size={16} color={WORKOUTS_ACCENT} />
                  <Text style={[ws.link, { flex: 1 }]} numberOfLines={1}>
                    {item.swappedFrom
                      ? `${exercise(item.exerciseId).name} · ${insteadOfLine(exercise(item.swappedFrom.exerciseId).name, item.swappedFrom.reason)}`
                      : t('workouts.doneIt.swap', 'Swap {name}', { name: exercise(item.exerciseId).name })}
                  </Text>
                </TouchableOpacity>
              ))}
              {block.sets.map((set, si) => {
                const ex = exercise(set.exerciseId);
                const firstOfRound = si % block.items.length === 0;
                const label = multi ? ex.name : t('workouts.doneIt.setN', 'Set {n}', { n: set.round + 1 });
                return (
                  <View key={si}>
                    {multi && firstOfRound && (
                      <Copy id="workouts.doneIt.roundN" style={styles.roundLabel} vars={{ n: set.round + 1 }}>
                        {'Round {n}'}
                      </Copy>
                    )}
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

        <TouchableOpacity
          style={[ws.secondaryBtn, styles.addBtn]}
          onPress={() => setPicking(true)}
          accessibilityHint="Pick one exercise, or several to log as a circuit"
        >
          <Copy id="workouts.doneIt.addExercise" style={ws.secondaryBtnText}>
            + Add exercise
          </Copy>
        </TouchableOpacity>
      </ScrollView>

      <View style={[ws.footer, { paddingBottom: Spacing.sm + insets.bottom }]}>
        <TouchableOpacity
          style={[ws.primaryBtn, (saving || !anyDone) && ws.disabled]}
          onPress={save}
          disabled={saving || !anyDone}
        >
          {saving ? <ActivityIndicator color={Colors.white} /> : <Copy id="workouts.doneIt.save" style={ws.primaryBtnText}>
              Save & rate it
            </Copy>}
        </TouchableOpacity>
        <Copy id="workouts.doneIt.footerNote" style={[ws.muted, styles.footerNote]}>
          Next, on Today: how hard it was to start, then how hard it was to keep going. It counts toward your week.
        </Copy>
      </View>

      <SwapExerciseSheet
        visible={!!swapItemNow}
        planned={swapItemNow ? exercise(swapItemNow.swappedFrom?.exerciseId ?? swapItemNow.exerciseId) : null}
        current={swapItemNow ? exercise(swapItemNow.exerciseId) : null}
        onCancel={() => setSwapping(null)}
        onPick={(picked, reason) => {
          const at = swapping;
          setSwapping(null);
          if (!at || !swapItemNow) return;
          const values = swapRelogValues(swapItemNow, picked, sessions);
          setSession((s) => s && swapItem(s, at.blockIndex, at.itemIndex, { exercise: picked, reason, values }));
        }}
      />

      <ExercisePickerModal
        visible={picking}
        title={t('workouts.doneIt.addWhat', 'Add what you did')}
        mode="multi"
        onCancel={() => setPicking(false)}
        onConfirm={(picked) => {
          setPicking(false);
          setSession(
            (s) =>
              s &&
              addDoneItBlock(
                s,
                picked.map((e) => ({ exerciseId: e.id, target: { ...DEFAULT_TARGET[e.kind] } })),
                {
                  id: makeId('block'),
                  rounds: newBlockShape(picked.map((e) => e.kind)).rounds,
                  ...(picked.length > 1 ? { name: 'Circuit' } : {}),
                  exercisesById,
                  sessions,
                }
              )
          );
        }}
      />

      <SetEntrySheet
        visible={!!editingSet}
        exercise={editingSet ? exercise(editingSet.exerciseId) : undefined}
        unit={unit}
        vt1={prefs.vt1_bpm}
        vt2={prefs.vt2_bpm}
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
  swapRow: { paddingHorizontal: Spacing.md, minHeight: 40 },
  value: { ...TextStyles.subhead, color: Colors.dark, fontVariant: ['tabular-nums'] },
  footerNote: { textAlign: 'center' },
  addBtn: { marginTop: Spacing.xs },
});
