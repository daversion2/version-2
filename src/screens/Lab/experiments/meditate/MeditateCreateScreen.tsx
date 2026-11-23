import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, TextStyles } from '../../../../constants/theme';
import { ListGroup, ListRow } from '../../../../components/common/ListGroup';
import { SegmentedControl } from '../../../../components/common/SegmentedControl';
import { Stepper } from '../../../../components/common/Stepper';
import { GuidedRecording, MeditateMode, MeditateStackParamList, NsdrLink } from '../../../../types/meditate';
import { BREATH_PATTERNS } from '../../../../data/breathPatterns';
import {
  clampMinutes,
  getSitTechnique,
  GUIDED_BLURB,
  guidedOptions,
  MODE_ORDER,
  MODES,
  SIT_TECHNIQUES,
  StartChoices,
  startDefaults,
  techniqueSteps,
} from '../../../../services/meditateMath';
import { showAlert } from '../../../../utils/alert';
import { useMeditate } from './MeditateContext';
import { NsdrLinkForm } from './components/NsdrLinkForm';
import { MEDITATE_ACCENT, ms } from './components/meditateStyle';
import { useMeditateStart } from './components/useMeditateStart';

type Props = NativeStackScreenProps<MeditateStackParamList, 'MeditateCreate'>;

/**
 * Set up any session: Sit, Breathe or NSDR; the technique, pattern or
 * recording; how long. Everything opens on what was used last time. The home's
 * top card repeats a session; this is where you choose a different one.
 */
export const MeditateCreateScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { loading, loadError, reload, prefs, updatePrefs, sessions, guided, guidedStatus, reloadGuided, launchHabit, bellPermission } =
    useMeditate();
  const { starting, doIt, doneIt, sheets } = useMeditateStart(navigation);
  const openOnMode = route.params?.mode;

  // The guided catalog didn't load: try again each time this screen shows.
  useFocusEffect(
    useCallback(() => {
      if (guidedStatus === 'error') reloadGuided();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const [choices, setChoices] = useState<StartChoices | null>(null);
  const [showSteps, setShowSteps] = useState(false);
  const [addingLink, setAddingLink] = useState(false);
  /** Per mode: play a guided recording instead of timing it yourself. Opens on last time's choice. */
  const [guidedOn, setGuidedOn] = useState<Record<MeditateMode, boolean>>({ sit: false, breathe: false, nsdr: false });
  const [guidedPick, setGuidedPick] = useState<string | undefined>(undefined);
  const seeded = useRef(false);

  // Open on last time's choices, once history has loaded (or failed to).
  useEffect(() => {
    if (loading || seeded.current) return;
    seeded.current = true;
    const lastStyle = (m: MeditateMode) => sessions.find((x) => x.mode === m)?.style;
    setGuidedOn({ sit: lastStyle('sit') === 'guided', breathe: lastStyle('breathe') === 'guided', nsdr: lastStyle('nsdr') === 'guided' });
    setGuidedPick(sessions.find((x) => x.style === 'guided')?.guided_id);
    const defaults = startDefaults({
      sessions,
      nsdrLinks: prefs.nsdr_links,
      launchPracticeId: launchHabit?.practice_id,
      launchGoalMin: launchHabit?.metric_goals?.duration_min,
    });
    setChoices(openOnMode ? { ...defaults, mode: openOnMode } : defaults);
  }, [loading, sessions, prefs.nsdr_links, launchHabit, openOnMode]);

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
  const plannedMinutes = recording ? recording.length_min : minutes;

  const setMinutes = (next: number) => set({ minutes: { ...choices.minutes, [mode]: clampMinutes(mode, next) } });

  const addLink = (link: NsdrLink) => {
    updatePrefs({ nsdr_links: [...prefs.nsdr_links, link] }).catch(() =>
      showAlert("Couldn't save that recording", 'Check your connection and try again.')
    );
    set({ nsdrLinkId: link.id });
    setAddingLink(false);
  };

  const onDoIt = () => {
    if (needsLink) return;
    doIt({
      mode,
      minutes: plannedMinutes,
      technique: choices.technique,
      pattern: choices.pattern,
      breatheStyle: choices.breatheStyle,
      nsdrLink: mode === 'nsdr' && !recording ? nsdrLink : undefined,
      guided: recording,
    });
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
                NSDR follows a recording — a yoga nidra or NSDR track you like. Save one and Do it opens it, with the
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
      </ScrollView>
      {sheets}

      {/* Do it runs the session now; Done it logs one already done, in the same order as the home. */}
      <View style={[ms.footer, styles.footerRow, { paddingBottom: Spacing.md + insets.bottom }]}>
        <TouchableOpacity
          style={[ms.primaryBtn, styles.doItBtn, (starting || needsLink) && ms.disabled]}
          onPress={onDoIt}
          disabled={starting || needsLink}
          accessibilityRole="button"
          accessibilityHint="Start this session now"
        >
          {starting ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={ms.primaryBtnText} numberOfLines={1}>
              {recording ? `Do it · ${recording.length_min} min` : mode === 'nsdr' ? 'Do it · open' : `Do it · ${minutes} min`}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[ms.secondaryBtn, styles.doneItBtn, starting && ms.disabled]}
          onPress={() => doneIt(mode, plannedMinutes)}
          disabled={starting}
          accessibilityRole="button"
          accessibilityHint="Log a session you've already done"
        >
          <Text style={ms.secondaryBtnText}>Done it</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  footerRow: { flexDirection: 'row', gap: Spacing.sm },
  doneItBtn: { flex: 1, paddingHorizontal: Spacing.sm },
  doItBtn: { flex: 2 },
  center: { alignItems: 'center', justifyContent: 'center' },
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
});
