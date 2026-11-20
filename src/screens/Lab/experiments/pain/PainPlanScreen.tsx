import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BorderRadius, Colors, Fonts, FontSizes, Spacing } from '../../../../constants/theme';
import type { PainItemId, PainOnset, PainStackParamList, PlanWeeks } from '../../../../types/pain';
import {
  ACTIVITY_SCALE_HINT,
  ACTIVITY_SUGGESTIONS,
  DEFAULT_PLAN_WEEKS,
  MAX_ACTIVITIES,
  MAX_PLAN_ITEMS,
  ONSET_OPTIONS,
  PAIN_ITEMS,
  PAIN_SCALE_HINT,
  PLAN_LENGTHS,
  RED_FLAG_STOP,
  RED_FLAG_URGENT,
  RED_FLAGS,
  TIER_LABEL,
} from '../../../../data/painPlan';
import { newPlan, nextPlanFrom, prefillPain, retestDateFor, shortDate } from '../../../../services/painMath';
import { StepFlowShell } from '../../../../components/common/StepFlowShell';
import { SegmentedControl } from '../../../../components/common/SegmentedControl';
import { InputField } from '../../../../components/common/InputField';
import { usePain } from './PainContext';
import { PainScale } from './components/PainScale';
import { itemTitles, PAIN_ACCENT, ps } from './components/painStyle';

type Props = NativeStackScreenProps<PainStackParamList, 'PainPlan'>;

type Step = 'safety' | 'onset' | 'pain' | 'activities' | 'rate' | 'items' | 'length';

/**
 * Setting up a plan, one question per step. A first plan takes the starting
 * test (7-day pain and 1–3 activities). The next plan in a chain skips it: the
 * last retest is where it starts. Red flags come first, every time.
 */
export const PainPlanScreen: React.FC<Props> = ({ navigation, route }) => {
  const { days, plans, today, savePlan, newPlanId } = usePain();
  const from = plans.find((p) => p.id === route.params?.fromPlanId);

  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [safety, setSafety] = useState<'clear' | 'flag' | undefined>();
  const [onset, setOnset] = useState<PainOnset | undefined>(from?.onset);
  const prefill = useMemo(() => prefillPain(days, today), [days, today]);
  const [painWeek, setPainWeek] = useState<number | undefined>(prefill);
  const [activities, setActivities] = useState<string[]>([]);
  const [custom, setCustom] = useState('');
  const [scores, setScores] = useState<Record<string, number>>({});
  const [items, setItems] = useState<PainItemId[]>(from?.items ?? []);
  const [weeks, setWeeks] = useState<PlanWeeks>(from?.weeks ?? DEFAULT_PLAN_WEEKS);
  const [saving, setSaving] = useState(false);

  const steps: Step[] = from
    ? ['safety', 'onset', 'items', 'length']
    : ['safety', 'onset', 'pain', 'activities', ...(activities.length ? (['rate'] as Step[]) : []), 'items', 'length'];
  const step = steps[Math.min(index, steps.length - 1)];
  const isLast = step === 'length';

  const canContinue = (() => {
    switch (step) {
      case 'safety':
        return safety === 'clear';
      case 'onset':
        return !!onset;
      case 'pain':
        return painWeek !== undefined;
      case 'activities':
        return activities.length > 0;
      case 'rate':
        return activities.every((a) => scores[a] !== undefined);
      case 'items':
        return items.length > 0;
      case 'length':
        return !saving;
    }
  })();

  const start = async () => {
    if (!onset || saving) return;
    setSaving(true);
    const id = newPlanId();
    const now = new Date();
    const plan = from
      ? nextPlanFrom(from, { id, onset, items, weeks, today, now })
      : newPlan({
          id,
          onset,
          items,
          weeks,
          today,
          now,
          baseline: {
            pain_week: painWeek ?? 0,
            activities: activities.map((label) => ({ label, score: scores[label] ?? 0 })),
          },
        });
    const ok = await savePlan(plan);
    setSaving(false);
    if (ok) navigation.popToTop();
  };

  const next = () => {
    if (isLast) return start();
    setDirection('forward');
    setIndex((i) => i + 1);
  };

  const back = () => {
    setDirection('backward');
    setIndex((i) => Math.max(0, i - 1));
  };

  const toggleActivity = (label: string) =>
    setActivities((a) =>
      a.includes(label) ? a.filter((x) => x !== label) : a.length < MAX_ACTIVITIES ? [...a, label] : a
    );

  const addCustom = () => {
    const label = custom.trim();
    if (!label || activities.includes(label) || activities.length >= MAX_ACTIVITIES) return;
    setActivities((a) => [...a, label]);
    setCustom('');
  };

  const toggleItem = (id: PainItemId) =>
    setItems((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length < MAX_PLAN_ITEMS ? [...cur, id] : cur));

  const option = (selected: boolean, onPress: () => void, label: string, sub?: string, key?: string) => (
    <TouchableOpacity
      key={key ?? label}
      style={[styles.option, selected && styles.optionOn]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <View style={ps.flex}>
        <Text style={ps.title}>{label}</Text>
        {sub ? <Text style={ps.muted}>{sub}</Text> : null}
      </View>
      {selected ? <Ionicons name="checkmark-circle" size={22} color={PAIN_ACCENT} /> : null}
    </TouchableOpacity>
  );

  const body = () => {
    switch (step) {
      case 'safety':
        return (
          <>
            <Text style={styles.question}>First, a quick safety check</Text>
            <Text style={ps.body}>Do any of these apply to you right now?</Text>
            <View style={styles.flags}>
              {RED_FLAGS.map((f) => (
                <View key={f} style={styles.flagRow}>
                  <Text style={ps.body}>•</Text>
                  <Text style={[ps.body, ps.flex]}>{f}</Text>
                </View>
              ))}
            </View>
            {option(safety === 'clear', () => setSafety('clear'), 'None of these')}
            {option(safety === 'flag', () => setSafety('flag'), 'One or more of these')}
            {safety === 'flag' ? (
              <View style={[ps.card, styles.stop]}>
                <Text style={ps.title}>{RED_FLAG_STOP}</Text>
                <Text style={ps.body}>{RED_FLAG_URGENT}</Text>
                <TouchableOpacity style={ps.secondaryBtn} onPress={() => navigation.goBack()}>
                  <Text style={ps.secondaryBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </>
        );
      case 'onset':
        return (
          <>
            <Text style={styles.question}>How long has your back been bothering you?</Text>
            <Text style={ps.body}>This episode, if it comes and goes.</Text>
            {ONSET_OPTIONS.map((o) => option(onset === o.value, () => setOnset(o.value), o.label, o.sub, o.value))}
          </>
        );
      case 'pain':
        return (
          <>
            <Text style={styles.question}>Over the past 7 days, how bad has your back pain been on average?</Text>
            <PainScale value={painWeek} onChange={setPainWeek} low="No pain" high="Worst" accessibilityLabel="Pain this week" />
            <Text style={ps.muted}>
              {prefill !== undefined ? `Filled in from your check-ins. Change it if it feels wrong. ` : ''}
              {PAIN_SCALE_HINT}.
            </Text>
          </>
        );
      case 'activities':
        return (
          <>
            <Text style={styles.question}>What does your back get in the way of?</Text>
            <Text style={ps.body}>
              Pick up to {MAX_ACTIVITIES}. You’ll rate them now and again at the end. They often change before the pain
              does.
            </Text>
            <View style={styles.chips}>
              {[...ACTIVITY_SUGGESTIONS, ...activities.filter((a) => !ACTIVITY_SUGGESTIONS.includes(a))].map((label) => {
                const on = activities.includes(label);
                return (
                  <TouchableOpacity
                    key={label}
                    style={[styles.chip, on && styles.chipOn]}
                    onPress={() => toggleActivity(label)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {activities.length < MAX_ACTIVITIES ? (
              <View style={styles.customRow}>
                <View style={ps.flex}>
                  <InputField
                    label="Something else"
                    value={custom}
                    onChangeText={setCustom}
                    placeholder="e.g. Playing golf"
                    returnKeyType="done"
                    onSubmitEditing={addCustom}
                    maxLength={40}
                  />
                </View>
                <TouchableOpacity onPress={addCustom} style={styles.addBtn} accessibilityLabel="Add activity">
                  <Ionicons name="add-circle" size={32} color={custom.trim() ? PAIN_ACCENT : Colors.separator} />
                </TouchableOpacity>
              </View>
            ) : null}
          </>
        );
      case 'rate':
        return (
          <>
            <Text style={styles.question}>How well can you do each one right now?</Text>
            <Text style={ps.muted}>{ACTIVITY_SCALE_HINT}.</Text>
            {activities.map((a) => (
              <View key={a} style={styles.rate}>
                <Text style={ps.title}>{a}</Text>
                <PainScale
                  value={scores[a]}
                  onChange={(n) => setScores((s) => ({ ...s, [a]: n }))}
                  low="Can’t do it"
                  high="As before"
                  accessibilityLabel={a}
                />
              </View>
            ))}
          </>
        );
      case 'items':
        return (
          <>
            <Text style={styles.question}>
              {from ? 'What will you do this time?' : 'What will you do each day?'}
            </Text>
            <Text style={ps.body}>
              Up to {MAX_PLAN_ITEMS}. Fewer is easier to keep, and easier to tell what helped.
              {from ? ' Changing one thing at a time works best.' : ''}
            </Text>
            {PAIN_ITEMS.map((item) => {
              const on = items.includes(item.id);
              const full = !on && items.length >= MAX_PLAN_ITEMS;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.option, styles.itemCard, on && styles.optionOn, full && styles.dim]}
                  onPress={() => toggleItem(item.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on, disabled: full }}
                >
                  <View style={[ps.flex, styles.itemText]}>
                    <View style={ps.row}>
                      <Text style={[ps.title, ps.flex]}>{item.title}</Text>
                      <Ionicons
                        name={on ? 'checkmark-circle' : 'ellipse-outline'}
                        size={22}
                        color={on ? PAIN_ACCENT : Colors.separator}
                      />
                    </View>
                    <View style={styles.tags}>
                      <View style={ps.tag}>
                        <Text style={ps.tagText}>{TIER_LABEL[item.tier]}</Text>
                      </View>
                      {item.forRecent && onset === 'recent' ? (
                        <View style={ps.tag}>
                          <Text style={ps.tagText}>Good for recent pain</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={ps.body}>{item.dose}</Text>
                    <Text style={ps.muted}>{item.why}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        );
      case 'length':
        return (
          <>
            <Text style={styles.question}>How long will you give it?</Text>
            <SegmentedControl<string>
              options={PLAN_LENGTHS.map((w) => ({ value: String(w), label: `${w} weeks` }))}
              value={String(weeks)}
              onChange={(w) => setWeeks(Number(w) as PlanWeeks)}
              accessibilityLabel="Plan length"
            />
            <Text style={ps.muted}>
              Back pain changes over weeks, not days, and one bad night can swing a day by 2–3 points. Two weeks is the
              least that tells you much; three is a good default.
            </Text>
            <View style={ps.card}>
              <Text style={ps.label}>Your plan</Text>
              <Text style={ps.title}>{itemTitles(items)}</Text>
              <Text style={ps.body}>
                Every day, starting today. Retest on {shortDate(retestDateFor(today, weeks))}.
              </Text>
              {from ? <Text style={ps.muted}>You start from your last retest: {from.retest?.pain_week ?? from.baseline.pain_week}/10.</Text> : null}
            </View>
          </>
        );
    }
  };

  return (
    <StepFlowShell
      progress={(index + 1) / steps.length}
      stepKey={step}
      direction={direction}
      accentColor={PAIN_ACCENT}
      title={from ? `Plan ${from.number + 1}` : 'New plan'}
      canGoBack={index > 0}
      onBack={back}
      onCancel={() => navigation.goBack()}
      canContinue={canContinue}
      allowSkip={step === 'activities'}
      nextLabel={isLast ? 'Start plan' : 'Continue'}
      skipLabel="Skip, track pain only"
      isLast={isLast}
      onNext={next}
    >
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {body()}
      </ScrollView>
    </StepFlowShell>
  );
};

const styles = StyleSheet.create({
  body: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  question: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xl, color: Colors.dark, lineHeight: 30 },
  flags: { gap: 6 },
  flagRow: { flexDirection: 'row', gap: Spacing.sm },
  stop: { borderColor: Colors.secondary },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    backgroundColor: Colors.white,
  },
  optionOn: { borderColor: PAIN_ACCENT, backgroundColor: PAIN_ACCENT + '14' },
  itemCard: { alignItems: 'flex-start' },
  itemText: { gap: 6 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  dim: { opacity: 0.45 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    backgroundColor: Colors.white,
  },
  chipOn: { borderColor: PAIN_ACCENT, backgroundColor: PAIN_ACCENT },
  chipText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark },
  chipTextOn: { color: Colors.white, fontFamily: Fonts.secondaryBold },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  addBtn: { paddingTop: Spacing.sm },
  rate: { gap: Spacing.sm },
});
