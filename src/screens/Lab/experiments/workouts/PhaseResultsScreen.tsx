import React, { useLayoutEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Spacing } from '../../../../constants/theme';
import { Workout, WorkoutsStackParamList } from '../../../../types/workouts';
import { phaseSessions, plannedSessions, programExerciseIds } from '../../../../services/trainingPhases';
import { useWorkouts } from './WorkoutsContext';
import { TestResultRow } from './components/PhaseParts';
import { WORKOUTS_TINT, ws } from './components/workoutsStyle';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'PhaseResults'>;

/** Before → after for every test, with what changed and how many sessions were done. */
export const PhaseResultsScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { phases, currentPhase, sessions, workouts, exercise, prefs } = useWorkouts();
  const phase = phases.find((p) => p.id === route.params.phaseId);

  useLayoutEffect(() => {
    navigation.setOptions({ title: phase ? `Phase ${phase.number} results` : 'Results' });
  }, [navigation, phase]);

  const trained = useMemo(
    () =>
      programExerciseIds(
        (phase?.workout_ids ?? []).map((id) => workouts.find((w) => w.id === id)).filter((w): w is Workout => !!w)
      ),
    [phase, workouts]
  );

  if (!phase) {
    return <View style={ws.screen} />;
  }

  const done = phaseSessions(phase, sessions).length;
  // Only the latest finished phase in a run can be continued, and not while another is under way.
  const canContinue = phase.status === 'complete' && !currentPhase && !phases.some((p) => p.previous_phase_id === phase.id);

  return (
    <View style={ws.screen}>
      <ScrollView contentContainerStyle={ws.scroll}>
        <View style={[ws.card, styles.summary]}>
          <View style={styles.summaryRow}>
            <Text style={ws.muted}>Sessions</Text>
            <Text style={ws.title}>
              {done} of {plannedSessions(phase)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={ws.muted}>Length</Text>
            <Text style={ws.title}>{phase.weeks} weeks</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={ws.muted}>What you changed</Text>
            <Text style={[ws.title, styles.changed]}>{phase.change?.label ?? 'Nothing yet — this was your first phase'}</Text>
          </View>
        </View>

        <Text style={ws.muted}>
          Here’s what you changed and what happened. A retest moves a little from day to day, so small changes read as
          “about the same”.
        </Text>

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
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Spacing.md + insets.bottom }]}>
        {canContinue && (
          <TouchableOpacity
            style={ws.primaryBtn}
            onPress={() => navigation.navigate('PhaseNext', { phaseId: phase.id })}
            accessibilityRole="button"
          >
            <Text style={ws.primaryBtnText}>Plan phase {phase.number + 1}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={ws.secondaryBtn} onPress={() => navigation.popToTop()} accessibilityRole="button">
          <Text style={ws.secondaryBtnText}>{canContinue ? 'Done for now' : 'Back to Workouts'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  summary: { gap: 6, backgroundColor: WORKOUTS_TINT, borderColor: 'transparent' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Spacing.md },
  changed: { flex: 1, textAlign: 'right' },
  footer: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
});
