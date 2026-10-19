import React, { useEffect, useLayoutEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePreventRemove } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../../constants/theme';
import { Exercise, Workout, WorkoutBlock, WorkoutsStackParamList } from '../../../../types/workouts';
import { DEFAULT_REST_SEC } from '../../../../data/workoutExercises';
import { DEFAULT_TARGET } from '../../../../services/workoutMath';
import { blockTitle, describeBlock, makeId } from '../../../../services/workoutSession';
import { newWorkoutId } from '../../../../services/labWorkouts';
import { showAlert, showConfirm } from '../../../../utils/alert';
import { useWorkouts } from './WorkoutsContext';
import { ExercisePickerModal } from './components/ExercisePickerModal';
import { BlockEditorModal } from './components/BlockEditorModal';
import { WORKOUTS_ACCENT, WORKOUTS_TINT, ws } from './components/workoutsStyle';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'WorkoutBuilder'>;

const blockFrom = (picked: Exercise[]): WorkoutBlock => ({
  id: makeId('block'),
  type: picked.length > 1 ? 'circuit' : 'single',
  ...(picked.length > 1 ? { name: 'Circuit' } : {}),
  items: picked.map((e) => ({ exerciseId: e.id, target: { ...DEFAULT_TARGET[e.kind] } })),
  rounds: 3,
  restSec: DEFAULT_REST_SEC,
});

export const WorkoutBuilderScreen: React.FC<Props> = ({ navigation, route }) => {
  const { userId, workouts, exercisesById, prefs, upsertWorkout, removeWorkout } = useWorkouts();
  const existing = route.params.workoutId ? workouts.find((w) => w.id === route.params.workoutId) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [blocks, setBlocks] = useState<WorkoutBlock[]>(existing?.blocks ?? []);
  const [picker, setPicker] = useState<'exercise' | 'circuit' | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  // Where to go once a save or delete has landed. Set as state so the render
  // that lifts the guard below happens before the navigation, not after.
  const [exit, setExit] = useState<(() => void) | null>(null);

  const change = (next: WorkoutBlock[]) => {
    setDirty(true);
    setBlocks(next);
  };

  // Backing out of unsaved edits asks first. usePreventRemove, not a
  // beforeRemove listener: native-stack only honours this one, so the back
  // button and the swipe are held natively too.
  usePreventRemove(dirty && !exit, ({ data }) =>
    showConfirm(
      'Discard changes?',
      'Your edits to this workout will be lost.',
      () => navigation.dispatch(data.action),
      'Discard'
    )
  );

  useEffect(() => {
    exit?.();
  }, [exit]);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return showAlert('Name this workout', 'e.g. "Push Day" or "Monday upper body".');
    if (!blocks.length) return showAlert('Add an exercise', 'A workout needs at least one exercise or circuit.');
    setSaving(true);
    const now = new Date().toISOString();
    const workout: Workout = existing
      ? { ...existing, name: trimmed, blocks, updated_at: now }
      : { id: newWorkoutId(userId), name: trimmed, blocks, created_at: now, updated_at: now };
    try {
      await upsertWorkout(workout);
      setExit(() =>
        existing ? () => navigation.goBack() : () => navigation.replace('WorkoutPreview', { workoutId: workout.id })
      );
    } catch (e) {
      showAlert("Couldn't save the workout", 'Check your connection and try again.');
      setSaving(false);
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      title: existing ? 'Edit workout' : 'New workout',
      headerRight: () =>
        saving ? (
          <ActivityIndicator color={WORKOUTS_ACCENT} />
        ) : (
          <TouchableOpacity onPress={save} style={ws.headerIconBtn}>
            <Text style={styles.save}>Save</Text>
          </TouchableOpacity>
        ),
    });
  });

  const move = (index: number, delta: -1 | 1) => {
    const to = index + delta;
    if (to < 0 || to >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[to]] = [next[to], next[index]];
    change(next);
  };

  const deleteWorkout = () =>
    showConfirm('Delete this workout?', 'Past sessions and records stay in your history.', async () => {
      if (!existing) return;
      try {
        await removeWorkout(existing.id);
        setExit(() => () => navigation.popToTop());
      } catch {
        showAlert("Couldn't delete it", 'Check your connection and try again.');
      }
    }, 'Delete');

  return (
    <View style={ws.screen}>
      <ScrollView contentContainerStyle={ws.scroll} keyboardShouldPersistTaps="handled">
        <Text style={ws.sectionLabel}>Name</Text>
        <TextInput
          style={styles.nameInput}
          value={name}
          onChangeText={(t) => {
            setDirty(true);
            setName(t);
          }}
          placeholder="e.g. Push Day"
          placeholderTextColor={Colors.gray}
          returnKeyType="done"
        />

        <Text style={ws.sectionLabel}>Exercises & circuits</Text>
        {blocks.length === 0 && (
          <Text style={ws.muted}>
            Add single exercises, or a circuit — several exercises back to back, where one pass through them is a set.
          </Text>
        )}

        {blocks.map((block, i) => {
          const isCircuit = block.items.length > 1;
          return (
            <TouchableOpacity
              key={block.id}
              style={[ws.card, styles.blockCard, isCircuit && styles.circuitCard]}
              onPress={() => setEditingIndex(i)}
              accessibilityRole="button"
              accessibilityHint="Edit sets, reps and rest"
            >
              <View style={{ flex: 1, gap: 2 }}>
                {isCircuit && <Text style={styles.circuitTag}>Circuit</Text>}
                <Text style={ws.title}>{blockTitle(block, exercisesById)}</Text>
                <Text style={ws.muted}>{describeBlock(block, exercisesById, prefs.unit)}</Text>
              </View>
              <View style={styles.reorder}>
                <TouchableOpacity onPress={() => move(i, -1)} hitSlop={6} disabled={i === 0} accessibilityLabel="Move up">
                  <Ionicons name="chevron-up" size={20} color={i === 0 ? Colors.border : Colors.gray} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => move(i, 1)}
                  hitSlop={6}
                  disabled={i === blocks.length - 1}
                  accessibilityLabel="Move down"
                >
                  <Ionicons name="chevron-down" size={20} color={i === blocks.length - 1 ? Colors.border : Colors.gray} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={styles.addRow}>
          <TouchableOpacity style={[ws.secondaryBtn, styles.addBtn]} onPress={() => setPicker('exercise')}>
            <Text style={ws.secondaryBtnText}>+ Exercise</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[ws.secondaryBtn, styles.addBtn]} onPress={() => setPicker('circuit')}>
            <Text style={ws.secondaryBtnText}>+ Circuit</Text>
          </TouchableOpacity>
        </View>

        {existing && (
          <TouchableOpacity style={styles.delete} onPress={deleteWorkout}>
            <Ionicons name="trash-outline" size={16} color={Colors.danger} />
            <Text style={styles.deleteText}>Delete workout</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <ExercisePickerModal
        visible={picker !== null}
        title={picker === 'circuit' ? 'Build a circuit' : 'Add an exercise'}
        mode={picker === 'circuit' ? 'multi' : 'single'}
        minSelect={picker === 'circuit' ? 2 : 1}
        confirmLabel={(n) => `Add circuit of ${n}`}
        onCancel={() => setPicker(null)}
        onConfirm={(picked) => {
          setPicker(null);
          change([...blocks, blockFrom(picked)]);
        }}
      />

      <BlockEditorModal
        visible={editingIndex !== null}
        block={editingIndex !== null ? blocks[editingIndex] ?? null : null}
        onCancel={() => setEditingIndex(null)}
        onSave={(updated) => {
          if (editingIndex === null) return;
          change(blocks.map((b, i) => (i === editingIndex ? updated : b)));
          setEditingIndex(null);
        }}
        onDelete={() => {
          if (editingIndex === null) return;
          change(blocks.filter((_, i) => i !== editingIndex));
          setEditingIndex(null);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  save: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.md, color: WORKOUTS_ACCENT },
  nameInput: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
  },
  blockCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  circuitCard: { borderLeftWidth: 3, borderLeftColor: WORKOUTS_ACCENT },
  circuitTag: {
    alignSelf: 'flex-start',
    fontFamily: Fonts.secondaryBold,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: WORKOUTS_ACCENT,
    backgroundColor: WORKOUTS_TINT,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  reorder: { gap: 2 },
  addRow: { flexDirection: 'row', gap: Spacing.sm },
  addBtn: { flex: 1 },
  delete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.lg,
  },
  deleteText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.danger },
});
