import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing } from '../../../../../constants/theme';
import { Equipment, Exercise, ExerciseKind, MuscleGroup } from '../../../../../types/workouts';
import {
  EQUIPMENT_LABELS,
  EQUIPMENT_ORDER,
  KIND_HINTS,
  KIND_LABELS,
  MUSCLE_GROUP_LABELS,
  MUSCLE_GROUP_ORDER,
} from '../../../../../data/workoutExercises';
import { validateExerciseName } from '../../../../../services/exerciseLibrary';
import { InputField } from '../../../../../components/common/InputField';
import { showAlert, showConfirm } from '../../../../../utils/alert';
import { useWorkouts } from '../WorkoutsContext';
import { WORKOUTS_ACCENT, WORKOUTS_TINT, ws } from './workoutsStyle';

interface Props {
  visible: boolean;
  /** Omit to create a new exercise. */
  exercise?: Exercise;
  /** Prefills a new exercise's name — what was typed in the picker's search. */
  initialName?: string;
  /** Prefills a new exercise's body part — the tile the picker had open. */
  initialMuscle?: MuscleGroup;
  onClose: () => void;
  /** After a save — the picker uses it to select what was just made. */
  onSaved?: (exercise: Exercise) => void;
}

const ChipRow = <T extends string>({
  options,
  labels,
  value,
  onChange,
  disabled,
  allowNone,
}: {
  options: T[];
  labels: Record<T, string>;
  value?: T;
  onChange: (v: T | undefined) => void;
  disabled?: boolean;
  allowNone?: boolean;
}) => (
  <View style={styles.chips}>
    {options.map((o) => {
      const on = value === o;
      return (
        <TouchableOpacity
          key={o}
          style={[ws.chip, on && ws.chipActive, disabled && !on && ws.disabled]}
          disabled={disabled}
          onPress={() => onChange(on && allowNone ? undefined : o)}
          accessibilityRole="radio"
          accessibilityState={{ checked: on, disabled }}
        >
          <Text style={[ws.chipText, on && ws.chipTextActive]}>{labels[o]}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

/**
 * One editor for every exercise. Yours: everything, except that how it's
 * logged locks after its first logged set. Built-in: just your form cues — its
 * name and type are shared with everyone and stay fixed.
 */
export const ExerciseEditorModal: React.FC<Props> = ({
  visible,
  exercise,
  initialName,
  initialMuscle,
  onClose,
  onSaved,
}) => {
  const { exercisesById, saveExercise, archiveExercise, isExerciseUsed, notes, saveNote } = useWorkouts();
  const isNew = !exercise;
  const isBuiltIn = !!exercise && !exercise.custom;
  const kindLocked = !!exercise && isExerciseUsed(exercise.id);

  const [name, setName] = useState('');
  const [kind, setKind] = useState<ExerciseKind>('weight');
  const [muscle, setMuscle] = useState<MuscleGroup>('full_body');
  const [equipment, setEquipment] = useState<Equipment | undefined>();
  const [note, setNote] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName(exercise?.name ?? initialName?.trim() ?? '');
    setKind(exercise?.kind ?? 'weight');
    setMuscle(exercise?.muscle ?? initialMuscle ?? 'full_body');
    setEquipment(exercise?.equipment);
    setNote(exercise ? notes[exercise.id] ?? '' : '');
    setNameError(null);
    setSaving(false);
    // Reset on open only: re-running when a save updates the library or the
    // notes would wipe the form out from under you.
  }, [visible, exercise?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    if (!isBuiltIn) {
      const error = validateExerciseName(name, Object.values(exercisesById), exercise?.id);
      if (error) return setNameError(error);
    }
    setSaving(true);
    try {
      let saved = exercise as Exercise;
      if (!isBuiltIn) {
        saved = await saveExercise({ id: exercise?.id, name, kind, muscle, equipment });
      }
      if (note.trim() !== (notes[saved.id] ?? '')) await saveNote(saved.id, note);
      onSaved?.(saved);
      onClose();
    } catch (e) {
      setSaving(false);
      showAlert("Couldn't save that", 'Check your connection and try again.');
    }
  };

  const remove = () => {
    if (!exercise) return;
    showConfirm(
      `Delete ${exercise.name}?`,
      'It leaves your list. Past sessions and records keep it, and saved workouts keep it until you take it out.',
      async () => {
        try {
          await archiveExercise(exercise.id);
          onClose();
        } catch {
          showAlert("Couldn't delete it", 'Check your connection and try again.');
        }
      },
      'Delete'
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.sheet} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={8} disabled={saving}>
            <Text style={styles.headerAction}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>
            {isNew ? 'New exercise' : isBuiltIn ? exercise!.name : 'Edit exercise'}
          </Text>
          {saving ? (
            <ActivityIndicator color={WORKOUTS_ACCENT} style={styles.headerSpinner} />
          ) : (
            <TouchableOpacity onPress={save} hitSlop={8}>
              <Text style={[styles.headerAction, styles.headerSave]}>Save</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {isBuiltIn ? (
            <View style={[ws.card, styles.builtIn]}>
              <Ionicons name="lock-closed-outline" size={16} color={Colors.gray} />
              <Text style={[ws.muted, { flex: 1 }]}>
                {KIND_LABELS[exercise!.kind]} · {MUSCLE_GROUP_LABELS[exercise!.muscle]}
                {exercise!.equipment ? ` · ${EQUIPMENT_LABELS[exercise!.equipment]}` : ''}
                {'\n'}A built-in exercise — the cues below are yours alone.
              </Text>
            </View>
          ) : (
            <>
              <InputField
                label="Name"
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  setNameError(null);
                }}
                placeholder="e.g. Sled Push"
                autoCapitalize="words"
                autoFocus={isNew && !initialName}
                maxLength={60}
                error={nameError ?? undefined}
              />

              <Text style={ws.sectionLabel}>How it’s logged</Text>
              <ChipRow
                options={['weight', 'reps', 'time'] as ExerciseKind[]}
                labels={KIND_LABELS}
                value={kind}
                onChange={(v) => v && setKind(v)}
                disabled={kindLocked}
              />
              <Text style={ws.muted}>
                {kindLocked
                  ? 'Locked — it has logged sets, which would read wrong as anything else. Make a new exercise to log it differently.'
                  : KIND_HINTS[kind]}
              </Text>

              <Text style={ws.sectionLabel}>Body part</Text>
              <ChipRow
                options={MUSCLE_GROUP_ORDER}
                labels={MUSCLE_GROUP_LABELS}
                value={muscle}
                onChange={(v) => v && setMuscle(v)}
              />

              <Text style={ws.sectionLabel}>Equipment</Text>
              <ChipRow
                options={EQUIPMENT_ORDER}
                labels={EQUIPMENT_LABELS}
                value={equipment}
                onChange={setEquipment}
                allowNone
              />
            </>
          )}

          <View style={styles.notes}>
            <InputField
              label="Form cues"
              value={note}
              onChangeText={setNote}
              placeholder="e.g. Pause at the chest, elbows tucked. Seat on 4."
              multiline
              maxLength={500}
            />
            <Text style={ws.muted}>Shown under the exercise while you do it.</Text>
          </View>

          {!isNew && !isBuiltIn && (
            <TouchableOpacity style={styles.delete} onPress={remove} disabled={saving}>
              <Ionicons name="trash-outline" size={16} color={Colors.danger} />
              <Text style={styles.deleteText}>Delete exercise</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: Colors.lightGray },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
  },
  headerAction: { fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: WORKOUTS_ACCENT, minWidth: 60 },
  headerSave: { fontFamily: Fonts.secondaryBold, textAlign: 'right' },
  headerSpinner: { minWidth: 60 },
  title: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg, color: Colors.dark, flexShrink: 1 },
  content: { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.xxl },
  builtIn: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: WORKOUTS_TINT },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  notes: { marginTop: Spacing.md, gap: 4 },
  delete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.lg,
  },
  deleteText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.danger },
});
