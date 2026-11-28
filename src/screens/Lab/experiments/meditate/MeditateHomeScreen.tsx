import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { BorderRadius, Colors, Spacing, TextStyles } from '../../../../constants/theme';
import { LargeTitle } from '../../../../components/common/LargeTitle';
import { ListGroup, ListRow } from '../../../../components/common/ListGroup';
import { MeditateStackParamList } from '../../../../types/meditate';
import { describeSession, isReadyToLog, MODE_ORDER, MODES, totals } from '../../../../services/meditateMath';
import { meditateHomeFocus, MeditatePlan, planFor } from '../../../../services/meditateHome';
import { formatMinutes, remainingSec } from '../../../../services/sessionTimer';
import { showConfirm } from '../../../../utils/alert';
import { useMeditate } from './MeditateContext';
import { MEDITATE_ACCENT, ms } from './components/meditateStyle';
import { MeditateWeekCard } from './components/MeditateWeekParts';
import { useMeditateStart } from './components/useMeditateStart';
import { Copy } from '../../../../components/common/Copy';
import { useCopy } from '../../../../context/CopyContext';

type Props = NativeStackScreenProps<MeditateStackParamList, 'MeditateHome'>;

/**
 * Meditate's home, organized like Workouts' (founder, 2026-11-23). The top card
 * is the last session, ready to repeat, with Do it and Done it on it. Under it:
 * the week at a glance, Progress and Create, then the other kinds of session.
 * Choosing anything different happens on Create.
 */
export const MeditateHomeScreen: React.FC<Props> = ({ navigation }) => {
  const {
    loading,
    loadError,
    reload,
    prefs,
    updatePrefs,
    sessions,
    guided,
    guidedStatus,
    reloadGuided,
    launchHabit,
    bellPermission,
    session,
    discardSession,
    closeApp,
  } = useMeditate();
  const { starting, resume, doIt, doneIt, sheets } = useMeditateStart(navigation);
  const t = useCopy();

  // The guided catalog didn't load: try again each time this screen shows.
  useFocusEffect(
    useCallback(() => {
      if (guidedStatus === 'error') reloadGuided();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  // A timed session's bell rings while this screen is up: re-render then, so
  // the resume card says it's ready to log.
  const [, setTick] = useState(0);
  const runningTimer = session && session.style === 'timer' && !session.endedAt ? session : null;
  useEffect(() => {
    if (!runningTimer) return undefined;
    const left = remainingSec(runningTimer, new Date());
    if (left === 0) return undefined;
    const timer = setTimeout(() => setTick((n) => n + 1), left * 1000 + 500);
    return () => clearTimeout(timer);
  }, [runningTimer]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={closeApp} style={ms.headerIconBtn} accessibilityLabel="Close Meditate">
          <Ionicons name="close" size={24} color={Colors.dark} />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('MeditateSettings')}
          style={ms.headerIconBtn}
          accessibilityLabel="Meditate settings"
        >
          <Ionicons name="settings-outline" size={22} color={Colors.dark} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, closeApp]);

  const planInput = useMemo(
    () => ({
      sessions,
      nsdrLinks: prefs.nsdr_links,
      guided,
      launchPracticeId: launchHabit?.practice_id,
      launchGoalMin: launchHabit?.metric_goals?.duration_min,
    }),
    [sessions, prefs.nsdr_links, guided, launchHabit]
  );
  const focus = useMemo(() => meditateHomeFocus({ ...planInput, draft: session }), [planInput, session]);
  const topPlan = focus.kind === 'session' ? focus.plan : undefined;
  const others = MODE_ORDER.filter((m) => m !== topPlan?.mode).map((m) => planFor(m, planInput));
  const readyToLog = !!session && isReadyToLog(session, new Date());
  const weekSec = totals(sessions, new Date()).weekSec;

  return (
    <View style={ms.screen}>
      <ScrollView
        contentContainerStyle={ms.scroll}
        refreshControl={<RefreshControl refreshing={false} onRefresh={reload} tintColor={MEDITATE_ACCENT} />}
      >
        <LargeTitle title={t('meditate.home.title', 'Meditate')} />

        {!prefs.intro_seen && !loading && (
          <View style={[ms.card, styles.intro]}>
            <Copy id="meditate.home.intro.title" style={ms.title}>How Meditate works</Copy>
            <Copy id="meditate.home.intro.doIt" style={styles.introLine}>
              • Do it repeats your last session. Change picks Sit, Breathe or NSDR, and how long.
            </Copy>
            <Copy id="meditate.home.intro.bell" style={styles.introLine}>
              • Lock your phone and a bell rings at the end — no screen glowing at you while you sit. Already sat? Done it logs it.
            </Copy>
            {guided.length > 0 && (
              <Copy id="meditate.home.intro.guided" style={styles.introLine}>
                • Guided is the exception: the recording plays with the screen on, so leave it lit to the end.
              </Copy>
            )}
            <Copy id="meditate.home.intro.rating" style={styles.introLine}>
              • Do it asks how hard it is to start. Finish asks how hard it was to stay with it. It counts toward your week.
            </Copy>
            <TouchableOpacity onPress={() => updatePrefs({ intro_seen: true }).catch(() => {})} style={styles.introBtn}>
              <Copy id="meditate.home.intro.gotIt" style={ms.link}>Got it</Copy>
            </TouchableOpacity>
          </View>
        )}

        {session && (
          <TouchableOpacity style={styles.resume} onPress={resume} accessibilityRole="button">
            <View style={{ flex: 1, gap: 2 }}>
              <Copy id={readyToLog ? 'meditate.home.readyToLog' : 'meditate.home.inProgress'} style={styles.resumeEyebrow}>
                {readyToLog ? 'Ready to log' : 'In progress'}
              </Copy>
              <Text style={styles.resumeTitle}>
                {describeSession({
                  mode: session.mode,
                  technique: session.technique,
                  pattern: session.pattern,
                  nsdr_title: session.nsdrTitle,
                  style: session.style,
                })}
              </Text>
            </View>
            <View style={styles.resumeActions}>
              <Copy id={readyToLog ? 'meditate.home.logIt' : 'meditate.home.resume'} style={styles.resumeCta}>
                {readyToLog ? 'Log it' : 'Resume'}
              </Copy>
              <TouchableOpacity
                hitSlop={8}
                onPress={() =>
                  showConfirm(
                    t('meditate.home.discard.title', 'Discard this session?'),
                    t('meditate.home.discard.message', 'Nothing from it will be saved.'),
                    discardSession,
                    t('meditate.home.discard.confirm', 'Discard'),
                  )
                }
              >
                <Copy id="meditate.home.discard" style={styles.resumeDiscard}>Discard</Copy>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}

        {loading && !session && <ActivityIndicator color={MEDITATE_ACCENT} style={{ marginTop: Spacing.lg }} />}

        {!!loadError && (
          <TouchableOpacity style={ms.card} onPress={reload}>
            <Copy id="meditate.home.loadFail.title" style={ms.title}>Couldn't load everything</Copy>
            <Copy id="meditate.home.loadFail.body" style={ms.muted}>You can still start a session. Tap to try loading again.</Copy>
          </TouchableOpacity>
        )}

        {!loading && focus.kind === 'session' && (
          <SessionCard
            plan={focus.plan}
            why={focus.why}
            starting={starting}
            noBell={focus.plan.timed && bellPermission === 'denied'}
            onChange={() => navigation.navigate('MeditateCreate', { mode: focus.plan.mode })}
            onDo={() => doIt(focus.plan)}
            onDone={() => doneIt(focus.plan.mode, focus.plan.minutes)}
          />
        )}

        {!loading && <MeditateWeekCard onOpen={() => navigation.navigate('MeditateWeek')} />}

        {!loading && (
          <View style={styles.tiles}>
            <HomeTile
              icon="trending-up"
              title={t('meditate.home.progress.title', 'Progress')}
              subtitle={
                weekSec > 0
                  ? t('meditate.home.progress.week', '{time} this week', { time: formatMinutes(weekSec) })
                  : t('meditate.home.progress.empty', 'Stats and records')
              }
              label="Progress, stats and records"
              onPress={() => navigation.navigate('MeditateHistory')}
            />
            <HomeTile
              icon="add"
              title={t('meditate.home.create.title', 'Create')}
              subtitle={t('meditate.home.create.subtitle', 'Custom session')}
              label="Create, custom session"
              onPress={() => navigation.navigate('MeditateCreate', topPlan ? { mode: topPlan.mode } : undefined)}
            />
          </View>
        )}

        {!loading && (
          <ListGroup title={topPlan ? t('meditate.home.otherSessions', 'Other sessions') : t('meditate.home.sessions', 'Sessions')}>
            {others.map((p) => (
              <ListRow
                key={p.mode}
                title={MODES[p.mode].label}
                subtitle={p.needsLink ? t('meditate.home.saveRecording', 'Save a recording to start') : `${p.title} · ${p.minutes} min`}
                onPress={() => navigation.navigate('MeditateCreate', { mode: p.mode })}
              />
            ))}
          </ListGroup>
        )}
      </ScrollView>
      {sheets}
    </View>
  );
};

/** The one thing to do now: last time's session, with Do it and Done it. */
const SessionCard: React.FC<{
  plan: MeditatePlan;
  why: string;
  starting: boolean;
  noBell: boolean;
  onChange: () => void;
  onDo: () => void;
  onDone: () => void;
}> = ({ plan, why, starting, noBell, onChange, onDo, onDone }) => (
  <View style={[ms.card, styles.sessionCard]}>
    <View style={styles.sessionHead}>
      <Text style={styles.eyebrow}>{why}</Text>
      <TouchableOpacity onPress={onChange} hitSlop={8} accessibilityRole="button" accessibilityLabel="Change this session">
        <Copy id="meditate.home.change" style={ms.link}>Change</Copy>
      </TouchableOpacity>
    </View>
    <Text style={styles.sessionTitle}>{plan.title}</Text>
    <Text style={ms.muted}>{plan.detail}</Text>

    {plan.needsLink ? (
      <TouchableOpacity style={[ms.primaryBtn, styles.action]} onPress={onChange} accessibilityRole="button">
        <Copy id="meditate.home.addRecording" style={ms.primaryBtnText}>Add a recording</Copy>
      </TouchableOpacity>
    ) : (
      <View style={[styles.buttons, styles.action]}>
        <TouchableOpacity
          style={[ms.primaryBtn, styles.doIt, starting && ms.disabled]}
          onPress={onDo}
          disabled={starting}
          accessibilityRole="button"
          accessibilityHint="Start this session now"
        >
          {starting ? <ActivityIndicator color={Colors.white} /> : <Copy id="meditate.home.doIt" style={ms.primaryBtnText}>Do it</Copy>}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.doneIt, starting && ms.disabled]}
          onPress={onDone}
          disabled={starting}
          accessibilityRole="button"
          accessibilityHint="Log a session you've already done"
        >
          <Copy id="meditate.home.doneIt" style={ms.secondaryBtnText}>Done it</Copy>
        </TouchableOpacity>
      </View>
    )}

    {noBell && (
      <View style={styles.warn}>
        <Ionicons name="notifications-off-outline" size={20} color={Colors.danger} />
        <View style={{ flex: 1, gap: 2 }}>
          <Copy id="meditate.home.noBell.title" style={ms.title}>No bell will ring</Copy>
          <Copy id="meditate.home.noBell.body" style={ms.muted}>Notifications are off, so nothing tells you when time’s up.</Copy>
          <TouchableOpacity onPress={() => Linking.openSettings()} style={styles.warnLink}>
            <Copy id="meditate.home.openSettings" style={ms.link}>Open Settings</Copy>
          </TouchableOpacity>
        </View>
      </View>
    )}
  </View>
);

const HomeTile: React.FC<{
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  label: string;
  onPress: () => void;
}> = ({ icon, title, subtitle, label, onPress }) => (
  <TouchableOpacity style={[ms.card, styles.tile]} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
    <Ionicons name={icon} size={22} color={MEDITATE_ACCENT} />
    <Text style={ms.title}>{title}</Text>
    <Text style={ms.muted} numberOfLines={1}>
      {subtitle}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  intro: { gap: 6 },
  introLine: { ...TextStyles.subhead, color: Colors.dark },
  introBtn: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.sm },
  resume: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: MEDITATE_ACCENT,
  },
  resumeEyebrow: { ...TextStyles.footnote, fontWeight: '600', color: Colors.white, opacity: 0.85 },
  resumeTitle: { ...TextStyles.headline, color: Colors.white },
  resumeActions: { alignItems: 'flex-end', gap: Spacing.sm },
  resumeCta: { ...TextStyles.headline, color: Colors.white },
  resumeDiscard: { ...TextStyles.footnote, color: Colors.white, opacity: 0.85 },
  sessionCard: { gap: 4, paddingVertical: 18, paddingHorizontal: 20 },
  sessionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { ...TextStyles.footnote, fontWeight: '600', color: MEDITATE_ACCENT },
  sessionTitle: { ...TextStyles.title2, color: Colors.dark },
  action: { marginTop: Spacing.sm + 4 },
  buttons: { flexDirection: 'row', gap: Spacing.sm },
  doIt: { flex: 2, paddingHorizontal: Spacing.sm },
  doneIt: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warn: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  warnLink: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  tiles: { flexDirection: 'row', gap: Spacing.sm + 4 },
  tile: { flex: 1, gap: 2 },
});
