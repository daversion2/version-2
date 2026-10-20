import React, { useLayoutEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing } from '../../../../constants/theme';
import { Workout, WorkoutsStackParamList } from '../../../../types/workouts';
import {
  endPhase,
  formatTestValue,
  nextProgramWorkout,
  phaseChain,
  phaseSessions,
  programExerciseIds,
  testSeries,
  testTypeFor,
} from '../../../../services/trainingPhases';
import { toLocalDateString } from '../../../../utils/date';
import { showAlert, showConfirm } from '../../../../utils/alert';
import { useWorkouts } from './WorkoutsContext';
import { formatPhaseDate, PhaseStatusCard, TestHistoryBars, TestResultRow } from './components/PhaseParts';
import { WORKOUTS_ACCENT, ws } from './components/workoutsStyle';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'Phase'>;

const STATUS_WORDS = { baseline: 'Waiting on its baseline', training: 'In training', complete: 'Complete', ended: 'Ended early' };

/** One phase: where it stands, its program and tests, and the tests' history across phases. */
export const PhaseScreen: React.FC<Props> = ({ navigation, route }) => {
  const { phases, currentPhase, sessions, workouts, exercise, exercisesById, prefs, upsertPhase } = useWorkouts();
  const phase = route.params?.phaseId ? phases.find((p) => p.id === route.params!.phaseId) : currentPhase ?? phases[0];
  const today = toLocalDateString(new Date());
  const [historyTest, setHistoryTest] = useState<string | undefined>();

  useLayoutEffect(() => {
    navigation.setOptions({ title: phase ? `Phase ${phase.number}` : 'Phases' });
  }, [navigation, phase]);

  const programWorkouts = useMemo(
    () =>
      phase
        ? phase.workout_ids.map((id) => workouts.find((w) => w.id === id)).filter((w): w is Workout => !!w)
        : [],
    [phase, workouts]
  );
  const trained = useMemo(() => programExerciseIds(programWorkouts), [programWorkouts]);
  const chain = useMemo(() => (phase ? phaseChain(phases, phase.id) : []), [phases, phase]);

  if (!phase) {
    return (
      <View style={[ws.screen, styles.center]}>
        <Text style={ws.muted}>No phases yet.</Text>
      </View>
    );
  }

  const done = phaseSessions(phase, sessions).length;
  const next = nextProgramWorkout(phase, workouts, sessions);
  const live = phase.status === 'baseline' || phase.status === 'training';
  const selected = historyTest ?? phase.tests[0]?.exerciseId;
  const others = phases.filter((p) => p.id !== phase.id);

  const openTest = () => {
    if (phase.status === 'baseline') return navigation.navigate('PhaseTest', { phaseId: phase.id, mode: 'baseline' });
    if (today >= phase.retest_date) return navigation.navigate('PhaseTest', { phaseId: phase.id, mode: 'retest' });
    showConfirm(
      'Retest early?',
      `Your retest is set for ${formatPhaseDate(phase.retest_date)}. Retesting now ends this phase.`,
      () => navigation.navigate('PhaseTest', { phaseId: phase.id, mode: 'retest' }),
      'Retest now'
    );
  };

  const end = () =>
    showConfirm(
      `End Phase ${phase.number}?`,
      'It stops here without a retest. Your sessions and baseline stay in your history.',
      async () => {
        try {
          await upsertPhase(endPhase(phase, new Date()));
          navigation.popToTop();
        } catch {
          showAlert("Couldn't end the phase", 'Check your connection and try again.');
        }
      },
      'End phase'
    );

  return (
    <ScrollView style={ws.screen} contentContainerStyle={ws.scroll}>
      {live ? (
        <PhaseStatusCard
          phase={phase}
          sessionsDone={done}
          today={today}
          nextWorkoutName={next?.name}
          onTest={openTest}
          onStartNext={next ? () => navigation.navigate('WorkoutPreview', { workoutId: next.id }) : undefined}
        />
      ) : (
        <View style={[ws.card, { gap: 4 }]}>
          <Text style={styles.eyebrow}>{STATUS_WORDS[phase.status]}</Text>
          <Text style={styles.title}>{phase.program_name}</Text>
          <Text style={ws.muted}>
            {formatPhaseDate(phase.start_date)} – {formatPhaseDate(phase.retest_date)} · {done} sessions
          </Text>
          {phase.status === 'complete' && (
            <TouchableOpacity onPress={() => navigation.navigate('PhaseResults', { phaseId: phase.id })} style={styles.link}>
              <Text style={styles.linkText}>See results</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {phase.status === 'training' && today < phase.retest_date && (
        <TouchableOpacity onPress={openTest} style={styles.link}>
          <Text style={styles.linkText}>Retest early</Text>
        </TouchableOpacity>
      )}

      {!!phase.change && (
        <View style={ws.card}>
          <Text style={ws.sectionLabel}>What this phase changed</Text>
          <Text style={ws.body}>{phase.change.label}</Text>
        </View>
      )}

      <Text style={ws.sectionLabel}>Tests</Text>
      <View style={ws.card}>
        {phase.tests.map((t) => (
          <TestResultRow
            key={t.exerciseId}
            exercise={exercise(t.exerciseId)}
            test={t}
            before={phase.baseline[t.exerciseId]}
            after={phase.retest?.[t.exerciseId]}
            unit={prefs.unit}
            untrained={!trained.has(t.exerciseId)}
          />
        ))}
      </View>

      <Text style={ws.sectionLabel}>Program · {phase.days_per_week} days a week</Text>
      {programWorkouts.length === 0 && <Text style={ws.muted}>These workouts have been deleted.</Text>}
      {programWorkouts.map((w) => (
        <TouchableOpacity
          key={w.id}
          style={[ws.card, styles.row]}
          onPress={() => navigation.navigate('WorkoutPreview', { workoutId: w.id })}
          accessibilityRole="button"
        >
          <Text style={[ws.title, { flex: 1 }]}>{w.name}</Text>
          {live && next?.id === w.id && <Text style={styles.next}>Next</Text>}
          <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
        </TouchableOpacity>
      ))}

      {selected && (
        <>
          <Text style={ws.sectionLabel}>Test history</Text>
          <View style={[ws.card, { gap: Spacing.md }]}>
            <View style={styles.chips}>
              {phase.tests.map((t) => (
                <TouchableOpacity
                  key={t.exerciseId}
                  style={[ws.chip, selected === t.exerciseId && ws.chipActive]}
                  onPress={() => setHistoryTest(t.exerciseId)}
                >
                  <Text style={[ws.chipText, selected === t.exerciseId && ws.chipTextActive]}>{exercise(t.exerciseId).name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TestHistoryBars
              points={testSeries(chain, selected)}
              format={(v) => formatTestValue(testTypeFor(exercisesById[selected]?.kind ?? 'reps'), v)}
              lowerIsBetter={exercisesById[selected]?.kind === 'distance'}
            />
          </View>
        </>
      )}

      {others.length > 0 && (
        <>
          <Text style={ws.sectionLabel}>Other phases</Text>
          {others.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[ws.card, styles.row]}
              onPress={() => navigation.push('Phase', { phaseId: p.id })}
              accessibilityRole="button"
            >
              <View style={{ flex: 1 }}>
                <Text style={ws.title}>
                  Phase {p.number} · {p.program_name}
                </Text>
                <Text style={ws.muted}>
                  {STATUS_WORDS[p.status]} · from {formatPhaseDate(p.start_date)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
            </TouchableOpacity>
          ))}
        </>
      )}

      {live && (
        <TouchableOpacity onPress={end} style={styles.end}>
          <Text style={styles.endText}>End this phase</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  eyebrow: {
    fontFamily: Fonts.secondaryBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: WORKOUTS_ACCENT,
  },
  title: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg, color: Colors.dark },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  next: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: WORKOUTS_ACCENT },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  link: { alignSelf: 'flex-start', paddingVertical: 6 },
  linkText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: WORKOUTS_ACCENT },
  end: { alignSelf: 'center', paddingVertical: Spacing.lg },
  endText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.gray },
});
