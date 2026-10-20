import React, { useLayoutEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing } from '../../../../constants/theme';
import { PhaseChange, Workout, WorkoutsStackParamList } from '../../../../types/workouts';
import { PHASE_CHANGE_OPTIONS } from '../../../../data/phaseTemplates';
import {
  applyChangeToWorkouts,
  changeIsAutomatic,
  nextPhaseFrom,
  phaseSessions,
  programExerciseIds,
  suggestNextChange,
} from '../../../../services/trainingPhases';
import { newPhaseId } from '../../../../services/labWorkouts';
import { toLocalDateString } from '../../../../utils/date';
import { showAlert } from '../../../../utils/alert';
import { useWorkouts } from './WorkoutsContext';
import { WORKOUTS_ACCENT, WORKOUTS_TINT, ws } from './components/workoutsStyle';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'PhaseNext'>;
const SUGGESTED = 'suggested';
const SAME = 'none';

/**
 * Same program, same tests, one change — the app suggests it from the
 * results; the user takes it, picks another, or keeps everything.
 */
export const PhaseNextScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { userId, phases, sessions, workouts, exercisesById, upsertPhase, upsertWorkout } = useWorkouts();
  const phase = phases.find((p) => p.id === route.params.phaseId);
  const [choice, setChoice] = useState<string>(SUGGESTED);
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: phase ? `Phase ${phase.number + 1}` : '' });
  }, [navigation, phase]);

  const program = useMemo(
    () => (phase?.workout_ids ?? []).map((id) => workouts.find((w) => w.id === id)).filter((w): w is Workout => !!w),
    [phase, workouts]
  );
  const suggestion = useMemo(
    () =>
      phase
        ? suggestNextChange({
            phase,
            sessionsDone: phaseSessions(phase, sessions).length,
            trainedIds: programExerciseIds(program),
            exercisesById,
          })
        : null,
    [phase, sessions, program, exercisesById]
  );

  if (!phase || !suggestion) return <View style={ws.screen} />;

  const chosen: PhaseChange =
    choice === SUGGESTED
      ? suggestion.change
      : choice === SAME
        ? { key: 'none', label: 'Nothing: the same phase again' }
        : (() => {
            const o = PHASE_CHANGE_OPTIONS.find((x) => x.key === choice)!;
            return { key: o.key, label: o.label };
          })();

  const start = async () => {
    setSaving(true);
    try {
      const now = new Date();
      for (const w of applyChangeToWorkouts(program, chosen, now)) await upsertWorkout(w);
      const next = nextPhaseFrom(phase, { id: newPhaseId(userId), change: chosen, today: toLocalDateString(now), now });
      await upsertPhase(next);
      navigation.popToTop();
      navigation.navigate('Phase', { phaseId: next.id });
    } catch {
      setSaving(false);
      showAlert("Couldn't start the next phase", 'Check your connection and try again.');
    }
  };

  // A render helper, not a component: a component defined in render would remount on every tap.
  const option = (id: string, title: string, detail: string, tag?: string) => {
    const on = choice === id;
    return (
      <TouchableOpacity
        key={id}
        style={[ws.card, styles.option, on && styles.optionOn]}
        onPress={() => setChoice(id)}
        accessibilityRole="radio"
        accessibilityState={{ checked: on }}
      >
        <View style={{ flex: 1, gap: 2 }}>
          {!!tag && <Text style={styles.tag}>{tag}</Text>}
          <Text style={ws.title}>{title}</Text>
          <Text style={ws.muted}>{detail}</Text>
        </View>
        <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={20} color={on ? WORKOUTS_ACCENT : Colors.border} />
      </TouchableOpacity>
    );
  };

  const how =
    chosen.key === 'none' || chosen.key === 'consistency'
      ? 'Your workouts stay exactly as they are.'
      : changeIsAutomatic(chosen)
        ? chosen.key === 'days'
          ? `Your schedule goes to ${Math.min(7, phase.days_per_week + 1)} days a week.`
          : 'Your workouts are updated for you when the phase starts.'
        : 'Make this change in your workouts before your next session — open one from the phase screen and tap Edit.';

  return (
    <View style={ws.screen}>
      <ScrollView contentContainerStyle={ws.scroll}>
        <Text style={styles.heading}>Change one thing</Text>
        <Text style={ws.muted}>
          Same program, same tests, one change — so the next retest has a clear story. Today’s retest becomes the new
          baseline.
        </Text>

        {option(SUGGESTED, suggestion.change.label, suggestion.why, 'Suggested')}

        <Text style={ws.sectionLabel}>Or pick a different change</Text>
        {PHASE_CHANGE_OPTIONS.map((o) => option(o.key, o.title, o.label))}
        {option(SAME, 'Keep everything the same', 'Run the same phase again')}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Spacing.md + insets.bottom }]}>
        <Text style={ws.muted}>{how}</Text>
        <TouchableOpacity style={[ws.primaryBtn, saving && ws.disabled]} onPress={start} disabled={saving}>
          {saving ? <ActivityIndicator color={Colors.white} /> : <Text style={ws.primaryBtnText}>Start phase {phase.number + 1}</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  heading: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xxl, color: Colors.dark },
  option: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  optionOn: { borderColor: WORKOUTS_ACCENT, borderWidth: 2, backgroundColor: WORKOUTS_TINT },
  tag: {
    fontFamily: Fonts.secondaryBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: WORKOUTS_ACCENT,
  },
  footer: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
});
