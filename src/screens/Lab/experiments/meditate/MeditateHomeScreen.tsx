import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../../constants/theme';
import { MeditateMode, MeditateStackParamList, NsdrLink } from '../../../../types/meditate';
import { BREATH_PATTERNS, getBreathPattern } from '../../../../data/breathPatterns';
import {
  clampMinutes,
  describeSession,
  getSitTechnique,
  MODE_ORDER,
  MODES,
  SIT_TECHNIQUES,
  StartChoices,
  startDefaults,
  techniqueSteps,
} from '../../../../services/meditateMath';
import { showAlert, showChoice, showConfirm } from '../../../../utils/alert';
import { useMeditate } from './MeditateContext';
import { NsdrLinkForm } from './components/NsdrLinkForm';
import { MEDITATE_ACCENT, MEDITATE_TINT, ms } from './components/meditateStyle';

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
    launchHabit,
    bellPermission,
    session,
    begin,
    discardSession,
    closeApp,
  } = useMeditate();

  const [choices, setChoices] = useState<StartChoices | null>(null);
  const [showSteps, setShowSteps] = useState(false);
  const [addingLink, setAddingLink] = useState(false);
  const [starting, setStarting] = useState(false);
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
  const timed = mode !== 'breathe' || choices.breatheStyle === 'timer';
  const technique = getSitTechnique(choices.technique);

  const setMinutes = (next: number) => set({ minutes: { ...choices.minutes, [mode]: clampMinutes(mode, next) } });

  const addLink = (link: NsdrLink) => {
    updatePrefs({ nsdr_links: [...prefs.nsdr_links, link] }).catch(() =>
      showAlert("Couldn't save that recording", 'Check your connection and try again.')
    );
    set({ nsdrLinkId: link.id });
    setAddingLink(false);
  };

  const resume = () => navigation.navigate(session?.endedAt ? 'MeditateDone' : 'MeditateSession');

  const start = async () => {
    if (mode === 'nsdr' && !nsdrLink) return;
    setStarting(true);
    try {
      await begin({
        mode,
        minutes,
        technique: choices.technique,
        pattern: choices.pattern,
        breatheStyle: choices.breatheStyle,
        nsdrLink: mode === 'nsdr' ? nsdrLink : undefined,
      });
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

  return (
    <View style={ms.screen}>
      <ScrollView contentContainerStyle={[ms.scroll, { paddingBottom: 140 + insets.bottom }]}>
        {!prefs.intro_seen && !loading && (
          <View style={[ms.card, styles.intro]}>
            <Text style={ms.title}>How Meditate works</Text>
            <Text style={ms.body}>• Pick Sit, Breathe or NSDR, and how long.</Text>
            <Text style={ms.body}>
              • Tap Begin and lock your phone. A bell rings at the end — no screen glowing at you while you sit.
            </Text>
            <Text style={ms.body}>
              • Finish, and it hands back to Today: “How hard was it to start?”, then the habit’s checked off.
            </Text>
            <TouchableOpacity onPress={() => updatePrefs({ intro_seen: true }).catch(() => {})} style={styles.introBtn}>
              <Text style={styles.introBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        )}

        {!!launchHabit && <Text style={ms.muted}>Finishing checks off “{launchHabit.name}”.</Text>}

        {session && (
          <TouchableOpacity style={styles.resume} onPress={resume} accessibilityRole="button">
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.resumeEyebrow}>{session.endedAt ? 'Ready to log' : 'In progress'}</Text>
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
              <Text style={styles.resumeCta}>{session.endedAt ? 'Log it' : 'Resume'}</Text>
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
            <Text style={ms.title}>Couldn't load your history</Text>
            <Text style={ms.muted}>You can still start a session. Tap to try loading again.</Text>
          </TouchableOpacity>
        )}

        {/* Mode */}
        <View style={styles.modes} accessibilityRole="tablist">
          {MODE_ORDER.map((m) => {
            const on = m === mode;
            return (
              <TouchableOpacity
                key={m}
                style={[styles.mode, on && styles.modeOn]}
                onPress={() => {
                  set({ mode: m });
                  setShowSteps(false);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
              >
                <Ionicons name={MODES[m].icon as any} size={20} color={on ? Colors.white : MEDITATE_ACCENT} />
                <Text style={[styles.modeText, on && styles.modeTextOn]}>{MODES[m].label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={ms.muted}>{config.blurb}</Text>

        {/* What you'll do */}
        {mode === 'sit' && (
          <>
            <Text style={ms.sectionLabel}>Technique</Text>
            <View style={ms.chipRow}>
              {SIT_TECHNIQUES.map((t) => {
                const on = t.key === choices.technique;
                return (
                  <TouchableOpacity
                    key={t.key}
                    style={[ms.chip, on && ms.chipActive]}
                    onPress={() => set({ technique: t.key })}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                  >
                    <Text style={[ms.chipText, on && ms.chipTextActive]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={[ms.card, styles.cueCard]}>
              <Text style={styles.cue}>{technique.cue}</Text>
              <TouchableOpacity onPress={() => setShowSteps((s) => !s)} style={styles.stepsToggle}>
                <Text style={styles.stepsToggleText}>{showSteps ? 'Hide the steps' : 'See the steps'}</Text>
                <Ionicons name={showSteps ? 'chevron-up' : 'chevron-down'} size={14} color={MEDITATE_ACCENT} />
              </TouchableOpacity>
              {showSteps &&
                techniqueSteps(technique.key).map((step, i) => (
                  <Text key={i} style={ms.body}>
                    {i + 1}. {step}
                  </Text>
                ))}
            </View>
          </>
        )}

        {mode === 'breathe' && (
          <>
            <Text style={ms.sectionLabel}>Pattern</Text>
            <View style={ms.chipRow}>
              {BREATH_PATTERNS.map((p) => {
                const on = p.key === choices.pattern;
                return (
                  <TouchableOpacity
                    key={p.key}
                    style={[ms.chip, on && ms.chipActive]}
                    onPress={() => set({ pattern: p.key })}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                  >
                    <Text style={[ms.chipText, on && ms.chipTextActive]}>{p.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={ms.muted}>{getBreathPattern(choices.pattern).blurb}</Text>

            <Text style={ms.sectionLabel}>How</Text>
            <View style={styles.styleRow}>
              {(
                [
                  { key: 'pacer', title: 'Follow the pacer', detail: 'A circle on screen sets the rhythm' },
                  { key: 'timer', title: 'Just time it', detail: 'Lock your phone, bell at the end' },
                ] as const
              ).map((o) => {
                const on = choices.breatheStyle === o.key;
                return (
                  <TouchableOpacity
                    key={o.key}
                    style={[ms.card, styles.styleCard, on && styles.styleCardOn]}
                    onPress={() => set({ breatheStyle: o.key })}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                  >
                    <Text style={[ms.title, { fontSize: FontSizes.sm }]}>{o.title}</Text>
                    <Text style={ms.muted}>{o.detail}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {mode === 'nsdr' && (
          <>
            <Text style={ms.sectionLabel}>Recording</Text>
            {prefs.nsdr_links.length === 0 && !addingLink && (
              <Text style={ms.muted}>
                NSDR follows a recording — a yoga nidra or NSDR track you like. Save one and Begin opens it, with the
                bell set for the end.
              </Text>
            )}
            {prefs.nsdr_links.map((l) => {
              const on = l.id === nsdrLink?.id;
              return (
                <TouchableOpacity
                  key={l.id}
                  style={[ms.card, styles.linkRow, on && styles.styleCardOn]}
                  onPress={() => set({ nsdrLinkId: l.id })}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                >
                  <Ionicons
                    name={on ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={on ? MEDITATE_ACCENT : Colors.gray}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={ms.title}>{l.title}</Text>
                    <Text style={ms.muted} numberOfLines={1}>
                      {l.url}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            {addingLink || prefs.nsdr_links.length === 0 ? (
              <NsdrLinkForm
                onAdd={addLink}
                onCancel={prefs.nsdr_links.length ? () => setAddingLink(false) : undefined}
              />
            ) : (
              <TouchableOpacity onPress={() => setAddingLink(true)} style={styles.addLink}>
                <Ionicons name="add" size={16} color={MEDITATE_ACCENT} />
                <Text style={styles.addLinkText}>Add a recording</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* How long */}
        <Text style={ms.sectionLabel}>How long</Text>
        <View style={[ms.card, styles.stepper]}>
          <TouchableOpacity
            onPress={() => setMinutes(minutes - config.stepMin)}
            disabled={minutes <= config.minMin}
            style={[styles.stepBtn, minutes <= config.minMin && ms.disabled]}
            accessibilityLabel="Less time"
          >
            <Ionicons name="remove" size={22} color={MEDITATE_ACCENT} />
          </TouchableOpacity>
          <View style={styles.stepValue}>
            <Text style={styles.stepNum}>{minutes}</Text>
            <Text style={ms.muted}>min</Text>
          </View>
          <TouchableOpacity
            onPress={() => setMinutes(minutes + config.stepMin)}
            disabled={minutes >= config.maxMin}
            style={[styles.stepBtn, minutes >= config.maxMin && ms.disabled]}
            accessibilityLabel="More time"
          >
            <Ionicons name="add" size={22} color={MEDITATE_ACCENT} />
          </TouchableOpacity>
        </View>

        {timed && bellPermission === 'denied' && (
          <View style={[ms.card, styles.warn]}>
            <Ionicons name="notifications-off-outline" size={18} color={Colors.danger} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={ms.title}>No bell will ring</Text>
              <Text style={ms.muted}>
                Notifications are off for Neuro-Nudge, so nothing tells you when time’s up. Turn them on, or check
                back yourself.
              </Text>
              <TouchableOpacity onPress={() => Linking.openSettings()}>
                <Text style={styles.warnLink}>Open Settings</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Spacing.md + insets.bottom }]}>
        <TouchableOpacity
          style={[ms.primaryBtn, (starting || (mode === 'nsdr' && !nsdrLink)) && ms.disabled]}
          onPress={onBegin}
          disabled={starting || (mode === 'nsdr' && !nsdrLink)}
          accessibilityRole="button"
        >
          {starting ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={ms.primaryBtnText}>
              {mode === 'nsdr' ? 'Begin · open recording' : `Begin · ${minutes} min`}
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
  intro: { gap: 6, borderColor: MEDITATE_ACCENT + '55' },
  introBtn: { alignSelf: 'flex-end', paddingVertical: 4, paddingHorizontal: Spacing.sm },
  introBtnText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: MEDITATE_ACCENT },
  resume: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: 14,
    backgroundColor: MEDITATE_ACCENT,
  },
  resumeEyebrow: {
    fontFamily: Fonts.secondaryBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Colors.white,
    opacity: 0.8,
  },
  resumeTitle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg, color: Colors.white },
  resumeActions: { alignItems: 'flex-end', gap: Spacing.sm },
  resumeCta: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.white },
  resumeDiscard: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.white, opacity: 0.8 },
  modes: { flexDirection: 'row', gap: Spacing.sm },
  mode: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  modeOn: { backgroundColor: MEDITATE_ACCENT, borderColor: MEDITATE_ACCENT },
  modeText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.sm, color: Colors.dark },
  modeTextOn: { color: Colors.white },
  cueCard: { gap: Spacing.sm, backgroundColor: MEDITATE_TINT, borderColor: MEDITATE_ACCENT + '33' },
  cue: { fontFamily: Fonts.primary, fontSize: FontSizes.md, color: Colors.dark, lineHeight: 23 },
  stepsToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  stepsToggleText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: MEDITATE_ACCENT },
  styleRow: { flexDirection: 'row', gap: Spacing.sm },
  styleCard: { flex: 1, gap: 2 },
  styleCardOn: { borderColor: MEDITATE_ACCENT, borderWidth: 1.5, backgroundColor: MEDITATE_TINT },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  addLink: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 4 },
  addLinkText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: MEDITATE_ACCENT },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: MEDITATE_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: { alignItems: 'center' },
  stepNum: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.hero, color: Colors.dark },
  warn: { flexDirection: 'row', gap: Spacing.md, borderColor: Colors.danger + '55' },
  warnLink: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: MEDITATE_ACCENT },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Colors.lightGray,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
