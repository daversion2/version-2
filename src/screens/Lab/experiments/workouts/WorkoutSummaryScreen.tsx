import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, TextStyles } from '../../../../constants/theme';
import { WorkoutsStackParamList } from '../../../../types/workouts';
import {
  backToWorkout,
  editLoggedSet,
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
import { Copy } from '../../../../components/common/Copy';
import { useCopy } from '../../../../context/CopyContext';
import { useWorkouts } from './WorkoutsContext';
import { useFinishWorkout } from './components/useFinishWorkout';
import { SetEntrySheet } from './components/SetEntrySheet';
import { WORKOUTS_ACCENT, ws } from './components/workoutsStyle';
import { keepSwapPlan, permanentSwapOffer, sessionSwaps, swapReasonLabel } from '../../../../services/exerciseSwap';
import { withTimeout } from '../../../../utils/withTimeout';
import { showAlert } from '../../../../utils/alert';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'WorkoutSummary'>;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;


export const WorkoutSummaryScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const t = useCopy();
  const { session, updateSession, exercise, exercisesById, prefs, records, workouts, sessions, upsertWorkout } = useWorkouts();
  const [keeping, setKeeping] = useState(false);
  const { saving, finish: finishWorkout } = useFinishWorkout();
  // The unit the sets were entered in, even if prefs didn't load this time.
  const unit = session?.unit ?? prefs.unit;

  const workout = session?.workoutId ? workouts.find((w) => w.id === session.workoutId) : undefined;
  const [saveChanges, setSaveChanges] = useState(false);
  const [saveAsNew, setSaveAsNew] = useState(false);
  const [newName, setNewName] = useState('');
  // Fix a typo before leaving: the records above recompute from the edited sets.
  const [fixingBlock, setFixingBlock] = useState<number | null>(null);
  const [fixing, setFixing] = useState<{ blockIndex: number; setIndex: number } | null>(null);
  const fixingSet = fixing ? session?.blocks[fixing.blockIndex]?.sets[fixing.setIndex] : undefined;

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
  // Swaps today (2026-11-20), and whether one has repeated enough to offer keeping it.
  const swaps = sessionSwaps({ blocks: doneBlocks });
  const offer = workout ? permanentSwapOffer({ id: session.id, workout_id: session.workoutId, blocks: doneBlocks }, sessions) : null;
  const count = (n: number, oneKey: string, one: string, manyKey: string, many: string) =>
    n === 1 ? t(oneKey, one, { n }) : t(manyKey, many, { n });
  const keepSwap = async () => {
    if (!offer || !workout || keeping) return;
    const plan = keepSwapPlan(workout, session, offer, new Date());
    if (!plan) {
      showAlert(
        t('workouts.summary.swapFailTitle', 'Couldn’t change the workout'),
        t('workouts.summary.swapChanged', '{name} has changed since you started. Edit it in the builder instead.', {
          name: workout.name,
        })
      );
      return;
    }
    setKeeping(true);
    try {
      // Offline, a save only settles once it reaches the server: don't leave the button spinning.
      await withTimeout(upsertWorkout(plan.workout), 8000);
      updateSession(plan.session);
    } catch (e: any) {
      showAlert(
        t('workouts.summary.swapFailTitle', 'Couldn’t change the workout'),
        e?.message === 'timeout'
          ? t('workouts.summary.offline', 'No connection right now. Try again when you’re back online.')
          : e?.message ?? t('workouts.summary.tryAgain', 'Please try again.')
      );
    } finally {
      setKeeping(false);
    }
  };

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
          <Copy id="workouts.summary.done" style={styles.heroTitle} accessibilityRole="header">
            Workout done
          </Copy>
          <Text style={styles.heroSub}>{session.workoutName}</Text>
        </View>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{formatSeconds(finishedDurationSec(session, new Date()))}</Text>
            <Copy id="workouts.summary.time" style={styles.statLabel}>
              Time
            </Copy>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{sets}</Text>
            <Text style={styles.statLabel}>
              {sets === 1 ? t('workouts.summary.set', 'Set') : t('workouts.summary.sets', 'Sets')}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{volume > 0 ? formatVolume(volume, unit) : '—'}</Text>
            <Copy id="workouts.summary.moved" style={styles.statLabel}>
              Moved
            </Copy>
          </View>
        </View>

        {swaps.length > 0 && (
          <View style={ws.panel}>
            {swaps.map((w, i) => {
              const kept = !!session.blocks.find((b) => b.id === w.blockId)?.items[w.itemIndex]?.swappedFrom?.kept;
              return (
                <View key={`${w.blockId}-${w.itemIndex}`} style={[styles.swapRow, i < swaps.length - 1 && ws.separator]}>
                  <Ionicons name="swap-horizontal" size={18} color={WORKOUTS_ACCENT} />
                  <View style={{ flex: 1 }}>
                    <Copy
                      id="workouts.summary.swapTitle"
                      style={ws.title}
                      vars={{ to: exercise(w.toId).name, from: exercise(w.fromId).name }}
                    >
                      {'{to} instead of {from}'}
                    </Copy>
                    <Text style={ws.muted}>
                      {[
                        swapReasonLabel(w.reason),
                        kept
                          ? t('workouts.summary.nowPart', 'Now part of {name}', {
                              name: workout?.name ?? t('workouts.summary.theWorkout', 'the workout'),
                            })
                          : t('workouts.summary.justToday', 'Just today'),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {offer && workout && (
          <View style={[ws.card, styles.offer]}>
            <Copy
              id="workouts.summary.offerTitle"
              style={ws.title}
              vars={{ to: exercise(offer.toId).name, from: exercise(offer.fromId).name }}
            >
              {'{to} instead of {from}, again'}
            </Copy>
            <Copy
              id="workouts.summary.offerBody"
              style={ws.body}
              vars={{ from: exercise(offer.fromId).name, workout: workout.name }}
            >
              {'That’s {from} swapped out the last two times you did {workout}. Make the swap permanent?'}
            </Copy>
            <TouchableOpacity
              style={[ws.secondaryBtn, keeping && ws.disabled]}
              onPress={keepSwap}
              disabled={keeping}
              accessibilityRole="button"
            >
              <Copy
                id="workouts.summary.offerPut"
                style={ws.secondaryBtnText}
                vars={{ to: exercise(offer.toId).name, workout: workout.name }}
              >
                {'Put {to} in {workout}'}
              </Copy>
            </TouchableOpacity>
          </View>
        )}

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
          <Copy
            id="workouts.summary.baselines"
            style={ws.lead}
            vars={{
              what: count(baselines, 'workouts.summary.oneExercise', '{n} exercise', 'workouts.summary.nExercises', '{n} exercises'),
            }}
          >
            {'First time logging {what} — that’s your baseline to beat next time.'}
          </Copy>
        )}

        <Copy id="workouts.summary.whatYouDid" style={ws.sectionLabel}>
          What you did
        </Copy>
        <View style={ws.panel}>
        {session.blocks.map((block, bi) => {
          const multi = block.items.length > 1;
          const title = multi ? block.name || t('workouts.summary.circuit', 'Circuit') : exercise(block.items[0].exerciseId).name;
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
                      ? t('workouts.summary.skipped', 'skipped')
                      : t('workouts.summary.notDone', 'not done')
                    : multi
                      ? t('workouts.summary.ofRounds', '{n} of {total} rounds', { n: done, total: block.rounds })
                      : t('workouts.summary.ofSets', '{n} of {total} sets', { n: done, total: block.rounds })}
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
              {block.sets.length > 0 && (
                <TouchableOpacity
                  style={styles.fixLink}
                  onPress={() => setFixingBlock(fixingBlock === bi ? null : bi)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: fixingBlock === bi }}
                  accessibilityLabel={`Edit the sets of ${title}`}
                >
                  <Text style={ws.link}>
                    {fixingBlock === bi ? t('workouts.summary.doneEditing', 'Done editing') : t('workouts.summary.editSets', 'Edit sets')}
                  </Text>
                </TouchableOpacity>
              )}
              {fixingBlock === bi &&
                block.sets.map((s, si) => {
                  const ex = exercise(s.exerciseId);
                  const label = multi
                    ? t('workouts.summary.roundLabel', 'Round {n}, {name}', { n: s.round + 1, name: ex.name })
                    : t('workouts.summary.setLabel', 'Set {n}', { n: si + 1 });
                  const value = formatSetValues(s, ex.kind, unit);
                  return (
                    <TouchableOpacity
                      key={si}
                      style={styles.fixRow}
                      onPress={() => setFixing({ blockIndex: bi, setIndex: si })}
                      accessibilityRole="button"
                      accessibilityLabel={`${label}, ${value}. Edit`}
                    >
                      <Text style={[ws.body, { flex: 1 }]}>{label}</Text>
                      <Text style={ws.body}>{value}</Text>
                      <Ionicons name="chevron-forward" size={16} color={Colors.gray} />
                    </TouchableOpacity>
                  );
                })}
              {clock && (
                <View style={styles.clock}>
                  <Text style={styles.clockLine}>
                    {t('workouts.summary.every', 'Every {time}', { time: formatClock(clock.sec) })}
                    {clock.rounds > 0
                      ? t('workouts.summary.workTook', ' · work took {time} on average ({pct}%)', {
                          time: formatClock(clock.avgWorkSec),
                          pct: Math.round(clock.share * 100),
                        })
                      : ''}
                    {clock.missed > 0 ? t('workouts.summary.missed', ' · {n} missed', { n: clock.missed }) : ''}
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
                    <Copy id="workouts.summary.tight" style={styles.clockTight}>
                      That left almost no rest. Next time, try a longer interval or a rep or two fewer.
                    </Copy>
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
              <Copy id="workouts.summary.saveChanges" style={ws.title} vars={{ name: workout.name }}>
                {'Save changes to {name}'}
              </Copy>
              <Text style={ws.muted}>
                {t('workouts.summary.planChange', '{list} become part of the plan.', {
                  list: [
                    changes.addedBlocks
                      ? count(
                          changes.addedBlocks,
                          'workouts.summary.oneAdded',
                          '{n} added exercise',
                          'workouts.summary.nAdded',
                          '{n} added exercises'
                        )
                      : null,
                    changes.extraRounds
                      ? count(
                          changes.extraRounds,
                          'workouts.summary.oneExtra',
                          '{n} extra set',
                          'workouts.summary.nExtra',
                          '{n} extra sets'
                        )
                      : null,
                  ]
                    .filter(Boolean)
                    .join(t('workouts.summary.and', ' and ')),
                })}
              </Text>
            </View>
            <Switch value={saveChanges} onValueChange={setSaveChanges} trackColor={{ true: WORKOUTS_ACCENT }} />
          </View>
        )}

        {!session.workoutId && doneBlocks.length > 0 && (
          <View style={ws.card}>
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Copy id="workouts.summary.saveAs" style={ws.title}>
                  Save as a workout
                </Copy>
                <Copy id="workouts.summary.saveAsSub" style={ws.muted}>
                  Run exactly this again next time.
                </Copy>
              </View>
              <Switch value={saveAsNew} onValueChange={setSaveAsNew} trackColor={{ true: WORKOUTS_ACCENT }} />
            </View>
            {saveAsNew && (
              <TextInput
                style={styles.nameInput}
                value={newName}
                onChangeText={setNewName}
                placeholder={t('workouts.summary.namePlaceholder', 'Name it, e.g. Upper body')}
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
            <Copy id="workouts.summary.finish" style={ws.primaryBtnText}>
              Finish & rate it
            </Copy>
          )}
        </TouchableOpacity>
        <Copy id="workouts.summary.footerNote" style={[ws.muted, styles.footerNote]}>
          Next, on Today: how hard it was to keep going. It counts toward your week.
        </Copy>
        <TouchableOpacity onPress={backToSession} disabled={saving} style={styles.back}>
          <Copy id="workouts.summary.back" style={styles.backText}>
            Back to workout
          </Copy>
        </TouchableOpacity>
      </View>

      <SetEntrySheet
        visible={!!fixingSet}
        exercise={fixingSet ? exercise(fixingSet.exerciseId) : undefined}
        unit={unit}
        vt1={prefs.vt1_bpm}
        vt2={prefs.vt2_bpm}
        mode="edit"
        initial={fixingSet ?? {}}
        onSave={async (values) => {
          if (fixing) updateSession(editLoggedSet(session, fixing.blockIndex, fixing.setIndex, values));
          setFixing(null);
        }}
        onCancel={() => setFixing(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  swapRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.md, paddingVertical: 12 },
  offer: { gap: Spacing.sm },
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
  fixLink: { alignSelf: 'flex-start', minHeight: 36, justifyContent: 'center' },
  fixRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 44 },
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
