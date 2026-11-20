import React, { useLayoutEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing } from '../../../../constants/theme';
import type { PainPlan, PainStackParamList } from '../../../../types/pain';
import { ACTIVITY_SCALE_HINT, PAIN_ITEM, PAIN_SCALE_HINT, SELF_EXPERIMENT_LINE } from '../../../../data/painPlan';
import {
  daysUntilRetest,
  endPlan,
  formatAverage,
  isRetestDue,
  itemAdherence,
  painWord,
  planResult,
  planWeek,
  prefillPain,
  recordRetest,
  resultNotes,
  shortDate,
  sortPlans,
  suggestNext,
  VERDICT_HEADLINE,
  type Adherence,
  type Verdict,
} from '../../../../services/painMath';
import { ListGroup, ListRow } from '../../../../components/common/ListGroup';
import { showConfirm } from '../../../../utils/alert';
import { usePain } from './PainContext';
import { PainScale } from './components/PainScale';
import { itemTitles, PAIN_ACCENT, ps } from './components/painStyle';

type Props = NativeStackScreenProps<PainStackParamList, 'PainResults'>;

const VERDICT_LINE: Record<Verdict, string> = {
  better: 'That’s a real change.',
  same: 'Within normal day-to-day swing.',
  worse: 'That’s a real rise.',
};

const signed = (n: number): string => (n > 0 ? `+${formatAverage(n)}` : formatAverage(n));

/**
 * One plan, whatever state it's in: in progress (the plan and how it's going),
 * due (the retest — same questions as the start, old answers hidden), done
 * (the comparison and what next), or ended early.
 */
export const PainResultsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { plans, plan: active, days, today, savePlan } = usePain();
  const plan = plans.find((p) => p.id === route.params.planId);

  useLayoutEffect(() => {
    if (plan) navigation.setOptions({ title: `Plan ${plan.number}` });
  }, [navigation, plan?.number]);

  if (!plan) {
    return (
      <View style={[ps.screen, ps.center]}>
        <Text style={ps.body}>That plan isn’t here any more.</Text>
      </View>
    );
  }

  const adherence = itemAdherence(plan, days, today);

  if (plan.status === 'active' && isRetestDue(plan, today)) {
    return <Retest plan={plan} />;
  }

  const end = () =>
    showConfirm(
      'End this plan early?',
      'You can start a new one straight away. An early end has no retest, so there’s no result.',
      async () => {
        if (await savePlan(endPlan(plan, today, new Date()))) navigation.goBack();
      },
      'End plan'
    );

  const isLatest = sortPlans(plans)[0]?.id === plan.id;

  return (
    <ScrollView style={ps.screen} contentContainerStyle={ps.scroll}>
      {plan.status === 'active' ? (
        <View style={ps.card}>
          <Text style={ps.bigTitle}>
            Week {planWeek(plan, today)} of {plan.weeks}
          </Text>
          <Text style={ps.body}>
            The retest opens on {shortDate(plan.retest_date)}, in {daysUntilRetest(plan, today)}{' '}
            {daysUntilRetest(plan, today) === 1 ? 'day' : 'days'}. Until then, just check in each evening.
          </Text>
        </View>
      ) : plan.status === 'ended' ? (
        <View style={ps.card}>
          <Text style={ps.bigTitle}>Ended early</Text>
          <Text style={ps.body}>
            {itemTitles(plan.items)}, from {shortDate(plan.start_date)}. Without a retest there’s no result.
          </Text>
        </View>
      ) : (
        <Outcome plan={plan} adherence={adherence} />
      )}

      {plan.change ? <Text style={[ps.muted, ps.centerText]}>Changed from the plan before: {plan.change}.</Text> : null}

      <ListGroup
        title={plan.status === 'active' ? 'Your plan so far' : 'How much got done'}
        footer={adherence.possible ? `${adherence.planDays} of ${adherence.possible} days with the whole plan.` : undefined}
      >
        {plan.items.map((id) => {
          const done = adherence.items.find((i) => i.id === id)?.done ?? 0;
          return (
            <ListRow
              key={id}
              title={PAIN_ITEM[id].title}
              subtitle={plan.status === 'active' ? PAIN_ITEM[id].dose : undefined}
              value={adherence.possible ? `${done}/${adherence.possible} days` : undefined}
            />
          );
        })}
      </ListGroup>

      {plan.status !== 'complete' ? (
        <ListGroup title="Where you started">
          <ListRow
            title="Average pain, past 7 days"
            value={`${plan.baseline.pain_week}/10 · ${painWord(plan.baseline.pain_week).toLowerCase()}`}
          />
          {plan.baseline.activities.map((a) => (
            <ListRow key={a.label} title={a.label} value={`${a.score}/10`} />
          ))}
        </ListGroup>
      ) : null}

      {plan.status === 'complete' && isLatest && !active ? <WhatNext plan={plan} adherence={adherence} /> : null}

      {plan.status === 'ended' && isLatest && !active ? (
        <TouchableOpacity style={ps.primaryBtn} onPress={() => navigation.navigate('PainPlan')}>
          <Text style={ps.primaryBtnText}>Start a new plan</Text>
        </TouchableOpacity>
      ) : null}

      {plan.status === 'active' ? (
        <TouchableOpacity style={ps.textBtn} onPress={end}>
          <Text style={[ps.textBtnText, { color: Colors.danger }]}>End plan early</Text>
        </TouchableOpacity>
      ) : null}

      <Text style={[ps.muted, ps.centerText]}>{SELF_EXPERIMENT_LINE}</Text>
    </ScrollView>
  );
};

/** The retest: the starting questions again, the old answers hidden until it's done. */
const Retest: React.FC<{ plan: PainPlan }> = ({ plan }) => {
  const { days, today, savePlan } = usePain();
  const prefill = useMemo(() => prefillPain(days, today), [days, today]);
  const [painWeek, setPainWeek] = useState<number | undefined>(prefill);
  const [scores, setScores] = useState<(number | undefined)[]>(plan.baseline.activities.map(() => undefined));
  const [saving, setSaving] = useState(false);

  const ready = painWeek !== undefined && scores.every((s) => s !== undefined);

  const finish = async () => {
    if (!ready || saving) return;
    setSaving(true);
    await savePlan(recordRetest(plan, { pain_week: painWeek!, scores: scores as number[] }, today, new Date()));
    setSaving(false);
  };

  return (
    <ScrollView style={ps.screen} contentContainerStyle={ps.scroll}>
      <View style={ps.card}>
        <Text style={ps.bigTitle}>Retest</Text>
        <Text style={ps.body}>
          The same questions as when you started. Answer for how things are now; your old answers show afterwards.
        </Text>
      </View>

      <View style={ps.card}>
        <Text style={ps.title}>Over the past 7 days, how bad has your back pain been on average?</Text>
        <PainScale value={painWeek} onChange={setPainWeek} low="No pain" high="Worst" accessibilityLabel="Pain this week" />
        <Text style={ps.muted}>
          {prefill !== undefined ? 'Filled in from your check-ins. Change it if it feels wrong. ' : ''}
          {PAIN_SCALE_HINT}.
        </Text>
      </View>

      {plan.baseline.activities.map((a, i) => (
        <View key={a.label} style={ps.card}>
          <Text style={ps.title}>{a.label}</Text>
          <PainScale
            value={scores[i]}
            onChange={(n) => setScores((s) => s.map((x, j) => (j === i ? n : x)))}
            low="Can’t do it"
            high="As before"
            accessibilityLabel={a.label}
          />
        </View>
      ))}
      {plan.baseline.activities.length ? (
        <Text style={[ps.muted, ps.centerText]}>{ACTIVITY_SCALE_HINT}.</Text>
      ) : null}

      <TouchableOpacity style={[ps.primaryBtn, !ready && ps.primaryBtnOff]} onPress={finish} disabled={!ready || saving}>
        <Text style={ps.primaryBtnText}>See results</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

/** Before → after, with the thresholds doing the judging. */
const Outcome: React.FC<{ plan: PainPlan; adherence: Adherence }> = ({ plan, adherence }) => {
  const result = planResult(plan);
  if (!result) return null;
  const { pain, activities, verdict } = result;
  const notes = resultNotes(plan, adherence.pct);

  return (
    <>
      <View style={ps.card}>
        <Text style={ps.bigTitle}>{VERDICT_HEADLINE[verdict]}</Text>
        <Text style={ps.body}>
          {itemTitles(plan.items)} for {plan.weeks} weeks
          {adherence.pct !== null ? `, ${Math.round(adherence.pct * 100)}% done` : ''}.
        </Text>
      </View>

      <View style={ps.card}>
        <Text style={ps.label}>Average pain, past 7 days</Text>
        <Text style={styles.compare}>
          {pain.before} → {pain.after}
        </Text>
        <Text style={ps.body}>
          {pain.diff > 0
            ? `${pain.diff} ${pain.diff === 1 ? 'point' : 'points'} less (${Math.round(pain.pct * 100)}%). `
            : pain.diff < 0
              ? `${-pain.diff} ${pain.diff === -1 ? 'point' : 'points'} more. `
              : 'No change. '}
          {VERDICT_LINE[pain.verdict]}
        </Text>
      </View>

      {activities ? (
        <ListGroup
          title="What your back gets in the way of"
          footer={`Average ${formatAverage(activities.beforeAvg)} → ${formatAverage(activities.afterAvg)} (${signed(activities.diff)}). ${VERDICT_LINE[activities.verdict]}`}
        >
          {activities.rows.map((r) => (
            <ListRow key={r.label} title={r.label} value={`${r.before} → ${r.after}`} />
          ))}
        </ListGroup>
      ) : null}

      <View style={styles.notes}>
        {notes.map((n) => (
          <Text key={n} style={ps.muted}>
            {n}
          </Text>
        ))}
      </View>
    </>
  );
};

/** The suggestion, then the next plan in the chain. */
const WhatNext: React.FC<{ plan: PainPlan; adherence: Adherence }> = ({ plan, adherence }) => {
  const navigation = useNavigation<NativeStackNavigationProp<PainStackParamList>>();
  const result = planResult(plan);
  if (!result) return null;
  const nextStep = suggestNext(result.verdict, adherence.pct);
  return (
    <View style={ps.card}>
      <Text style={ps.label}>What next</Text>
      <Text style={ps.title}>{nextStep.title}</Text>
      <Text style={ps.body}>{nextStep.why}</Text>
      <TouchableOpacity style={ps.primaryBtn} onPress={() => navigation.navigate('PainPlan', { fromPlanId: plan.id })}>
        <Text style={ps.primaryBtnText}>Start the next plan</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  compare: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xxl, color: PAIN_ACCENT },
  notes: { gap: Spacing.xs, paddingHorizontal: Spacing.md },
});
