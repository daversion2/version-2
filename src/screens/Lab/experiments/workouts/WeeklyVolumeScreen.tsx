import React, { useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing } from '../../../../constants/theme';
import type { Exercise, SetValues, WorkoutsStackParamList } from '../../../../types/workouts';
import {
  canLogKind,
  checkinPending,
  describeTarget,
  describeWeekRow,
  prefillFrom,
  targetFraction,
  weekLabel,
  weekSummary,
} from '../../../../services/weeklyVolume';
import { formatVolume } from '../../../../services/workoutMath';
import { showAlert } from '../../../../utils/alert';
import { useWorkouts } from './WorkoutsContext';
import { ExercisePickerModal } from './components/ExercisePickerModal';
import { SetEntrySheet } from './components/SetEntrySheet';
import { CardioWeekCard } from './components/CardioWeekCard';
import { cardioWeek } from '../../../../services/cardio';
import { ProgressBar } from './components/PhaseParts';
import { useLogSets } from './components/useLogSets';
import { WORKOUTS_ACCENT, WORKOUTS_TINT, ws } from './components/workoutsStyle';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'WeeklyVolume'>;

/**
 * Every exercise done since Monday, from any workout, with sets added straight
 * from here — for tracking volume by the week instead of by the workout.
 * The logic is services/weeklyVolume.ts.
 */
export const WeeklyVolumeScreen: React.FC<Props> = ({ navigation }) => {
  const { sessions, exercisesById, prefs, rateLoggedSets } = useWorkouts();
  const now = new Date();
  const week = useMemo(
    () => weekSummary({ sessions, exercisesById, targets: prefs.weekly_targets, now: new Date() }),
    [sessions, exercisesById, prefs.weekly_targets]
  );
  const pending = checkinPending(sessions, now);
  const cardio = useMemo(() => cardioWeek({ sessions, exercisesById, now: new Date() }), [sessions, exercisesById]);
  const [picking, setPicking] = useState(false);
  const [adding, setAdding] = useState<{ exercise: Exercise; initial: SetValues } | null>(null);
  const logSets = useLogSets();

  const openAdd = (exercise: Exercise) => setAdding({ exercise, initial: prefillFrom(sessions, exercise) });

  // One tap, one hand-off: a second tap while the first saves would send it twice.
  const [rating, setRating] = useState(false);
  const ratingRef = useRef(false);
  const rate = async () => {
    if (!pending || ratingRef.current) return;
    ratingRef.current = true;
    setRating(true);
    try {
      await rateLoggedSets(pending);
    } catch {
      showAlert("Couldn't hand it to Today", 'Check your connection and try again.');
    } finally {
      ratingRef.current = false;
      setRating(false);
    }
  };

  const change = week.volumeChangePct;

  return (
    <ScrollView style={ws.screen} contentContainerStyle={ws.scroll}>
      <View style={[ws.card, styles.summary]}>
        <Text style={styles.eyebrow}>{weekLabel(week.start)}</Text>
        <Text style={styles.big}>{formatVolume(week.totalVolumeKg, prefs.unit)}</Text>
        <Text style={ws.muted}>
          {week.totalSets} {week.totalSets === 1 ? 'set' : 'sets'}
          {change !== null ? ` · ${change >= 0 ? 'up' : 'down'} ${Math.abs(change)}% on last week` : ''}
        </Text>
      </View>

      <CardioWeekCard week={cardio} />

      {pending && (
        <View style={[ws.card, styles.rate]}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={ws.title}>Done for today?</Text>
            <Text style={ws.muted}>Rate today’s sets to count them toward your week.</Text>
          </View>
          <TouchableOpacity
            style={[styles.rateBtn, rating && ws.disabled]}
            onPress={rate}
            disabled={rating}
            accessibilityRole="button"
            accessibilityState={{ busy: rating, disabled: rating }}
          >
            {rating ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.rateBtnText}>Rate it</Text>}
          </TouchableOpacity>
        </View>
      )}

      <Text style={ws.sectionLabel}>Exercises</Text>
      {week.rows.length === 0 && (
        <Text style={ws.muted}>
          Nothing yet since Monday. Sets from any workout show up here, and you can add sets straight from this screen.
        </Text>
      )}

      {week.rows.map((row) => {
        const exercise = exercisesById[row.exerciseId];
        const targetText = describeTarget(row);
        return (
          <TouchableOpacity
            key={row.exerciseId}
            style={[ws.card, styles.row]}
            onPress={() => navigation.navigate('WeeklyVolumeExercise', { exerciseId: row.exerciseId })}
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
        <Text style={ws.secondaryBtnText}>+ Add exercise</Text>
      </TouchableOpacity>
      <Text style={[ws.muted, styles.footnote]}>
        Sets added here count like a workout: in stats, records and your week.
      </Text>

      <ExercisePickerModal
        visible={picking}
        title="Add an exercise"
        mode="single"
        onCancel={() => setPicking(false)}
        onConfirm={([exercise]) => {
          setPicking(false);
          if (!exercise) return;
          if (!canLogKind(exercise.kind)) {
            showAlert('Run it as a workout', 'Timed distances like a mile are logged from a workout, not here.');
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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  summary: { gap: 4 },
  eyebrow: {
    fontFamily: Fonts.secondaryBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: WORKOUTS_ACCENT,
  },
  big: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xxl, color: Colors.dark },
  rate: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderColor: WORKOUTS_ACCENT + '55' },
  rateBtn: {
    backgroundColor: WORKOUTS_ACCENT,
    borderRadius: 999,
    paddingHorizontal: Spacing.md,
    minHeight: 40,
    justifyContent: 'center',
  },
  rateBtnText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.sm, color: Colors.white },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  target: { gap: 4, marginTop: 2 },
  targetText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.dark },
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
