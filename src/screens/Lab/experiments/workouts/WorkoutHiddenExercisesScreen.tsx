import React from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Fonts, FontSizes, Spacing, BorderRadius, Colors } from '../../../../constants/theme';
import { KIND_LABELS, MUSCLE_GROUP_LABELS } from '../../../../data/workoutExercises';
import { exerciseSubtitle } from '../../../../services/exerciseLibrary';
import { showAlert, showConfirm } from '../../../../utils/alert';
import { useWorkouts } from './WorkoutsContext';
import { WORKOUTS_ACCENT, ws } from './components/workoutsStyle';

/**
 * Workouts → Settings → Hidden exercises. Everything hidden from the picker
 * with its eye icon, A–Z; "Show" puts one back. Hiding never touched history,
 * so there's nothing to restore beyond the picker.
 */
export const WorkoutHiddenExercisesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { hiddenExercises, setExerciseHidden, prefs, updatePrefs } = useWorkouts();

  const showAll = () =>
    showConfirm(
      `Show all ${hiddenExercises.length}?`,
      'They go back in the exercise picker.',
      () =>
        updatePrefs({ hidden_exercise_ids: [] }).catch(() =>
          showAlert("Couldn't save that", 'Check your connection and try again.')
        ),
      'Show all'
    );

  return (
    <FlatList
      style={ws.screen}
      data={hiddenExercises}
      keyExtractor={(e) => e.id}
      contentContainerStyle={{ paddingBottom: Spacing.xxl + insets.bottom }}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={ws.muted}>
            Hidden from the exercise picker. Your history, stats and any workout that already uses one are unchanged.
          </Text>
          {hiddenExercises.length > 1 && (
            <TouchableOpacity onPress={showAll} accessibilityRole="button" style={styles.showAll}>
              <Text style={styles.showText}>Show all</Text>
            </TouchableOpacity>
          )}
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={ws.title}>{item.name}</Text>
            <Text style={ws.muted}>
              {MUSCLE_GROUP_LABELS[item.muscle]} · {exerciseSubtitle(item, KIND_LABELS[item.kind])}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.showBtn}
            onPress={() => setExerciseHidden(item.id, false)}
            accessibilityRole="button"
            accessibilityLabel={`Show ${item.name}`}
          >
            <Text style={styles.showText}>Show</Text>
          </TouchableOpacity>
        </View>
      )}
      ListEmptyComponent={
        <Text style={[ws.muted, styles.empty]}>
          {prefs.hidden_exercise_ids?.length
            ? 'Nothing to show back — the exercises you hid have since been deleted.'
            : 'Nothing hidden. In the exercise picker, tap the eye icon on one you’ll never do.'}
        </Text>
      }
    />
  );
};

const styles = StyleSheet.create({
  header: { padding: Spacing.lg, paddingBottom: Spacing.sm, gap: Spacing.sm },
  showAll: { alignSelf: 'flex-start', paddingVertical: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  showBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: WORKOUTS_ACCENT,
  },
  showText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: WORKOUTS_ACCENT },
  empty: { paddingHorizontal: Spacing.lg, textAlign: 'center', marginTop: Spacing.lg },
});
