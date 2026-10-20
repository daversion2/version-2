import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useKeepAwake } from 'expo-keep-awake';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../../constants/theme';
import { SetValues, WorkoutsStackParamList } from '../../../../types/workouts';
import {
  addBlock,
  addRound,
  adjustRest,
  currentPosition,
  durationSec,
  endRest,
  enterSummary,
  isBlockFinished,
  jumpTo,
  logSet,
  makeId,
  Position,
  repeatsInBlock,
  restRemainingSec,
  roundsDone,
  setsTodayFor,
  skipBlock,
  slotSets,
  totalSetsLogged,
  undoLastSet,
} from '../../../../services/workoutSession';
import {
  applySetsToRecord,
  DEFAULT_TARGET,
  describeRecord,
  formatClock,
  formatDistance,
  formatSetValues,
  fromDisplayWeight,
  lastSetsFor,
  lastSlotSetsFor,
  prefillFor,
  stepWeight,
  toDisplayWeight,
} from '../../../../services/workoutMath';
import { answerStepUp, applyStepUp, stepUpKey, suggestStepUp } from '../../../../services/trainingPhases';
import { showChoice, showConfirm } from '../../../../utils/alert';
import { triggerRewardHaptic, triggerTapHaptic } from '../../../../utils/haptics';
import { useWorkouts } from './WorkoutsContext';
import { NumberStepper } from './components/NumberStepper';
import { HoldTimer } from './components/HoldTimer';
import { TimeEntry } from './components/TimeEntry';
import { RestSheet, REST_SHEET_HEIGHT } from './components/RestSheet';
import { ExercisePickerModal } from './components/ExercisePickerModal';
import { ExerciseEditorModal } from './components/ExerciseEditorModal';
import { WORKOUTS_ACCENT, WORKOUTS_TINT, ws } from './components/workoutsStyle';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'WorkoutSession'>;

/** Re-render every second — the elapsed clock and the rest countdown. */
const useNow = (ms = 1000): Date => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
};

export const WorkoutSessionScreen: React.FC<Props> = ({ navigation }) => {
  // A lit screen for the whole workout — the rest timer is useless if the phone sleeps.
  useKeepAwake('workout-session');
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const now = useNow();
  const { session, updateSession, discardSession, exercise, prefs, sessions, records, closeApp, notes } = useWorkouts();
  const unit = prefs.unit;

  const [values, setValues] = useState<SetValues>({});
  const [picking, setPicking] = useState(false);
  const [holdRunning, setHoldRunning] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [editingCues, setEditingCues] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Discarded from somewhere else — nothing to show here.
  useEffect(() => {
    if (!session && isFocused) navigation.popToTop();
  }, [session, isFocused, navigation]);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const pos = session ? currentPosition(session) : null;
  const ex = pos ? exercise(pos.item.exerciseId) : null;
  const positionKey = pos ? `${pos.block.id}:${pos.block.sets.length}` : 'none';

  // An exercise that's in this circuit twice (pull-ups 1st and 5th) goes by
  // its own slot — last time's 5th, today's 5th — or each would prefill the
  // other's numbers. Otherwise, by exercise, as ever.
  const repeated = !!pos && repeatsInBlock(pos.block, pos.itemIndex);
  const lastSets = useMemo(
    () =>
      !ex || !pos
        ? []
        : repeated
          ? lastSlotSetsFor(sessions, { blockId: pos.block.id, itemIndex: pos.itemIndex, exerciseId: ex.id }, session?.id)
          : lastSetsFor(sessions, ex.id, session?.id),
    [sessions, ex?.id, session?.id, pos?.block.id, pos?.itemIndex, repeated] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const todays = session && ex ? setsTodayFor(session, ex.id) : [];
  const todaysInSlot = pos && repeated ? slotSets(pos.block, pos.itemIndex) : todays;
  const prefill =
    pos && ex ? prefillFor(ex.kind, pos.item.target, lastSets, todaysInSlot.length, todaysInSlot) : null;

  // In a phase, a little more than last time once you've earned it. An
  // accepted weight applies from the first set; after that, today's own
  // weight carries on as usual. Added reps or seconds apply to every set.
  const slotKey = pos ? stepUpKey(pos.block.id, pos.itemIndex) : '';
  const answered = session?.stepUps?.[slotKey];
  const stepUpNow =
    answered?.weightKg !== undefined && todaysInSlot.length > 0 ? { ...answered, weightKg: undefined } : answered;
  const stepUpOffer =
    session?.phaseId && pos && ex && !answered && todaysInSlot.length === 0
      ? suggestStepUp(ex.kind, pos.item.target, lastSets, unit)
      : null;

  // New set → fresh numbers from last time / the plan. Keyed on position, so
  // typing a weight isn't overwritten by the clock re-rendering the screen —
  // and on history arriving, so a slow load can't leave the plan's numbers
  // under a "Last time" line that says otherwise.
  useEffect(() => {
    if (prefill) setValues(applyStepUp(prefill.values, stepUpNow));
    setHoldRunning(false);
  }, [positionKey, lastSets.length, ex?.kind, JSON.stringify(answered ?? null)]); // eslint-disable-line react-hooks/exhaustive-deps

  // Rest ran out: close the sheet with a tap so you feel it from across the gym.
  const remaining = session ? restRemainingSec(session, now) : 0;
  useEffect(() => {
    if (session?.rest && remaining <= 0) {
      triggerTapHaptic();
      updateSession(endRest(session));
    }
  }, [remaining, session, updateSession]);

  if (!session) return <View style={ws.screen} />;

  const showToast = (text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  };

  const describePosition = (p: Position): string => {
    const name = exercise(p.item.exerciseId).name;
    return p.block.items.length > 1
      ? `${name} · round ${p.round + 1} of ${p.block.rounds}`
      : `${name} · set ${p.round + 1} of ${p.block.rounds}`;
  };

  const onLog = () => {
    if (!pos || !ex) return;
    const result = logSet(session, values, new Date());
    // A record set on this very set gets said now, not saved for the summary.
    const before = applySetsToRecord(ex.id, ex.kind, todays, records[ex.id]).prs.length;
    const after = applySetsToRecord(ex.id, ex.kind, setsTodayFor(result.session, ex.id), records[ex.id]).prs;
    if (after.length > before) {
      triggerRewardHaptic();
      showToast(`New record: ${describeRecord(after[after.length - 1], ex.name, unit).title}`);
    } else {
      triggerTapHaptic();
    }
    updateSession(result.session);
  };

  const goToSummary = () => {
    updateSession(enterSummary(session, new Date()));
    navigation.navigate('WorkoutSummary');
  };

  const onFinish = () => {
    if (totalSetsLogged(session) === 0) {
      showConfirm('Nothing logged yet', 'Discard this workout?', async () => {
        await discardSession();
      }, 'Discard');
      return;
    }
    const left = session.blocks.filter((b) => !isBlockFinished(b)).length;
    if (left === 0) return goToSummary();
    showConfirm(
      'Finish now?',
      `${left} ${left === 1 ? 'exercise isn’t' : 'exercises aren’t'} done. What you logged still counts.`,
      goToSummary,
      'Finish'
    );
  };

  const onClose = () =>
    showChoice('Leave this workout?', 'It stays saved on this phone — resume it any time from Workouts.', [
      { label: 'Keep it for later', onPress: closeApp },
      {
        label: 'Discard workout',
        onPress: () =>
          showConfirm('Discard this workout?', 'Nothing from it will be saved.', discardSession, 'Discard'),
      },
    ]);

  const titleOf = (index: number): string => {
    const block = session.blocks[index];
    return block.items.length > 1 ? block.name || 'Circuit' : exercise(block.items[0].exerciseId).name;
  };

  const onPlanTap = (index: number) => {
    const block = session.blocks[index];
    if (pos?.blockIndex === index) return;
    if (!block.skipped && isBlockFinished(block)) {
      showConfirm(
        `Another ${block.items.length > 1 ? 'round' : 'set'}?`,
        `Adds one more to ${titleOf(index)} and goes there now.`,
        () => updateSession(addRound(session, index)),
        'Add one'
      );
      return;
    }
    updateSession(jumpTo(session, index));
  };

  const isCircuit = !!pos && pos.block.items.length > 1;
  const isLastInRound = !!pos && pos.itemIndex === pos.block.items.length - 1;
  const logLabel = !isCircuit ? `Log set ${(pos?.round ?? 0) + 1}` : isLastInRound ? 'Log & finish round' : 'Log & next';
  const nextAfterRest = currentPosition(session);

  return (
    <View style={[ws.screen, { paddingTop: insets.top }]}>
      {/* Top bar — its own, not the stack header: no swipe-back mid-workout. */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onClose} style={styles.iconBtn} accessibilityLabel="Leave workout">
          <Ionicons name="close" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <View style={styles.topCenter}>
          <Text style={styles.topTitle} numberOfLines={1}>
            {session.workoutName}
          </Text>
          <Text style={styles.topClock}>{formatClock(durationSec(session, now))}</Text>
        </View>
        <TouchableOpacity onPress={onFinish} style={styles.finishBtn} accessibilityRole="button">
          <Text style={styles.finishText}>Finish</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          ws.scroll,
          { paddingBottom: Spacing.xxl + insets.bottom + (session.rest ? REST_SHEET_HEIGHT : 0) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {session.lighter && (
          <View style={styles.lightWeek}>
            <Ionicons name="leaf-outline" size={16} color={WORKOUTS_ACCENT} />
            <Text style={styles.lightWeekText}>
              Light week: fewer sets, so your retest shows your fitness, not your tiredness.
            </Text>
          </View>
        )}
        {pos && ex ? (
          <View style={[ws.card, styles.current]}>
            {isCircuit ? (
              <>
                <Text style={styles.eyebrow}>
                  {pos.block.name || 'Circuit'} · round {pos.round + 1} of {pos.block.rounds}
                </Text>
                <View style={styles.circuitList}>
                  {pos.block.items.map((item, i) => {
                    const done = i < pos.itemIndex;
                    const active = i === pos.itemIndex;
                    return (
                      <View key={`${item.exerciseId}_${i}`} style={styles.circuitItem}>
                        <Ionicons
                          name={done ? 'checkmark-circle' : active ? 'radio-button-on' : 'ellipse-outline'}
                          size={16}
                          color={done || active ? WORKOUTS_ACCENT : Colors.border}
                        />
                        <Text style={[styles.circuitName, active && styles.circuitNameActive, done && styles.circuitNameDone]}>
                          {exercise(item.exerciseId).name}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </>
            ) : (
              <Text style={styles.eyebrow}>
                Exercise {pos.blockIndex + 1} of {session.blocks.length}
              </Text>
            )}

            <Text style={styles.exerciseName}>{ex.name}</Text>
            {ex.kind === 'distance' && !!ex.distanceM && (
              <Text style={styles.lastTime}>{formatDistance(ex.distanceM)} · lower is better</Text>
            )}

            {/* Your form cues, where you'll actually read them. Tap to edit —
                "seat on 4" gets written down mid-set, not later. */}
            {notes[ex.id] ? (
              <TouchableOpacity style={styles.cues} onPress={() => setEditingCues(true)} accessibilityRole="button" accessibilityHint="Edit form cues">
                <Ionicons name="document-text-outline" size={16} color={WORKOUTS_ACCENT} />
                <Text style={styles.cuesText}>{notes[ex.id]}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.addCues} onPress={() => setEditingCues(true)} accessibilityRole="button">
                <Ionicons name="add" size={14} color={Colors.gray} />
                <Text style={styles.addCuesText}>Add form cues</Text>
              </TouchableOpacity>
            )}

            <View style={styles.pills}>
              {Array.from({ length: pos.block.rounds }).map((_, i) => {
                const done = i < roundsDone(pos.block);
                const active = i === pos.round;
                return (
                  <View key={i} style={[styles.pill, done && styles.pillDone, active && styles.pillActive]}>
                    {done ? (
                      <Ionicons name="checkmark" size={14} color={Colors.white} />
                    ) : (
                      <Text style={[styles.pillText, active && styles.pillTextActive]}>{i + 1}</Text>
                    )}
                  </View>
                );
              })}
            </View>

            <Text style={styles.lastTime}>
              {prefill?.last
                ? `Last time: ${formatSetValues(prefill.last, ex.kind, unit)}`
                : 'First time — today sets your baseline'}
            </Text>

            {stepUpOffer && (
              <View style={styles.stepUp}>
                <Text style={styles.stepUpTitle}>{stepUpOffer.title}</Text>
                <Text style={ws.muted}>{stepUpOffer.why}</Text>
                <View style={styles.stepUpRow}>
                  <TouchableOpacity
                    style={[styles.stepUpBtn, styles.stepUpBtnFill]}
                    onPress={() => updateSession(answerStepUp(session, slotKey, stepUpOffer.stepUp))}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.stepUpBtnText, { color: Colors.white }]}>Use it</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.stepUpBtn}
                    onPress={() => updateSession(answerStepUp(session, slotKey, { declined: true }))}
                    accessibilityRole="button"
                  >
                    <Text style={styles.stepUpBtnText}>Not today</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {ex.kind === 'time' ? (
              <HoldTimer
                seconds={values.seconds ?? DEFAULT_TARGET.time.seconds!}
                targetSec={pos.item.target.seconds ?? prefill?.values.seconds ?? 30}
                onChange={(seconds) => setValues({ ...values, seconds })}
                onRunningChange={setHoldRunning}
              />
            ) : ex.kind === 'distance' ? (
              <TimeEntry
                seconds={values.seconds ?? DEFAULT_TARGET.distance.seconds!}
                onChange={(seconds) => setValues({ ...values, seconds })}
              />
            ) : (
              <View style={styles.inputs}>
                {ex.kind === 'weight' && (
                  <NumberStepper
                    label={`Weight (${unit})`}
                    value={toDisplayWeight(values.weightKg ?? 0, unit)}
                    allowDecimal
                    onDecrement={() => setValues({ ...values, weightKg: stepWeight(values.weightKg ?? 0, unit, -1) })}
                    onIncrement={() => setValues({ ...values, weightKg: stepWeight(values.weightKg ?? 0, unit, 1) })}
                    onSubmitValue={(v) => setValues({ ...values, weightKg: fromDisplayWeight(v, unit) })}
                  />
                )}
                <NumberStepper
                  label="Reps"
                  value={values.reps ?? 0}
                  onDecrement={() => setValues({ ...values, reps: Math.max(1, (values.reps ?? 1) - 1) })}
                  onIncrement={() => setValues({ ...values, reps: (values.reps ?? 0) + 1 })}
                  onSubmitValue={(v) => setValues({ ...values, reps: Math.max(1, Math.round(v)) })}
                />
              </View>
            )}

            <TouchableOpacity
              style={[ws.primaryBtn, holdRunning && ws.disabled]}
              onPress={onLog}
              disabled={holdRunning}
              accessibilityRole="button"
            >
              <Text style={ws.primaryBtnText}>{logLabel}</Text>
            </TouchableOpacity>

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.action}
                onPress={() => updateSession(undoLastSet(session))}
                disabled={!session.history.length}
              >
                <Ionicons name="arrow-undo-outline" size={16} color={session.history.length ? Colors.gray : Colors.border} />
                <Text style={[styles.actionText, !session.history.length && styles.actionDisabled]}>Undo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.action} onPress={() => updateSession(addRound(session, pos.blockIndex))}>
                <Ionicons name="add" size={16} color={Colors.gray} />
                <Text style={styles.actionText}>{isCircuit ? 'Round' : 'Set'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.action}
                onPress={() =>
                  showConfirm(
                    `Skip ${isCircuit ? pos.block.name || 'this circuit' : ex.name}?`,
                    roundsDone(pos.block) || pos.itemIndex
                      ? 'What you logged stays. You can come back to it from the plan below.'
                      : 'You can come back to it from the plan below.',
                    () => updateSession(skipBlock(session, pos.blockIndex)),
                    'Skip'
                  )
                }
              >
                <Ionicons name="play-skip-forward-outline" size={16} color={Colors.gray} />
                <Text style={styles.actionText}>Skip</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : session.blocks.length === 0 ? (
          <View style={[ws.card, styles.current, styles.centered]}>
            <Ionicons name="barbell-outline" size={32} color={WORKOUTS_ACCENT} />
            <Text style={styles.exerciseName}>Add your first exercise</Text>
            <Text style={[ws.muted, { textAlign: 'center' }]}>Pick one to do straight sets, or several for a circuit.</Text>
            <TouchableOpacity style={[ws.primaryBtn, styles.wide]} onPress={() => setPicking(true)}>
              <Text style={ws.primaryBtnText}>Add exercise</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[ws.card, styles.current, styles.centered]}>
            <Ionicons name="checkmark-done-circle" size={40} color={WORKOUTS_ACCENT} />
            <Text style={styles.exerciseName}>That’s every set</Text>
            <Text style={[ws.muted, { textAlign: 'center' }]}>
              {totalSetsLogged(session)} sets in {formatClock(durationSec(session, now))}.
            </Text>
            <TouchableOpacity style={[ws.primaryBtn, styles.wide]} onPress={goToSummary}>
              <Text style={ws.primaryBtnText}>Finish workout</Text>
            </TouchableOpacity>
          </View>
        )}

        {session.blocks.length > 0 && <Text style={ws.sectionLabel}>Plan</Text>}
        {session.blocks.map((block, i) => {
          const done = roundsDone(block);
          const finished = isBlockFinished(block);
          const current = pos?.blockIndex === i;
          const multi = block.items.length > 1;
          const title = titleOf(i);
          return (
            <TouchableOpacity
              key={block.id}
              style={[styles.planRow, current && styles.planRowCurrent]}
              onPress={() => onPlanTap(i)}
              accessibilityRole="button"
              accessibilityHint={finished && !block.skipped ? 'Add another set' : 'Go to this one now'}
            >
              <Ionicons
                name={
                  block.skipped
                    ? 'remove-circle-outline'
                    : finished
                      ? 'checkmark-circle'
                      : current
                        ? 'radio-button-on'
                        : 'ellipse-outline'
                }
                size={20}
                color={block.skipped ? Colors.gray : finished || current ? WORKOUTS_ACCENT : Colors.border}
              />
              <View style={{ flex: 1 }}>
                <Text style={[ws.title, block.skipped && styles.skippedText]}>
                  {title}
                  {block.added ? '  · added' : ''}
                </Text>
                {multi && (
                  <Text style={ws.muted} numberOfLines={1}>
                    {block.items.map((it) => exercise(it.exerciseId).name).join(' → ')}
                  </Text>
                )}
              </View>
              <Text style={styles.planCount}>
                {block.skipped ? 'skipped' : `${done}/${block.rounds}`}
              </Text>
            </TouchableOpacity>
          );
        })}

        {session.blocks.length > 0 && (
          <TouchableOpacity style={ws.secondaryBtn} onPress={() => setPicking(true)}>
            <Text style={ws.secondaryBtnText}>+ Add exercise</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {!!toast && (
        <View style={[styles.toast, { top: insets.top + 64 }]} pointerEvents="none">
          <Ionicons name="trophy" size={16} color={Colors.white} />
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      {session.rest && remaining > 0 && (
        <RestSheet
          remainingSec={remaining}
          totalSec={session.rest.totalSec}
          nextLabel={nextAfterRest ? describePosition(nextAfterRest) : 'Finish'}
          onAdjust={(delta) => updateSession(adjustRest(session, delta, new Date()))}
          onSkip={() => updateSession(endRest(session))}
        />
      )}

      <ExerciseEditorModal
        visible={editingCues && !!ex}
        exercise={ex ?? undefined}
        onClose={() => setEditingCues(false)}
      />

      <ExercisePickerModal
        visible={picking}
        title="Add to this workout"
        mode="multi"
        onCancel={() => setPicking(false)}
        onConfirm={(picked) => {
          setPicking(false);
          updateSession(
            addBlock(
              session,
              picked.map((e) => ({ exerciseId: e.id, target: { ...DEFAULT_TARGET[e.kind] } })),
              { id: makeId('block'), ...(picked.length > 1 ? { name: 'Circuit' } : {}) }
            )
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topCenter: { flex: 1, alignItems: 'center' },
  topTitle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.dark },
  topClock: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray, fontVariant: ['tabular-nums'] },
  finishBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: WORKOUTS_TINT,
  },
  finishText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.sm, color: WORKOUTS_ACCENT },

  current: { gap: Spacing.md, padding: Spacing.lg, borderColor: WORKOUTS_ACCENT + '55' },
  centered: { alignItems: 'center' },
  wide: { alignSelf: 'stretch' },
  eyebrow: {
    fontFamily: Fonts.secondaryBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: WORKOUTS_ACCENT,
  },
  circuitList: { gap: 4 },
  circuitItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  circuitName: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray },
  circuitNameActive: { fontFamily: Fonts.secondaryBold, color: Colors.dark },
  circuitNameDone: { textDecorationLine: 'line-through' },
  exerciseName: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xxl, color: Colors.dark },
  cues: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: WORKOUTS_TINT,
    marginTop: -Spacing.xs,
  },
  cuesText: { flex: 1, fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark, lineHeight: 19 },
  addCues: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: -Spacing.sm },
  addCuesText: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  pill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillDone: { backgroundColor: WORKOUTS_ACCENT, borderColor: WORKOUTS_ACCENT },
  pillActive: { borderColor: WORKOUTS_ACCENT, borderWidth: 2 },
  pillText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xs, color: Colors.gray },
  pillTextActive: { color: WORKOUTS_ACCENT },
  lastTime: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray },
  stepUp: {
    gap: 4,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.secondary + '14',
    borderWidth: 1,
    borderColor: Colors.secondary + '40',
  },
  stepUpTitle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.dark },
  stepUpRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  stepUpBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: WORKOUTS_ACCENT,
    backgroundColor: Colors.white,
  },
  stepUpBtnFill: { backgroundColor: WORKOUTS_ACCENT },
  stepUpBtnText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.sm, color: WORKOUTS_ACCENT },
  lightWeek: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: WORKOUTS_TINT,
  },
  lightWeekText: { flex: 1, fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark },
  inputs: { flexDirection: 'row', gap: Spacing.sm },
  actions: { flexDirection: 'row', justifyContent: 'space-around' },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: Spacing.sm },
  actionText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.gray },
  actionDisabled: { color: Colors.border },

  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
  },
  planRowCurrent: { backgroundColor: WORKOUTS_TINT },
  planCount: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.gray },
  skippedText: { color: Colors.gray },

  toast: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.secondary,
  },
  toastText: { flex: 1, fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.white },
});
