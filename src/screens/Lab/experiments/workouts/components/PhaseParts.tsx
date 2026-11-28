import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../../../constants/theme';
import { Exercise, PhaseTest, TrainingPhase, WeightUnit } from '../../../../../types/workouts';
import {
  compareTest,
  daysUntilRetest,
  describeComparison,
  formatTestValue,
  isLighterWeek,
  isRetestDue,
  phaseWeek,
  plannedSessions,
  TestPoint,
  testLabel,
  testTypeFor,
} from '../../../../../services/trainingPhases';
import { Copy } from '../../../../../components/common/Copy';
import { useCopy } from '../../../../../context/CopyContext';
import { copyText } from '../../../../../services/appCopy';
import { WORKOUTS_ACCENT, WORKOUTS_TINT, ws } from './workoutsStyle';

/** "Mon, Nov 30" from YYYY-MM-DD. */
export const formatPhaseDate = (day: string): string => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

export const retestLine = (phase: TrainingPhase, today: string): string => {
  const days = daysUntilRetest(phase, today);
  if (days <= 0) return copyText('workouts.parts.retestToday', 'Retest today');
  if (days === 1) return copyText('workouts.parts.retestTomorrow', 'Retest tomorrow');
  return copyText('workouts.parts.retestOn', 'Retest {date} · {n} days', {
    date: formatPhaseDate(phase.retest_date),
    n: days,
  });
};

export const ProgressBar: React.FC<{ value: number; max: number }> = ({ value, max }) => (
  <View style={styles.bar}>
    <View style={[styles.barFill, { width: `${Math.min(100, max > 0 ? (value / max) * 100 : 0)}%` }]} />
  </View>
);

/** Where the phase stands — Workouts home and the phase screen both show it. */
export const PhaseStatusCard: React.FC<{
  phase: TrainingPhase;
  sessionsDone: number;
  today: string;
  nextWorkoutName?: string;
  onOpen?: () => void;
  onTest: () => void;
  onStartNext?: () => void;
}> = ({ phase, sessionsDone, today, nextWorkoutName, onOpen, onTest, onStartNext }) => {
  const planned = plannedSessions(phase);
  const due = isRetestDue(phase, today);
  const Wrapper: React.ElementType = onOpen ? TouchableOpacity : View;

  if (phase.status === 'baseline') {
    return (
      <Wrapper style={[ws.card, styles.card]} {...(onOpen ? { onPress: onOpen, accessibilityRole: 'button' } : {})}>
        <Copy id="workouts.parts.testDay" style={styles.eyebrow} vars={{ n: phase.number }}>
          {'Phase {n} · test day'}
        </Copy>
        <Text style={styles.title}>{phase.program_name}</Text>
        <Copy id="workouts.parts.baselineBody" style={ws.body} vars={{ weeks: phase.weeks }}>
          {'Do your baseline test to start. The {weeks}-week clock starts once it’s saved.'}
        </Copy>
        <TouchableOpacity style={ws.primaryBtn} onPress={onTest} accessibilityRole="button">
          <Copy id="workouts.parts.startTest" style={ws.primaryBtnText}>
            Start the test
          </Copy>
        </TouchableOpacity>
      </Wrapper>
    );
  }

  return (
    <Wrapper style={[ws.card, styles.card]} {...(onOpen ? { onPress: onOpen, accessibilityRole: 'button' } : {})}>
      <View style={styles.headRow}>
        <Copy
          id="workouts.parts.weekOf"
          style={styles.eyebrow}
          vars={{ n: phase.number, week: phaseWeek(phase, today), total: phase.weeks }}
        >
          {'Phase {n} · week {week} of {total}'}
        </Copy>
        {onOpen && <Ionicons name="chevron-forward" size={18} color={Colors.gray} />}
      </View>
      <Text style={styles.title}>{phase.program_name}</Text>
      {!!phase.change && (
        <Copy id="workouts.parts.thisPhase" style={ws.muted} vars={{ label: phase.change.label }}>
          {'This phase: {label}'}
        </Copy>
      )}
      <View style={styles.statRow}>
        <Copy id="workouts.parts.sessions" style={ws.muted}>
          Sessions
        </Copy>
        <Copy id="workouts.parts.sessionsOf" style={styles.stat} vars={{ n: sessionsDone, total: planned }}>
          {'{n} of {total}'}
        </Copy>
      </View>
      <ProgressBar value={sessionsDone} max={planned} />
      <View style={styles.statRow}>
        <Text style={ws.muted}>{retestLine(phase, today)}</Text>
        {isLighterWeek(phase, today) && (
          <Copy id="workouts.parts.lightWeek" style={styles.light}>
            Light week
          </Copy>
        )}
      </View>
      {due ? (
        <TouchableOpacity style={[ws.primaryBtn, styles.retestBtn]} onPress={onTest} accessibilityRole="button">
          <Copy id="workouts.parts.retestNow" style={ws.primaryBtnText}>
            Retest now
          </Copy>
        </TouchableOpacity>
      ) : (
        !!onStartNext &&
        !!nextWorkoutName && (
          <TouchableOpacity style={ws.primaryBtn} onPress={onStartNext} accessibilityRole="button">
            <Copy id="workouts.parts.next" style={ws.primaryBtnText} vars={{ name: nextWorkoutName }}>
              {'Next: {name}'}
            </Copy>
          </TouchableOpacity>
        )
      )}
    </Wrapper>
  );
};

/** Baseline → retest for one test, with the change in plain words. */
export const TestResultRow: React.FC<{
  exercise: Exercise;
  test: PhaseTest;
  before?: number;
  after?: number;
  unit: WeightUnit;
  untrained?: boolean;
}> = ({ exercise, test, before, after, unit, untrained }) => {
  const type = testTypeFor(exercise.kind);
  const label = testLabel(exercise, test, unit);
  if (before === undefined) {
    return (
      <View style={styles.resultRow}>
        <Text style={ws.title}>{exercise.name}</Text>
        <Copy id="workouts.parts.notTested" style={ws.muted} vars={{ label }}>
          {'{label} · not tested yet'}
        </Copy>
      </View>
    );
  }
  if (after === undefined) {
    return (
      <View style={styles.resultRow}>
        <View style={styles.statRow}>
          <View style={{ flex: 1 }}>
            <Text style={ws.title}>{exercise.name}</Text>
            <Text style={ws.muted}>{label}</Text>
          </View>
          <Text style={styles.value}>{formatTestValue(type, before)}</Text>
        </View>
        {untrained && (
          <Copy id="workouts.parts.untrainedNoResult" style={styles.note}>
            Not in your program — fine to track, but don’t expect much change.
          </Copy>
        )}
      </View>
    );
  }
  const c = compareTest(type, before, after);
  const max = Math.max(before, after) || 1;
  return (
    <View style={styles.resultRow}>
      <View style={styles.statRow}>
        <View style={{ flex: 1 }}>
          <Text style={ws.title}>{exercise.name}</Text>
          {type === 'fastest' ? (
            <Copy id="workouts.parts.lowerLabel" style={ws.muted} vars={{ label }}>
              {'{label} · lower is better'}
            </Copy>
          ) : (
            <Text style={ws.muted}>{label}</Text>
          )}
        </View>
        <View
          style={[
            styles.pill,
            c.state === 'up' && styles.pillUp,
            c.state === 'down' && styles.pillDown,
          ]}
        >
          <Text style={[styles.pillText, c.state === 'up' && styles.pillTextUp, c.state === 'down' && styles.pillTextDown]}>
            {describeComparison(type, c)}
          </Text>
        </View>
      </View>
      <Text style={styles.big}>
        {formatTestValue(type, before)} <Text style={styles.arrow}>→</Text> {formatTestValue(type, after)}
      </Text>
      <View style={styles.cmp}>
        <Copy id="workouts.parts.before" style={styles.cmpLabel}>
          Before
        </Copy>
        <View style={styles.cmpTrack}>
          <View style={[styles.cmpBar, { width: `${(before / max) * 100}%` }]} />
        </View>
      </View>
      <View style={styles.cmp}>
        <Copy id="workouts.parts.now" style={styles.cmpLabel}>
          Now
        </Copy>
        <View style={styles.cmpTrack}>
          <View style={[styles.cmpBar, styles.cmpBarNow, { width: `${(after / max) * 100}%` }]} />
        </View>
      </View>
      {untrained && (
        <Copy id="workouts.parts.untrained" style={styles.note}>
          Not in your program, so a small change is expected.
        </Copy>
      )}
    </View>
  );
};

/** One test across phases: a bar per point, value on top, what changed underneath. */
export const TestHistoryBars: React.FC<{ points: TestPoint[]; format: (v: number) => string; lowerIsBetter?: boolean }> = ({
  points,
  format,
  lowerIsBetter,
}) => {
  if (points.length < 2) {
    return (
      <Copy id="workouts.parts.chartEmpty" style={ws.muted}>
        The chart fills in after your first retest.
      </Copy>
    );
  }
  const max = Math.max(...points.map((p) => p.value)) || 1;
  const min = Math.min(...points.map((p) => p.value));
  // Bars from a floor below the lowest value, so a 6 → 9 change is visible.
  const floor = Math.max(0, min - (max - min) * 0.6);
  return (
    <View style={{ gap: Spacing.sm }}>
      <View style={styles.chart}>
        {points.map((p, i) => {
          const h = 16 + ((p.value - floor) / (max - floor || 1)) * 84;
          return (
            <View key={`${p.label}_${i}`} style={styles.chartCol}>
              <Text style={styles.chartValue}>{format(p.value)}</Text>
              <View style={[styles.chartBar, i === points.length - 1 && styles.chartBarLast, { height: h }]} />
              <Text style={styles.chartLabel}>{p.label}</Text>
            </View>
          );
        })}
      </View>
      {lowerIsBetter && (
        <Copy id="workouts.parts.lowerBetter" style={ws.muted}>
          Lower is better.
        </Copy>
      )}
      {points.slice(1).map((p, i) => (
        <Text key={`c_${i}`} style={ws.muted}>
          {p.label}: {p.change}
        </Text>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { gap: Spacing.sm, borderColor: WORKOUTS_ACCENT + '55', borderWidth: 1.5 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: {
    fontFamily: Fonts.secondaryBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: WORKOUTS_ACCENT,
  },
  title: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg, color: Colors.dark },
  statRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  stat: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.sm, color: Colors.dark, fontVariant: ['tabular-nums'] },
  light: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: WORKOUTS_ACCENT,
    backgroundColor: WORKOUTS_TINT,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  retestBtn: { backgroundColor: Colors.secondary },
  bar: { height: 8, borderRadius: 4, backgroundColor: Colors.lightGray, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4, backgroundColor: WORKOUTS_ACCENT },
  resultRow: { gap: 6, paddingVertical: Spacing.sm },
  value: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xl, color: Colors.dark, fontVariant: ['tabular-nums'] },
  note: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.secondary },
  pill: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.full, backgroundColor: Colors.lightGray },
  pillUp: { backgroundColor: WORKOUTS_TINT },
  pillDown: { backgroundColor: Colors.secondary + '1A' },
  pillText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.gray },
  pillTextUp: { color: WORKOUTS_ACCENT },
  pillTextDown: { color: Colors.secondary },
  big: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xxl, color: Colors.dark, fontVariant: ['tabular-nums'] },
  arrow: { color: Colors.gray, fontFamily: Fonts.secondary },
  cmp: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cmpLabel: { width: 48, fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray },
  cmpTrack: { flex: 1, height: 8 },
  cmpBar: { height: 8, borderRadius: 4, backgroundColor: Colors.border },
  cmpBarNow: { backgroundColor: WORKOUTS_ACCENT },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, height: 150 },
  chartCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  chartValue: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xs, color: Colors.dark, fontVariant: ['tabular-nums'] },
  chartBar: { width: '70%', borderRadius: 6, backgroundColor: WORKOUTS_ACCENT + '55' },
  chartBarLast: { backgroundColor: WORKOUTS_ACCENT },
  chartLabel: { fontFamily: Fonts.secondary, fontSize: 11, color: Colors.gray },
});
