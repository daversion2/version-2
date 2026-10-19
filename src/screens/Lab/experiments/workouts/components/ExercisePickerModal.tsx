import React, { useEffect, useMemo, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, SectionList, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../../../constants/theme';
import { Exercise, MuscleGroup } from '../../../../../types/workouts';
import { KIND_LABELS, MUSCLE_GROUP_LABELS, MUSCLE_GROUP_ORDER } from '../../../../../data/workoutExercises';
import { exerciseSubtitle, exercisesInGroup, searchExercises } from '../../../../../services/exerciseLibrary';
import { useWorkouts } from '../WorkoutsContext';
import { BodyPartTiles } from './BodyPartTiles';
import { ExerciseEditorModal } from './ExerciseEditorModal';
import { WORKOUTS_ACCENT, WORKOUTS_TINT, ws } from './workoutsStyle';

interface Props {
  visible: boolean;
  title: string;
  /**
   * single: a tap picks and closes. multi: each tap adds one (tap pull-ups
   * twice to have it twice in the round), the strip at the bottom removes, then
   * confirm — order kept.
   */
  mode: 'single' | 'multi';
  minSelect?: number;
  confirmLabel?: (count: number) => string;
  onCancel: () => void;
  onConfirm: (exercises: Exercise[]) => void;
}

export const ExercisePickerModal: React.FC<Props> = ({
  visible,
  title,
  mode,
  minSelect = 1,
  confirmLabel = (n) => (n > 1 ? `Add ${n} as a circuit` : 'Add exercise'),
  onCancel,
  onConfirm,
}) => {
  const insets = useSafeAreaInsets();
  const { exercises, notes } = useWorkouts();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Exercise[]>([]);
  const [creating, setCreating] = useState(false);
  // Which body part's tile is open; null = the tiles themselves.
  const [group, setGroup] = useState<MuscleGroup | null>(null);

  useEffect(() => {
    if (visible) {
      setSearch('');
      setSelected([]);
      setCreating(false);
      setGroup(null);
    }
  }, [visible]);

  const term = search.trim().toLowerCase();
  // A search looks through everything, whichever tile is open.
  const showTiles = !term && !group;
  const sections = useMemo(() => {
    if (!term && group) {
      // The header already names the body part, so no section title.
      return [{ title: '', data: exercisesInGroup(exercises, group) }];
    }
    const matching = searchExercises(exercises, term);
    // Yours first — the ones you made are the ones you're most likely after.
    const mine = matching.filter((e) => e.custom);
    return [
      { title: 'Yours', data: mine },
      ...MUSCLE_GROUP_ORDER.map((muscle) => ({
        title: MUSCLE_GROUP_LABELS[muscle],
        data: matching.filter((e) => !e.custom && e.muscle === muscle),
      })),
    ].filter((s) => s.data.length > 0);
  }, [exercises, term, group]);
  const exactMatch = exercises.some((e) => e.name.toLowerCase() === term);

  const pick = (exercise: Exercise) => {
    if (mode === 'single') {
      onConfirm([exercise]);
      return;
    }
    setSelected((list) => [...list, exercise]);
  };

  const removeAt = (index: number) => setSelected((list) => list.filter((_, i) => i !== index));

  /** Every place this exercise sits in the order, 1-based: [1, 5]. */
  const positions = (id: string) => selected.flatMap((e, i) => (e.id === id ? [i + 1] : []));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <View style={styles.sheet}>
        <View style={styles.header}>
          {group ? (
            <TouchableOpacity
              onPress={() => setGroup(null)}
              hitSlop={8}
              style={styles.back}
              accessibilityRole="button"
              accessibilityLabel="Back to body parts"
            >
              <Ionicons name="chevron-back" size={20} color={WORKOUTS_ACCENT} />
              {/* Not "Back": beside the Back body part's title it read as a typo. */}
              <Text style={styles.backText}>All</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={onCancel} hitSlop={8}>
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.title}>{group ? MUSCLE_GROUP_LABELS[group] : title}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.searchRow}>
          <Ionicons name="search" size={16} color={Colors.gray} />
          <TextInput
            style={styles.search}
            value={search}
            onChangeText={setSearch}
            placeholder="Search exercises"
            placeholderTextColor={Colors.gray}
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>

        {/* Always here, not only when a search comes up empty. */}
        <TouchableOpacity style={styles.newRow} onPress={() => setCreating(true)} accessibilityRole="button">
          <Ionicons name="add-circle" size={22} color={WORKOUTS_ACCENT} />
          <Text style={styles.newText}>
            {term && !exactMatch ? `New exercise “${search.trim()}”` : 'New exercise'}
          </Text>
        </TouchableOpacity>

        {showTiles ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ paddingBottom: Spacing.xxl + insets.bottom + (mode === 'multi' ? 150 : 0) }}
          >
            <BodyPartTiles exercises={exercises} onOpen={setGroup} selectedIds={selected.map((e) => e.id)} />
          </ScrollView>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(e) => e.id}
            keyboardShouldPersistTaps="handled"
            // The keyboard covers the picked strip and the confirm button.
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ paddingBottom: Spacing.xxl + insets.bottom + (mode === 'multi' ? 150 : 0) }}
            stickySectionHeadersEnabled={false}
            renderSectionHeader={({ section }) =>
              section.title ? <Text style={styles.sectionHeader}>{section.title}</Text> : null
            }
            renderItem={({ item }) => {
              const at = positions(item.id);
              const isSelected = at.length > 0;
              return (
                <TouchableOpacity
                  style={[styles.row, isSelected && styles.rowSelected]}
                  onPress={() => pick(item)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityHint={mode === 'multi' && isSelected ? 'Adds it again' : undefined}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={ws.title}>{item.name}</Text>
                    <Text style={ws.muted}>{exerciseSubtitle(item, KIND_LABELS[item.kind])}</Text>
                  </View>
                  {!!notes[item.id] && (
                    <Ionicons name="document-text-outline" size={16} color={Colors.gray} style={styles.noteIcon} />
                  )}
                  {mode === 'multi' &&
                    (isSelected ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{at.join(', ')}</Text>
                      </View>
                    ) : (
                      <View style={styles.badgeEmpty} />
                    ))}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <Text style={[ws.muted, { textAlign: 'center', marginTop: Spacing.xl }]}>
                Nothing matches. Tap “New exercise” to make it.
              </Text>
            }
          />
        )}

        {mode === 'multi' && (
          <View style={[styles.footer, { paddingBottom: Spacing.md + insets.bottom }]}>
            {selected.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
                {selected.map((e, i) => (
                  <TouchableOpacity
                    key={`${e.id}_${i}`}
                    style={styles.stripChip}
                    onPress={() => removeAt(i)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${e.name}, number ${i + 1}`}
                  >
                    <Text style={styles.stripText}>
                      {i + 1}. {e.name}
                    </Text>
                    <Ionicons name="close" size={14} color={WORKOUTS_ACCENT} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            {selected.length > 0 && (
              <Text style={[ws.muted, { textAlign: 'center' }]}>
                {selected.length > 1
                  ? 'Done back to back in this order, then rest — one round. Tap one again to repeat it.'
                  : 'Tap an exercise again to have it twice in a round.'}
              </Text>
            )}
            <TouchableOpacity
              style={[ws.primaryBtn, selected.length < minSelect && ws.disabled]}
              disabled={selected.length < minSelect}
              onPress={() => onConfirm(selected)}
            >
              <Text style={ws.primaryBtnText}>
                {selected.length < minSelect
                  ? minSelect > 1
                    ? `Pick at least ${minSelect}`
                    : 'Pick an exercise'
                  : confirmLabel(selected.length)}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ExerciseEditorModal
        visible={creating}
        initialName={term && !exactMatch ? search : undefined}
        initialMuscle={group ?? undefined}
        onClose={() => setCreating(false)}
        onSaved={(saved) => {
          setSearch('');
          if (mode === 'multi') {
            pick(saved);
            return;
          }
          // Picking closes this sheet too. Let the editor finish sliding away
          // first — iOS drops a modal dismissed mid-animation.
          setTimeout(() => onConfirm([saved]), 450);
        }}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: Colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  cancel: { fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: WORKOUTS_ACCENT, width: 60 },
  back: { flexDirection: 'row', alignItems: 'center', width: 60, marginLeft: -6 },
  backText: { fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: WORKOUTS_ACCENT },
  title: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg, color: Colors.dark },
  headerSpacer: { width: 60 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.lightGray,
  },
  search: { flex: 1, paddingVertical: 10, fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: Colors.dark },
  newRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xs,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: WORKOUTS_TINT,
  },
  newText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.md, color: WORKOUTS_ACCENT, flexShrink: 1 },
  noteIcon: { marginRight: Spacing.sm },
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  rowSelected: { backgroundColor: WORKOUTS_TINT },
  badge: {
    minWidth: 26,
    height: 26,
    paddingHorizontal: 7,
    borderRadius: 13,
    backgroundColor: WORKOUTS_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xs, color: Colors.white },
  badgeEmpty: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: Colors.border },
  strip: { gap: Spacing.xs },
  stripChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: WORKOUTS_TINT,
  },
  stripText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: WORKOUTS_ACCENT },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
});
