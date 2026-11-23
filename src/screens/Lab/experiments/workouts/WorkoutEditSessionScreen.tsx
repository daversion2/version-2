import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { usePreventRemove } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, TextStyles } from '../../../../constants/theme';
import type { CompletedWorkoutSession, SetValues, WorkoutsStackParamList } from '../../../../types/workouts';
import { isTimeoutError } from '../../../../services/labWorkouts';
import { canRemoveSet } from '../../../../services/weeklyVolume';
import { formatSetValues } from '../../../../services/workoutMath';
import { blockTitle } from '../../../../services/workoutSession';
import {
  canEditLength,
  MAX_SESSION_MINUTES,
  MIN_SESSION_MINUTES,
  sessionMinutes,
  withAddedRound,
  withEditedSet,
  withoutLastRound,
  withRemovedSet,
  withSessionMinutes,
} from '../../../../services/workoutEdit';
import { showAlert, showConfirm } from '../../../../utils/alert';
import { formatDayHeader, toLocalDateString } from '../../../../utils/date';
import { showNotSavedYet, useWorkouts } from './WorkoutsContext';
import { NumberStepper } from './components/NumberStepper';
import { SetEntrySheet } from './components/SetEntrySheet';
import { WORKOUTS_ACCENT, ws } from './components/workoutsStyle';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'WorkoutEditSession'>;

/** iOS drops an alert presented while a sheet is still animating away. */
const SHEET_GAP_MS = 400;

/**
 * One finished workout, corrected: its sets, its length, or the whole thing
 * (founder, 2026-11-23). Every past session opens here. Changes are held on
 * this screen until Save. The logic is services/workoutEdit.ts.
 */
export const WorkoutEditSessionScreen: React.FC<Props> = ({ navigation, route }) => {
  const { sessionId, exerciseId } = route.params;
  const insets = useSafeAreaInsets();
  const { sessions, exercise, exercisesById, prefs, editSession } = useWorkouts();
  const saved = sessions.find((s) => s.id === sessionId);
  const [draft, setDraft] = useState<CompletedWorkoutSession | null>(saved ?? null);
  const [editing, setEditing] = useState<{ blockIndex: number; setIndex: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const scrolled = useRef(false);

  const dirty = useMemo(
    () => !!draft && !!saved && JSON.stringify(draft) !== JSON.stringify(saved),
    [draft, saved]
  );

  usePreventRemove(dirty && !leaving, ({ data }) =>
    showConfirm('Discard changes?', 'Your edits to this workout will be lost.', () => navigation.dispatch(data.action), 'Discard')
  );

  // Once the guard above is off, so the leaving isn't stopped by it.
  useEffect(() => {
    if (leaving) navigation.goBack();
  }, [leaving, navigation]);

  if (!draft) {
    return (
      <View style={[ws.screen, styles.center]}>
        <Text style={ws.muted}>This workout no longer exists.</Text>
      </View>
    );
  }

  const unit = prefs.unit;
  const editingSet = editing ? draft.blocks[editing.blockIndex]?.sets[editing.setIndex] : undefined;
  const minutes = sessionMinutes(draft);
  const setMinutes = (m: number) => setDraft((d) => d && withSessionMinutes(d, m, exercisesById));

  const commit = async (next: CompletedWorkoutSession | null, failTitle: string) => {
    setBusy(true);
    try {
      await editSession(sessionId, next);
      setLeaving(true);
    } catch (e) {
      if (isTimeoutError(e)) {
        setLeaving(true);
        setTimeout(showNotSavedYet, SHEET_GAP_MS);
        return;
      }
      showAlert(failTitle, 'Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = (message?: string) =>
    showConfirm(
      'Delete this workout?',
      message ?? 'It comes off your week, stats and records, along with its rating and XP. This can’t be undone.',
      () => commit(null, 'Couldn’t delete that workout'),
      'Delete'
    );

  const removeEditingSet = async () => {
    if (!editing) return;
    const next = withRemovedSet(draft, editing, exercisesById);
    setEditing(null);
    if (next) return setDraft(next);
    setTimeout(
      () => confirmDelete('That’s its only set. Deleting it removes the whole workout, with its rating and XP. This can’t be undone.'),
      SHEET_GAP_MS
    );
  };

  const removeLastRound = (blockIndex: number) => {
    const next = withoutLastRound(draft, blockIndex, exercisesById);
    if (next) return setDraft(next);
    confirmDelete('That’s its only round. Deleting it removes the whole workout, with its rating and XP. This can’t be undone.');
  };

  return (
    <View style={ws.screen}>
      <ScrollView ref={scrollRef} contentContainerStyle={[ws.scroll, { paddingBottom: 120 + insets.bottom }]}>
        <View style={[ws.card, styles.head]}>
          <Text style={ws.title}>{draft.workout_name}</Text>
          <Text style={ws.muted}>{formatDayHeader(toLocalDateString(new Date(draft.started_at)))}</Text>
        </View>

        {canEditLength(draft) && (
          <View style={[ws.panel, styles.lengthPanel]}>
            <NumberStepper
              label="How long?"
              value={minutes}
              suffix=" min"
              layout="row"
              onDecrement={() => setMinutes(Math.max(MIN_SESSION_MINUTES, minutes - 5))}
              onIncrement={() => setMinutes(Math.min(MAX_SESSION_MINUTES, minutes + 5))}
              onSubmitValue={setMinutes}
            />
          </View>
        )}

        {draft.blocks.map((block, bi) => {
          if (block.sets.length === 0) return null;
          const multi = block.items.length > 1;
          const isTarget = !!exerciseId && block.sets.some((s) => s.exerciseId === exerciseId);
          return (
            <View
              key={block.id}
              style={ws.panel}
              onLayout={(e) => {
                if (!isTarget || scrolled.current) return;
                scrolled.current = true;
                scrollRef.current?.scrollTo({ y: Math.max(0, e.nativeEvent.layout.y - Spacing.md), animated: false });
              }}
            >
              <View style={[styles.row, styles.blockHead, ws.separator]}>
                <Text style={[ws.title, { flex: 1 }]}>{blockTitle(block, exercisesById)}</Text>
                {multi && <Text style={ws.muted}>Circuit</Text>}
              </View>
              {block.sets.map((set, si) => {
                const ex = exercise(set.exerciseId);
                const firstOfRound = si % block.items.length === 0;
                const label = multi ? ex.name : `Set ${si + 1}`;
                const round = Math.floor(si / block.items.length) + 1;
                return (
                  <View key={si}>
                    {multi && firstOfRound && <Text style={styles.roundLabel}>Round {round}</Text>}
                    <TouchableOpacity
                      style={[styles.row, styles.setRow]}
                      onPress={() => setEditing({ blockIndex: bi, setIndex: si })}
                      accessibilityRole="button"
                      accessibilityLabel={`${multi ? `Round ${round}, ` : ''}${label}, ${formatSetValues(set, ex.kind, unit)}. Edit`}
                    >
                      <Text style={[ws.body, { flex: 1 }]}>{label}</Text>
                      <Text style={styles.value}>{formatSetValues(set, ex.kind, unit)}</Text>
                      <Ionicons name="chevron-forward" size={16} color={Colors.gray} />
                    </TouchableOpacity>
                  </View>
                );
              })}
              <View style={[styles.row, styles.blockActions]}>
                <TouchableOpacity
                  style={styles.action}
                  onPress={() => setDraft((d) => d && withAddedRound(d, bi, exercisesById))}
                  accessibilityRole="button"
                  accessibilityLabel={`Add a ${multi ? 'round' : 'set'} to ${blockTitle(block, exercisesById)}`}
                >
                  <Text style={ws.link}>+ Add {multi ? 'round' : 'set'}</Text>
                </TouchableOpacity>
                {multi && (
                  <TouchableOpacity
                    style={styles.action}
                    onPress={() => removeLastRound(bi)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove the last round of ${blockTitle(block, exercisesById)}`}
                  >
                    <Text style={styles.removeText}>Remove last round</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}

        <TouchableOpacity style={ws.textBtn} onPress={() => confirmDelete()} disabled={busy} accessibilityRole="button">
          <Text style={ws.destructiveText}>Delete workout</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={[ws.footer, { paddingBottom: Spacing.sm + insets.bottom }]}>
        <TouchableOpacity
          style={[ws.primaryBtn, (!dirty || busy) && ws.disabled]}
          onPress={() => commit(draft, 'Couldn’t save your changes')}
          disabled={!dirty || busy}
          accessibilityRole="button"
          accessibilityState={{ disabled: !dirty || busy, busy }}
        >
          {busy ? <ActivityIndicator color={Colors.white} /> : <Text style={ws.primaryBtnText}>Save changes</Text>}
        </TouchableOpacity>
      </View>

      <SetEntrySheet
        visible={!!editingSet}
        exercise={editingSet ? exercise(editingSet.exerciseId) : undefined}
        unit={unit}
        vt1={prefs.vt1_bpm}
        vt2={prefs.vt2_bpm}
        mode="edit"
        initial={editingSet ?? {}}
        onSave={async (values: SetValues) => {
          if (editing) setDraft((d) => d && withEditedSet(d, editing, values, exercisesById));
          setEditing(null);
        }}
        onDelete={editing && canRemoveSet(draft, editing) ? removeEditingSet : undefined}
        onCancel={() => setEditing(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  head: { gap: 2 },
  lengthPanel: { paddingHorizontal: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  blockHead: { paddingHorizontal: Spacing.md, paddingVertical: 12 },
  roundLabel: { ...TextStyles.footnote, color: Colors.gray, paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  setRow: { paddingHorizontal: Spacing.md, minHeight: 44 },
  value: { ...TextStyles.subhead, color: Colors.dark, fontVariant: ['tabular-nums'] },
  blockActions: { justifyContent: 'space-between', paddingHorizontal: Spacing.md },
  action: { minHeight: 44, justifyContent: 'center' },
  removeText: { ...TextStyles.subhead, color: Colors.danger },
});
