import React, { useEffect, useLayoutEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing } from '../../../../constants/theme';
import { PhaseTest, WorkoutsStackParamList } from '../../../../types/workouts';
import {
  DEFAULT_TARGET,
  formatWeight,
  fromDisplayWeight,
  lastSetsFor,
  stepWeight,
  toDisplayWeight,
} from '../../../../services/workoutMath';
import {
  formatTestValue,
  recordBaseline,
  recordRetest,
  TEST_STANDARDS,
  testLabel,
  testTypeFor,
} from '../../../../services/trainingPhases';
import { toLocalDateString } from '../../../../utils/date';
import { showAlert } from '../../../../utils/alert';
import { useWorkouts } from './WorkoutsContext';
import { NumberStepper } from './components/NumberStepper';
import { HoldTimer } from './components/HoldTimer';
import { TimeEntry } from './components/TimeEntry';
import { formatPhaseDate } from './components/PhaseParts';
import { WORKOUTS_ACCENT, WORKOUTS_TINT, ws } from './components/workoutsStyle';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'PhaseTest'>;

/** Baseline or retest: a short checklist, then one number per test. */
export const PhaseTestScreen: React.FC<Props> = ({ navigation, route }) => {
  const { phaseId, mode } = route.params;
  const insets = useSafeAreaInsets();
  const { phases, exercise, records, sessions, prefs, upsertPhase } = useWorkouts();
  const unit = prefs.unit;
  const phase = phases.find((p) => p.id === phaseId);
  const retest = mode === 'retest';

  // Where each box starts: the baseline on a retest; otherwise your records
  // and last session, so a baseline isn't typed from zero.
  const startValues = (): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const t of phase?.tests ?? []) {
      const ex = exercise(t.exerciseId);
      const r = records[t.exerciseId];
      if (retest && phase?.baseline[t.exerciseId] !== undefined) {
        out[t.exerciseId] = phase.baseline[t.exerciseId];
        continue;
      }
      switch (testTypeFor(ex.kind)) {
        case 'max_reps':
          out[t.exerciseId] = r?.maxReps ?? 10;
          break;
        case 'reps_at_weight':
          out[t.exerciseId] = 10;
          break;
        case 'longest':
          out[t.exerciseId] = r?.longestSec ?? 30;
          break;
        case 'fastest':
          out[t.exerciseId] = r?.fastestSec ?? DEFAULT_TARGET.distance.seconds!;
          break;
      }
    }
    return out;
  };
  const startWeights = (): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const t of phase?.tests ?? []) {
      if (exercise(t.exerciseId).kind !== 'weight') continue;
      out[t.exerciseId] = t.weightKg ?? lastSetsFor(sessions, t.exerciseId)[0]?.weightKg ?? 0;
    }
    return out;
  };
  const [values, setValues] = useState<Record<string, number>>(startValues);
  const [weights, setWeights] = useState<Record<string, number>>(startWeights);

  // Opened the instant a new phase was saved, the phase can arrive a render
  // late — fill the boxes then, once, rather than leaving them at zero.
  useEffect(() => {
    if (!phase || Object.keys(values).length > 0) return;
    setValues(startValues());
    setWeights(startWeights());
  }, [phase?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [running, setRunning] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: retest ? 'Retest' : 'Baseline test' });
  }, [navigation, retest]);

  if (!phase) {
    return (
      <View style={[ws.screen, styles.center]}>
        <Text style={ws.muted}>This phase no longer exists.</Text>
      </View>
    );
  }

  const anyRunning = Object.values(running).some(Boolean);
  const set = (id: string, v: number) => setValues((all) => ({ ...all, [id]: v }));

  const save = async () => {
    const missingWeight = phase.tests.find((t) => exercise(t.exerciseId).kind === 'weight' && !(weights[t.exerciseId] > 0));
    if (missingWeight) {
      showAlert('Pick a weight', `Choose the weight for ${exercise(missingWeight.exerciseId).name}. Every test of it uses the same one.`);
      return;
    }
    setSaving(true);
    try {
      const now = new Date();
      if (retest) {
        await upsertPhase(recordRetest(phase, values, now));
        navigation.replace('PhaseResults', { phaseId: phase.id });
      } else {
        const tests: PhaseTest[] = phase.tests.map((t) =>
          exercise(t.exerciseId).kind === 'weight' ? { ...t, weightKg: weights[t.exerciseId] } : t
        );
        await upsertPhase(recordBaseline(phase, values, tests, toLocalDateString(now), now));
        navigation.replace('Phase', { phaseId: phase.id });
      }
    } catch (e) {
      setSaving(false);
      showAlert("Couldn't save the results", 'Check your connection and try again.');
    }
  };

  return (
    <View style={ws.screen}>
      <ScrollView contentContainerStyle={ws.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>
          Phase {phase.number} · {retest ? `retest · ${formatPhaseDate(phase.retest_date)}` : 'baseline'}
        </Text>
        <Text style={styles.heading}>{retest ? 'Same tests, same way' : 'Where you’re starting from'}</Text>

        <View style={[ws.card, styles.checklist]}>
          <Text style={ws.title}>Before you start</Text>
          {[
            retest ? 'The same warm-up as your baseline.' : 'Warm up for 5–10 minutes.',
            'Test first thing in the session, while you’re fresh.',
            'Rest 3–5 minutes between tests.',
          ].map((line) => (
            <View key={line} style={styles.checkLine}>
              <Ionicons name="checkmark-circle-outline" size={18} color={WORKOUTS_ACCENT} />
              <Text style={[ws.body, { flex: 1 }]}>{line}</Text>
            </View>
          ))}
        </View>

        {phase.tests.map((t) => {
          const ex = exercise(t.exerciseId);
          const type = testTypeFor(ex.kind);
          const v = values[t.exerciseId] ?? 0;
          const base = phase.baseline[t.exerciseId];
          return (
            <View key={t.exerciseId} style={[ws.card, styles.test]}>
              <View>
                <Text style={styles.testName}>{ex.name}</Text>
                <Text style={styles.testType}>
                  {testLabel(ex, retest ? t : { ...t, weightKg: weights[t.exerciseId] || undefined }, unit)}
                  {retest && base !== undefined ? ` · baseline ${formatTestValue(type, base)}` : ''}
                </Text>
              </View>
              <Text style={ws.muted}>{TEST_STANDARDS[type]}</Text>

              {type === 'reps_at_weight' && !retest && (
                <NumberStepper
                  size="small"
                  label={`Test weight (${unit})`}
                  value={toDisplayWeight(weights[t.exerciseId] ?? 0, unit)}
                  allowDecimal
                  onDecrement={() => setWeights((w) => ({ ...w, [t.exerciseId]: stepWeight(w[t.exerciseId] ?? 0, unit, -1) }))}
                  onIncrement={() => setWeights((w) => ({ ...w, [t.exerciseId]: stepWeight(w[t.exerciseId] ?? 0, unit, 1) }))}
                  onSubmitValue={(n) => setWeights((w) => ({ ...w, [t.exerciseId]: fromDisplayWeight(n, unit) }))}
                />
              )}
              {type === 'reps_at_weight' && retest && !!t.weightKg && (
                <Text style={ws.muted}>Use {formatWeight(t.weightKg, unit)}, the same as your baseline.</Text>
              )}

              {(type === 'max_reps' || type === 'reps_at_weight') && (
                <NumberStepper
                  label="Reps"
                  value={v}
                  onDecrement={() => set(t.exerciseId, Math.max(0, v - 1))}
                  onIncrement={() => set(t.exerciseId, v + 1)}
                  onSubmitValue={(n) => set(t.exerciseId, Math.max(0, Math.round(n)))}
                />
              )}
              {type === 'longest' && (
                <HoldTimer
                  seconds={v}
                  targetSec={retest && base ? base : 60}
                  onChange={(s) => set(t.exerciseId, s)}
                  onRunningChange={(r) => setRunning((all) => ({ ...all, [t.exerciseId]: r }))}
                />
              )}
              {type === 'fastest' && <TimeEntry seconds={v} onChange={(s) => set(t.exerciseId, s)} />}
            </View>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Spacing.md + insets.bottom }]}>
        <TouchableOpacity
          style={[ws.primaryBtn, (saving || anyRunning) && ws.disabled]}
          onPress={save}
          disabled={saving || anyRunning}
          accessibilityRole="button"
        >
          {saving ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={ws.primaryBtnText}>{retest ? 'See results' : 'Save baseline and start'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
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
  heading: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xxl, color: Colors.dark },
  checklist: { gap: Spacing.sm, backgroundColor: WORKOUTS_TINT, borderColor: 'transparent' },
  checkLine: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  test: { gap: Spacing.sm },
  testName: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg, color: Colors.dark },
  testType: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: WORKOUTS_ACCENT },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
});
