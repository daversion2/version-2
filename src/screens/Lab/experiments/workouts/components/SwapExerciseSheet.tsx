import React, { useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BorderRadius, Colors, Spacing, TextStyles } from '../../../../../constants/theme';
import type { Exercise, SwapReason } from '../../../../../types/workouts';
import { KIND_LABELS } from '../../../../../data/workoutExercises';
import { exerciseSubtitle } from '../../../../../services/exerciseLibrary';
import { SWAP_REASONS, swapSuggestions } from '../../../../../services/exerciseSwap';
import { useWorkouts } from '../WorkoutsContext';
import { ExercisePickerModal } from './ExercisePickerModal';
import { Copy } from '../../../../../components/common/Copy';
import { useCopy } from '../../../../../context/CopyContext';
import { WORKOUTS_ACCENT, WORKOUTS_TINT, ws } from './workoutsStyle';

/**
 * "Swap for today" (2026-11-20): what to do instead of one exercise, for this
 * session only. An optional reason, suggestions (same body part, bodyweight,
 * recent), or the full picker. When the item is already swapped, the planned
 * exercise is offered back at the top. Logic: services/exerciseSwap.ts and
 * swapItem in services/workoutSession.ts.
 */
export const SwapExerciseSheet: React.FC<{
  visible: boolean;
  /** What the workout planned. */
  planned: Exercise | null;
  /** What's there now, when it's already been swapped. */
  current?: Exercise | null;
  onCancel: () => void;
  onPick: (exercise: Exercise, reason?: SwapReason) => void;
}> = ({ visible, planned, current, onCancel, onPick }) => {
  const insets = useSafeAreaInsets();
  const t = useCopy();
  const { exercises, sessions } = useWorkouts();
  const [reason, setReason] = useState<SwapReason | undefined>();
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (visible) {
      setReason(undefined);
      setSearching(false);
    }
  }, [visible]);

  const suggestions = useMemo(
    () => (planned ? swapSuggestions(planned, exercises, sessions).filter((e) => e.id !== current?.id) : []),
    [planned, current, exercises, sessions]
  );

  if (!planned) return null;
  const swapped = !!current && current.id !== planned.id;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.md }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} accessibilityRole="button" style={styles.headerBtn}>
            <Copy id="workouts.swap.cancel" style={ws.link}>
              Cancel
            </Copy>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.titleBlock}>
            <Copy id="workouts.swap.title" style={styles.title} accessibilityRole="header" vars={{ name: planned.name }}>
              {'Swap {name} for today'}
            </Copy>
            <Copy id="workouts.swap.lead" style={styles.lead} vars={{ name: planned.name }}>
              {'Just this workout. Next time it’s {name} again.'}
            </Copy>
          </View>

          {swapped && (
            <View style={ws.panel}>
              <TouchableOpacity
                style={styles.row}
                onPress={() => onPick(planned)}
                accessibilityRole="button"
                accessibilityLabel={`Back to ${planned.name}`}
              >
                <View style={styles.rowIcon}>
                  <Ionicons name="arrow-undo" size={18} color={WORKOUTS_ACCENT} />
                </View>
                <View style={styles.rowText}>
                  <Copy id="workouts.swap.back" style={ws.title} vars={{ name: planned.name }}>
                    {'Back to {name}'}
                  </Copy>
                  <Copy id="workouts.swap.undo" style={ws.muted}>
                    Undo the swap
                  </Copy>
                </View>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.group}>
            <Copy id="workouts.swap.why" style={ws.sectionLabel}>
              Why? (optional)
            </Copy>
            <View style={styles.chips}>
              {SWAP_REASONS.map((r) => {
                const on = reason === r.id;
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.chip, on && styles.chipOn]}
                    onPress={() => setReason(on ? undefined : r.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{r.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.group}>
            <Copy id="workouts.swap.instead" style={ws.sectionLabel}>
              Instead
            </Copy>
            <View style={ws.panel}>
              {suggestions.map((e, i) => (
                <TouchableOpacity
                  key={e.id}
                  style={[styles.row, i < suggestions.length - 1 && ws.separator]}
                  onPress={() => onPick(e, reason)}
                  accessibilityRole="button"
                  accessibilityLabel={`Swap for ${e.name}`}
                >
                  <View style={styles.rowText}>
                    <Text style={ws.title}>{e.name}</Text>
                    <Text style={ws.muted}>{exerciseSubtitle(e, KIND_LABELS[e.kind])}</Text>
                  </View>
                  <Ionicons name="swap-horizontal" size={18} color={WORKOUTS_ACCENT} />
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.row, suggestions.length > 0 && styles.topSeparator]}
                onPress={() => setSearching(true)}
                accessibilityRole="button"
              >
                <View style={styles.rowIcon}>
                  <Ionicons name="search" size={18} color={WORKOUTS_ACCENT} />
                </View>
                <Copy id="workouts.swap.searchAll" style={[ws.title, styles.rowText, { color: WORKOUTS_ACCENT }]}>
                  Search all exercises
                </Copy>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>

      <ExercisePickerModal
        visible={searching}
        title={t('workouts.swap.insteadOf', 'Instead of {name}', { name: planned.name })}
        mode="single"
        onCancel={() => setSearching(false)}
        onConfirm={([e]) => {
          setSearching(false);
          if (e) onPick(e, reason);
        }}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: Colors.lightGray },
  header: { flexDirection: 'row', justifyContent: 'flex-start', paddingHorizontal: Spacing.sm, paddingTop: Spacing.sm },
  headerBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.sm },
  content: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl, gap: Spacing.lg },
  titleBlock: { gap: 4, paddingHorizontal: 4 },
  title: { ...TextStyles.title2, color: Colors.dark },
  lead: { ...TextStyles.subhead, color: Colors.label2 },
  group: { gap: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.cardBg,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: WORKOUTS_ACCENT },
  chipText: { ...TextStyles.subhead, fontWeight: '600', color: Colors.dark },
  chipTextOn: { color: Colors.white },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: Spacing.md, paddingVertical: 10 },
  rowIcon: { width: 32, height: 32, borderRadius: 9, backgroundColor: WORKOUTS_TINT, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, gap: 2 },
  topSeparator: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.separator },
});
