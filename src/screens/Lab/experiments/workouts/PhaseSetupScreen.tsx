import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing } from '../../../../constants/theme';
import { PhaseTest, Workout, WorkoutsStackParamList } from '../../../../types/workouts';
import { PHASE_TEMPLATES, phaseTemplate } from '../../../../data/phaseTemplates';
import {
  DEFAULT_PHASE_WEEKS,
  newPhase,
  PHASE_LENGTHS,
  plannedSessions,
  programExerciseIds,
  retestDateFor,
  TEST_STANDARDS,
  testLabel,
  testTypeFor,
} from '../../../../services/trainingPhases';
import { ensureWorkouts, newPhaseId } from '../../../../services/labWorkouts';
import { toLocalDateString } from '../../../../utils/date';
import { showAlert } from '../../../../utils/alert';
import { useWorkouts } from './WorkoutsContext';
import { ExercisePickerModal } from './components/ExercisePickerModal';
import { formatPhaseDate } from './components/PhaseParts';
import { WORKOUTS_ACCENT, WORKOUTS_TINT, ws } from './components/workoutsStyle';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'PhaseSetup'>;
type Step = 'program' | 'tests' | 'length';
const OWN = 'own';
const DAY_OPTIONS = [2, 3, 4, 5];

/** Program → tests → length. Nothing is saved until the last step. */
export const PhaseSetupScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { userId, workouts, exercise, exercisesById, prefs, currentPhase, upsertPhase, addWorkoutsLocally } =
    useWorkouts();
  const [step, setStep] = useState<Step>('program');
  const [programId, setProgramId] = useState<string>(PHASE_TEMPLATES[0].id);
  const [ownIds, setOwnIds] = useState<string[]>([]);
  const [ownDays, setOwnDays] = useState(3);
  const [tests, setTests] = useState<PhaseTest[]>([]);
  const [weeks, setWeeks] = useState<number>(DEFAULT_PHASE_WEEKS);
  const [lighter, setLighter] = useState(false);
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);

  const template = phaseTemplate(programId);
  const programWorkouts: Pick<Workout, 'id' | 'name' | 'blocks'>[] = template
    ? template.workouts.map((w) => workouts.find((x) => x.id === w.id) ?? w)
    : ownIds.map((id) => workouts.find((w) => w.id === id)).filter((w): w is Workout => !!w);
  const trained = useMemo(() => programExerciseIds(programWorkouts as Workout[]), [programWorkouts]);
  const daysPerWeek = template ? template.days_per_week : ownDays;

  // A new program brings its suggested tests; from your own workouts, the
  // first three exercises they train.
  useEffect(() => {
    const ids = template
      ? template.tests
      : [...new Set(programWorkouts.flatMap((w) => w.blocks.flatMap((b) => b.items.map((i) => i.exerciseId))))].slice(0, 3);
    setTests(ids.filter((id) => exercisesById[id]).map((exerciseId) => ({ exerciseId })));
  }, [programId, ownIds.join(','), exercisesById]); // eslint-disable-line react-hooks/exhaustive-deps

  if (currentPhase) {
    return (
      <View style={[ws.screen, styles.center]}>
        <Text style={ws.title}>You’re already in a phase</Text>
        <Text style={[ws.muted, { textAlign: 'center' }]}>Finish or end Phase {currentPhase.number} before starting another.</Text>
      </View>
    );
  }

  const canNext =
    step === 'program' ? !!template || ownIds.length > 0 : step === 'tests' ? tests.length > 0 : true;

  const create = async () => {
    setSaving(true);
    try {
      const now = new Date();
      const today = toLocalDateString(now);
      if (template) {
        const stamp = now.toISOString();
        const added = await ensureWorkouts(
          userId,
          template.workouts.map((w) => ({ ...w, created_at: stamp, updated_at: stamp })),
          new Set(workouts.map((w) => w.id))
        );
        addWorkoutsLocally(added);
      }
      const names = programWorkouts.map((w) => w.name);
      const phase = newPhase({
        id: newPhaseId(userId),
        programName: template ? template.name : names.length <= 3 ? names.join(' / ') : 'My program',
        templateId: template?.id,
        workoutIds: programWorkouts.map((w) => w.id),
        daysPerWeek,
        weeks,
        lighterLastWeek: lighter,
        tests,
        today,
        now,
      });
      await upsertPhase(phase);
      navigation.replace('PhaseTest', { phaseId: phase.id, mode: 'baseline' });
    } catch (e) {
      setSaving(false);
      showAlert("Couldn't start the phase", 'Check your connection and try again.');
    }
  };

  const next = () => {
    if (step === 'program') setStep('tests');
    else if (step === 'tests') setStep('length');
    else create();
  };
  const back = () => (step === 'length' ? setStep('tests') : step === 'tests' ? setStep('program') : navigation.goBack());

  return (
    <View style={ws.screen}>
      <ScrollView contentContainerStyle={ws.scroll}>
        <Text style={styles.stepLabel}>
          Step {step === 'program' ? 1 : step === 'tests' ? 2 : 3} of 3
        </Text>

        {step === 'program' && (
          <>
            <Text style={styles.heading}>Pick a program</Text>
            <Text style={ws.muted}>Start from a template, or use workouts you’ve saved. You can edit any workout later.</Text>
            {PHASE_TEMPLATES.map((t) => {
              const on = programId === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[ws.card, styles.option, on && styles.optionOn]}
                  onPress={() => setProgramId(t.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                >
                  <View style={styles.optionHead}>
                    <Text style={[ws.title, { flex: 1 }]}>{t.name}</Text>
                    <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={20} color={on ? WORKOUTS_ACCENT : Colors.border} />
                  </View>
                  <Text style={ws.body}>{t.description}</Text>
                  <Text style={ws.muted}>
                    {t.workouts.map((w) => w.name).join(' · ')} · tests {t.tests.map((id) => exercise(id).name).join(', ')}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[ws.card, styles.option, programId === OWN && styles.optionOn]}
              onPress={() => setProgramId(OWN)}
              accessibilityRole="radio"
              accessibilityState={{ checked: programId === OWN }}
            >
              <View style={styles.optionHead}>
                <Text style={[ws.title, { flex: 1 }]}>From my workouts</Text>
                <Ionicons
                  name={programId === OWN ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={programId === OWN ? WORKOUTS_ACCENT : Colors.border}
                />
              </View>
              <Text style={ws.body}>Pick the saved workouts this phase rotates through.</Text>
            </TouchableOpacity>

            {programId === OWN && (
              <>
                {workouts.length === 0 && <Text style={ws.muted}>No saved workouts yet. Build one first.</Text>}
                {workouts.map((w) => {
                  const on = ownIds.includes(w.id);
                  return (
                    <TouchableOpacity
                      key={w.id}
                      style={styles.checkRow}
                      onPress={() => setOwnIds(on ? ownIds.filter((id) => id !== w.id) : [...ownIds, w.id])}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                    >
                      <Ionicons name={on ? 'checkbox' : 'square-outline'} size={22} color={on ? WORKOUTS_ACCENT : Colors.gray} />
                      <Text style={ws.body}>{w.name}</Text>
                    </TouchableOpacity>
                  );
                })}
                <Text style={ws.sectionLabel}>Days a week</Text>
                <View style={styles.chips}>
                  {DAY_OPTIONS.map((d) => (
                    <TouchableOpacity key={d} style={[ws.chip, ownDays === d && ws.chipActive]} onPress={() => setOwnDays(d)}>
                      <Text style={[ws.chipText, ownDays === d && ws.chipTextActive]}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </>
        )}

        {step === 'tests' && (
          <>
            <Text style={styles.heading}>Your tests</Text>
            <Text style={ws.muted}>
              You’ll do these today and again at the end — same tests, same way. Any exercise works, including your own and runs.
            </Text>
            {tests.map((t) => {
              const ex = exercise(t.exerciseId);
              const untrained = !trained.has(t.exerciseId);
              return (
                <View key={t.exerciseId} style={[ws.card, { gap: 4 }]}>
                  <View style={styles.optionHead}>
                    <View style={{ flex: 1 }}>
                      <Text style={ws.title}>{ex.name}</Text>
                      <Text style={styles.testType}>{testLabel(ex, t, prefs.unit)}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setTests(tests.filter((x) => x.exerciseId !== t.exerciseId))}
                      hitSlop={8}
                      accessibilityLabel={`Remove ${ex.name}`}
                    >
                      <Ionicons name="close" size={20} color={Colors.gray} />
                    </TouchableOpacity>
                  </View>
                  <Text style={ws.muted}>{TEST_STANDARDS[testTypeFor(ex.kind)]}</Text>
                  {untrained && (
                    <Text style={styles.note}>Not in your program. Fine to track, but don’t expect it to move much.</Text>
                  )}
                </View>
              );
            })}
            {tests.length > 5 && <Text style={ws.muted}>That’s a long test day — three to five tests is plenty.</Text>}
            <TouchableOpacity style={ws.secondaryBtn} onPress={() => setPicking(true)}>
              <Text style={ws.secondaryBtnText}>+ Add any exercise as a test</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'length' && (
          <>
            <Text style={styles.heading}>How long?</Text>
            <Text style={ws.muted}>Long enough to see a change, short enough to stay with it.</Text>
            <View style={styles.chips}>
              {PHASE_LENGTHS.map((n) => (
                <TouchableOpacity key={n} style={[ws.chip, weeks === n && ws.chipActive]} onPress={() => setWeeks(n)}>
                  <Text style={[ws.chipText, weeks === n && ws.chipTextActive]}>
                    {n} weeks{n === DEFAULT_PHASE_WEEKS ? ' · suggested' : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={[ws.card, { gap: 6 }]}>
              <View style={styles.summaryRow}>
                <Text style={ws.muted}>Schedule</Text>
                <Text style={styles.summaryValue}>{daysPerWeek} days a week</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={ws.muted}>Sessions</Text>
                <Text style={styles.summaryValue}>{plannedSessions({ days_per_week: daysPerWeek, weeks })}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={ws.muted}>Test</Text>
                <Text style={styles.summaryValue}>Next</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={ws.muted}>Retest, if you test today</Text>
                <Text style={styles.summaryValue}>{formatPhaseDate(retestDateFor(toLocalDateString(new Date()), weeks))}</Text>
              </View>
            </View>
            <View style={[ws.card, styles.toggle]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={ws.title}>Make the last week lighter</Text>
                <Text style={ws.muted}>
                  About 40% fewer sets in week {weeks}, so the retest shows your fitness, not your tiredness.
                </Text>
              </View>
              <Switch value={lighter} onValueChange={setLighter} trackColor={{ true: WORKOUTS_ACCENT, false: Colors.border }} />
            </View>
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Spacing.md + insets.bottom }]}>
        <TouchableOpacity style={[ws.secondaryBtn, styles.footerBtn]} onPress={back} disabled={saving}>
          <Text style={ws.secondaryBtnText}>{step === 'program' ? 'Cancel' : 'Back'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[ws.primaryBtn, styles.footerBtn, (!canNext || saving) && ws.disabled]}
          onPress={next}
          disabled={!canNext || saving}
        >
          {saving ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={ws.primaryBtnText}>{step === 'length' ? 'Start with the test' : 'Next'}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ExercisePickerModal
        visible={picking}
        title="Add a test"
        mode="single"
        onCancel={() => setPicking(false)}
        onConfirm={(picked) => {
          setPicking(false);
          const add = picked.filter((e) => !tests.some((t) => t.exerciseId === e.id));
          setTests([...tests, ...add.map((e) => ({ exerciseId: e.id }))]);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, padding: Spacing.lg },
  stepLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: WORKOUTS_ACCENT,
  },
  heading: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xxl, color: Colors.dark },
  option: { gap: 4 },
  optionOn: { borderColor: WORKOUTS_ACCENT, borderWidth: 2, backgroundColor: WORKOUTS_TINT },
  optionHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  testType: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: WORKOUTS_ACCENT },
  note: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.secondary },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryValue: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.sm, color: Colors.dark },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  footer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  footerBtn: { flex: 1 },
});
