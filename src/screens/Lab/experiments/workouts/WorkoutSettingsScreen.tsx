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
import { useWorkouts } from './WorkoutsContext';
import { WORKOUTS_ACCENT, ws } from './components/workoutsStyle';

const UNITS: { value: WeightUnit; label: string }[] = [
  { value: 'lb', label: 'Pounds (lb)' },
  { value: 'kg', label: 'Kilograms (kg)' },
];

export const WorkoutSettingsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<WorkoutsStackParamList>>();
  const { prefs, updatePrefs, exercises, notes } = useWorkouts();
  const mineCount = exercises.filter((e) => e.custom).length;
  const notesCount = Object.keys(notes).length;

  const save = (changes: Parameters<typeof updatePrefs>[0]) =>
    updatePrefs(changes).catch(() => showAlert("Couldn't save that", 'Check your connection and try again.'));

  return (
    <ScrollView style={ws.screen} contentContainerStyle={ws.scroll}>
      <TouchableOpacity
        style={[ws.card, styles.linkRow]}
        onPress={() => navigation.navigate('WorkoutExercises')}
        accessibilityRole="button"
      >
        <Ionicons name="barbell-outline" size={20} color={WORKOUTS_ACCENT} />
        <View style={{ flex: 1 }}>
          <Text style={ws.title}>My exercises</Text>
          <Text style={ws.muted}>
            {mineCount === 0 ? 'Add your own' : `${mineCount} of your own`}
            {notesCount > 0 ? ` · cues on ${notesCount}` : ''}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
      </TouchableOpacity>

      <Text style={ws.sectionLabel}>Weight unit</Text>
      <View style={styles.units}>
        {UNITS.map((u) => (
          <TouchableOpacity
            key={u.value}
            style={[styles.unit, prefs.unit === u.value && styles.unitOn]}
            onPress={() => save({ unit: u.value })}
            accessibilityRole="radio"
            accessibilityState={{ checked: prefs.unit === u.value }}
          >
            <Text style={[styles.unitText, prefs.unit === u.value && styles.unitTextOn]}>{u.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={ws.muted}>History is stored once and shown in whichever unit you pick.</Text>

      <Text style={ws.sectionLabel}>Weekly goal</Text>
      <WeeklyGoalPicker
        noun="workouts"
        value={clampWeeklyGoal(prefs.weekly_goal, 'workouts')}
        accent={WORKOUTS_ACCENT}
        onChange={(n) => save({ weekly_goal: n })}
      />
      <Text style={ws.muted}>
        Shown on Today as “1 of 3 this week”. A week that falls short gets the usual one-tap “what got in the way?”.
      </Text>
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
});
