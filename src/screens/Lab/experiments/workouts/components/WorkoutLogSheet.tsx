import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, TextStyles } from '../../../../../constants/theme';
import type { CompletedWorkoutSession, Exercise, SetValues, WeightUnit } from '../../../../../types/workouts';
import { formatSetValues } from '../../../../../services/workoutMath';
import { makeId } from '../../../../../services/workoutSession';
import { canLogKind, prefillFrom } from '../../../../../services/weeklyVolume';
import { lastTimeFor, quickLogSession, usualExercises } from '../../../../../services/workoutQuickLog';
import {
  getRecordsFor,
  isTimeoutError,
  SAVE_TIMEOUT_MS,
  saveSessionChange,
  withTimeout,
} from '../../../../../services/labWorkouts';
import { formatRelativeDay, toLocalDateString } from '../../../../../utils/date';
import { showAlert } from '../../../../../utils/alert';
import { SetEntrySheet } from './SetEntrySheet';
import { WORKOUTS_ACCENT } from './workoutsStyle';

// =============================================================================
// LOG, from the Workouts page (services/workoutQuickLog.ts): something already
// done, straight into the week. What you usually log leads, each with last
// time's numbers; the top one has "Same" to save it exactly as last time.
// Tap any row for This week's entry sheet, already filled in. Saved as its
// own session and handed to Today, which asks both ratings.
//
// Loaded with require() from the Workouts page (screens/Home/AppPageScreen),
// so none of the Workouts app loads at start-up.
// =============================================================================

export interface WorkoutLogSheetProps {
  visible: boolean;
  userId: string;
  sessions: CompletedWorkoutSession[];
  exercisesById: Record<string, Exercise>;
  unit: WeightUnit;
  vt1?: number;
  vt2?: number;
  /** Saved: hand it to Today to be rated. */
  onLogged: (logged: { sessionId: string; durationSec: number }) => void;
  onCancel: () => void;
}

/** iOS drops a modal presented while another is still animating away. */
const SHEET_GAP_MS = 400;
const RECORDS_READ_MS = 8000;

export const WorkoutLogSheet: React.FC<WorkoutLogSheetProps> = ({
  visible,
  userId,
  sessions,
  exercisesById,
  unit,
  vt1,
  vt2,
  onLogged,
  onCancel,
}) => {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [entry, setEntry] = useState<{ exercise: Exercise; initial: SetValues } | null>(null);
  const [listOpen, setListOpen] = useState(visible);
  const [savingSame, setSavingSame] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    if (visible) {
      setQuery('');
      setEntry(null);
      setSavingSame(false);
      busy.current = false;
    }
    setListOpen(visible);
  }, [visible]);

  const usual = useMemo(() => usualExercises(sessions, exercisesById, new Date()), [sessions, exercisesById]);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return Object.values(exercisesById)
      .filter((e) => !e.archived_at && canLogKind(e.kind) && e.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 40);
  }, [query, exercisesById]);

  const lastLine = (exercise: Exercise): string => {
    const last = lastTimeFor(sessions, exercise);
    if (!last) return 'Not done yet';
    const numbers = formatSetValues(last.values, exercise.kind, unit);
    const sets = exercise.kind === 'cardio' || last.count === 1 ? '' : `${last.count} sets · `;
    return `${sets}${numbers} · ${formatRelativeDay(toLocalDateString(new Date(last.at)))}`;
  };

  /** Saves one quick log and hands it on. False (and an alert) when it didn't save, so the sheet stays open. */
  const save = async (exercise: Exercise, values: SetValues, count: number): Promise<boolean> => {
    if (busy.current) return false;
    busy.current = true;
    try {
      // Records are written whole, so they're built on what's really saved.
      let records;
      try {
        records = await withTimeout(getRecordsFor(userId, [exercise.id]), RECORDS_READ_MS);
      } catch {
        showAlert("Couldn't log that", 'Check your connection and try again.');
        return false;
      }
      const { session, record } = quickLogSession({
        id: makeId('quick'),
        exercise,
        values,
        count,
        records,
        exercisesById,
        now: new Date(),
      });
      try {
        await withTimeout(
          saveSessionChange(userId, { sessionId: session.id, session, records: { [exercise.id]: record } }),
          SAVE_TIMEOUT_MS
        );
      } catch (e) {
        // Timed out: queued, and it lands once back online. The rating can go ahead.
        if (!isTimeoutError(e)) {
          showAlert("Couldn't log that", 'Check your connection and try again.');
          return false;
        }
      }
      setEntry(null);
      setListOpen(false);
      onLogged({ sessionId: session.id, durationSec: session.duration_sec });
      return true;
    } finally {
      busy.current = false;
    }
  };

  const same = async (exercise: Exercise) => {
    const last = lastTimeFor(sessions, exercise);
    if (!last || savingSame) return;
    setSavingSame(true);
    if (!(await save(exercise, last.values, last.count))) setSavingSame(false);
  };

  const open = (exercise: Exercise) => {
    setListOpen(false);
    setTimeout(() => setEntry({ exercise, initial: prefillFrom(sessions, exercise) }), SHEET_GAP_MS);
  };

  const row = (exercise: Exercise, withSame: boolean) => (
    <View key={exercise.id} style={styles.row}>
      <TouchableOpacity
        style={styles.rowMain}
        onPress={() => open(exercise)}
        accessibilityRole="button"
        accessibilityLabel={`${exercise.name}, ${lastLine(exercise)}`}
      >
        <Text style={styles.rowTitle} numberOfLines={1}>
          {exercise.name}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {lastLine(exercise)}
        </Text>
      </TouchableOpacity>
      {withSame ? (
        <TouchableOpacity
          style={styles.same}
          onPress={() => same(exercise)}
          disabled={savingSame}
          accessibilityRole="button"
          accessibilityLabel={`Log ${exercise.name}, same as last time`}
        >
          {savingSame ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.sameText}>Same</Text>}
        </TouchableOpacity>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
      )}
    </View>
  );

  return (
    <>
      <Modal visible={listOpen} transparent animationType="slide" onRequestClose={onCancel}>
        <View style={styles.backdrop}>
          <Pressable style={styles.dismiss} onPress={onCancel} accessibilityLabel="Cancel" />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Spacing.md) + Spacing.sm }]}>
            <View style={styles.grabber} />
            <View style={styles.head}>
              <TouchableOpacity onPress={onCancel} hitSlop={8} accessibilityRole="button">
                <Text style={styles.cancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.title} accessibilityRole="header">
                Log to this week
              </Text>
              <View style={styles.headSpacer} />
            </View>
            <View style={styles.search}>
              <Ionicons name="search" size={16} color={Colors.gray} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search exercises"
                placeholderTextColor={Colors.gray}
                style={styles.searchInput}
                autoCorrect={false}
                clearButtonMode="while-editing"
                accessibilityLabel="Search exercises"
              />
            </View>
            {query.trim() ? (
              <FlatList
                style={styles.list}
                data={matches}
                keyExtractor={(e) => e.id}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => row(item, false)}
                ListEmptyComponent={<Text style={styles.empty}>Nothing matches “{query.trim()}”.</Text>}
              />
            ) : usual.length > 0 ? (
              <>
                <Text style={styles.sectionLabel}>You usually log</Text>
                <View style={styles.panel}>{usual.map((e, i) => row(e, i === 0))}</View>
                <Text style={styles.hint}>“Same” saves it exactly as last time.</Text>
              </>
            ) : (
              <Text style={styles.empty}>Search for what you did. What you log most will show up here.</Text>
            )}
          </View>
        </View>
      </Modal>

      <SetEntrySheet
        visible={!!entry}
        exercise={entry?.exercise}
        unit={unit}
        vt1={vt1}
        vt2={vt2}
        mode="add"
        initial={entry?.initial ?? {}}
        note="Added to this week, then rated on Today."
        onCancel={() => {
          setEntry(null);
          onCancel();
        }}
        onSave={async (values, count) => {
          if (entry) await save(entry.exercise, values, count);
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  dismiss: { flex: 1 },
  sheet: {
    backgroundColor: Colors.lightGray,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    gap: Spacing.sm + 4,
    maxHeight: '88%',
  },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: Colors.separator },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  cancel: { ...TextStyles.body, color: WORKOUTS_ACCENT },
  title: { ...TextStyles.headline, color: Colors.dark },
  headSpacer: { width: 52 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.cardBg,
    borderRadius: 10,
    paddingHorizontal: Spacing.sm + 4,
    minHeight: 40,
  },
  searchInput: { ...TextStyles.body, flex: 1, color: Colors.dark, paddingVertical: 8 },
  list: { flexGrow: 0, backgroundColor: Colors.cardBg, borderRadius: 14 },
  sectionLabel: { ...TextStyles.footnote, color: Colors.gray, paddingHorizontal: Spacing.md, marginBottom: -4 },
  panel: { backgroundColor: Colors.cardBg, borderRadius: 14, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    minHeight: 60,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.separator,
  },
  rowMain: { flex: 1, paddingVertical: 10, gap: 2 },
  rowTitle: { ...TextStyles.body, color: Colors.dark },
  rowSub: { ...TextStyles.footnote, color: Colors.gray },
  same: {
    minWidth: 64,
    minHeight: 36,
    borderRadius: 18,
    paddingHorizontal: Spacing.sm + 4,
    backgroundColor: WORKOUTS_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sameText: { ...TextStyles.subhead, fontWeight: '700', color: Colors.white },
  hint: { ...TextStyles.footnote, color: Colors.gray, textAlign: 'center' },
  empty: { ...TextStyles.subhead, color: Colors.gray, textAlign: 'center', padding: Spacing.md },
});
