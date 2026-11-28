import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../../../constants/theme';
import { BlockItem, SetValues, WorkoutBlock } from '../../../../../types/workouts';
import { defaultIntervalSec } from '../../../../../services/workoutSession';
import { SegmentedControl } from '../../../../../components/common/SegmentedControl';
import {
  DEFAULT_TARGET,
  formatClock,
  formatSeconds,
  fromDisplayWeight,
  stepWeight,
  toDisplayWeight,
} from '../../../../../services/workoutMath';
import { showConfirm } from '../../../../../utils/alert';
import { useWorkouts } from '../WorkoutsContext';
import { NumberStepper } from './NumberStepper';
import { TimeEntry } from './TimeEntry';
import { CardioZonePicker } from './CardioEntry';
import { CardioZonesInfo } from './CardioZonesInfo';
import { ExercisePickerModal } from './ExercisePickerModal';
import { ExercisePhotos } from './ExerciseDemoCard';
import { Copy } from '../../../../../components/common/Copy';
import { useCopy } from '../../../../../context/CopyContext';
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
  const tx = useCopy();
  const kind = exercise(item.exerciseId).kind;
  const t = { ...DEFAULT_TARGET[kind], ...item.target };

  if (kind === 'cardio') {
    const minutes = Math.round((t.seconds ?? DEFAULT_TARGET.cardio.seconds!) / 60);
    return (
      <View style={styles.cardioTarget}>
        <NumberStepper
          size="small"
          label={tx('workouts.block.minutes', 'Minutes')}
          value={minutes}
          onDecrement={() => onChange({ ...t, seconds: clamp(minutes - 1, 1, 600) * 60 })}
          onIncrement={() => onChange({ ...t, seconds: clamp(minutes + 1, 1, 600) * 60 })}
          onSubmitValue={(v) => onChange({ ...t, seconds: clamp(Math.round(v), 1, 600) * 60 })}
        />
        <View style={styles.zoneHead}>
          <Copy id="workouts.block.howHard" style={ws.muted}>
            How hard
          </Copy>
          <CardioZonesInfo size={18} />
        </View>
        <CardioZonePicker compact value={t.zone ?? 1} onChange={(zone) => onChange({ ...t, zone })} />
      </View>
    );
  }
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
        label={tx('workouts.block.seconds', 'Seconds')}
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
        label={tx('workouts.block.reps', 'Reps')}
        value={t.reps ?? 10}
        onDecrement={() => onChange({ ...t, reps: clamp((t.reps ?? 10) - 1, 1, 500) })}
        onIncrement={() => onChange({ ...t, reps: clamp((t.reps ?? 10) + 1, 1, 500) })}
        onSubmitValue={(v) => onChange({ ...t, reps: clamp(Math.round(v), 1, 500) })}
      />
      {kind === 'weight' && (
        <NumberStepper
          size="small"
          label={tx('workouts.block.weight', 'Weight ({unit})', { unit: prefs.unit })}
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
  const t = useCopy();
  const [draft, setDraft] = useState<WorkoutBlock | null>(block);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    if (visible) setDraft(block);
  }, [visible, block]);

  if (!draft) return null;
  const isCircuit = draft.items.length > 1;
  const onClock = !!draft.intervalSec;

  const setClock = (mode: 'rest' | 'interval') => {
    if (mode === 'interval') return setDraft({ ...draft, intervalSec: defaultIntervalSec(draft) });
    const { intervalSec: _off, ...rest } = draft;
    setDraft(rest);
  };

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
            <Copy id="workouts.block.cancel" style={styles.headerAction}>
              Cancel
            </Copy>
          </TouchableOpacity>
          <Text style={styles.title}>
            {isCircuit ? t('workouts.block.circuit', 'Circuit') : exercise(draft.items[0].exerciseId).name}
          </Text>
          <TouchableOpacity
            onPress={() => onSave({ ...draft, type: isCircuit ? 'circuit' : 'single' })}
            hitSlop={8}
          >
            <Copy id="workouts.block.done" style={[styles.headerAction, styles.headerSave]}>
              Done
            </Copy>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {isCircuit && (
            <View style={{ gap: Spacing.xs }}>
              <Copy id="workouts.block.name" style={ws.sectionLabel}>
                Name
              </Copy>
              <TextInput
                style={styles.nameInput}
                value={draft.name ?? ''}
                onChangeText={(name) => setDraft({ ...draft, name })}
                placeholder={t('workouts.block.circuit', 'Circuit')}
                placeholderTextColor={Colors.gray}
              />
            </View>
          )}

          <View style={styles.pair}>
            <NumberStepper
              label={isCircuit ? t('workouts.block.rounds', 'Rounds') : t('workouts.block.sets', 'Sets')}
              value={draft.rounds}
              onDecrement={() => setDraft({ ...draft, rounds: clamp(draft.rounds - 1, 1, 20) })}
              onIncrement={() => setDraft({ ...draft, rounds: clamp(draft.rounds + 1, 1, 20) })}
            />
            {onClock ? (
              <NumberStepper
                label={isCircuit ? t('workouts.block.roundEvery', 'A round every') : t('workouts.block.setEvery', 'A set every')}
                value={draft.intervalSec!}
                suffix={formatClock(draft.intervalSec!)}
                onDecrement={() => setDraft({ ...draft, intervalSec: clamp(draft.intervalSec! - 15, 30, 900) })}
                onIncrement={() => setDraft({ ...draft, intervalSec: clamp(draft.intervalSec! + 15, 30, 900) })}
              />
            ) : (
              <NumberStepper
                label={
                  isCircuit
                    ? t('workouts.block.restAfterRound', 'Rest after a round')
                    : t('workouts.block.restBetweenSets', 'Rest between sets')
                }
                value={draft.restSec}
                suffix={draft.restSec > 0 ? formatSeconds(draft.restSec) : t('workouts.block.noRest', 'no rest')}
                onDecrement={() => setDraft({ ...draft, restSec: clamp(draft.restSec - 15, 0, 600) })}
                onIncrement={() => setDraft({ ...draft, restSec: clamp(draft.restSec + 15, 0, 600) })}
              />
            )}
          </View>

          <View style={{ gap: Spacing.xs }}>
            <Copy id="workouts.block.clock" style={ws.sectionLabel}>
              Clock
            </Copy>
            <SegmentedControl
              accessibilityLabel="Clock"
              options={[
                { value: 'rest', label: t('workouts.block.restAfterEach', 'Rest after each') },
                { value: 'interval', label: t('workouts.block.onClock', 'On the clock') },
              ]}
              value={onClock ? 'interval' : 'rest'}
              onChange={setClock}
            />
          </View>
          <Text style={ws.muted}>
            {onClock
              ? t(
                  'workouts.block.clockExplain',
                  '{each} starts on the clock; whatever’s left after the work is rest. {count} take {time}.{extra}',
                  {
                    each: isCircuit ? t('workouts.block.eachRound', 'Each round') : t('workouts.block.eachSet', 'Each set'),
                    count: isCircuit
                      ? draft.rounds === 1
                        ? t('workouts.block.oneRound', '{n} round', { n: draft.rounds })
                        : t('workouts.block.nRounds', '{n} rounds', { n: draft.rounds })
                      : draft.rounds === 1
                        ? t('workouts.block.oneSet', '{n} set', { n: draft.rounds })
                        : t('workouts.block.nSets', '{n} sets', { n: draft.rounds }),
                    time: formatClock(draft.rounds * draft.intervalSec!),
                    extra: isCircuit ? t('workouts.block.backToBack', ' The exercises run back to back inside it.') : '',
                  }
                )
              : isCircuit
                ? t('workouts.block.noRestCircuit', 'Exercises run back to back with no rest; the timer starts after the last one.')
                : t('workouts.block.restNote', 'Rest starts when you log the set. Best for sets to failure or anything you can’t time.')}
          </Text>

          <Text style={ws.sectionLabel}>
            {isCircuit ? t('workouts.block.inOrder', 'Exercises, in order') : t('workouts.block.eachSetLabel', 'Each set')}
          </Text>
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
              <ExercisePhotos exerciseId={item.exerciseId} style={styles.photos} />
              <TargetEditor item={item} onChange={(target) => setItem(index, target)} />
            </View>
          ))}

          <TouchableOpacity style={ws.secondaryBtn} onPress={() => setPicking(true)}>
            <Text style={ws.secondaryBtnText}>
              {isCircuit
                ? t('workouts.block.addToCircuit', 'Add an exercise to the circuit')
                : t('workouts.block.makeCircuit', 'Make it a circuit — add an exercise')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.delete}
            onPress={() =>
              showConfirm(
                t('workouts.block.removeTitle', 'Remove from workout?'),
                t('workouts.block.removeMsg', 'This only changes the plan, not past sessions.'),
                onDelete,
                t('workouts.block.remove', 'Remove')
              )
            }
          >
            <Ionicons name="trash-outline" size={16} color={Colors.danger} />
            <Text style={styles.deleteText}>
              {isCircuit ? t('workouts.block.removeCircuit', 'Remove circuit') : t('workouts.block.removeExercise', 'Remove exercise')}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <ExercisePickerModal
          visible={picking}
          title={t('workouts.block.addToCircuitTitle', 'Add to circuit')}
          mode="multi"
          confirmLabel={(n) => t('workouts.block.addN', 'Add {n} to the circuit', { n })}
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
  cardioTarget: { gap: Spacing.sm },
  zoneHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  photos: { marginTop: Spacing.sm },
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
