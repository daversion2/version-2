import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius, TextStyles } from '../../../../constants/theme';
import { LargeTitle } from '../../../../components/common/LargeTitle';
import { ListGroup, ListRow } from '../../../../components/common/ListGroup';
import { SegmentedControl } from '../../../../components/common/SegmentedControl';
import { Stepper } from '../../../../components/common/Stepper';
import { GuidedRecording, MeditateMode, MeditateStackParamList, NsdrLink } from '../../../../types/meditate';
import { BREATH_PATTERNS } from '../../../../data/breathPatterns';
import {
  clampMinutes,
  describeSession,
  getSitTechnique,
  GUIDED_BLURB,
  guidedOptions,
  isReadyToLog,
  MODE_ORDER,
  MODES,
  pastSession,
  SIT_TECHNIQUES,
  StartChoices,
  startDefaults,
  techniqueSteps,
} from '../../../../services/meditateMath';
import { showAlert, showChoice, showConfirm } from '../../../../utils/alert';
import { useMeditate } from './MeditateContext';
import { NsdrLinkForm } from './components/NsdrLinkForm';
import { CalmScale } from './components/CalmScale';
import { MEDITATE_ACCENT, ms } from './components/meditateStyle';
import { PastSessionSheet } from '../../../../components/miniapps/PastSessionSheet';
import { newMeditateId, saveMeditateSession } from '../../../../services/labMeditate';
import { remainingSec } from '../../../../services/sessionTimer';
import { withTimeout } from '../../../../utils/withTimeout';

type Props = NativeStackScreenProps<MeditateStackParamList, 'MeditateHome'>;

/**
 * Meditate's start screen: one screen from open to Begin. Sit, Breathe or
 * NSDR; the technique, pattern or recording; how long. Everything opens on
 * what was used last time, so a regular just taps Begin.
 */
export const MeditateHomeScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
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
    begin,
    discardSession,
    closeApp,
    userId,
    recordFinished,
    closeAndCheckOff,
  } = useMeditate();
  // A sit done without the app, or forgotten: credit only comes through the
  // app, so it's entered here — saved to history, then rated on Today.
  const [loggingPast, setLoggingPast] = useState(false);
  const [savingPast, setSavingPast] = useState(false);
  // Same as the Done screen: a spinner while it saves, and give up offline
  // rather than spin forever. The sheet stays open so nothing is lost.
  const logPast = async (input: { date: string; minutes: number; mode?: string }) => {
    if (savingPast) return;
    setSavingPast(true);
    const completed = pastSession({
      id: newMeditateId(userId),
      mode: (input.mode as MeditateMode) ?? 'sit',
      date: input.date,
      minutes: input.minutes,
      now: new Date(),
    });
    try {
      await withTimeout(saveMeditateSession(userId, completed), 15000);
    } catch (e) {
      console.warn('Meditate: past session not saved:', e);
      setSavingPast(false);
      showAlert("Couldn't save that session", 'Check your connection and try again.');
      return;
    }
    setSavingPast(false);
    setLoggingPast(false);
    recordFinished(completed);
    closeAndCheckOff(completed);
  };

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

  const [choices, setChoices] = useState<StartChoices | null>(null);
  const [showSteps, setShowSteps] = useState(false);
  const [addingLink, setAddingLink] = useState(false);
  const [starting, setStarting] = useState(false);
  const [calmBefore, setCalmBefore] = useState<number | undefined>(undefined);
  /** Per mode: play a guided recording instead of timing it yourself. Opens on last time's choice. */
  const [guidedOn, setGuidedOn] = useState<Record<MeditateMode, boolean>>({ sit: false, breathe: false, nsdr: false });
  const [guidedPick, setGuidedPick] = useState<string | undefined>(undefined);
  const seeded = useRef(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={closeApp} style={ms.headerIconBtn} accessibilityLabel="Close Meditate">
          <Ionicons name="close" size={24} color={Colors.dark} />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => navigation.navigate('MeditateHistory')}
            style={ms.headerIconBtn}
            accessibilityLabel="History and records"
          >
            <Ionicons name="stats-chart-outline" size={21} color={Colors.dark} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('MeditateSettings')}
            style={ms.headerIconBtn}
            accessibilityLabel="Meditate settings"
          >
            <Ionicons name="settings-outline" size={22} color={Colors.dark} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, closeApp]);

  // Open on last time's choices, once history has loaded (or failed to).
  useEffect(() => {
    if (loading || seeded.current) return;
    seeded.current = true;
    const lastStyle = (m: MeditateMode) => sessions.find((x) => x.mode === m)?.style;
    setGuidedOn({ sit: lastStyle('sit') === 'guided', breathe: lastStyle('breathe') === 'guided', nsdr: lastStyle('nsdr') === 'guided' });
    setGuidedPick(sessions.find((x) => x.style === 'guided')?.guided_id);
    setChoices(
      startDefaults({
        sessions,
        nsdrLinks: prefs.nsdr_links,
        launchPracticeId: launchHabit?.practice_id,
        launchGoalMin: launchHabit?.metric_goals?.duration_min,
      })
    );
  }, [loading, sessions, prefs.nsdr_links, launchHabit]);

  if (!choices) {
    return (
      <View style={[ms.screen, styles.center]}>
        <ActivityIndicator color={MEDITATE_ACCENT} />
      </View>
    );
  }

  const set = (changes: Partial<StartChoices>) => setChoices((c) => (c ? { ...c, ...changes } : c));
  const { mode } = choices;
  const minutes = choices.minutes[mode];
  const config = MODES[mode];
  const nsdrLink = prefs.nsdr_links.find((l) => l.id === choices.nsdrLinkId) ?? prefs.nsdr_links[0];
  const technique = getSitTechnique(choices.technique);
  // Guided is offered only where an approved recording exists for this mode
  // (and, for Sit, this technique).
  const options = guidedOptions(guided, mode, choices.technique);
  const useGuided = guidedOn[mode] && options.length > 0;
  const recording: GuidedRecording | undefined = useGuided
    ? (options.find((r) => r.id === guidedPick) ?? options[0])
    : undefined;
  const timed = !useGuided && (mode !== 'breathe' || choices.breatheStyle === 'timer');
  const needsLink = mode === 'nsdr' && !useGuided && !nsdrLink;
  const readyToLog = !!session && isReadyToLog(session, new Date());

  const setMinutes = (next: number) => set({ minutes: { ...choices.minutes, [mode]: clampMinutes(mode, next) } });

  const addLink = (link: NsdrLink) => {
    updatePrefs({ nsdr_links: [...prefs.nsdr_links, link] }).catch(() =>
      showAlert("Couldn't save that recording", 'Check your connection and try again.')
    );
    set({ nsdrLinkId: link.id });
    setAddingLink(false);
  };

  const resume = () =>
    navigation.navigate(
      session?.endedAt ? 'MeditateDone' : session?.style === 'guided' ? 'MeditateGuided' : 'MeditateSession',
    );

  const start = async () => {
    if (needsLink) return;
    setStarting(true);
    try {
      await begin({
        mode,
        minutes: recording ? recording.length_min : minutes,
        technique: choices.technique,
        pattern: choices.pattern,
        breatheStyle: choices.breatheStyle,
        nsdrLink: mode === 'nsdr' && !recording ? nsdrLink : undefined,
        guided: recording,
        calmBefore,
      });
      setCalmBefore(undefined);
      if (recording) {
        navigation.navigate('MeditateGuided');
        return;
      }
      navigation.navigate('MeditateSession');
      if (mode === 'nsdr' && nsdrLink) {
        Linking.openURL(nsdrLink.url).catch(() =>
          showAlert("Couldn't open that recording", 'The timer is running — open it yourself, or fix the link in settings.')
        );
      }
    } catch (e) {
      console.warn('Meditate: could not start:', e);
      showAlert("Couldn't start", 'Something went wrong. Try again.');
    } finally {
      setStarting(false);
    }
  };

  /** Starting while a session is saved asks first — never silently throws it away. */
  const onBegin = () => {
    if (!session) return start();
    showChoice('A session is still open', 'Pick it back up, or throw it away and start this one?', [
      { label: 'Resume it', onPress: resume },
      {
        label: 'Discard and start',
        onPress: async () => {
          await discardSession();
          start();
        },
      },
    ]);
  };

  // A row in a choice list: tap to pick, a check mark on the chosen one.
  const choiceRow = (key: string, title: string, subtitle: string | undefined, on: boolean, onPress: () => void) => (
    <ListRow
      key={key}
      title={title}
      subtitle={subtitle}
      onPress={onPress}
      chevron={false}
      right={on ? <Ionicons name="checkmark" size={20} color={MEDITATE_ACCENT} /> : undefined}
      accessibilityLabel={`${title}${subtitle ? `, ${subtitle}` : ''}${on ? ', selected' : ''}`}
    />
  );

  return (
    <View style={ms.screen}>
      <ScrollView contentContainerStyle={[ms.scroll, { paddingBottom: 120 + insets.bottom }]}>
        <LargeTitle title="New session" />

        {!prefs.intro_seen && !loading && (
          <View style={[ms.card, styles.intro]}>
            <Text style={ms.title}>How Meditate works</Text>
            <Text style={styles.introLine}>• Pick Sit, Breathe or NSDR, and how long.</Text>
            <Text style={styles.introLine}>
              • Tap Begin and lock your phone. A bell rings at the end — no screen glowing at you while you sit.
            </Text>
            {guided.length > 0 && (
              <Text style={styles.introLine}>
                • Guided is the exception: the recording plays with the screen on, so leave it lit to the end.
              </Text>
            )}
            <Text style={styles.introLine}>
              • Finish, and it hands back to Today to rate your override: how hard was it to start? It counts toward
              your week.
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

        {!!loadError && (
          <TouchableOpacity style={ms.card} onPress={reload}>
            <Text style={ms.title}>Couldn't load everything</Text>
            <Text style={ms.muted}>You can still start a session. Tap to try loading again.</Text>
          </TouchableOpacity>
        )}

        {/* Mode */}
        <SegmentedControl
          options={MODE_ORDER.map((m) => ({ value: m, label: MODES[m].label }))}
          value={mode}
          onChange={(m) => {
            set({ mode: m });
            setShowSteps(false);
          }}
          accessibilityLabel="Kind of session"
        />
        <Text style={[ms.lead, styles.blurb]}>{useGuided ? GUIDED_BLURB : config.blurb}</Text>

        {/* What you'll do */}
        {mode === 'sit' && (
          <>
            <ListGroup title="Technique">
              {SIT_TECHNIQUES.map((t) =>
                choiceRow(t.key, t.label, t.cue, t.key === choices.technique, () => set({ technique: t.key }))
              )}
            </ListGroup>
            {techniqueSteps(technique.key).length > 0 && (
              <>
                <TouchableOpacity onPress={() => setShowSteps((s) => !s)} style={styles.stepsToggle}>
                  <Text style={ms.link}>
                    {showSteps ? 'Hide the steps' : `See the steps for ${technique.label.toLowerCase()}`}
                  </Text>
                  <Ionicons name={showSteps ? 'chevron-up' : 'chevron-down'} size={14} color={MEDITATE_ACCENT} />
                </TouchableOpacity>
                {showSteps && (
                  <View style={[ms.card, styles.steps]}>
                    {techniqueSteps(technique.key).map((step, i) => (
                      <Text key={i} style={styles.stepText}>
                        {i + 1}. {step}
                      </Text>
                    ))}
                  </View>
                )}
              </>
            )}
          </>
        )}

        {mode === 'breathe' && (
          <>
            <ListGroup title="Pattern">
              {BREATH_PATTERNS.map((p) =>
                choiceRow(p.key, p.label, p.blurb, p.key === choices.pattern, () => set({ pattern: p.key }))
              )}
            </ListGroup>
            {!useGuided && (
              <ListGroup title="How">
                {choiceRow('pacer', 'Follow the pacer', 'A circle on screen sets the rhythm', choices.breatheStyle === 'pacer', () =>
                  set({ breatheStyle: 'pacer' })
                )}
                {choiceRow('timer', 'Just time it', 'Lock your phone, bell at the end', choices.breatheStyle === 'timer', () =>
                  set({ breatheStyle: 'timer' })
                )}
              </ListGroup>
            )}
          </>
        )}

        {mode === 'nsdr' && !useGuided && (
          <>
            {prefs.nsdr_links.length > 0 && (
              <ListGroup title="Recording">
                {prefs.nsdr_links.map((l) =>
                  choiceRow(l.id, l.title, l.url, l.id === nsdrLink?.id, () => set({ nsdrLinkId: l.id }))
                )}
              </ListGroup>
            )}
            {prefs.nsdr_links.length === 0 && !addingLink && (
              <Text style={ms.lead}>
                NSDR follows a recording — a yoga nidra or NSDR track you like. Save one and Begin opens it, with the
                bell set for the end.
              </Text>
            )}
            {addingLink || prefs.nsdr_links.length === 0 ? (
              <NsdrLinkForm
                onAdd={addLink}
                onCancel={prefs.nsdr_links.length ? () => setAddingLink(false) : undefined}
              />
            ) : (
              <TouchableOpacity onPress={() => setAddingLink(true)} style={styles.addLink}>
                <Ionicons name="add" size={18} color={MEDITATE_ACCENT} />
                <Text style={ms.link}>Add a recording</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Timer or guided — only where a recording exists */}
        {options.length > 0 && (
          <SegmentedControl
            options={[
              { value: 'own', label: 'On my own' },
              { value: 'guided', label: 'Guided' },
            ]}
            value={useGuided ? 'guided' : 'own'}
            onChange={(v) => setGuidedOn((g) => ({ ...g, [mode]: v === 'guided' }))}
            accessibilityLabel="Guidance"
          />
        )}

        {/* How long */}
        {recording ? (
          <ListGroup title="Recording">
            {options.map((r) =>
              choiceRow(r.id, `${r.length_min} min`, `Read by ${r.voice}`, r.id === recording.id, () => setGuidedPick(r.id))
            )}
          </ListGroup>
        ) : (
          <View style={[ms.card, styles.length]}>
            <Text style={ms.body}>How long</Text>
            <Stepper
              value={minutes}
              onChange={setMinutes}
              min={config.minMin}
              max={config.maxMin}
              step={config.stepMin}
              format={(n) => `${n} min`}
              accessibilityLabel="Session length"
            />
          </View>
        )}

        {timed && bellPermission === 'denied' && (
          <View style={[ms.card, styles.warn]}>
            <Ionicons name="notifications-off-outline" size={20} color={Colors.danger} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={ms.title}>No bell will ring</Text>
              <Text style={ms.muted}>
                Notifications are off for Neuro-Nudge, so nothing tells you when time’s up. Turn them on, or check
                back yourself.
              </Text>
              <TouchableOpacity onPress={() => Linking.openSettings()} style={styles.warnLink}>
                <Text style={ms.link}>Open Settings</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={ms.card}>
          <CalmScale question="How calm do you feel?" value={calmBefore} onChange={setCalmBefore} />
        </View>

        <TouchableOpacity style={styles.pastLink} onPress={() => setLoggingPast(true)} accessibilityRole="button">
          <Text style={ms.link}>Log a past session</Text>
        </TouchableOpacity>
      </ScrollView>
      <PastSessionSheet
        visible={loggingPast}
        accent={MEDITATE_ACCENT}
        title="Log a past session"
        minutes={{ min: MODES.sit.minMin, max: MODES.sit.maxMin, step: MODES.sit.stepMin, initial: MODES.sit.defaultMin }}
        modes={MODE_ORDER.map((m) => ({
          value: m,
          label: MODES[m].label,
          minutes: { min: MODES[m].minMin, max: MODES[m].maxMin, step: MODES[m].stepMin, initial: MODES[m].defaultMin },
        }))}
        saving={savingPast}
        onCancel={() => !savingPast && setLoggingPast(false)}
        onSave={logPast}
      />

      <View style={[ms.footer, { paddingBottom: Spacing.md + insets.bottom }]}>
        <TouchableOpacity
          style={[ms.primaryBtn, (starting || needsLink) && ms.disabled]}
          onPress={onBegin}
          disabled={starting || needsLink}
          accessibilityRole="button"
        >
          {starting ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={ms.primaryBtnText}>
              {recording
                ? `Begin · ${recording.length_min} min guided`
                : mode === 'nsdr'
                  ? 'Begin · open recording'
                  : `Begin · ${minutes} min`}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
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
  blurb: { marginTop: -(Spacing.md - 4) },
  stepsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingHorizontal: 4,
    marginVertical: -Spacing.sm,
  },
  steps: { gap: Spacing.sm },
  stepText: { ...TextStyles.subhead, color: Colors.dark },
  addLink: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: 4 },
  length: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingRight: Spacing.sm,
  },
  warn: { flexDirection: 'row', gap: Spacing.md },
  warnLink: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  pastLink: { alignSelf: 'center', minHeight: 44, justifyContent: 'center' },
});
