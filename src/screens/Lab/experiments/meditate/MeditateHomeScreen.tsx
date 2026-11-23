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
    const timer = setTimeout(() => setTick((t) => t + 1), left * 1000 + 500);
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
        <LargeTitle title="Meditate" />

        {!prefs.intro_seen && !loading && (
          <View style={[ms.card, styles.intro]}>
            <Text style={ms.title}>How Meditate works</Text>
            <Text style={styles.introLine}>• Do it repeats your last session. Change picks Sit, Breathe or NSDR, and how long.</Text>
            <Text style={styles.introLine}>
              • Lock your phone and a bell rings at the end — no screen glowing at you while you sit. Already sat? Done it logs it.
            </Text>
            {guided.length > 0 && (
              <Text style={styles.introLine}>
                • Guided is the exception: the recording plays with the screen on, so leave it lit to the end.
              </Text>
            )}
            <Text style={styles.introLine}>
              • Do it asks how hard it is to start. Finish asks how hard it was to stay with it. It counts toward your
              week.
            </Text>
            <TouchableOpacity onPress={() => updatePrefs({ intro_seen: true }).catch(() => {})} style={styles.introBtn}>
              <Text style={ms.link}>Got it</Text>
            </TouchableOpacity>
          </View>
        )}

        {session && (
          <TouchableOpacity style={styles.resume} onPress={resume} accessibilityRole="button">
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.resumeEyebrow}>{readyToLog ? 'Ready to log' : 'In progress'}</Text>
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
              <Text style={styles.resumeCta}>{readyToLog ? 'Log it' : 'Resume'}</Text>
              <TouchableOpacity
                hitSlop={8}
                onPress={() => showConfirm('Discard this session?', 'Nothing from it will be saved.', discardSession, 'Discard')}
              >
                <Text style={styles.resumeDiscard}>Discard</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}

        {loading && !session && <ActivityIndicator color={MEDITATE_ACCENT} style={{ marginTop: Spacing.lg }} />}

        {!!loadError && (
          <TouchableOpacity style={ms.card} onPress={reload}>
            <Text style={ms.title}>Couldn't load everything</Text>
            <Text style={ms.muted}>You can still start a session. Tap to try loading again.</Text>
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
              title="Progress"
              subtitle={weekSec > 0 ? `${formatMinutes(weekSec)} this week` : 'Stats and records'}
              label="Progress, stats and records"
              onPress={() => navigation.navigate('MeditateHistory')}
            />
            <HomeTile
              icon="add"
              title="Create"
              subtitle="Custom session"
              label="Create, custom session"
              onPress={() => navigation.navigate('MeditateCreate', topPlan ? { mode: topPlan.mode } : undefined)}
            />
          </View>
        )}

        {!loading && (
          <ListGroup title={topPlan ? 'Other sessions' : 'Sessions'}>
            {others.map((p) => (
              <ListRow
                key={p.mode}
                title={MODES[p.mode].label}
                subtitle={p.needsLink ? 'Save a recording to start' : `${p.title} · ${p.minutes} min`}
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
        <Text style={ms.link}>Change</Text>
      </TouchableOpacity>
    </View>
    <Text style={styles.sessionTitle}>{plan.title}</Text>
    <Text style={ms.muted}>{plan.detail}</Text>

    {plan.needsLink ? (
      <TouchableOpacity style={[ms.primaryBtn, styles.action]} onPress={onChange} accessibilityRole="button">
        <Text style={ms.primaryBtnText}>Add a recording</Text>
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
          {starting ? <ActivityIndicator color={Colors.white} /> : <Text style={ms.primaryBtnText}>Do it</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.doneIt, starting && ms.disabled]}
          onPress={onDone}
          disabled={starting}
          accessibilityRole="button"
          accessibilityHint="Log a session you've already done"
        >
          <Text style={ms.secondaryBtnText}>Done it</Text>
        </TouchableOpacity>
      </View>
    )}

    {noBell && (
      <View style={styles.warn}>
        <Ionicons name="notifications-off-outline" size={20} color={Colors.danger} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={ms.title}>No bell will ring</Text>
          <Text style={ms.muted}>Notifications are off, so nothing tells you when time’s up.</Text>
          <TouchableOpacity onPress={() => Linking.openSettings()} style={styles.warnLink}>
            <Text style={ms.link}>Open Settings</Text>
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
