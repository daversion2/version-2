import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../../../constants/theme';
import { BlockItem, SetValues, WorkoutBlock } from '../../../../../types/workouts';
import {
  DEFAULT_TARGET,
  formatSeconds,
  fromDisplayWeight,
  stepWeight,
  toDisplayWeight,
} from '../../../../../services/workoutMath';
import { showConfirm } from '../../../../../utils/alert';
import { useWorkouts } from '../WorkoutsContext';
import { NumberStepper } from './NumberStepper';
import { TimeEntry } from './TimeEntry';
import { ExercisePickerModal } from './ExercisePickerModal';
import { WORKOUTS_ACCENT, ws } from './workoutsStyle';

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

interface Props {
  visible: boolean;
  block: WorkoutBlock | null;
  onCancel: () => void;
  onSave: (block: WorkoutBlock) => void;
  onDelete: () => void;
}

/** One planned item's numbers: reps (+ optional weight), seconds, or a target time. */
const TargetEditor: React.FC<{ item: BlockItem; onChange: (target: SetValues) => void }> = ({
  item,
  onChange,
}) => {
  const { exercise, prefs } = useWorkouts();
  const kind = exercise(item.exerciseId).kind;
  const t = { ...DEFAULT_TARGET[kind], ...item.target };

  if (kind === 'distance') {
    return (
      <TimeEntry
        size="small"
        labelPrefix="Target"
        seconds={t.seconds ?? DEFAULT_TARGET.distance.seconds!}
        onChange={(seconds) => onChange({ ...t, seconds })}
      />
    );
  }
  if (kind === 'time') {
    return (
      <NumberStepper
        size="small"
        label="Seconds"
        value={t.seconds ?? 30}
        onDecrement={() => onChange({ ...t, seconds: clamp((t.seconds ?? 30) - 5, 5, 3600) })}
        onIncrement={() => onChange({ ...t, seconds: clamp((t.seconds ?? 30) + 5, 5, 3600) })}
        onSubmitValue={(v) => onChange({ ...t, seconds: clamp(Math.round(v), 1, 3600) })}
      />
    );
  }
  return (
    <View style={styles.targetRow}>
      <NumberStepper
        size="small"
        label="Reps"
        value={t.reps ?? 10}
        onDecrement={() => onChange({ ...t, reps: clamp((t.reps ?? 10) - 1, 1, 500) })}
        onIncrement={() => onChange({ ...t, reps: clamp((t.reps ?? 10) + 1, 1, 500) })}
        onSubmitValue={(v) => onChange({ ...t, reps: clamp(Math.round(v), 1, 500) })}
      />
      {kind === 'weight' && (
        <NumberStepper
          size="small"
          label={`Weight (${prefs.unit})`}
          value={toDisplayWeight(t.weightKg ?? 0, prefs.unit)}
          allowDecimal
          onDecrement={() => onChange({ ...t, weightKg: stepWeight(t.weightKg ?? 0, prefs.unit, -1) })}
          onIncrement={() => onChange({ ...t, weightKg: stepWeight(t.weightKg ?? 0, prefs.unit, 1) })}
          onSubmitValue={(v) => onChange({ ...t, weightKg: fromDisplayWeight(v, prefs.unit) })}
        />
      )}
    </View>
  );
};

export const BlockEditorModal: React.FC<Props> = ({ visible, block, onCancel, onSave, onDelete }) => {
  const { exercise } = useWorkouts();
  const [draft, setDraft] = useState<WorkoutBlock | null>(block);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    if (visible) setDraft(block);
  }, [visible, block]);

  if (!draft) return null;
  const isCircuit = draft.items.length > 1;

  const setItem = (index: number, target: SetValues) =>
    setDraft({ ...draft, items: draft.items.map((it, i) => (i === index ? { ...it, target } : it)) });

  const removeItem = (index: number) => {
    const items = draft.items.filter((_, i) => i !== index);
    setDraft({ ...draft, items, type: items.length > 1 ? 'circuit' : 'single' });
  };

  const moveItem = (index: number, delta: -1 | 1) => {
    const to = index + delta;
    if (to < 0 || to >= draft.items.length) return;
    const items = [...draft.items];
    [items[index], items[to]] = [items[to], items[index]];
    setDraft({ ...draft, items });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <View style={styles.sheet}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} hitSlop={8}>
            <Text style={styles.headerAction}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{isCircuit ? 'Circuit' : exercise(draft.items[0].exerciseId).name}</Text>
          <TouchableOpacity
            onPress={() => onSave({ ...draft, type: isCircuit ? 'circuit' : 'single' })}
            hitSlop={8}
          >
            <Text style={[styles.headerAction, styles.headerSave]}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {isCircuit && (
            <View style={{ gap: Spacing.xs }}>
              <Text style={ws.sectionLabel}>Name</Text>
              <TextInput
                style={styles.nameInput}
                value={draft.name ?? ''}
                onChangeText={(name) => setDraft({ ...draft, name })}
                placeholder="Circuit"
                placeholderTextColor={Colors.gray}
              />
            </View>
          )}

          <View style={styles.pair}>
            <NumberStepper
              label={isCircuit ? 'Rounds' : 'Sets'}
              value={draft.rounds}
              onDecrement={() => setDraft({ ...draft, rounds: clamp(draft.rounds - 1, 1, 20) })}
              onIncrement={() => setDraft({ ...draft, rounds: clamp(draft.rounds + 1, 1, 20) })}
            />
            <NumberStepper
              label={isCircuit ? 'Rest after a round' : 'Rest between sets'}
              value={draft.restSec}
              suffix={draft.restSec > 0 ? formatSeconds(draft.restSec) : 'no rest'}
              onDecrement={() => setDraft({ ...draft, restSec: clamp(draft.restSec - 15, 0, 600) })}
              onIncrement={() => setDraft({ ...draft, restSec: clamp(draft.restSec + 15, 0, 600) })}
            />
          </View>
          {isCircuit && (
            <Text style={ws.muted}>
              Exercises run back to back with no rest; the timer starts after the last one.
            </Text>
          )}

          <Text style={ws.sectionLabel}>{isCircuit ? 'Exercises, in order' : 'Each set'}</Text>
          {draft.items.map((item, index) => (
            <View key={`${item.exerciseId}_${index}`} style={ws.card}>
              <View style={styles.itemHead}>
                <Text style={[ws.title, { flex: 1 }]}>{exercise(item.exerciseId).name}</Text>
                {isCircuit && (
                  <View style={styles.itemActions}>
                    <TouchableOpacity onPress={() => moveItem(index, -1)} hitSlop={6} disabled={index === 0}>
                      <Ionicons name="chevron-up" size={20} color={index === 0 ? Colors.border : Colors.gray} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => moveItem(index, 1)}
                      hitSlop={6}
                      disabled={index === draft.items.length - 1}
                    >
                      <Ionicons
                        name="chevron-down"
                        size={20}
                        color={index === draft.items.length - 1 ? Colors.border : Colors.gray}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeItem(index)} hitSlop={6}>
                      <Ionicons name="close-circle-outline" size={20} color={Colors.gray} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              <TargetEditor item={item} onChange={(target) => setItem(index, target)} />
            </View>
          ))}

          <TouchableOpacity style={ws.secondaryBtn} onPress={() => setPicking(true)}>
            <Text style={ws.secondaryBtnText}>
              {isCircuit ? 'Add an exercise to the circuit' : 'Make it a circuit — add an exercise'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.delete}
            onPress={() =>
              showConfirm('Remove from workout?', 'This only changes the plan, not past sessions.', onDelete, 'Remove')
            }
          >
            <Ionicons name="trash-outline" size={16} color={Colors.danger} />
            <Text style={styles.deleteText}>Remove {isCircuit ? 'circuit' : 'exercise'}</Text>
          </TouchableOpacity>
        </ScrollView>

        <ExercisePickerModal
          visible={picking}
          title="Add to circuit"
          mode="multi"
          confirmLabel={(n) => `Add ${n} to the circuit`}
          onCancel={() => setPicking(false)}
          onConfirm={(picked) => {
            setPicking(false);
            const items = [
              ...draft.items,
              ...picked.map((e) => ({ exerciseId: e.id, target: { ...DEFAULT_TARGET[e.kind] } })),
            ];
            setDraft({ ...draft, items, type: items.length > 1 ? 'circuit' : 'single' });
          }}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: Colors.lightGray },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
  },
  headerAction: { fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: WORKOUTS_ACCENT, minWidth: 60 },
  headerSave: { fontFamily: Fonts.secondaryBold, textAlign: 'right' },
  title: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg, color: Colors.dark, flexShrink: 1 },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  nameInput: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  pair: { flexDirection: 'row', gap: Spacing.sm },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  targetRow: { flexDirection: 'row', justifyContent: 'space-around' },
  delete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  deleteText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.danger },
});
