import React, { useEffect, useMemo, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, SectionList, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../../../constants/theme';
import { Exercise } from '../../../../../types/workouts';
import { KIND_LABELS, MUSCLE_GROUP_LABELS, MUSCLE_GROUP_ORDER } from '../../../../../data/workoutExercises';
import { exerciseSubtitle, searchExercises } from '../../../../../services/exerciseLibrary';
import { useWorkouts } from '../WorkoutsContext';
import { ExerciseEditorModal } from './ExerciseEditorModal';
import { WORKOUTS_ACCENT, WORKOUTS_TINT, ws } from './workoutsStyle';

interface Props {
  visible: boolean;
  title: string;
  /** single: a tap picks and closes. multi: tap to toggle, then confirm — order kept. */
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

  useEffect(() => {
    if (visible) {
      setSearch('');
      setSelected([]);
      setCreating(false);
    }
  }, [visible]);

  const term = search.trim().toLowerCase();
  const sections = useMemo(() => {
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
  }, [exercises, term]);
  const exactMatch = exercises.some((e) => e.name.toLowerCase() === term);

  const toggle = (exercise: Exercise) => {
    if (mode === 'single') {
      onConfirm([exercise]);
      return;
    }
    setSelected((list) =>
      list.some((e) => e.id === exercise.id) ? list.filter((e) => e.id !== exercise.id) : [...list, exercise]
    );
  };

  const order = (id: string) => selected.findIndex((e) => e.id === id);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <View style={styles.sheet}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} hitSlop={8}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
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

        <SectionList
          sections={sections}
          keyExtractor={(e) => e.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: Spacing.xxl + insets.bottom + 60 }}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
          renderItem={({ item }) => {
            const index = order(item.id);
            const isSelected = index >= 0;
            return (
              <TouchableOpacity
                style={[styles.row, isSelected && styles.rowSelected]}
                onPress={() => toggle(item)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
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
                      <Text style={styles.badgeText}>{index + 1}</Text>
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

        {mode === 'multi' && (
          <View style={[styles.footer, { paddingBottom: Spacing.md + insets.bottom }]}>
            {selected.length > 1 && (
              <Text style={[ws.muted, { textAlign: 'center' }]}>
                Done back to back in this order, then rest — one round.
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
        onClose={() => setCreating(false)}
        onSaved={(saved) => {
          setSearch('');
          if (mode === 'multi') {
            toggle(saved);
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
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: WORKOUTS_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xs, color: Colors.white },
  badgeEmpty: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: Colors.border },
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
