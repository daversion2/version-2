import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, SectionList, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../../constants/theme';
import { Exercise } from '../../../../types/workouts';
import { KIND_LABELS, MUSCLE_GROUP_LABELS, MUSCLE_GROUP_ORDER } from '../../../../data/workoutExercises';
import { exerciseSubtitle, searchExercises } from '../../../../services/exerciseLibrary';
import { useWorkouts } from './WorkoutsContext';
import { ExerciseEditorModal } from './components/ExerciseEditorModal';
import { WORKOUTS_ACCENT, WORKOUTS_TINT, ws } from './components/workoutsStyle';

/**
 * Workouts → Settings → My exercises. Yours first (add, edit, delete), then
 * the built-ins, where the only thing to edit is your own form cues.
 */
export const WorkoutExercisesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { exercises, notes } = useWorkouts();
  const [search, setSearch] = useState('');
  // undefined = closed; null = a new exercise; an Exercise = editing that one.
  const [editing, setEditing] = useState<Exercise | null | undefined>(undefined);

  const mine = useMemo(() => exercises.filter((e) => e.custom), [exercises]);
  const sections = useMemo(() => {
    const matching = searchExercises(exercises, search);
    return [
      { key: 'mine', title: 'Yours', data: matching.filter((e) => e.custom) },
      ...MUSCLE_GROUP_ORDER.map((m) => ({
        key: m,
        title: `Built-in · ${MUSCLE_GROUP_LABELS[m]}`,
        data: matching.filter((e) => !e.custom && e.muscle === m),
      })),
    ].filter((s) => s.data.length > 0 || (s.key === 'mine' && !search.trim()));
  }, [exercises, search]);

  return (
    <View style={ws.screen}>
      <View style={styles.top}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={16} color={Colors.gray} />
          <TextInput
            style={styles.search}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name, equipment or body part"
            placeholderTextColor={Colors.gray}
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
        <TouchableOpacity style={ws.primaryBtn} onPress={() => setEditing(null)} accessibilityRole="button">
          <Text style={ws.primaryBtnText}>+ New exercise</Text>
        </TouchableOpacity>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(e) => e.id}
        keyboardShouldPersistTaps="handled"
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingBottom: Spacing.xxl + insets.bottom }}
        renderSectionHeader={({ section }) => (
          <View>
            <Text style={styles.sectionHeader}>{section.title}</Text>
            {section.key === 'mine' && mine.length === 0 && (
              <Text style={[ws.muted, styles.emptyMine]}>
                Nothing yet. Add the moves the built-in list doesn’t have — a machine at your gym, a carry, a drill.
              </Text>
            )}
          </View>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => setEditing(item)}
            accessibilityRole="button"
            accessibilityHint={item.custom ? 'Edit or delete' : 'Add your form cues'}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={ws.title}>{item.name}</Text>
              <Text style={ws.muted}>{exerciseSubtitle(item, KIND_LABELS[item.kind])}</Text>
              {!!notes[item.id] && (
                <Text style={styles.note} numberOfLines={1}>
                  {notes[item.id]}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={[ws.muted, styles.emptyMine]}>Nothing matches. Add it with “New exercise”.</Text>
        }
      />

      <ExerciseEditorModal
        visible={editing !== undefined}
        exercise={editing ?? undefined}
        initialName={editing === null ? search : undefined}
        onClose={() => setEditing(undefined)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  top: { padding: Spacing.lg, paddingBottom: Spacing.sm, gap: Spacing.sm },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  search: { flex: 1, paddingVertical: 10, fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: Colors.dark },
  sectionHeader: {
    fontFamily: Fonts.secondaryBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Colors.gray,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  emptyMine: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
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
  note: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: WORKOUTS_ACCENT,
    backgroundColor: WORKOUTS_TINT,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
    maxWidth: '100%',
  },
});
