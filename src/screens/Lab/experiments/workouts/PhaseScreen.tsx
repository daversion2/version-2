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
import { Copy } from '../../../../components/common/Copy';
import { useCopy } from '../../../../context/CopyContext';
import { useWorkouts } from './WorkoutsContext';
import { formatPhaseDate, PhaseStatusCard, TestHistoryBars, TestResultRow } from './components/PhaseParts';
import { WORKOUTS_ACCENT, ws } from './components/workoutsStyle';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'Phase'>;

const STATUS_WORDS = {
  baseline: { key: 'workouts.phase.statusBaseline', label: 'Waiting on its baseline' },
  training: { key: 'workouts.phase.statusTraining', label: 'In training' },
  complete: { key: 'workouts.phase.statusComplete', label: 'Complete' },
  ended: { key: 'workouts.phase.statusEnded', label: 'Ended early' },
};

/** One phase: where it stands, its program and tests, and the tests' history across phases. */
export const PhaseScreen: React.FC<Props> = ({ navigation, route }) => {
  const t = useCopy();
  const statusWord = (s: keyof typeof STATUS_WORDS) => t(STATUS_WORDS[s].key, STATUS_WORDS[s].label);
  const { phases, currentPhase, sessions, workouts, exercise, exercisesById, prefs, upsertPhase } = useWorkouts();
  const phase = route.params?.phaseId ? phases.find((p) => p.id === route.params!.phaseId) : currentPhase ?? phases[0];
  const today = toLocalDateString(new Date());
  const [historyTest, setHistoryTest] = useState<string | undefined>();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: phase ? t('workouts.phase.title', 'Phase {n}', { n: phase.number }) : t('workouts.phase.titleNone', 'Phases'),
    });
  }, [navigation, phase, t]);

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
        <Copy id="workouts.phase.none" style={ws.muted}>
          No phases yet.
        </Copy>
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
      t('workouts.phase.retestEarlyTitle', 'Retest early?'),
      t('workouts.phase.retestEarlyMsg', 'Your retest is set for {date}. Retesting now ends this phase.', {
        date: formatPhaseDate(phase.retest_date),
      }),
      () => navigation.navigate('PhaseTest', { phaseId: phase.id, mode: 'retest' }),
      t('workouts.phase.retestNow', 'Retest now')
    );
  };

  const end = () =>
    showConfirm(
      t('workouts.phase.endTitle', 'End Phase {n}?', { n: phase.number }),
      t('workouts.phase.endMsg', 'It stops here without a retest. Your sessions and baseline stay in your history.'),
      async () => {
        try {
          await upsertPhase(endPhase(phase, new Date()));
          navigation.popToTop();
        } catch {
          showAlert(
            t('workouts.phase.endFailTitle', "Couldn't end the phase"),
            t('workouts.phase.endFailMsg', 'Check your connection and try again.')
          );
        }
      },
      t('workouts.phase.endConfirm', 'End phase')
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
          <Text style={styles.eyebrow}>{statusWord(phase.status)}</Text>
          <Text style={styles.title}>{phase.program_name}</Text>
          <Copy
            id="workouts.phase.range"
            style={ws.muted}
            vars={{ from: formatPhaseDate(phase.start_date), to: formatPhaseDate(phase.retest_date), n: done }}
          >
            {'{from} – {to} · {n} sessions'}
          </Copy>
          {phase.status === 'complete' && (
            <TouchableOpacity onPress={() => navigation.navigate('PhaseResults', { phaseId: phase.id })} style={styles.link}>
              <Copy id="workouts.phase.seeResults" style={styles.linkText}>
                See results
              </Copy>
            </TouchableOpacity>
          )}
        </View>
      )}

      {phase.status === 'training' && today < phase.retest_date && (
        <TouchableOpacity onPress={openTest} style={styles.link}>
          <Copy id="workouts.phase.retestEarly" style={styles.linkText}>
            Retest early
          </Copy>
        </TouchableOpacity>
      )}

      {!!phase.change && (
        <View style={ws.card}>
          <Copy id="workouts.phase.changed" style={ws.sectionLabel}>
            What this phase changed
          </Copy>
          <Text style={ws.body}>{phase.change.label}</Text>
        </View>
      )}

      <Copy id="workouts.phase.tests" style={ws.sectionLabel}>
        Tests
      </Copy>
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

      <Copy id="workouts.phase.program" style={ws.sectionLabel} vars={{ n: phase.days_per_week }}>
        {'Program · {n} days a week'}
      </Copy>
      {programWorkouts.length === 0 && (
        <Copy id="workouts.phase.deleted" style={ws.muted}>
          These workouts have been deleted.
        </Copy>
      )}
      {programWorkouts.map((w) => (
        <TouchableOpacity
          key={w.id}
          style={[ws.card, styles.row]}
          onPress={() => navigation.navigate('WorkoutPreview', { workoutId: w.id })}
          accessibilityRole="button"
        >
          <Text style={[ws.title, { flex: 1 }]}>{w.name}</Text>
          {live && next?.id === w.id && (
            <Copy id="workouts.phase.next" style={styles.next}>
              Next
            </Copy>
          )}
          <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
        </TouchableOpacity>
      ))}

      {selected && (
        <>
          <Copy id="workouts.phase.history" style={ws.sectionLabel}>
            Test history
          </Copy>
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
          <Copy id="workouts.phase.others" style={ws.sectionLabel}>
            Other phases
          </Copy>
          {others.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[ws.card, styles.row]}
              onPress={() => navigation.push('Phase', { phaseId: p.id })}
              accessibilityRole="button"
            >
              <View style={{ flex: 1 }}>
                <Copy id="workouts.phase.otherTitle" style={ws.title} vars={{ n: p.number, name: p.program_name }}>
                  {'Phase {n} · {name}'}
                </Copy>
                <Copy
                  id="workouts.phase.otherMeta"
                  style={ws.muted}
                  vars={{ status: statusWord(p.status), date: formatPhaseDate(p.start_date) }}
                >
                  {'{status} · from {date}'}
                </Copy>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
            </TouchableOpacity>
          ))}
        </>
      )}

      {live && (
        <TouchableOpacity onPress={end} style={styles.end}>
          <Copy id="workouts.phase.end" style={styles.endText}>
            End this phase
          </Copy>
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
