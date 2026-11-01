import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing } from '../../../../constants/theme';
import type { SetValues, WorkoutsStackParamList } from '../../../../types/workouts';
import {
  canLogKind,
  describeTarget,
  describeWeekRow,
  editSet,
  entriesByDay,
  prefillFrom,
  removeSet,
  targetFraction,
  targetUnit,
  WeekEntry,
  weekSummary,
} from '../../../../services/weeklyVolume';
import { formatCount, formatSeconds, formatSetValues, formatVolume } from '../../../../services/workoutMath';
import { formatRelativeDay } from '../../../../utils/date';
import { showAlert, showConfirm } from '../../../../utils/alert';
import { useWorkouts } from './WorkoutsContext';
import { NumberStepper } from './components/NumberStepper';
import { ProgressBar } from './components/PhaseParts';
import { SetEntrySheet } from './components/SetEntrySheet';
import { useLogSets } from './components/useLogSets';
import { WORKOUTS_ACCENT, ws } from './components/workoutsStyle';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'WeeklyVolumeExercise'>;

const TARGET_STEP = { reps: 5, sec: 30 } as const;
const DEFAULT_TARGET = { reps: 100, sec: 300 } as const;

/** One exercise this week: its sets by day (each one editable), its weekly target, and "+ Add sets". */
export const WeeklyVolumeExerciseScreen: React.FC<Props> = ({ navigation, route }) => {
  const { exerciseId } = route.params;
  const { sessions, exercise: exerciseOf, exercisesById, prefs, updatePrefs, changeSession } = useWorkouts();
  const exercise = exerciseOf(exerciseId);
  const unitOfTarget = targetUnit(exercise.kind);
  const logSets = useLogSets();

  const row = useMemo(() => {
    const week = weekSummary({ sessions, exercisesById, targets: prefs.weekly_targets, now: new Date() });
    return week.rows.find((r) => r.exerciseId === exerciseId);
  }, [sessions, exercisesById, prefs.weekly_targets, exerciseId]);

  const savedTarget = prefs.weekly_targets?.[exerciseId] ?? 0;
  const [target, setTarget] = useState(savedTarget || (unitOfTarget ? DEFAULT_TARGET[unitOfTarget] : 0));
  useEffect(() => {
    if (savedTarget) setTarget(savedTarget);
  }, [savedTarget]);

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<WeekEntry | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: exercise.name });
  }, [navigation, exercise.name]);

  const saveTarget = async (n: number) => {
    try {
      await updatePrefs({ weekly_targets: { ...(prefs.weekly_targets ?? {}), [exerciseId]: n } });
    } catch {
      showAlert("Couldn't save the target", 'Check your connection and try again.');
    }
  };

  const sessionOf = (entry: WeekEntry) => sessions.find((s) => s.id === entry.sessionId);

  const saveEdit = async (values: SetValues) => {
    const entry = editing;
    const session = entry && sessionOf(entry);
    if (!entry || !session) return;
    try {
      await changeSession(session.id, editSet(session, entry, values, exercisesById), [exerciseId]);
      setEditing(null);
    } catch {
      showAlert("Couldn't save that set", 'Check your connection and try again.');
    }
  };

  const deleteEntry = async () => {
    const entry = editing;
    const session = entry && sessionOf(entry);
    if (!entry || !session) return;
    const remove = async () => {
      try {
        await changeSession(session.id, removeSet(session, entry, exercisesById), [exerciseId]);
        setEditing(null);
      } catch {
        showAlert("Couldn't delete that set", 'Check your connection and try again.');
      }
    };
    if (entry.fromLog) return remove();
    // A set from a workout: say where it's being taken from.
    setEditing(null);
    setTimeout(
      () => showConfirm('Delete this set?', `It comes out of ${entry.sessionName} too.`, remove, 'Delete'),
      400
    );
  };

  const days = row ? entriesByDay(row.entries) : [];
  const targetText = row ? describeTarget(row) : null;
  const lastWeek =
    row && (row.lastWeekProgress > 0 || row.lastWeekVolumeKg > 0)
      ? exercise.kind === 'weight'
        ? `Last week: ${formatCount(row.lastWeekProgress)} reps · ${formatVolume(row.lastWeekVolumeKg, prefs.unit)}`
        : unitOfTarget === 'sec'
          ? `Last week: ${formatSeconds(row.lastWeekProgress)}`
          : `Last week: ${formatCount(row.lastWeekProgress)} reps`
      : null;

  return (
    <ScrollView style={ws.screen} contentContainerStyle={ws.scroll}>
      <View style={[ws.card, { gap: 4 }]}>
        <Text style={styles.eyebrow}>This week</Text>
        <Text style={ws.body}>{row ? describeWeekRow(row, prefs.unit) : 'Not done yet this week'}</Text>
        {!!lastWeek && <Text style={ws.muted}>{lastWeek}</Text>}
        {row && targetText && (
          <View style={styles.target}>
            <ProgressBar value={targetFraction(row)} max={1} />
            <Text style={styles.targetText}>{targetText}</Text>
          </View>
        )}
      </View>

      {canLogKind(exercise.kind) && !exercise.archived_at && (
        <TouchableOpacity style={ws.primaryBtn} onPress={() => setAdding(true)} accessibilityRole="button">
          <Text style={ws.primaryBtnText}>+ Add sets</Text>
        </TouchableOpacity>
      )}

      {unitOfTarget && (
        <>
          <Text style={ws.sectionLabel}>Weekly target</Text>
          <View style={[ws.card, { gap: Spacing.sm }]}>
            <Text style={ws.muted}>
              {unitOfTarget === 'sec' ? 'Seconds held' : 'Reps'} to reach by Sunday. It keeps this exercise on This week
              even before you’ve done it.
            </Text>
            <View style={styles.targetRow}>
              <NumberStepper
                label={unitOfTarget === 'sec' ? 'Seconds a week' : 'Reps a week'}
                value={target}
                onDecrement={() => setTarget((t) => Math.max(TARGET_STEP[unitOfTarget], t - TARGET_STEP[unitOfTarget]))}
                onIncrement={() => setTarget((t) => t + TARGET_STEP[unitOfTarget])}
                onSubmitValue={(n) => setTarget(Math.max(1, Math.round(n)))}
              />
            </View>
            <TouchableOpacity
              style={[ws.secondaryBtn, target === savedTarget && ws.disabled]}
              disabled={target === savedTarget || target <= 0}
              onPress={() => saveTarget(target)}
              accessibilityRole="button"
            >
              <Text style={ws.secondaryBtnText}>{savedTarget ? 'Update target' : 'Set target'}</Text>
            </TouchableOpacity>
            {savedTarget > 0 && (
              <TouchableOpacity style={styles.link} onPress={() => saveTarget(0)} accessibilityRole="button">
                <Text style={styles.linkText}>Remove target</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}

      {days.map(({ date, entries }) => (
        <View key={date} style={{ gap: Spacing.sm }}>
          <Text style={ws.sectionLabel}>{formatRelativeDay(date)}</Text>
          <View style={ws.card}>
            {entries.map((entry, i) => (
              <TouchableOpacity
                key={`${entry.sessionId}-${entry.blockIndex}-${entry.setIndex}`}
                style={[styles.entry, i > 0 && styles.entryBorder]}
                onPress={() => setEditing(entry)}
                accessibilityRole="button"
                accessibilityHint="Edit or delete this set"
              >
                <Text style={ws.body}>{formatSetValues(entry.set, exercise.kind, prefs.unit)}</Text>
                <Text style={ws.muted}>{entry.sessionName}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <SetEntrySheet
        visible={adding}
        exercise={exercise}
        unit={prefs.unit}
        mode="add"
        initial={prefillFrom(sessions, exercise)}
        onCancel={() => setAdding(false)}
        onSave={async (values, count) => {
          await logSets(exercise, values, count, () => setAdding(false));
        }}
      />

      <SetEntrySheet
        visible={!!editing}
        exercise={exercise}
        unit={prefs.unit}
        mode="edit"
        initial={editing?.set ?? {}}
        note={editing ? `${editing.sessionName}, ${formatRelativeDay(editing.date)}` : undefined}
        onCancel={() => setEditing(null)}
        onSave={(values) => saveEdit(values)}
        onDelete={deleteEntry}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  eyebrow: {
    fontFamily: Fonts.secondaryBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: WORKOUTS_ACCENT,
  },
  target: { gap: 4, marginTop: 4 },
  targetText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.dark },
  targetRow: { flexDirection: 'row' },
  link: { alignSelf: 'center', minHeight: 44, justifyContent: 'center' },
  linkText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.gray },
  entry: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 },
  entryBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
});
