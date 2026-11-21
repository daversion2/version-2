import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppColors, BorderRadius, Colors, Spacing, TextStyles } from '../../constants/theme';
import { KEEP_GOING_LEVELS, START_LEVELS } from '../../constants/resistance';
import { REACH_STOPS } from '../../data/comfortZone';
import { useAuth } from '../../context/AuthContext';
import { CloseOutReminderSheet } from '../../components/appSetup/CloseOutReminderSheet';
import { ScreenIntro } from '../../components/common/ScreenIntro';
import { useScreenIntro } from '../../hooks/useScreenIntro';
import { APP_ICONS } from '../../components/homeDashboard/DashboardParts';
import { MINI_APPS } from '../../services/miniApps';
import { TodayAppId } from '../../services/appCheckins';
import { AppSetup, loadAppSetup, visibleApps } from '../../services/appSetup';
import { formatReminderTime } from '../../services/closeOutReminder';
import {
  appPlan,
  formatPlan,
  isBadDay,
  loadNightlyClose,
  NightlyCloseData,
  NightlyWin,
  PLAN_WHENS,
  RowAppId,
  planFromReflection,
  SessionToday,
  suggestPlanApp,
} from '../../services/nightlyClose';
import { buildDailySummary, saveReflection } from '../../services/reflections';
import type { ReflectionGrade } from '../../types';
import type { RootStackParamList } from '../../types/navigation';
import { getTodayString } from '../../utils/date';
import { showAlert } from '../../utils/alert';
import { triggerRewardHaptic } from '../../utils/haptics';

// =============================================================================
// CLOSE OUT THE DAY — its own micro-app (2026-11-20). A home (tonight, the
// plan already set, the last 7 nights, the evening reminder) and three beats:
// tonight's win from today's app sessions, a grade for the effort, one session
// planned for tomorrow. Logic: services/nightlyClose.ts (tested). Mockup:
// https://claude.ai/artifact/JyTy21iCp1BuRU9kmKQsMJ.
//
// Opened from Today's row (root route NightlyApp) and still from the old
// NightlyReflection route (Home stack, rules' call to action), which renders
// this same component. Only goBack and app routes are used, so it works in
// either place.
// =============================================================================

type Step = 'home' | 'win' | 'grade' | 'plan';
type IconName = keyof typeof Ionicons.glyphMap;
const APP_TITLES = (id: TodayAppId) => MINI_APPS[id].title;
const ROW_TITLES: Record<RowAppId, string> = { craving: 'Craving Crusher', hotcold: 'Hot & Cold', avoidance: 'Avoidance Training' };

const ACCENT = AppColors.nightly;
const TINT = AppColors.nightly + '1F';
const GRADE_ORDER: ReflectionGrade[] = ['A', 'B', 'C', 'D', 'F'];
const DAY_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const startWord = (n?: number) => (n ? START_LEVELS[n - 1]?.anchor : undefined);
const keepWord = (app: TodayAppId, n?: number) =>
  n && app !== 'meals' ? KEEP_GOING_LEVELS[app][n - 1]?.anchor : undefined;

const sessionLine = (s: SessionToday): string =>
  [startWord(s.start) && `Start: ${startWord(s.start)}`, keepWord(s.appId, s.keepGoing) && `Keep going: ${keepWord(s.appId, s.keepGoing)}`]
    .filter(Boolean)
    .join(' · ') || 'Not rated';

const winCopy = (win: NightlyWin): { headline: string; body: string } => {
  if (!win) {
    return {
      headline: 'Nothing logged today.',
      body: 'That happens. Tonight’s plan goes small, so tomorrow is an easy yes.',
    };
  }
  if (win.kind === 'hardStart') {
    return {
      headline: `You did ${APP_TITLES(win.appId)} when getting started took everything.`,
      body: 'You rated the start a 3 and went anyway. That’s the training.',
    };
  }
  if (win.kind === 'hardStay') {
    return {
      headline: `You kept going in ${APP_TITLES(win.appId)} when you wanted to stop.`,
      body: 'Staying with it took everything, and you stayed. That’s the override’s second job.',
    };
  }
  return {
    headline: (() => {
      const names = [...win.appIds.map(APP_TITLES), ...win.rowIds.map((r) => ROW_TITLES[r])];
      return names.length === 1 ? `You showed up for ${names[0]}.` : `You showed up in ${names.length} apps today.`;
    })(),
    body: 'Every session is a start you made. That’s the training.',
  };
};

const weekday = (date: string) => new Date(`${date}T12:00:00`).getDay();

export const NightlyApp: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { user, userProfile } = useAuth();
  const intro = useScreenIntro('nightly_reflection');
  const today = getTodayString();

  const [data, setData] = useState<NightlyCloseData | null>(null);
  const [setup, setSetup] = useState<AppSetup | null>(null);
  const [failed, setFailed] = useState(false);
  const [step, setStep] = useState<Step>('home');
  const [grade, setGrade] = useState<ReflectionGrade | null>(null);
  const [planApp, setPlanApp] = useState<TodayAppId | null>(null);
  const [when, setWhen] = useState<string>(PLAN_WHENS[0]);
  const [saving, setSaving] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);

  const load = useCallback(() => {
    if (!user) return;
    setFailed(false);
    Promise.all([loadNightlyClose(user.uid, today), loadAppSetup(user.uid, userProfile)])
      .then(([d, s]) => {
        setData(d);
        setSetup(s);
      })
      .catch((e) => {
        console.warn('Close out the day: loading failed', e);
        setFailed(true);
      });
  }, [user, userProfile, today]);

  useFocusEffect(load);

  const apps = useMemo(() => (setup ? visibleApps(setup.hidden) : []), [setup]);
  const suggested = data && setup ? suggestPlanApp(apps, data.weekCounts, setup.goals) : null;
  const chosenApp = planApp ?? suggested;
  const badDay = isBadDay({ grade, loggedToday: (data?.loggedApps.length ?? 0) + (data?.rowsToday.length ?? 0) });
  const plan = chosenApp ? appPlan(chosenApp, when, badDay) : null;
  const tonightPlan = planFromReflection(data?.tonight ?? null);

  const begin = () => {
    setGrade(data?.tonight?.grade ?? null);
    setPlanApp(tonightPlan?.appId ?? null);
    setWhen(tonightPlan?.appId && tonightPlan.cue ? tonightPlan.cue : PLAN_WHENS[0]);
    setStep('win');
  };

  const save = async () => {
    if (!user || !grade || saving) return;
    setSaving(true);
    try {
      const existing = data?.tonight;
      await saveReflection(user.uid, {
        user_id: user.uid,
        date: today,
        grade,
        prompt_ifthen_cue: plan?.cue || undefined,
        prompt_ifthen_response: plan?.response || undefined,
        plan_app_id: plan?.appId,
        // saveReflection writes the whole document: keep what an older version collected.
        prompt_why_connection: existing?.prompt_why_connection,
        factors: existing?.factors,
        prompt_went_well: existing?.prompt_went_well,
        prompt_hardest: existing?.prompt_hardest,
        prompt_tomorrow: existing?.prompt_tomorrow,
        daily_summary: await buildDailySummary(user.uid, today),
        created_at: existing?.created_at ?? new Date().toISOString(),
      });
      triggerRewardHaptic();
      setStep('home');
      load();
    } catch (e: any) {
      console.warn('Saving the close-out failed:', e);
      showAlert('Couldn’t save', e?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const exit = () => (step === 'home' ? navigation.goBack() : setStep(step === 'win' ? 'home' : step === 'grade' ? 'win' : 'grade'));

  // --- Pieces --------------------------------------------------------------

  const header = (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.back}
        onPress={exit}
        accessibilityRole="button"
        accessibilityLabel={step === 'home' ? 'Back to Today' : step === 'win' ? 'Cancel' : 'Back'}
      >
        {step === 'win' ? null : <Ionicons name="chevron-back" size={24} color={Colors.primary} />}
        <Text style={styles.backText}>{step === 'home' ? 'Today' : step === 'win' ? 'Cancel' : 'Back'}</Text>
      </TouchableOpacity>
      {step === 'home' ? (
        <TouchableOpacity style={styles.iconButton} onPress={intro.reopen} accessibilityRole="button" accessibilityLabel="How this works">
          <Ionicons name="information-circle-outline" size={24} color={Colors.primary} />
        </TouchableOpacity>
      ) : (
        <Text style={styles.stepCount}>{step === 'win' ? '1' : step === 'grade' ? '2' : '3'} of 3</Text>
      )}
    </View>
  );

  const progress = (n: number) => (
    <View style={styles.progress} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {[1, 2, 3].map((i) => (
        <View key={i} style={[styles.progressBar, { backgroundColor: i <= n ? ACCENT : Colors.fill }]} />
      ))}
    </View>
  );

  const appTile = (id: TodayAppId, size = 34) => (
    <View style={[styles.appTile, { width: size, height: size, borderRadius: size * 0.29, backgroundColor: AppColors[id] }]}>
      <Ionicons name={APP_ICONS[id] as IconName} size={size * 0.53} color={Colors.white} />
    </View>
  );

  const primary = (label: string, onPress: () => void, disabled = false) => (
    <TouchableOpacity
      style={[styles.primary, disabled && styles.primaryOff]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      {saving ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.primaryText}>{label}</Text>}
    </TouchableOpacity>
  );

  // --- Screens -------------------------------------------------------------

  const home = () => {
    if (!data) return null;
    const closed = !!data.tonight;
    return (
      <>
        <View style={styles.titleBlock}>
          <Text style={styles.eyebrow}>{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}</Text>
          <Text style={styles.largeTitle} accessibilityRole="header">
            Close out the day
          </Text>
        </View>

        <View style={styles.card}>
          <View style={[styles.cardBand, { backgroundColor: TINT }]}>
            <View style={[styles.appTile, styles.bandIcon]}>
              <Ionicons name="moon-outline" size={28} color={Colors.white} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>{closed ? `Tonight: ${data.tonight!.grade}` : 'Tonight'}</Text>
              <Text style={styles.cardBody}>
                {closed ? 'Closed out. Open it again to change anything.' : 'Your win, a grade, tomorrow’s plan. About a minute.'}
              </Text>
            </View>
          </View>
          <View style={styles.cardFoot}>
            {data.loggedApps.length + data.rowsToday.length > 0 ? (
              <View style={styles.chips}>
                {data.loggedApps.map((id) => (
                  <Text key={id} style={styles.chip}>
                    {APP_TITLES(id)}
                  </Text>
                ))}
                {data.rowsToday.map((id) => (
                  <Text key={id} style={styles.chip}>
                    {ROW_TITLES[id]}
                  </Text>
                ))}
              </View>
            ) : (
              <Text style={styles.muted}>Nothing logged yet today.</Text>
            )}
            {primary(closed ? 'Close out again' : 'Close out today', begin)}
          </View>
        </View>

        <View style={styles.group}>
          <Text style={styles.groupTitle}>TOMORROW’S PLAN</Text>
          <View style={[styles.panel, styles.planRow]}>
            {tonightPlan?.appId ? appTile(tonightPlan.appId) : <Ionicons name="calendar-outline" size={24} color={Colors.gray} />}
            <Text style={[styles.body, styles.flex]}>{tonightPlan ? formatPlan(tonightPlan) : 'Set tonight, when you close out.'}</Text>
          </View>
        </View>

        <View style={styles.group}>
          <Text style={styles.groupTitle}>LAST 7 NIGHTS</Text>
          <View style={[styles.panel, styles.nights]} accessible accessibilityLabel={nightsLabel(data.nights)}>
            {data.nights.map((n) => (
              <View key={n.date} style={styles.night}>
                <Text style={[styles.nightDay, n.date === today && styles.nightToday]}>{DAY_LETTER[weekday(n.date)]}</Text>
                {n.grade ? (
                  <View style={[styles.nightGrade, { backgroundColor: TINT }]}>
                    <Text style={styles.nightGradeText}>{n.grade}</Text>
                  </View>
                ) : (
                  <View style={[styles.nightGrade, styles.nightEmpty, n.date === today && { borderColor: ACCENT }]} />
                )}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.panel}>
          <TouchableOpacity style={styles.listRow} onPress={() => setReminderOpen(true)} accessibilityRole="button">
            <Text style={[styles.body, styles.flex]}>Evening reminder</Text>
            <Text style={styles.value}>
              {userProfile?.closeout_reminder_time ? formatReminderTime(userProfile.closeout_reminder_time) : 'Off'}
            </Text>
          </TouchableOpacity>
        </View>
      </>
    );
  };

  const win = () => {
    if (!data) return null;
    const copy = winCopy(data.win);
    return (
      <>
        {progress(1)}
        <View style={styles.beat}>
          <Text style={styles.kicker}>TONIGHT’S WIN</Text>
          <Text style={styles.beatTitle} accessibilityRole="header">
            {copy.headline}
          </Text>
          <Text style={styles.beatBody}>{copy.body}</Text>
        </View>
        {data.sessions.length > 0 && (
          <View style={styles.group}>
            <Text style={styles.groupTitle}>TODAY</Text>
            <View style={styles.panel}>
              {data.sessions.map((s, i) => (
                <View key={`${s.appId}-${i}`} style={[styles.sessionRow, i < data.sessions.length - 1 && styles.separator]}>
                  {appTile(s.appId)}
                  <View style={styles.flex}>
                    <Text style={styles.headline}>{APP_TITLES(s.appId)}</Text>
                    <Text style={styles.muted}>{sessionLine(s)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
        <View style={styles.flex} />
        {primary('Next', () => setStep('grade'))}
      </>
    );
  };

  const gradeStep = () => (
    <>
      {progress(2)}
      <View style={styles.beat}>
        <Text style={styles.kicker}>GRADE THE EFFORT</Text>
        <Text style={styles.beatTitle} accessibilityRole="header">
          How hard did you push yourself today?
        </Text>
        <Text style={styles.beatBody}>The effort, not the results.</Text>
      </View>
      <View style={styles.grades} accessibilityRole="radiogroup">
        {GRADE_ORDER.map((g) => {
          const stop = REACH_STOPS.find((r) => r.grade === g)!;
          const on = grade === g;
          return (
            <TouchableOpacity
              key={g}
              style={[styles.gradeRow, on && { borderColor: ACCENT }]}
              onPress={() => setGrade(g)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${g}: ${stop.label}`}
            >
              <View style={[styles.gradeTile, { backgroundColor: on ? ACCENT : TINT }]}>
                <Text style={[styles.gradeLetter, on && styles.gradeLetterOn]}>{g}</Text>
              </View>
              <Text style={[styles.headline, styles.flex]}>{stop.label}</Text>
              {on && <Ionicons name="checkmark" size={22} color={ACCENT} />}
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.flex} />
      {primary('Next', () => setStep('plan'), !grade)}
    </>
  );

  const planStep = () => (
    <>
      {progress(3)}
      <View style={styles.beat}>
        <Text style={styles.kicker}>TOMORROW</Text>
        <Text style={styles.beatTitle} accessibilityRole="header">
          {badDay ? 'Keep tomorrow small.' : 'One session. When?'}
        </Text>
        {badDay && <Text style={styles.beatBody}>Getting back on track beats making up for it. A small one counts.</Text>}
      </View>

      <View style={styles.group}>
        <Text style={styles.groupTitle}>WHICH APP</Text>
        <View style={styles.appChoices}>
          {apps.map((id) => {
            const on = chosenApp === id;
            const goal = setup?.goals[id] ?? 0;
            return (
              <TouchableOpacity
                key={id}
                style={[styles.appChoice, on && { borderColor: ACCENT }]}
                onPress={() => setPlanApp(id)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${APP_TITLES(id)}, ${data?.weekCounts[id] ?? 0} of ${goal} this week`}
              >
                {appTile(id, 28)}
                <Text style={styles.headline}>{APP_TITLES(id)}</Text>
                <Text style={styles.muted}>
                  {data?.weekCounts[id] ?? 0} of {goal}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.group}>
        <Text style={styles.groupTitle}>WHEN</Text>
        <View style={styles.whens}>
          {PLAN_WHENS.map((w) => {
            const on = when === w;
            return (
              <TouchableOpacity
                key={w}
                style={[styles.when, on && { backgroundColor: ACCENT, borderColor: ACCENT }]}
                onPress={() => setWhen(w)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
              >
                <Text style={[styles.whenText, on && styles.whenTextOn]}>{w}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {plan && (
        <View style={[styles.panel, styles.planPreview]}>
          <Text style={styles.previewLabel}>YOUR PLAN</Text>
          <Text style={styles.previewText}>{formatPlan(plan)}</Text>
          <Text style={styles.muted}>It waits on Today until you’ve done it.</Text>
        </View>
      )}

      <View style={styles.flex} />
      {primary('Save and close out', save, !grade || saving)}
    </>
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom + Spacing.lg }]}
      >
        {header}
        {failed ? (
          <View style={styles.failed}>
            <Text style={styles.body}>Couldn’t load today.</Text>
            <TouchableOpacity onPress={load} accessibilityRole="button">
              <Text style={styles.link}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : !data || !setup ? (
          <ActivityIndicator color={Colors.primary} style={styles.loading} />
        ) : step === 'home' ? (
          home()
        ) : step === 'win' ? (
          win()
        ) : step === 'grade' ? (
          gradeStep()
        ) : (
          planStep()
        )}
      </ScrollView>
      <CloseOutReminderSheet visible={reminderOpen} onClose={() => setReminderOpen(false)} />
      <ScreenIntro intro={intro} accent={ACCENT} />
    </View>
  );
};

const nightsLabel = (nights: NightlyCloseData['nights']) =>
  `Last 7 nights: ${nights.map((n) => n.grade ?? 'not closed').join(', ')}`;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  content: { flexGrow: 1, paddingHorizontal: Spacing.md, gap: Spacing.lg },
  flex: { flex: 1 },
  loading: { marginTop: Spacing.xl },
  failed: { alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xl },
  link: { ...TextStyles.body, color: Colors.primary },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  back: { flexDirection: 'row', alignItems: 'center', minHeight: 44, marginLeft: -6, paddingRight: Spacing.sm },
  backText: { ...TextStyles.body, color: Colors.primary },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  stepCount: { ...TextStyles.subhead, fontWeight: '700', color: Colors.label2 },

  titleBlock: { gap: 2, paddingHorizontal: 4, marginTop: -Spacing.md },
  eyebrow: { ...TextStyles.footnote, fontWeight: '600', letterSpacing: 0.3, color: Colors.gray },
  largeTitle: { ...TextStyles.largeTitle, color: Colors.dark },

  card: { backgroundColor: Colors.cardBg, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  cardBand: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: Spacing.md },
  bandIcon: { width: 52, height: 52, borderRadius: 14, backgroundColor: ACCENT },
  cardTitle: { ...TextStyles.headline, color: Colors.dark },
  cardBody: { ...TextStyles.subhead, color: Colors.label2 },
  cardFoot: { padding: Spacing.md, gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    ...TextStyles.footnote,
    fontWeight: '600',
    color: Colors.dark,
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    overflow: 'hidden',
  },

  group: { gap: 6 },
  groupTitle: { ...TextStyles.footnote, fontWeight: '700', letterSpacing: 0.5, color: Colors.gray, paddingHorizontal: Spacing.md },
  panel: { backgroundColor: Colors.cardBg, borderRadius: BorderRadius.md, overflow: 'hidden' },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.md },
  listRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: Spacing.md },
  body: { ...TextStyles.body, color: Colors.dark },
  value: { ...TextStyles.body, color: Colors.gray },
  headline: { ...TextStyles.headline, color: Colors.dark },
  muted: { ...TextStyles.footnote, color: Colors.gray },
  separator: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.separator },

  nights: { flexDirection: 'row', justifyContent: 'space-between', padding: Spacing.md },
  night: { alignItems: 'center', gap: 6 },
  nightDay: { ...TextStyles.caption, color: Colors.gray },
  nightToday: { color: Colors.dark, fontWeight: '700' },
  nightGrade: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  nightGradeText: { ...TextStyles.subhead, fontWeight: '800', color: Colors.dark },
  nightEmpty: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: Colors.separator },

  appTile: { alignItems: 'center', justifyContent: 'center' },

  progress: { flexDirection: 'row', gap: 6, marginTop: -Spacing.sm },
  progressBar: { flex: 1, height: 4, borderRadius: 2 },
  beat: { gap: 6 },
  kicker: { ...TextStyles.footnote, fontWeight: '700', letterSpacing: 0.5, color: Colors.label2 },
  beatTitle: { ...TextStyles.title1, color: Colors.dark },
  beatBody: { ...TextStyles.callout, color: Colors.label2 },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.md },

  grades: { gap: 10 },
  gradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.cardBg,
    borderWidth: 2,
    borderColor: Colors.cardBg,
  },
  gradeTile: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  gradeLetter: { ...TextStyles.headline, fontWeight: '800', color: Colors.dark },
  gradeLetterOn: { color: Colors.white },

  appChoices: { flexDirection: 'row', gap: 8 },
  appChoice: {
    flex: 1,
    gap: 4,
    padding: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.cardBg,
    borderWidth: 2,
    borderColor: Colors.cardBg,
  },
  whens: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  when: {
    minHeight: 40,
    paddingHorizontal: Spacing.md,
    borderRadius: 20,
    backgroundColor: Colors.cardBg,
    borderWidth: 2,
    borderColor: Colors.cardBg,
    justifyContent: 'center',
  },
  whenText: { ...TextStyles.subhead, fontWeight: '600', color: Colors.dark },
  whenTextOn: { color: Colors.white },
  planPreview: { padding: Spacing.md, gap: 6 },
  previewLabel: { ...TextStyles.caption, fontWeight: '700', letterSpacing: 0.5, color: Colors.gray },
  previewText: { ...TextStyles.title2, color: Colors.dark },

  primary: {
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryOff: { opacity: 0.45 },
  primaryText: { ...TextStyles.headline, color: Colors.white },
});
