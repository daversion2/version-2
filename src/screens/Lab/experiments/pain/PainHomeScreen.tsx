import React, { useLayoutEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing } from '../../../../constants/theme';
import type { PainStackParamList } from '../../../../types/pain';
import { PAIN_SCALE_HINT, SELF_EXPERIMENT_LINE } from '../../../../data/painPlan';
import {
  daysUntilRetest,
  formatAverage,
  isFlare,
  isPlanDay,
  isRetestDue,
  painAverage,
  painWord,
  planOn,
  planResult,
  planStreak,
  planWeek,
  recentPain,
  shortDate,
  sortPlans,
  VERDICT_HEADLINE,
  weekSummary,
} from '../../../../services/painMath';
import { ProgressRing } from '../../../../components/common/ProgressRing';
import { usePain } from './PainContext';
import { CheckInSheet, CheckInTarget } from './components/CheckInSheet';
import { PainScale } from './components/PainScale';
import { PainBars } from './components/PainBars';
import { itemTitles, PAIN_ACCENT, ps, ratingLabel } from './components/painStyle';

type Props = NativeStackScreenProps<PainStackParamList, 'PainHome'>;

/**
 * Home: today's check-in and the plan in one place. Tap today's pain, tick
 * what you did, tap how hard it was to start — logged. Below: the plan, this
 * week against the goal, and the last two weeks.
 */
export const PainHomeScreen: React.FC<Props> = ({ navigation }) => {
  const { loading, loadError, reload, today, prefs, days, plans, plan, closeApp } = usePain();
  const [target, setTarget] = useState<CheckInTarget | null>(null);
  const [sheetKey, setSheetKey] = useState(0);
  const [note, setNote] = useState<string | null>(null);

  const open = (next: CheckInTarget) => {
    setNote(null);
    setSheetKey((k) => k + 1);
    setTarget(next);
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={closeApp} style={ps.headerIconBtn} accessibilityLabel="Close Back Pain">
          <Ionicons name="close" size={24} color={Colors.dark} />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('PainHistory')}
          style={ps.headerIconBtn}
          accessibilityLabel="History and settings"
        >
          <Ionicons name="time-outline" size={22} color={Colors.dark} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, closeApp]);

  const todayLog = days.find((d) => d.date === today);
  const todayPlan = planOn(plans, today);
  const week = useMemo(() => weekSummary(days, plans, today, prefs.weekly_goal), [days, plans, today, prefs.weekly_goal]);
  const streak = useMemo(() => planStreak(days, plans, today), [days, plans, today]);
  const bars = useMemo(() => recentPain(days, today, 14), [days, today]);
  const avg = useMemo(() => painAverage(days, today, 7), [days, today]);
  const flare = useMemo(() => isFlare(days, plan, today), [days, plan, today]);
  const lastPlan = useMemo(() => sortPlans(plans)[0], [plans]);

  if (loading) {
    return (
      <View style={[ps.screen, ps.center]}>
        <ActivityIndicator color={PAIN_ACCENT} />
      </View>
    );
  }

  const planCard = () => {
    if (!plan) {
      const last = lastPlan ? planResult(lastPlan) : null;
      return (
        <View style={ps.card}>
          <Text style={ps.title}>{lastPlan ? 'Start your next plan' : 'Find out what helps your back'}</Text>
          <Text style={ps.body}>
            Pick up to three things to do each day for 2–4 weeks, then retest and see what actually changed.
          </Text>
          {lastPlan ? (
            <TouchableOpacity onPress={() => navigation.navigate('PainResults', { planId: lastPlan.id })}>
              <Text style={ps.link}>
                Last plan: {last ? VERDICT_HEADLINE[last.verdict].toLowerCase() : 'ended early'}
              </Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={ps.primaryBtn}
            onPress={() =>
              navigation.navigate(
                'PainPlan',
                lastPlan?.status === 'complete' ? { fromPlanId: lastPlan.id } : undefined
              )
            }
          >
            <Text style={ps.primaryBtnText}>{lastPlan?.status === 'complete' ? 'Start the next plan' : 'Start a plan'}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (isRetestDue(plan, today)) {
      return (
        <View style={ps.card}>
          <Text style={ps.title}>Time to retest</Text>
          <Text style={ps.body}>
            Your {plan.weeks} weeks are up. Answer the same questions as at the start and see what changed.
          </Text>
          <TouchableOpacity style={ps.primaryBtn} onPress={() => navigation.navigate('PainResults', { planId: plan.id })}>
            <Text style={ps.primaryBtnText}>Retest now</Text>
          </TouchableOpacity>
        </View>
      );
    }
    const left = daysUntilRetest(plan, today);
    return (
      <TouchableOpacity style={ps.card} onPress={() => navigation.navigate('PainResults', { planId: plan.id })}>
        <View style={ps.row}>
          <Text style={[ps.title, ps.flex]}>
            Plan {plan.number} · week {planWeek(plan, today)} of {plan.weeks}
          </Text>
          <Ionicons name="chevron-forward" size={17} color={Colors.separator} />
        </View>
        <Text style={ps.body}>{itemTitles(plan.items)}</Text>
        <Text style={ps.muted}>
          Retest on {shortDate(plan.retest_date)}, in {left} {left === 1 ? 'day' : 'days'}.
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={ps.screen}>
      <ScrollView contentContainerStyle={ps.scroll}>
        {loadError ? (
          <TouchableOpacity style={ps.card} onPress={reload}>
            <Text style={ps.body}>Couldn’t load your check-ins. Tap to try again.</Text>
          </TouchableOpacity>
        ) : null}

        {flare ? (
          <View style={[ps.card, styles.flare]}>
            <View style={ps.row}>
              <Ionicons name="alert-circle" size={22} color={Colors.secondary} />
              <Text style={[ps.title, ps.flex]}>A rough couple of days</Text>
            </View>
            <Text style={ps.body}>
              Your pain has been well above where you started for two days. Ease off anything that makes it worse. If
              it keeps up, or spreads down a leg, see a doctor or physio.
            </Text>
          </View>
        ) : null}

        {todayLog ? (
          <TouchableOpacity style={ps.card} onPress={() => open({ date: today })} accessibilityLabel="Edit today’s check-in">
            <View style={ps.row}>
              <Text style={[ps.label, ps.flex]}>Today</Text>
              <Text style={ps.link}>Edit</Text>
            </View>
            <Text style={ps.bigTitle}>
              {todayLog.pain}/10 · {painWord(todayLog.pain)}
            </Text>
            {todayPlan ? (
              <Text style={ps.body}>
                {todayLog.done.length
                  ? `Did ${itemTitles(todayLog.done)}${isPlanDay(todayLog, todayPlan) ? ', the whole plan' : ''}.`
                  : 'Nothing from your plan yet.'}
                {ratingLabel(todayLog.resistance) ? ` ${ratingLabel(todayLog.resistance)}.` : ''}
              </Text>
            ) : null}
          </TouchableOpacity>
        ) : (
          <View style={ps.card}>
            <Text style={ps.title}>How’s your back today?</Text>
            <PainScale
              onChange={(pain) => open({ date: today, pain })}
              low="No pain"
              high="Worst"
              accessibilityLabel="Today’s pain"
            />
            <Text style={[ps.muted, ps.centerText]}>{PAIN_SCALE_HINT}. Your average for the day.</Text>
          </View>
        )}

        {note ? (
          <View style={[ps.card, ps.row]}>
            <Ionicons name="checkmark-circle" size={20} color={PAIN_ACCENT} />
            <Text style={[ps.body, ps.flex]}>{note}</Text>
          </View>
        ) : null}

        {planCard()}

        {plan ? (
          <View style={[ps.card, styles.week]}>
            <View style={styles.ringWrap}>
              <ProgressRing pct={week.goal ? week.planDays / week.goal : 0} color={PAIN_ACCENT} />
              <Text style={styles.ringText}>
                {week.planDays}/{week.goal}
              </Text>
            </View>
            <View style={ps.flex}>
              <Text style={ps.title}>This week</Text>
              <Text style={ps.body}>
                {week.met
                  ? 'Weekly goal met.'
                  : `${week.goal - week.planDays} more plan ${week.goal - week.planDays === 1 ? 'day' : 'days'} for your goal.`}
              </Text>
              {streak > 1 ? <Text style={ps.muted}>{streak} days in a row with the whole plan.</Text> : null}
            </View>
          </View>
        ) : null}

        {days.length ? (
          <View style={ps.card}>
            <Text style={ps.title}>Last two weeks</Text>
            <PainBars values={bars} />
            {avg.avg !== null ? (
              <Text style={ps.muted}>
                7-day average {formatAverage(avg.avg)} · {painWord(avg.avg).toLowerCase()}
                {plan ? ` · started at ${plan.baseline.pain_week}` : ''}
              </Text>
            ) : null}
          </View>
        ) : null}

        <Text style={[ps.muted, ps.centerText]}>{SELF_EXPERIMENT_LINE}</Text>
      </ScrollView>

      <CheckInSheet key={sheetKey} target={target} onClose={() => setTarget(null)} onSaved={setNote} />
    </View>
  );
};

const styles = StyleSheet.create({
  flare: { borderColor: Colors.secondary },
  week: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  ringWrap: { alignItems: 'center', justifyContent: 'center' },
  ringText: { position: 'absolute', fontFamily: Fonts.primaryBold, fontSize: FontSizes.sm, color: Colors.dark },
});
