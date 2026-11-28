import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../../constants/theme';
import { WeightUnit, WorkoutsStackParamList } from '../../../../types/workouts';
import { clampWeeklyGoal } from '../../../../services/appCheckins';
import { WeeklyGoalPicker } from '../../../../components/miniapps/WeeklyGoalPicker';
import { showAlert } from '../../../../utils/alert';
import { validThresholds } from '../../../../services/cardio';
import { Copy } from '../../../../components/common/Copy';
import { useCopy } from '../../../../context/CopyContext';
import { useWorkouts } from './WorkoutsContext';
import { NumberStepper } from './components/NumberStepper';
import { CardioZonesInfo } from './components/CardioZonesInfo';
import { WORKOUTS_ACCENT, ws } from './components/workoutsStyle';

/** A tap up from "not set" starts here: typical-ish adult thresholds, quick to adjust. */
const VT_START = { vt1_bpm: 140, vt2_bpm: 165 } as const;
const MIN_BPM = 60;
const MAX_BPM = 230;

/** 0 = not set. Below MIN_BPM steps down to not set; up from not set starts at a typical value. */
const stepBpm = (bpm: number, dir: 1 | -1, start: number): number => {
  if (!bpm) return dir > 0 ? start : 0;
  const next = bpm + dir;
  return next < MIN_BPM ? 0 : Math.min(MAX_BPM, next);
};
const typedBpm = (n: number): number => (n < MIN_BPM ? 0 : Math.min(MAX_BPM, Math.round(n)));

const UNITS: { value: WeightUnit; label: string; key: string }[] = [
  { value: 'lb', label: 'Pounds (lb)', key: 'workouts.settings.pounds' },
  { value: 'kg', label: 'Kilograms (kg)', key: 'workouts.settings.kilograms' },
];

export const WorkoutSettingsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<WorkoutsStackParamList>>();
  const t = useCopy();
  const { prefs, updatePrefs, exercises, hiddenExercises, notes } = useWorkouts();
  const mineCount = exercises.filter((e) => e.custom).length;
  const notesCount = Object.keys(notes).length;

  const save = (changes: Parameters<typeof updatePrefs>[0]) =>
    updatePrefs(changes).catch(() => showAlert(
        t('workouts.settings.saveFailTitle', "Couldn't save that"),
        t('workouts.settings.saveFailMsg', 'Check your connection and try again.')
      ));

  return (
    <ScrollView style={ws.screen} contentContainerStyle={ws.scroll}>
      <TouchableOpacity
        style={[ws.card, styles.linkRow]}
        onPress={() => navigation.navigate('WorkoutExercises')}
        accessibilityRole="button"
      >
        <Ionicons name="barbell-outline" size={20} color={WORKOUTS_ACCENT} />
        <View style={{ flex: 1 }}>
          <Copy id="workouts.settings.myExercises" style={ws.title}>
            My exercises
          </Copy>
          <Text style={ws.muted}>
            {mineCount === 0
              ? t('workouts.settings.addOwn', 'Add your own')
              : t('workouts.settings.ownCount', '{n} of your own', { n: mineCount })}
            {notesCount > 0 ? t('workouts.settings.cuesOn', ' · cues on {n}', { n: notesCount }) : ''}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[ws.card, styles.linkRow]}
        onPress={() => navigation.navigate('WorkoutHiddenExercises')}
        accessibilityRole="button"
      >
        <Ionicons name="eye-off-outline" size={20} color={WORKOUTS_ACCENT} />
        <View style={{ flex: 1 }}>
          <Copy id="workouts.settings.hidden" style={ws.title}>
            Hidden exercises
          </Copy>
          <Text style={ws.muted}>
            {hiddenExercises.length === 0
              ? t('workouts.settings.hiddenNone', 'None — hide one from the picker with its eye icon')
              : t('workouts.settings.hiddenCount', '{n} hidden from the picker', { n: hiddenExercises.length })}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
      </TouchableOpacity>

      <Copy id="workouts.settings.weightUnit" style={ws.sectionLabel}>
        Weight unit
      </Copy>
      <View style={styles.units}>
        {UNITS.map((u) => (
          <TouchableOpacity
            key={u.value}
            style={[styles.unit, prefs.unit === u.value && styles.unitOn]}
            onPress={() => save({ unit: u.value })}
            accessibilityRole="radio"
            accessibilityState={{ checked: prefs.unit === u.value }}
          >
            <Text style={[styles.unitText, prefs.unit === u.value && styles.unitTextOn]}>
              {t(u.key, u.label)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Copy id="workouts.settings.unitNote" style={ws.muted}>
        History is stored once and shown in whichever unit you pick.
      </Copy>

      <Copy id="workouts.settings.weeklyGoal" style={ws.sectionLabel}>
        Weekly goal
      </Copy>
      <WeeklyGoalPicker
        noun="workouts"
        value={clampWeeklyGoal(prefs.weekly_goal, 'workouts')}
        accent={WORKOUTS_ACCENT}
        onChange={(n) => save({ weekly_goal: n })}
      />
      <Copy id="workouts.settings.goalNote" style={ws.muted}>
        Shown on Today as “1 of 3 this week”. A week that falls short gets the usual one-tap “what got in the way?”.
      </Copy>

      <View style={styles.sectionHead}>
        <Copy id="workouts.settings.cardio" style={[ws.sectionLabel, styles.sectionHeadLabel]}>
          Cardio thresholds (optional)
        </Copy>
        <CardioZonesInfo size={18} />
      </View>
      <View style={styles.bpmRow}>
        {(['vt1_bpm', 'vt2_bpm'] as const).map((key) => {
          const bpm = prefs[key] ?? 0;
          return (
            <NumberStepper
              key={key}
              label={
                key === 'vt1_bpm'
                  ? t('workouts.settings.vt1Hr', 'VT1 heart rate')
                  : t('workouts.settings.vt2Hr', 'VT2 heart rate')
              }
              value={bpm}
              suffix={bpm ? 'bpm' : undefined}
              onDecrement={() => save({ [key]: stepBpm(bpm, -1, VT_START[key]) })}
              onIncrement={() => save({ [key]: stepBpm(bpm, 1, VT_START[key]) })}
              onSubmitValue={(n) => save({ [key]: typedBpm(n) })}
            />
          );
        })}
      </View>
      {!validThresholds(prefs.vt1_bpm, prefs.vt2_bpm) && (
        <Copy id="workouts.settings.vtWarn" style={styles.warn}>
          VT2 should be higher than VT1.
        </Copy>
      )}
      <Copy id="workouts.settings.vtNote" style={ws.muted}>
        VT1 is where your breathing first picks up — the top of easy. VT2 is where it turns hard and ragged. Cardio is
        logged by the talk test either way; if you know your heart rate at each (from a lab or field test), each zone
        shows its range too. Leave at 0 if you don’t.
      </Copy>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  units: { flexDirection: 'row', gap: Spacing.sm },
  unit: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  unitOn: { borderColor: WORKOUTS_ACCENT, backgroundColor: WORKOUTS_ACCENT },
  unitText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.dark },
  unitTextOn: { color: Colors.white },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  bpmRow: { flexDirection: 'row', gap: Spacing.sm },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: -(Spacing.md - 6) },
  sectionHeadLabel: { marginBottom: 0, paddingRight: 0 },
  warn: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.danger },
});
