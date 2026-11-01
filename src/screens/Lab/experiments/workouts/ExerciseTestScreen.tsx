import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing } from '../../../../constants/theme';
import { WorkoutsStackParamList } from '../../../../types/workouts';
import { fromDisplayWeight, lastSetsFor, stepWeight, toDisplayWeight } from '../../../../services/workoutMath';
import { describeComparison, TEST_STANDARDS, testLabel, testTypeFor } from '../../../../services/trainingPhases';
import {
  formatTestResult,
  newExerciseTest,
  testHistory,
  TestHistoryEntry,
  testStartValues,
} from '../../../../services/exerciseTests';
import { newExerciseTestId } from '../../../../services/labWorkouts';
import { showAlert } from '../../../../utils/alert';
import { useWorkouts } from './WorkoutsContext';
import { NumberStepper } from './components/NumberStepper';
import { HoldTimer } from './components/HoldTimer';
import { TimeEntry } from './components/TimeEntry';
import { ExercisePickerModal } from './components/ExercisePickerModal';
import { WORKOUTS_ACCENT, WORKOUTS_TINT, ws } from './components/workoutsStyle';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'ExerciseTest'>;

/**
 * Test one exercise any time — no phase, no program. Tested the same way a
 * phase tests it, so the result lands in one history with phase baselines and
 * retests, and compares with the last test done the same way.
 */
export const ExerciseTestScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { userId, exercise, records, sessions, tests, phases, prefs, addTest } = useWorkouts();
  const unit = prefs.unit;
  const [exerciseId, setExerciseId] = useState<string | undefined>(route.params?.exerciseId);
  const ex = exerciseId ? exercise(exerciseId) : null;
  const type = ex ? testTypeFor(ex.kind) : null;
  const history = useMemo(() => (ex ? testHistory(ex, tests, phases) : []), [ex, tests, phases]);

  const [value, setValue] = useState(0);
  const [weightKg, setWeightKg] = useState(0);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<TestHistoryEntry | null>(null);

  // A new exercise: start from its last test (same weight), else records.
  useEffect(() => {
    if (!ex) return;
    const start = testStartValues({
      exercise: ex,
      history,
      record: records[ex.id],
      lastSessionWeightKg: lastSetsFor(sessions, ex.id)[0]?.weightKg,
    });
    setValue(start.value);
    setWeightKg(start.weightKg ?? 0);
  }, [exerciseId]); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => navigation.setOptions({ title: 'Test' }), [navigation]);

  const save = async () => {
    if (!ex || !type) return;
    if (type === 'reps_at_weight' && !(weightKg > 0)) {
      showAlert('Pick a weight', 'Choose the weight you’re testing at. Use the same one next time to compare.');
      return;
    }
    setSaving(true);
    try {
      const test = newExerciseTest({ id: newExerciseTestId(userId), exercise: ex, value, weightKg, now: new Date() });
      await addTest(test);
      // Its own entry, compared against everything before it.
      setSaved(testHistory(ex, [test, ...tests], phases).find((e) => e.key === `test:${test.id}`) ?? null);
    } catch (e) {
      showAlert("Couldn't save the test", 'Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!ex || !type) {
    return (
      <View style={ws.screen}>
        <ExercisePickerModal
          visible
          title="Test an exercise"
          mode="single"
          onCancel={() => navigation.goBack()}
          onConfirm={([picked]) => picked && setExerciseId(picked.id)}
        />
      </View>
    );
  }

  const last = history[0];

  if (saved) {
    return (
      <View style={ws.screen}>
        <ScrollView contentContainerStyle={ws.scroll}>
          <View style={styles.hero}>
            <Ionicons name="checkmark-circle" size={44} color={WORKOUTS_ACCENT} />
            <Text style={styles.heroTitle}>{ex.name}</Text>
            <Text style={styles.result}>{formatTestResult(type, saved.value, unit, saved.weightKg)}</Text>
            <Text style={[ws.body, styles.centerText]}>
              {saved.comparison
                ? `${describeComparison(type, saved.comparison)} since your last test (${formatTestResult(type, saved.comparison.before, unit, saved.weightKg)}).`
                : type === 'reps_at_weight' && history.length > 0
                  ? 'First test at this weight — this is the one to beat next time.'
                  : 'Your first test — this is the one to beat next time.'}
            </Text>
          </View>
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: Spacing.md + insets.bottom }]}>
          <TouchableOpacity style={ws.primaryBtn} onPress={() => navigation.goBack()} accessibilityRole="button">
            <Text style={ws.primaryBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={ws.screen}>
      <ScrollView contentContainerStyle={ws.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>Test</Text>
        <Text style={styles.heading}>{ex.name}</Text>
        {!route.params?.exerciseId && (
          <TouchableOpacity onPress={() => setExerciseId(undefined)} style={styles.change}>
            <Text style={styles.changeText}>Change exercise</Text>
          </TouchableOpacity>
        )}

        <View style={[ws.card, styles.checklist]}>
          <Text style={ws.title}>Before you start</Text>
          {[
            'Warm up for 5–10 minutes.',
            'Test while you’re fresh — first thing in a session, or on its own.',
            last ? 'Test the same way as last time, so the numbers compare.' : 'Note how you did it — next time, do it the same way.',
          ].map((line) => (
            <View key={line} style={styles.checkLine}>
              <Ionicons name="checkmark-circle-outline" size={18} color={WORKOUTS_ACCENT} />
              <Text style={[ws.body, { flex: 1 }]}>{line}</Text>
            </View>
          ))}
        </View>

        <View style={[ws.card, styles.test]}>
          <View>
            <Text style={styles.testType}>{testLabel(ex, { exerciseId: ex.id, weightKg: weightKg || undefined }, unit)}</Text>
            {last && (
              <Text style={ws.muted}>
                Last test: {formatTestResult(type, last.value, unit, last.weightKg)}
              </Text>
            )}
          </View>
          <Text style={ws.muted}>{TEST_STANDARDS[type]}</Text>

          {type === 'reps_at_weight' && (
            <NumberStepper
              size="small"
              label={`Test weight (${unit})`}
              value={toDisplayWeight(weightKg, unit)}
              allowDecimal
              onDecrement={() => setWeightKg((w) => stepWeight(w, unit, -1))}
              onIncrement={() => setWeightKg((w) => stepWeight(w, unit, 1))}
              onSubmitValue={(n) => setWeightKg(fromDisplayWeight(n, unit))}
            />
          )}
          {(type === 'max_reps' || type === 'reps_at_weight') && (
            <NumberStepper
              label="Reps"
              value={value}
              onDecrement={() => setValue((v) => Math.max(0, v - 1))}
              onIncrement={() => setValue((v) => v + 1)}
              onSubmitValue={(n) => setValue(Math.max(0, Math.round(n)))}
            />
          )}
          {type === 'longest' && (
            <HoldTimer
              seconds={value}
              targetSec={last?.value || 60}
              onChange={setValue}
              onRunningChange={setRunning}
            />
          )}
          {type === 'fastest' && <TimeEntry seconds={value} onChange={setValue} />}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Spacing.md + insets.bottom }]}>
        <TouchableOpacity
          style={[ws.primaryBtn, (saving || running || value <= 0) && ws.disabled]}
          onPress={save}
          disabled={saving || running || value <= 0}
          accessibilityRole="button"
        >
          {saving ? <ActivityIndicator color={Colors.white} /> : <Text style={ws.primaryBtnText}>Save test</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  eyebrow: {
    fontFamily: Fonts.secondaryBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: WORKOUTS_ACCENT,
  },
  heading: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xxl, color: Colors.dark },
  change: { alignSelf: 'flex-start', paddingVertical: 4 },
  changeText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: WORKOUTS_ACCENT },
  checklist: { gap: Spacing.sm, backgroundColor: WORKOUTS_TINT, borderColor: 'transparent' },
  checkLine: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  test: { gap: Spacing.sm },
  testType: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: WORKOUTS_ACCENT },
  hero: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xl },
  heroTitle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg, color: Colors.dark },
  result: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xxl, color: WORKOUTS_ACCENT },
  centerText: { textAlign: 'center' },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
});
