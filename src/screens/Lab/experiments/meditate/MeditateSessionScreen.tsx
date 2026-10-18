import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, AppState, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing } from '../../../../constants/theme';
import { MeditateStackParamList } from '../../../../types/meditate';
import { getBreathPattern } from '../../../../data/breathPatterns';
import { addPacedSeconds, getSitTechnique, MODES } from '../../../../services/meditateMath';
import { elapsedSec, formatMinutes, isDue } from '../../../../services/sessionTimer';
import { showAlert, showConfirm } from '../../../../utils/alert';
import { useMeditate } from './MeditateContext';
import { BreathPacer } from './components/BreathPacer';
import { MEDITATE_ACCENT, MEDITATE_TINT, ms } from './components/meditateStyle';

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
  const { session, end, updateSession, prefs } = useMeditate();
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

  if (!session || session.endedAt) return <View style={[ms.screen, { backgroundColor: Colors.white }]} />;

  const endEarly = () =>
    showConfirm('End now?', 'It’s logged as the time you actually did — that still counts.', () => end(true), 'End');

  const link = prefs.nsdr_links.find((l) => l.id === session.nsdrLinkId);
  const openRecording = () =>
    link &&
    Linking.openURL(link.url).catch(() => showAlert("Couldn't open that recording", 'Check the link in Meditate settings.'));

  // --- Paced breathing --------------------------------------------------------
  if (session.style === 'pacer') {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + Spacing.md }]}>
        <View style={styles.middle}>
          <BreathPacer
            pattern={session.pattern ?? 'box'}
            plannedSec={session.plannedSec}
            pacedSec={session.pacedSec ?? 0}
            onPhaseDone={(sec) => updateSession(addPacedSeconds(session, sec))}
            onComplete={() => end(false)}
          />
        </View>
        <TouchableOpacity onPress={endEarly} style={ms.textBtn} accessibilityRole="button">
          <Text style={ms.textBtnText}>End early</Text>
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
          <Text style={styles.title}>{STILL[session.mode]}</Text>
          <Text style={styles.lead}>Checking the time is the urge. Notice it — then lock your phone and return.</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={ms.primaryBtn} onPress={() => setView('settle')} accessibilityRole="button">
            <Text style={ms.primaryBtnText}>Keep going</Text>
          </TouchableOpacity>
          <TouchableOpacity style={ms.secondaryBtn} onPress={endEarly} accessibilityRole="button">
            <Text style={ms.secondaryBtnText}>End early</Text>
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
        ? `${getBreathPattern(session.pattern).label}: ${getBreathPattern(session.pattern).blurb}. Make the exhale longer than the inhale.`
        : 'Lie still and follow the recording. Deeply relaxed — not asleep.';

  return (
    <View style={[styles.screen, { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.md }]}>
      <View style={styles.middle}>
        <Ionicons name={MODES[session.mode].icon as any} size={40} color={MEDITATE_ACCENT} />
        <Text style={styles.title}>{fresh ? 'Lock your phone' : 'Back to it'}</Text>
        <Text style={styles.lead}>
          {!fresh
            ? 'Lock your phone and return to it. The bell will tell you when.'
            : session.bellId
              ? `The bell rings in ${formatMinutes(session.plannedSec)}. Until then, nothing here needs you.`
              : `No bell is set — notifications are off. Come back when ${formatMinutes(session.plannedSec)} feels done.`}
        </Text>
        <View style={styles.anchor}>
          <Text style={styles.anchorText}>{anchor}</Text>
        </View>
        {session.mode === 'nsdr' && link && (
          <TouchableOpacity style={[ms.secondaryBtn, styles.reopen]} onPress={openRecording} accessibilityRole="button">
            <Text style={ms.secondaryBtnText}>Open “{link.title}” again</Text>
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity onPress={endEarly} style={ms.textBtn} accessibilityRole="button">
        <Text style={ms.textBtnText}>End early</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.white, paddingHorizontal: Spacing.lg },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  title: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xxl, color: Colors.dark, textAlign: 'center' },
  lead: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 23,
    maxWidth: 320,
  },
  anchor: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: 14,
    backgroundColor: MEDITATE_TINT,
    maxWidth: 340,
  },
  anchorText: { fontFamily: Fonts.primary, fontSize: FontSizes.md, color: Colors.dark, textAlign: 'center', lineHeight: 23 },
  reopen: { paddingHorizontal: Spacing.lg, marginTop: Spacing.sm },
  actions: { gap: Spacing.sm },
});
