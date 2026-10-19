import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../../constants/theme';
import { Workout, WorkoutsStackParamList } from '../../../../types/workouts';
import {
  applySessionToWorkout,
  backToWorkout,
  durationSec,
  planChanges,
  roundsDone,
  toCompletedSession,
  totalSetsLogged,
  workoutFromSession,
} from '../../../../services/workoutSession';
import {
  computeSessionRecords,
  describeRecord,
  formatSeconds,
  formatSetValues,
  formatWeight,
  sessionVolumeKg,
} from '../../../../services/workoutMath';
import { newWorkoutId, saveFinishedSession } from '../../../../services/labWorkouts';
import { showAlert } from '../../../../utils/alert';
import { useWorkouts } from './WorkoutsContext';
import { WORKOUTS_ACCENT, WORKOUTS_TINT, ws } from './components/workoutsStyle';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'WorkoutSummary'>;

/** Offline, a Firestore write never settles — give up and say so rather than spin forever. */
const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const WorkoutSummaryScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const {
    userId,
    session,
    updateSession,
    exercise,
    exercisesById,
    prefs,
    records,
    workouts,
    recordFinished,
    closeAndCheckOff,
  } = useWorkouts();
  const unit = prefs.unit;

  const workout = session?.workoutId ? workouts.find((w) => w.id === session.workoutId) : undefined;
  const [saveChanges, setSaveChanges] = useState(false);
  const [saveAsNew, setSaveAsNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const computed = useMemo(
    () => (session ? computeSessionRecords(session, exercisesById, records) : null),
    [session, exercisesById, records]
  );

  if (!session || !computed) return <View style={ws.screen} />;

  const { records: touched, prs } = computed;
  const sets = totalSetsLogged(session);
  const volume = sessionVolumeKg(session, exercisesById);
  const changes = planChanges(session);
  const baselines = Object.keys(touched).filter((id) => !records[id]).length;
  const doneBlocks = session.blocks.filter((b) => b.sets.length > 0);

  const finish = async () => {
    setSaving(true);
    const now = new Date();
    let toWrite: Workout | undefined;
    // Every finished workout is the Workouts check-in on Today; no habit is
    // chosen here (services/appCheckins.ts ticks a matching Workout habit).
    let final = { ...session };
    delete final.habitId;
    if (workout) {
      toWrite = saveChanges ? applySessionToWorkout(workout, session, now) : workout;
    } else if (saveAsNew && doneBlocks.length) {
      toWrite = workoutFromSession(session, {
        id: newWorkoutId(userId),
        name: newName || `Workout ${now.toLocaleDateString()}`,
        now,
      });
      final = { ...final, workoutId: toWrite.id, workoutName: toWrite.name };
    }
    const completed = toCompletedSession(final, { now, prs, exercisesById });
    try {
      await withTimeout(saveFinishedSession(userId, { session: completed, records: touched, workout: toWrite }), 15000);
    } catch (e) {
      console.warn('Workouts: save failed:', e);
      setSaving(false);
      showAlert(
        "Couldn't save your workout",
        'It’s kept on this phone. Check your connection and tap Finish again.'
      );
      return;
    }
    recordFinished({ completed, records: touched, workout: toWrite });
    closeAndCheckOff(completed.duration_sec);
  };

  const backToSession = () => {
    updateSession(backToWorkout(session));
    navigation.popTo('WorkoutSession');
  };

  return (
    <View style={[ws.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={[ws.scroll, { paddingBottom: 170 + insets.bottom }]}>
        <View style={styles.hero}>
          <Ionicons name="checkmark-done-circle" size={44} color={WORKOUTS_ACCENT} />
          <Text style={styles.heroTitle}>Workout done</Text>
          <Text style={ws.muted}>{session.workoutName}</Text>
        </View>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{formatSeconds(durationSec(session, new Date()))}</Text>
            <Text style={styles.statLabel}>time</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{sets}</Text>
            <Text style={styles.statLabel}>{sets === 1 ? 'set' : 'sets'}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{volume > 0 ? formatWeight(volume, unit) : '—'}</Text>
            <Text style={styles.statLabel}>moved</Text>
          </View>
        </View>

        {prs.length > 0 && (
          <View style={[ws.card, styles.prCard]}>
            <View style={styles.prHead}>
              <Ionicons name="trophy" size={18} color={Colors.secondary} />
              <Text style={styles.prTitle}>{plural(prs.length, 'new record', 'new records')}</Text>
            </View>
            {prs.map((pr, i) => {
              const text = describeRecord(pr, exercise(pr.exerciseId).name, unit);
              return (
                <View key={i} style={styles.prRow}>
                  <Text style={ws.title}>{text.title}</Text>
                  <Text style={ws.muted}>{text.detail}</Text>
                </View>
              );
            })}
          </View>
        )}
        {baselines > 0 && (
          <Text style={ws.muted}>
            First time logging {plural(baselines, 'exercise', 'exercises')} — that’s your baseline to beat next time.
          </Text>
        )}

        <Text style={ws.sectionLabel}>What you did</Text>
        {session.blocks.map((block) => {
          const multi = block.items.length > 1;
          const title = multi ? block.name || 'Circuit' : exercise(block.items[0].exerciseId).name;
          const done = roundsDone(block);
          return (
            <View key={block.id} style={ws.card}>
              <View style={styles.recapHead}>
                <Text style={[ws.title, { flex: 1 }]}>{title}</Text>
                <Text style={ws.muted}>
                  {block.sets.length === 0
                    ? block.skipped
                      ? 'skipped'
                      : 'not done'
                    : `${done} of ${block.rounds} ${multi ? 'rounds' : 'sets'}`}
                </Text>
              </View>
              {block.sets.length > 0 && (
                <Text style={styles.recapSets}>
                  {block.sets
                    .map((s) => {
                      const ex = exercise(s.exerciseId);
                      const v = formatSetValues(s, ex.kind, unit);
                      return multi ? `${ex.name} ${v}` : v;
                    })
                    .join(multi ? '\n' : '  ·  ')}
                </Text>
              )}
            </View>
          );
        })}

        {workout && changes.any && (
          <View style={[ws.card, styles.toggleRow]}>
            <View style={{ flex: 1 }}>
              <Text style={ws.title}>Save changes to {workout.name}</Text>
              <Text style={ws.muted}>
                {[
                  changes.addedBlocks ? plural(changes.addedBlocks, 'added exercise', 'added exercises') : null,
                  changes.extraRounds ? plural(changes.extraRounds, 'extra set', 'extra sets') : null,
                ]
                  .filter(Boolean)
                  .join(' and ')}{' '}
                become part of the plan.
              </Text>
            </View>
            <Switch value={saveChanges} onValueChange={setSaveChanges} trackColor={{ true: WORKOUTS_ACCENT }} />
          </View>
        )}

        {!session.workoutId && doneBlocks.length > 0 && (
          <View style={ws.card}>
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={ws.title}>Save as a workout</Text>
                <Text style={ws.muted}>Run exactly this again next time.</Text>
              </View>
              <Switch value={saveAsNew} onValueChange={setSaveAsNew} trackColor={{ true: WORKOUTS_ACCENT }} />
            </View>
            {saveAsNew && (
              <TextInput
                style={styles.nameInput}
                value={newName}
                onChangeText={setNewName}
                placeholder="Name it, e.g. Upper body"
                placeholderTextColor={Colors.gray}
              />
            )}
          </View>
        )}

      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Spacing.md + insets.bottom }]}>
        <TouchableOpacity style={[ws.primaryBtn, saving && ws.disabled]} onPress={finish} disabled={saving}>
          {saving ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={ws.primaryBtnText}>Finish & rate it</Text>
          )}
        </TouchableOpacity>
        <Text style={[ws.muted, styles.footerNote]}>
          Next: “How hard was it to start?” on Today, and it counts toward your week.
        </Text>
        <TouchableOpacity onPress={backToSession} disabled={saving} style={styles.back}>
          <Text style={styles.backText}>Back to workout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 4, paddingVertical: Spacing.md },
  heroTitle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xxl, color: Colors.dark },
  stats: { flexDirection: 'row', gap: Spacing.sm },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statNum: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg, color: WORKOUTS_ACCENT, fontVariant: ['tabular-nums'] },
  statLabel: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray, marginTop: 2 },
  prCard: { gap: Spacing.sm, borderColor: Colors.secondary + '55', backgroundColor: Colors.secondary + '0D' },
  prHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  prTitle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.secondary },
  prRow: { gap: 1 },
  recapHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  recapSets: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray, marginTop: 4, lineHeight: 18 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  nameInput: {
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Colors.lightGray,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  footerNote: { textAlign: 'center' },
  back: { alignItems: 'center', paddingVertical: Spacing.sm },
  backText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: WORKOUTS_ACCENT },
});
