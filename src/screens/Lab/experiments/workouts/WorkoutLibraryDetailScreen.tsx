import React, { useLayoutEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing } from '../../../../constants/theme';
import { useAuth } from '../../../../context/AuthContext';
import type { WorkoutsStackParamList } from '../../../../types/workouts';
import {
  LIBRARY_FOCUS_LABELS,
  LIBRARY_GEAR_LABELS,
  LIBRARY_LEVELS,
  findLibraryWorkout,
} from '../../../../data/workoutLibrary';
import {
  canSeeWorkoutLibrary,
  findLibraryCopy,
  libraryWorkoutToWorkout,
  resolveLibraryWorkout,
} from '../../../../services/workoutLibrary';
import { newWorkoutId } from '../../../../services/labWorkouts';
import { blockTitle } from '../../../../services/workoutSession';
import { formatClock, formatSeconds, formatTarget } from '../../../../services/workoutMath';
import { showAlert, showChoice } from '../../../../utils/alert';
import { useWorkouts } from './WorkoutsContext';
import { WORKOUTS_ACCENT, WORKOUTS_TINT, ws } from './components/workoutsStyle';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'WorkoutLibraryDetail'>;

/** One library workout, fitted to the equipment ticked on the library, with "Add to my workouts". */
export const WorkoutLibraryDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { userProfile } = useAuth();
  const { userId, prefs, workouts, exercise, exercisesById, upsertWorkout, ensureLoaded } = useWorkouts();
  const [saving, setSaving] = useState(false);
  const template = findLibraryWorkout(route.params.libraryId);
  const gear = prefs.library_gear ?? [];
  // A template that no longer fits (gear changed since) falls back to bodyweight, which every template fits.
  const resolved = template ? resolveLibraryWorkout(template, gear) ?? resolveLibraryWorkout(template, []) : null;

  useLayoutEffect(() => {
    navigation.setOptions({ title: template?.name ?? '' });
  }, [navigation, template]);

  if (!canSeeWorkoutLibrary(userProfile) || !template || !resolved) {
    return (
      <View style={[ws.screen, styles.center]}>
        <Text style={ws.muted}>This workout isn’t available.</Text>
      </View>
    );
  }

  const existing = findLibraryCopy(workouts, template.id);

  const add = async () => {
    setSaving(true);
    try {
      // Don't save on top of a failed load (WorkoutsContext.ensureLoaded).
      await ensureLoaded();
      const copy = libraryWorkoutToWorkout(resolved, newWorkoutId(userId), new Date());
      await upsertWorkout(copy);
      navigation.replace('WorkoutPreview', { workoutId: copy.id });
    } catch {
      showAlert('Couldn’t add it', 'Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const onAdd = () => {
    if (!existing) return void add();
    showChoice('Already in your workouts', 'Open the copy you have, or add another one fitted to what you have now?', [
      { label: 'Open mine', onPress: () => navigation.replace('WorkoutPreview', { workoutId: existing.id }) },
      { label: 'Add another copy', onPress: () => void add() },
    ]);
  };

  const level = LIBRARY_LEVELS.find((l) => l.value === template.level)?.label ?? '';
  const uses = resolved.uses.map((g) => LIBRARY_GEAR_LABELS[g]);

  return (
    <View style={ws.screen}>
      <ScrollView contentContainerStyle={[ws.scroll, { paddingBottom: 120 + insets.bottom }]}>
        <View style={styles.head}>
          <Text style={ws.eyebrow}>
            {level} · {LIBRARY_FOCUS_LABELS[template.focus]} · about {template.minutes} min
          </Text>
          <Text style={ws.body}>{template.summary}</Text>
          <Text style={ws.muted}>{uses.length ? `Uses: ${uses.join(', ')}` : 'No equipment needed'}</Text>
        </View>

        <View style={ws.card}>
          <Text style={ws.title}>How to run it</Text>
          <View style={styles.notes}>
            {template.notes.map((n) => (
              <View key={n} style={styles.noteRow}>
                <Text style={ws.body}>•</Text>
                <Text style={[ws.body, styles.noteText]}>{n}</Text>
              </View>
            ))}
          </View>
        </View>

        {resolved.blocks.map((block, i) => {
          const isCircuit = block.items.length > 1;
          return (
            <View key={block.id} style={ws.card}>
              <View style={styles.blockHead}>
                <Text style={styles.index}>{i + 1}</Text>
                <View style={styles.flex}>
                  <Text style={ws.title}>{blockTitle(block, exercisesById)}</Text>
                  <Text style={ws.muted}>
                    {isCircuit
                      ? `${block.rounds} ${block.rounds === 1 ? 'round' : 'rounds'}`
                      : `${block.rounds} ${block.rounds === 1 ? 'set' : 'sets'}`}
                    {block.intervalSec
                      ? ` · every ${formatClock(block.intervalSec)}`
                      : block.restSec > 0
                        ? ` · rest ${formatSeconds(block.restSec)}`
                        : ' · no rest'}
                  </Text>
                </View>
              </View>
              <View style={styles.items}>
                {block.items.map((item, j) => {
                  const ex = exercise(item.exerciseId);
                  return (
                    <Text key={`${item.exerciseId}_${j}`} style={ws.body}>
                      {isCircuit ? `${ex.name} · ` : ''}
                      {formatTarget(item.target, ex.kind, prefs.unit)}
                    </Text>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={[ws.footer, { paddingBottom: Spacing.md + insets.bottom }]}>
        <TouchableOpacity
          style={[ws.primaryBtn, saving && ws.disabled]}
          onPress={onAdd}
          disabled={saving}
          accessibilityHint="Copies this workout into your workouts, where you can start, edit or delete it"
        >
          {saving ? <ActivityIndicator color={Colors.white} /> : <Text style={ws.primaryBtnText}>Add to my workouts</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  flex: { flex: 1 },
  head: { gap: 4, paddingHorizontal: 4 },
  notes: { marginTop: Spacing.xs, gap: 6 },
  noteRow: { flexDirection: 'row', gap: Spacing.xs },
  noteText: { flex: 1 },
  blockHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  index: {
    width: 26,
    height: 26,
    borderRadius: 13,
    textAlign: 'center',
    lineHeight: 26,
    overflow: 'hidden',
    backgroundColor: WORKOUTS_TINT,
    color: WORKOUTS_ACCENT,
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xs,
  },
  items: { marginTop: Spacing.sm, gap: 6, paddingLeft: 34 },
});
