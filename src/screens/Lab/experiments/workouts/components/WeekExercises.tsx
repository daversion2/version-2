import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, TextStyles } from '../../../../../constants/theme';
import type { Exercise, SetValues } from '../../../../../types/workouts';
import {
  canLogKind,
  checkinPending,
  describeTarget,
  describeWeekRow,
  prefillFrom,
  targetFraction,
  weekSummary,
} from '../../../../../services/weeklyVolume';
import { showAlert } from '../../../../../utils/alert';
import { useWorkouts } from '../WorkoutsContext';
import { ExercisePickerModal } from './ExercisePickerModal';
import { ProgressBar } from './PhaseParts';
import { SetEntrySheet } from './SetEntrySheet';
import { useLogSets } from './useLogSets';
import { Copy } from '../../../../../components/common/Copy';
import { useCopy } from '../../../../../context/CopyContext';
import { WORKOUTS_ACCENT, WORKOUTS_TINT, ws } from './workoutsStyle';

/** Sets added without a workout wait here to be rated, so they count toward the week. */
export const WeekRateCard: React.FC = () => {
  const { sessions, rateLoggedSets } = useWorkouts();
  const t = useCopy();
  const pending = checkinPending(sessions, new Date());
  // One tap, one hand-off: a second tap while the first saves would send it twice.
  const [rating, setRating] = useState(false);
  const ratingRef = useRef(false);

  if (!pending) return null;

  const rate = async () => {
    if (ratingRef.current) return;
    ratingRef.current = true;
    setRating(true);
    try {
      await rateLoggedSets(pending);
    } catch {
      showAlert(
        t('workouts.weekEx.handFailTitle', "Couldn't hand it to Today"),
        t('workouts.weekEx.failMsg', 'Check your connection and try again.')
      );
    } finally {
      ratingRef.current = false;
      setRating(false);
    }
  };

  return (
    <View style={[ws.card, styles.rate]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Copy id="workouts.weekEx.doneToday" style={ws.title}>
          Done for today?
        </Copy>
        <Copy id="workouts.weekEx.rateSub" style={ws.muted}>
          Rate today’s sets to count them toward your week.
        </Copy>
      </View>
      <TouchableOpacity
        style={[styles.rateBtn, rating && ws.disabled]}
        onPress={rate}
        disabled={rating}
        accessibilityRole="button"
        accessibilityState={{ busy: rating, disabled: rating }}
      >
        {rating ? <ActivityIndicator color={Colors.white} /> : <Copy id="workouts.weekEx.rateIt" style={styles.rateBtnText}>
            Rate it
          </Copy>}
      </TouchableOpacity>
    </View>
  );
};

/**
 * Every exercise done since Monday, from any workout, with weekly targets and
 * sets added straight from here. The logic is services/weeklyVolume.ts.
 */
export const WeekExercises: React.FC<{ onOpenExercise: (exerciseId: string) => void }> = ({ onOpenExercise }) => {
  const { sessions, exercisesById, prefs } = useWorkouts();
  const t = useCopy();
  const week = useMemo(
    () => weekSummary({ sessions, exercisesById, targets: prefs.weekly_targets, now: new Date() }),
    [sessions, exercisesById, prefs.weekly_targets]
  );
  const [picking, setPicking] = useState(false);
  const [adding, setAdding] = useState<{ exercise: Exercise; initial: SetValues } | null>(null);
  const logSets = useLogSets();

  const openAdd = (exercise: Exercise) => setAdding({ exercise, initial: prefillFrom(sessions, exercise) });

  return (
    <>
      <Copy id="workouts.weekEx.since" style={ws.sectionLabel}>
        Exercises since Monday
      </Copy>
      {week.rows.length === 0 && (
        <Copy id="workouts.weekEx.nothing" style={ws.lead}>
          Nothing yet since Monday. Sets from any workout show up here, and you can add sets here too.
        </Copy>
      )}

      {week.rows.map((row) => {
        const exercise = exercisesById[row.exerciseId];
        const targetText = describeTarget(row);
        return (
          <TouchableOpacity
            key={row.exerciseId}
            style={[ws.card, styles.row]}
            onPress={() => onOpenExercise(row.exerciseId)}
            accessibilityRole="button"
          >
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={ws.title}>{exercise.name}</Text>
              <Text style={ws.muted}>{describeWeekRow(row, prefs.unit)}</Text>
              {targetText && (
                <View style={styles.target}>
                  <ProgressBar value={targetFraction(row)} max={1} />
                  <Text style={styles.targetText}>{targetText}</Text>
                </View>
              )}
            </View>
            {canLogKind(row.kind) && !exercise.archived_at && (
              <TouchableOpacity
                style={styles.plus}
                onPress={() => openAdd(exercise)}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={`Add sets of ${exercise.name}`}
              >
                <Ionicons name="add" size={22} color={WORKOUTS_ACCENT} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity style={ws.secondaryBtn} onPress={() => setPicking(true)} accessibilityRole="button">
        <Copy id="workouts.weekEx.add" style={ws.secondaryBtnText}>
          + Add exercise
        </Copy>
      </TouchableOpacity>
      <Copy id="workouts.weekEx.footnote" style={[ws.muted, styles.footnote]}>
        Sets added here count like a workout: in stats, records and your week.
      </Copy>

      <ExercisePickerModal
        visible={picking}
        title={t('workouts.weekEx.addTitle', 'Add an exercise')}
        mode="single"
        onCancel={() => setPicking(false)}
        onConfirm={([exercise]) => {
          setPicking(false);
          if (!exercise) return;
          if (!canLogKind(exercise.kind)) {
            showAlert(
              t('workouts.weekEx.runTitle', 'Run it as a workout'),
              t('workouts.weekEx.runMsg', 'Timed distances like a mile are logged from a workout, not here.')
            );
            return;
          }
          // Let the picker finish closing first: iOS drops a modal opened mid-dismissal.
          setTimeout(() => openAdd(exercise), 400);
        }}
      />

      <SetEntrySheet
        visible={!!adding}
        exercise={adding?.exercise}
        unit={prefs.unit}
        vt1={prefs.vt1_bpm}
        vt2={prefs.vt2_bpm}
        mode="add"
        initial={adding?.initial ?? {}}
        onCancel={() => setAdding(null)}
        onSave={async (values, count) => {
          if (!adding) return;
          await logSets(adding.exercise, values, count, () => setAdding(null));
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  rate: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderColor: WORKOUTS_ACCENT + '55' },
  rateBtn: {
    backgroundColor: WORKOUTS_ACCENT,
    borderRadius: 999,
    paddingHorizontal: Spacing.md,
    minHeight: 40,
    justifyContent: 'center',
  },
  rateBtnText: { ...TextStyles.subhead, fontWeight: '700', color: Colors.white },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  target: { gap: 4, marginTop: 2 },
  targetText: { ...TextStyles.footnote, fontWeight: '600', color: Colors.dark },
  plus: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: WORKOUTS_TINT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footnote: { textAlign: 'center' },
});
