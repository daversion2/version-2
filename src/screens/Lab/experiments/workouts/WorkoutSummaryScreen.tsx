import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, TextStyles } from '../../../../constants/theme';
import { WorkoutsStackParamList } from '../../../../types/workouts';
import {
  backToWorkout,
  finishedDurationSec,
  intervalReport,
  planChanges,
  roundsDone,
  totalSetsLogged,
} from '../../../../services/workoutSession';
import {
  computeSessionRecords,
  describeRecord,
  formatClock,
  formatSeconds,
  formatSetValues,
  formatVolume,
  sessionVolumeKg,
} from '../../../../services/workoutMath';
import { useWorkouts } from './WorkoutsContext';
import { useFinishWorkout } from './components/useFinishWorkout';
import { WORKOUTS_ACCENT, ws } from './components/workoutsStyle';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'WorkoutSummary'>;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const WorkoutSummaryScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { session, updateSession, exercise, exercisesById, prefs, records, workouts } = useWorkouts();
  const { saving, finish: finishWorkout } = useFinishWorkout();
  // The unit the sets were entered in, even if prefs didn't load this time.
  const unit = session?.unit ?? prefs.unit;

  const workout = session?.workoutId ? workouts.find((w) => w.id === session.workoutId) : undefined;
  const [saveChanges, setSaveChanges] = useState(false);
  const [saveAsNew, setSaveAsNew] = useState(false);
  const [newName, setNewName] = useState('');

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

  const finish = () =>
    finishWorkout(session, {
      saveChanges,
      ...(!session.workoutId && saveAsNew ? { saveAsNewName: newName } : {}),
      onTimedOut: updateSession,
    });

  const backToSession = () => {
    updateSession(backToWorkout(session));
    navigation.popTo('WorkoutSession');
  };

  return (
    <View style={[ws.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={[ws.scroll, { paddingBottom: 170 + insets.bottom }]}>
        <View style={styles.hero}>
          <View style={styles.badge}>
            <Ionicons name="checkmark" size={30} color={Colors.white} />
          </View>
          <Text style={styles.heroTitle} accessibilityRole="header">
            Workout done
          </Text>
          <Text style={styles.heroSub}>{session.workoutName}</Text>
        </View>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{formatSeconds(finishedDurationSec(session, new Date()))}</Text>
            <Text style={styles.statLabel}>Time</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{sets}</Text>
            <Text style={styles.statLabel}>{sets === 1 ? 'Set' : 'Sets'}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{volume > 0 ? formatVolume(volume, unit) : '—'}</Text>
            <Text style={styles.statLabel}>Moved</Text>
          </View>
        </View>

        {prs.length > 0 && (
          <View style={ws.panel} accessibilityLabel={plural(prs.length, 'new record', 'new records')}>
            {prs.map((pr, i) => {
              const text = describeRecord(pr, exercise(pr.exerciseId).name, unit);
              return (
                <View key={i} style={styles.prRow}>
                  <View style={styles.prIcon}>
                    <Ionicons name="arrow-up" size={18} color={Colors.secondary} />
                  </View>
                  <View style={[styles.prMain, i < prs.length - 1 && ws.separator]}>
                    <Text style={ws.title}>{text.title}</Text>
                    <Text style={ws.muted}>{text.detail}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
        {baselines > 0 && (
          <Text style={ws.lead}>
            First time logging {plural(baselines, 'exercise', 'exercises')} — that’s your baseline to beat next time.
          </Text>
        )}

        <Text style={ws.sectionLabel}>What you did</Text>
        <View style={ws.panel}>
        {session.blocks.map((block, bi) => {
          const multi = block.items.length > 1;
          const title = multi ? block.name || 'Circuit' : exercise(block.items[0].exerciseId).name;
          const done = roundsDone(block);
          const clock = intervalReport(block);
          return (
            <View key={block.id} style={styles.recapRow}>
            <View style={[styles.recapMain, bi < session.blocks.length - 1 && ws.separator]}>
              <View style={styles.recapHead}>
                <Text style={[styles.recapTitle, block.sets.length === 0 && styles.recapTitleMuted]}>{title}</Text>
                <Text style={styles.recapCount}>
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
              {clock && (
                <View style={styles.clock}>
                  <Text style={styles.clockLine}>
                    Every {formatClock(clock.sec)}
                    {clock.rounds > 0
                      ? ` · work took ${formatClock(clock.avgWorkSec)} on average (${Math.round(clock.share * 100)}%)`
                      : ''}
                    {clock.missed > 0 ? ` · ${clock.missed} missed` : ''}
                  </Text>
                  <View style={styles.clockTrack}>
                    <View
                      style={[
                        styles.clockFill,
                        clock.tight && styles.clockFillTight,
                        { width: `${Math.min(100, Math.round(clock.share * 100))}%` },
                      ]}
                    />
                  </View>
                  {clock.tight && (
                    <Text style={styles.clockTight}>
                      That left almost no rest. Next time, try a longer interval or a rep or two fewer.
                    </Text>
                  )}
                </View>
              )}
            </View>
            </View>
          );
        })}
        </View>

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

      <View style={[ws.footer, { paddingBottom: Spacing.sm + insets.bottom }]}>
        <TouchableOpacity style={[ws.primaryBtn, saving && ws.disabled]} onPress={finish} disabled={saving}>
          {saving ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={ws.primaryBtnText}>Finish & rate it</Text>
          )}
        </TouchableOpacity>
        <Text style={[ws.muted, styles.footerNote]}>
          Next, on Today: how hard you pushed. It counts toward your week.
        </Text>
        <TouchableOpacity onPress={backToSession} disabled={saving} style={styles.back}>
          <Text style={styles.backText}>Back to workout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 6, paddingTop: Spacing.xl },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: WORKOUTS_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  heroTitle: { ...TextStyles.title1, color: Colors.dark },
  heroSub: { ...TextStyles.subhead, color: Colors.gray },
  stats: { flexDirection: 'row', gap: 10 },
  stat: {
    flex: 1,
    gap: 2,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: Colors.cardBg,
  },
  statNum: { ...TextStyles.title2, fontWeight: '600', color: Colors.dark, fontVariant: ['tabular-nums'] },
  statLabel: { ...TextStyles.footnote, color: Colors.gray },
  prRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingLeft: Spacing.md },
  prIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.secondary + '1F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prMain: { flex: 1, gap: 1, paddingVertical: 14, paddingRight: Spacing.md },
  recapRow: { paddingLeft: Spacing.md },
  recapMain: { paddingVertical: 12, paddingRight: Spacing.md, gap: 2 },
  recapHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  recapTitle: { ...TextStyles.body, flex: 1, color: Colors.dark },
  recapTitleMuted: { color: Colors.gray },
  recapCount: { ...TextStyles.subhead, color: Colors.gray },
  recapSets: { ...TextStyles.footnote, color: Colors.gray },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  clock: { gap: 6, marginTop: Spacing.sm },
  clockLine: { ...TextStyles.footnote, color: Colors.label2 },
  clockTrack: { height: 4, borderRadius: 2, backgroundColor: Colors.lightGray, overflow: 'hidden' },
  clockFill: { height: '100%', backgroundColor: WORKOUTS_ACCENT },
  clockFillTight: { backgroundColor: Colors.danger },
  clockTight: { ...TextStyles.footnote, fontWeight: '600', color: Colors.dark },
  nameInput: {
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.lightGray,
    paddingHorizontal: 12,
    minHeight: 44,
    ...TextStyles.body,
    color: Colors.dark,
  },
  footerNote: { textAlign: 'center' },
  back: { alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  backText: { ...TextStyles.body, color: WORKOUTS_ACCENT },
});
