import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../../../constants/theme';
import type { Exercise, SetValues, WeightUnit } from '../../../../../types/workouts';
import { fromDisplayWeight, stepWeight, toDisplayWeight } from '../../../../../services/workoutMath';
import { isLoggableSet } from '../../../../../services/weeklyVolume';
import { NumberStepper } from './NumberStepper';
import { ws } from './workoutsStyle';

interface Props {
  visible: boolean;
  exercise?: Exercise;
  unit: WeightUnit;
  /** add: weight, reps and how many sets. edit: one set's numbers, plus delete. */
  mode: 'add' | 'edit';
  initial: SetValues;
  /** "From Leg Day, Mon" — where an edited set came from. */
  note?: string;
  onSave: (values: SetValues, count: number) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel: () => void;
}

const SECONDS_STEP = 5;

/** Weight × reps (or reps, or seconds) for This week — adding sets, or fixing one — and Done it's sets. */
export const SetEntrySheet: React.FC<Props> = ({ visible, exercise, unit, mode, initial, note, onSave, onDelete, onCancel }) => {
  const insets = useSafeAreaInsets();
  const [values, setValues] = useState<SetValues>(initial);
  const [count, setCount] = useState(1);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setValues(initial);
      setCount(1);
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!exercise) return null;
  const kind = exercise.kind;
  // This week leaves distance out; a Done-it set can still be one (its time).
  const ok = kind === 'distance' ? (values.seconds ?? 0) > 0 : isLoggableSet(kind, values);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  const reps = values.reps ?? 0;
  const seconds = values.seconds ?? 0;
  const weightKg = values.weightKg ?? 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismiss} onPress={onCancel} accessibilityLabel="Cancel" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Spacing.md) + Spacing.md }]}>
          <Text style={styles.title}>{exercise.name}</Text>
          {!!note && <Text style={ws.muted}>{note}</Text>}

          <View style={styles.row}>
            {kind === 'weight' && (
              <NumberStepper
                label={`Weight (${unit})`}
                value={toDisplayWeight(weightKg, unit)}
                onDecrement={() => setValues((v) => ({ ...v, weightKg: stepWeight(v.weightKg ?? 0, unit, -1) }))}
                onIncrement={() => setValues((v) => ({ ...v, weightKg: stepWeight(v.weightKg ?? 0, unit, 1) }))}
                onSubmitValue={(n) => setValues((v) => ({ ...v, weightKg: fromDisplayWeight(n, unit) }))}
                allowDecimal
              />
            )}
            {(kind === 'weight' || kind === 'reps') && (
              <NumberStepper
                label="Reps"
                value={reps}
                onDecrement={() => setValues((v) => ({ ...v, reps: Math.max(0, (v.reps ?? 0) - 1) }))}
                onIncrement={() => setValues((v) => ({ ...v, reps: (v.reps ?? 0) + 1 }))}
                onSubmitValue={(n) => setValues((v) => ({ ...v, reps: Math.round(n) }))}
              />
            )}
            {(kind === 'time' || kind === 'distance') && (
              <NumberStepper
                label={kind === 'distance' ? 'Time (seconds)' : 'Seconds'}
                value={seconds}
                onDecrement={() => setValues((v) => ({ ...v, seconds: Math.max(0, (v.seconds ?? 0) - SECONDS_STEP) }))}
                onIncrement={() => setValues((v) => ({ ...v, seconds: (v.seconds ?? 0) + SECONDS_STEP }))}
                onSubmitValue={(n) => setValues((v) => ({ ...v, seconds: Math.round(n) }))}
              />
            )}
          </View>

          {mode === 'add' && (
            <View style={styles.row}>
              <NumberStepper
                label="Sets"
                value={count}
                onDecrement={() => setCount((c) => Math.max(1, c - 1))}
                onIncrement={() => setCount((c) => Math.min(20, c + 1))}
                onSubmitValue={(n) => setCount(Math.min(20, Math.max(1, Math.round(n))))}
              />
            </View>
          )}

          <TouchableOpacity
            style={[ws.primaryBtn, (!ok || busy) && ws.disabled]}
            disabled={!ok || busy}
            onPress={() => run(() => onSave(values, count))}
            accessibilityRole="button"
          >
            {busy ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={ws.primaryBtnText}>
                {mode === 'edit' ? 'Save' : count > 1 ? `Add ${count} sets` : 'Add set'}
              </Text>
            )}
          </TouchableOpacity>

          {mode === 'edit' && onDelete && (
            <TouchableOpacity
              style={styles.delete}
              disabled={busy}
              onPress={() => run(onDelete)}
              accessibilityRole="button"
            >
              <Text style={styles.deleteText}>Delete this set</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  dismiss: { flex: 1 },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg - 4,
    paddingTop: Spacing.lg - 2,
    gap: Spacing.sm,
  },
  title: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xl, color: Colors.dark },
  row: { flexDirection: 'row', gap: Spacing.sm },
  delete: { alignItems: 'center', paddingVertical: Spacing.sm, minHeight: 44, justifyContent: 'center' },
  deleteText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.danger },
});
