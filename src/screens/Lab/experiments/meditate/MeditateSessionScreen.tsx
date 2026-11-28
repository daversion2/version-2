import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, AppState, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { BorderRadius, Colors, MeditateNight, Spacing, TextStyles } from '../../../../constants/theme';
import { MeditateStackParamList } from '../../../../types/meditate';
import { getBreathPattern } from '../../../../data/breathPatterns';
import {
  addPacedSeconds,
  breatheCue,
  getSitTechnique,
  isTooShortToLog,
  loggedIfEndedNow,
  MODES,
} from '../../../../services/meditateMath';
import { elapsedSec, formatMinutes, isDue } from '../../../../services/sessionTimer';
import { showAlert, showConfirm } from '../../../../utils/alert';
import { useMeditate } from './MeditateContext';
import { BreathPacer } from './components/BreathPacer';
import { MEDITATE_ACCENT, ms } from './components/meditateStyle';
import { Copy } from '../../../../components/common/Copy';
import { useCopy } from '../../../../context/CopyContext';

type Props = NativeStackScreenProps<MeditateStackParamList, 'MeditateSession'>;

/** A session this young is the one just begun — anything older is being returned to. */
const FRESH_SEC = 10;

const STILL: Record<string, string> = { sit: 'Still sitting.', breathe: 'Still breathing.', nsdr: 'Still resting.' };

const haptic = (fn: () => void) => {
  try {
    fn();
  } catch {
    /* no-op */
  }
};

/**
 * The session itself. Timed (Sit, NSDR, Breathe "just time it"): nothing to
 * watch — lock the phone and the bell rings. Come back early and there's no
 * clock, on purpose: checking the time is the urge the sit is training you
 * to notice. Paced (Breathe "follow the pacer"): the circle, screen on.
 */
export const MeditateSessionScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const t = useCopy();
  const { session, end, updateSession, prefs, discardSession } = useMeditate();
  const [fresh] = useState(() => !!session && elapsedSec(session, new Date()) < FRESH_SEC);
  const [view, setView] = useState<'settle' | 'peek'>(fresh ? 'settle' : 'peek');
  const appState = useRef(AppState.currentState);

  // Over: on to logging it. Gone (discarded): back to the start.
  useEffect(() => {
    if (!session) navigation.popToTop();
    else if (session.endedAt) navigation.replace('MeditateDone');
  }, [session, navigation]);

  // Timed: the clock is checked, never ticked — each second while on screen
  // (the bell may arrive while you're looking), and on every return.
  const timedId = session && session.style === 'timer' && !session.endedAt ? session.id : null;
  useEffect(() => {
    if (!timedId || !session) return;
    const check = () => {
      if (isDue(session, new Date())) {
        haptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
        end(false);
        return true;
      }
      return false;
    };
    if (check()) return;
    const tick = setInterval(check, 1000);
    const sub = AppState.addEventListener('change', (next) => {
      const returning = /inactive|background/.test(appState.current) && next === 'active';
      appState.current = next;
      if (returning && !check()) setView('peek');
    });
    return () => {
      clearInterval(tick);
      sub.remove();
    };
    // Re-arm only for a different session; its clock fields never change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timedId]);

  if (!session || session.endedAt) return <View style={ms.screen} />;

  // Under a minute can't be logged (meditateMath MIN_LOGGED_SEC), so ending
  // then only throws it away — and says so before it does.
  const endEarly = () =>
    isTooShortToLog(loggedIfEndedNow(session, new Date()))
      ? showConfirm(
          t('meditate.session.tooShort.title', 'Too short to count'),
          t('meditate.session.tooShort.message', 'Under a minute isn’t logged, so ending now discards this session.'),
          discardSession,
          t('meditate.session.tooShort.confirm', 'Discard'),
          t('meditate.session.tooShort.cancel', 'Keep going'),
        )
      : showConfirm(
          t('meditate.session.endNow.title', 'End now?'),
          t('meditate.session.endNow.message', 'It’s logged as the time you actually did — that still counts.'),
          () => end(true),
          t('meditate.session.endNow.confirm', 'End'),
        );

  const link = prefs.nsdr_links.find((l) => l.id === session.nsdrLinkId);
  const openRecording = () =>
    link &&
    Linking.openURL(link.url).catch(() => showAlert(t('meditate.session.openFail.title', "Couldn't open that recording"), t('meditate.session.openFail.message', 'Check the link in Meditate settings.')));

  // --- Paced breathing --------------------------------------------------------
  if (session.style === 'pacer') {
    return (
      <View style={[styles.screen, styles.night, { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.sm }]}>
        <StatusBar style="light" />
        <View style={styles.pacer}>
          <BreathPacer
            pattern={session.pattern ?? 'box'}
            plannedSec={session.plannedSec}
            pacedSec={session.pacedSec ?? 0}
            onPhaseDone={(sec) => updateSession(addPacedSeconds(session, sec))}
            onComplete={() => end(false)}
          />
        </View>
        <TouchableOpacity onPress={endEarly} style={ms.textBtn} accessibilityRole="button">
          <Copy id="meditate.session.end" style={[ms.textBtnText, styles.nightText]}>End</Copy>
        </TouchableOpacity>
      </View>
    );
  }

  // --- Timed: came back before the bell --------------------------------------
  if (view === 'peek') {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.md }]}>
        <View style={styles.middle}>
          <Ionicons name="eye-off-outline" size={36} color={MEDITATE_ACCENT} />
          <Copy id={`meditate.session.still.${session.mode}`} style={styles.title}>{STILL[session.mode]}</Copy>
          <Copy id="meditate.session.peek" style={styles.lead}>Checking the time is the urge. Notice it — then lock your phone and return.</Copy>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={ms.primaryBtn} onPress={() => setView('settle')} accessibilityRole="button">
            <Copy id="meditate.session.keepGoing" style={ms.primaryBtnText}>Keep going</Copy>
          </TouchableOpacity>
          <TouchableOpacity style={ms.secondaryBtn} onPress={endEarly} accessibilityRole="button">
            <Copy id="meditate.session.endEarly" style={ms.secondaryBtnText}>End early</Copy>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- Timed: settle in -------------------------------------------------------
  const anchor =
    session.mode === 'sit'
      ? getSitTechnique(session.technique).cue
      : session.mode === 'breathe'
        ? `${getBreathPattern(session.pattern).label}: ${getBreathPattern(session.pattern).blurb}. ${breatheCue(session.pattern)}`
        : t('meditate.session.nsdrAnchor', 'Lie still and follow the recording. Deeply relaxed — not asleep.');

  return (
    <View style={[styles.screen, { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.md }]}>
      <View style={styles.middle}>
        <Ionicons name={MODES[session.mode].icon as any} size={40} color={MEDITATE_ACCENT} />
        <Copy id={fresh ? 'meditate.session.lockPhone' : 'meditate.session.backToIt'} style={styles.title}>
          {fresh ? 'Lock your phone' : 'Back to it'}
        </Copy>
        <Text style={styles.lead}>
          {!fresh
            ? t('meditate.session.lead.back', 'Lock your phone and return to it. The bell will tell you when.')
            : session.bellId
              ? t('meditate.session.lead.bell', 'The bell rings in {time}. Until then, nothing here needs you.', { time: formatMinutes(session.plannedSec) })
              : t('meditate.session.lead.noBell', 'No bell is set — notifications are off. Come back when {time} feels done.', { time: formatMinutes(session.plannedSec) })}
        </Text>
        <View style={styles.anchor}>
          <Text style={styles.anchorText}>{anchor}</Text>
        </View>
        {session.mode === 'nsdr' && link && (
          <TouchableOpacity style={[ms.secondaryBtn, styles.reopen]} onPress={openRecording} accessibilityRole="button">
            <Copy id="meditate.session.openAgain" style={ms.secondaryBtnText} vars={{ title: link.title }}>
              {'Open “{title}” again'}
            </Copy>
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity onPress={endEarly} style={ms.textBtn} accessibilityRole="button">
        <Copy id="meditate.session.endEarlyText" style={ms.textBtnText}>End early</Copy>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray, paddingHorizontal: Spacing.lg },
  night: { backgroundColor: MeditateNight.bg },
  nightText: { color: MeditateNight.text2 },
  pacer: { flex: 1 },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  title: { ...TextStyles.title1, color: Colors.dark, textAlign: 'center' },
  lead: { ...TextStyles.body, color: Colors.gray, textAlign: 'center', maxWidth: 320 },
  anchor: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.cardBg,
    maxWidth: 340,
  },
  anchorText: { ...TextStyles.body, color: Colors.dark, textAlign: 'center' },
  reopen: { marginTop: Spacing.sm },
  actions: { gap: Spacing.sm },
});
