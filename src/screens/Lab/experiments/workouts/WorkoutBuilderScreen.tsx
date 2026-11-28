import React, { useEffect, useLayoutEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePreventRemove } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../../constants/theme';
import { Exercise, Workout, WorkoutBlock, WorkoutsStackParamList } from '../../../../types/workouts';
import { DEFAULT_TARGET } from '../../../../services/workoutMath';
import { blockTitle, describeBlock, makeId, newBlockShape } from '../../../../services/workoutSession';
import { newWorkoutId } from '../../../../services/labWorkouts';
import { showAlert, showConfirm } from '../../../../utils/alert';
import { Copy } from '../../../../components/common/Copy';
import { useCopy } from '../../../../context/CopyContext';
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
  ...newBlockShape(picked.map((e) => e.kind)),
});

export const WorkoutBuilderScreen: React.FC<Props> = ({ navigation, route }) => {
  const t = useCopy();
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
      t('workouts.builder.discardTitle', 'Discard changes?'),
      t('workouts.builder.discardMsg', 'Your edits to this workout will be lost.'),
      () => navigation.dispatch(data.action),
      t('workouts.builder.discard', 'Discard')
    )
  );

  useEffect(() => {
    exit?.();
  }, [exit]);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return showAlert(
        t('workouts.builder.nameTitle', 'Name this workout'),
        t('workouts.builder.nameMsg', 'e.g. "Push Day" or "Monday upper body".')
      );
    if (!blocks.length) return showAlert(
        t('workouts.builder.addTitle', 'Add an exercise'),
        t('workouts.builder.addMsg', 'A workout needs at least one exercise or circuit.')
      );
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
      showAlert(
        t('workouts.builder.failTitle', "Couldn't save the workout"),
        t('workouts.builder.failMsg', 'Check your connection and try again.')
      );
      setSaving(false);
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      title: existing ? t('workouts.builder.titleEdit', 'Edit workout') : t('workouts.builder.titleNew', 'New workout'),
      headerRight: () =>
        saving ? (
          <ActivityIndicator color={WORKOUTS_ACCENT} />
        ) : (
          <TouchableOpacity onPress={save} style={ws.headerIconBtn}>
            <Copy id="workouts.builder.save" style={styles.save}>
              Save
            </Copy>
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
    showConfirm(
      t('workouts.builder.deleteTitle', 'Delete this workout?'),
      t('workouts.builder.deleteMsg', 'Past sessions and records stay in your history.'),
      async () => {
        if (!existing) return;
        try {
          await removeWorkout(existing.id);
          setExit(() => () => navigation.popToTop());
        } catch {
          showAlert(
            t('workouts.builder.deleteFailTitle', "Couldn't delete it"),
            t('workouts.builder.failMsg', 'Check your connection and try again.')
          );
        }
      },
      t('workouts.builder.delete', 'Delete')
    );

  return (
    <View style={ws.screen}>
      <ScrollView contentContainerStyle={ws.scroll} keyboardShouldPersistTaps="handled">
        <Copy id="workouts.builder.name" style={ws.sectionLabel}>
          Name
        </Copy>
        <TextInput
          style={styles.nameInput}
          value={name}
          onChangeText={(t) => {
            setDirty(true);
            setName(t);
          }}
          placeholder={t('workouts.builder.namePlaceholder', 'e.g. Push Day')}
          placeholderTextColor={Colors.gray}
          returnKeyType="done"
        />

        <Copy id="workouts.builder.blocks" style={ws.sectionLabel}>
          Exercises & circuits
        </Copy>
        {blocks.length === 0 && (
          <Copy id="workouts.builder.empty" style={ws.muted}>
            Add single exercises, or a circuit — several exercises back to back, where one pass through them is a set.
          </Copy>
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
                {isCircuit && (
                  <Copy id="workouts.builder.circuit" style={styles.circuitTag}>
                    Circuit
                  </Copy>
                )}
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
            <Copy id="workouts.builder.plusExercise" style={ws.secondaryBtnText}>
              + Exercise
            </Copy>
          </TouchableOpacity>
          <TouchableOpacity style={[ws.secondaryBtn, styles.addBtn]} onPress={() => setPicker('circuit')}>
            <Copy id="workouts.builder.plusCircuit" style={ws.secondaryBtnText}>
              + Circuit
            </Copy>
          </TouchableOpacity>
        </View>

        {existing && (
          <TouchableOpacity style={styles.delete} onPress={deleteWorkout}>
            <Ionicons name="trash-outline" size={16} color={Colors.danger} />
            <Copy id="workouts.builder.deleteWorkout" style={styles.deleteText}>
              Delete workout
            </Copy>
          </TouchableOpacity>
        )}
      </ScrollView>

      <ExercisePickerModal
        visible={picker !== null}
        title={
          picker === 'circuit'
            ? t('workouts.builder.buildCircuit', 'Build a circuit')
            : t('workouts.builder.addExercise', 'Add an exercise')
        }
        mode={picker === 'circuit' ? 'multi' : 'single'}
        minSelect={picker === 'circuit' ? 2 : 1}
        confirmLabel={(n) => t('workouts.builder.addCircuit', 'Add circuit of {n}', { n })}
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
