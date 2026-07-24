import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { PracticeSessionParams } from '../../types/navigation';
import { getPractice, PRACTICE_GROUPS } from '../../data/practices';
import { useAuth } from '../../context/AuthContext';
import { completePractice } from '../../services/practices';
import { getMindPattern, MindPattern } from '../../services/mindPatterns';
import { PracticeCompletionInput, NeuroscienceTidbit } from '../../types';
import { PracticeReady } from '../../components/habits/PracticeReady';
import { PracticeTimer } from '../../components/habits/PracticeTimer';
import { PracticeBreathPacer } from '../../components/habits/PracticeBreathPacer';
import { PracticeCaptureFlow } from '../../components/habits/PracticeCaptureFlow';
import { HabitCelebrationModal } from '../../components/habits/HabitCelebrationModal';
import { HabitTidbitModal } from '../../components/habits/HabitTidbitModal';
import { TidbitLearnMore } from '../../components/reward/TidbitLearnMore';
import {
  selectHabitTidbit,
  recordTidbitShown,
  recordLearnMoreTap,
} from '../../services/neuroscienceTidbits';

// Structural props so the same screen can be registered in any stack. Needs
// goBack (return to caller), navigate (open the practice's learn content),
// and replace (swap this screen for the post-first-practice Debrief).
interface Props {
  route: { params: PracticeSessionParams };
  navigation: {
    goBack: () => void;
    navigate: (...args: any[]) => void;
    replace: (name: string, params?: object) => void;
  };
}

type Step = 'ready' | 'go' | 'capture';

/**
 * The forward "Start" flow for a practice rep: Ready (briefing) → Go (timer or a
 * phone-down handoff) → Capture (log the rep). Launched from PracticeDetail for
 * adopted curated practices that carry briefing content; the retroactive
 * HabitCompletionModal remains the "I already did it" shortcut.
 *
 * Middle beat by `practice.flow`:
 *  - 'timer'  → in-app countdown (PracticeTimer). Per-display variants (pacer for
 *               breathwork, hidden for boredom) land in later phases.
 *  - 'away'   → phone-down handoff; they do it offline and tap "I'm done".
 *  - 'moment' → no middle beat; Ready (the pre-commit) goes straight to Capture.
 */
export const PracticeSessionScreen: React.FC<Props> = ({ route, navigation }) => {
  const { practiceId, habitId, habitName } = route.params;
  const practice = getPractice(practiceId);
  const { user, refreshProfile } = useAuth();

  const accent = PRACTICE_GROUPS.find((g) => g.id === practice?.group)?.color ?? Colors.primary;

  const [step, setStep] = useState<Step>('ready');
  // Minutes measured by the timer, carried into Capture as a seed (null = untimed).
  const [timerMinutes, setTimerMinutes] = useState<number | null>(null);
  // Pattern the breath pacer guided, seeded into Capture's `technique` field.
  const [pacerTechnique, setPacerTechnique] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<{ points: number; streak: number } | null>(null);
  // Neuroscience tidbit shown after the celebration. Best-effort: null if
  // none matched or the fetch failed.
  const [tidbit, setTidbit] = useState<NeuroscienceTidbit | null>(null);
  const [tidbitVisible, setTidbitVisible] = useState(false);
  const [learnMoreVisible, setLearnMoreVisible] = useState(false);
  // The dominant mind tag from recent reps of this practice, shown as the
  // Ready beat's "Your pattern" block. Best-effort: absent until loaded.
  const [mindPattern, setMindPattern] = useState<MindPattern | null>(null);

  useEffect(() => {
    if (!user) return;
    getMindPattern(user.uid, habitId)
      .then(setMindPattern)
      .catch(() => {});
  }, [user, habitId]);

  if (!practice) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Practice not found.</Text>
      </View>
    );
  }

  // Ready handoff → Go (timer/away) or straight to Capture (moment has no session).
  const handleBegin = () => setStep(practice.flow === 'moment' ? 'capture' : 'go');

  const handleTimerDone = (minutes: number) => {
    setTimerMinutes(minutes);
    setStep('capture');
  };

  const handlePacerDone = (minutes: number, technique: string) => {
    setTimerMinutes(minutes);
    setPacerTechnique(technique);
    setStep('capture');
  };

  const handleSubmit = async (input: PracticeCompletionInput) => {
    if (!user) return;
    const result = await completePractice(
      user.uid,
      { id: habitId, name: habitName },
      input
    );
    // Fetch the neuroscience tidbit up front so it's ready to show right
    // after the celebration is dismissed.
    try {
      const picked = await selectHabitTidbit(user.uid, {
        streakDays: result.streakBefore,
        difficulty: input.difficulty,
      });
      if (picked) {
        await recordTidbitShown(user.uid, picked.id);
      }
      setTidbit(picked);
    } catch (err) {
      console.warn('Failed to fetch practice tidbit:', err);
    }
    setCelebration({ points: result.pointsEarned, streak: result.willpower.newStreak });
    // Refresh the shared profile so Home sees the incremented completion count
    // the moment we return — that's what arms the one-time post-first-practice
    // Debrief (Home owns that trigger now).
    refreshProfile().catch(() => {});
  };

  const finishSession = () => {
    // Return to Home, which owns the one-time post-first-practice Debrief
    // trigger (it fires deterministically once the profile reflects this
    // completion). Navigate only after the native Modal has fully torn down —
    // actions dispatched during its dismissal are silently dropped on iOS.
    setTimeout(() => navigation.goBack(), 300);
  };

  const dismissCelebration = () => {
    setCelebration(null);
    if (tidbit) {
      setTidbitVisible(true);
      return;
    }
    finishSession();
  };

  const handleTidbitDismiss = () => {
    setTidbitVisible(false);
    finishSession();
  };

  const handleTidbitLearnMore = () => {
    if (user && tidbit) {
      recordLearnMoreTap(user.uid, tidbit.id).catch(() => {});
    }
    setTidbitVisible(false);
    setLearnMoreVisible(true);
  };

  const handleLearnMoreClose = () => {
    setLearnMoreVisible(false);
    finishSession();
  };

  return (
    <View style={styles.screen}>
      {step === 'ready' && (
        <PracticeReady
          practice={practice}
          mindPattern={mindPattern}
          onBegin={handleBegin}
          onLearn={() => navigation.navigate('PracticeDetail', { practiceId, readOnly: true })}
        />
      )}

      {step === 'go' && practice.flow === 'timer' && practice.timerDisplay === 'pacer' && (
        <View style={styles.goWrap}>
          <PracticeBreathPacer
            accentColor={accent}
            defaultMinutes={
              (practice.tracking?.find((t) => t.key === 'duration_min')?.default as number) ?? 5
            }
            onDone={handlePacerDone}
            onSkip={() => setStep('capture')}
          />
        </View>
      )}

      {step === 'go' && practice.flow === 'timer' && practice.timerDisplay !== 'pacer' && (
        <View style={styles.goWrap}>
          <PracticeTimer
            accentColor={accent}
            defaultMinutes={
              (practice.tracking?.find((t) => t.key === 'duration_min')?.default as number) ?? 10
            }
            onDone={handleTimerDone}
            onSkip={() => setStep('capture')}
          />
        </View>
      )}

      {step === 'go' && practice.flow === 'away' && (
        <View style={styles.handoff}>
          <View style={[styles.iconWrap, { backgroundColor: accent + '1A' }]}>
            <Ionicons name={practice.icon as any} size={32} color={accent} />
          </View>
          <Text style={styles.handoffTitle}>Set your phone down.</Text>
          {!!practice.ready?.override && (
            <Text style={styles.handoffBody}>{practice.ready.override}</Text>
          )}
          <Text style={styles.handoffHint}>Come back and log it when you’re done.</Text>
          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: accent }]}
            onPress={() => setStep('capture')}
            activeOpacity={0.85}
          >
            <Text style={styles.doneText}>I’m done</Text>
            <Ionicons name="arrow-forward" size={18} color={Colors.white} />
          </TouchableOpacity>
        </View>
      )}

      {step === 'capture' && (
        <PracticeCaptureFlow
          practiceId={practiceId}
          title={habitName}
          accentColor={accent}
          initialMetrics={
            timerMinutes != null
              ? {
                  duration_min: timerMinutes,
                  ...(pacerTechnique ? { technique: pacerTechnique } : {}),
                }
              : undefined
          }
          onSubmit={handleSubmit}
          onCancel={() => navigation.goBack()}
        />
      )}

      <HabitCelebrationModal
        visible={!!celebration}
        pointsEarned={celebration?.points ?? 0}
        streakDays={celebration?.streak ?? 0}
        onDismiss={dismissCelebration}
      />
      <HabitTidbitModal
        visible={tidbitVisible}
        tidbit={tidbit}
        onLearnMore={handleTidbitLearnMore}
        onDismiss={handleTidbitDismiss}
      />
      {tidbit && (
        <TidbitLearnMore
          visible={learnMoreVisible}
          tidbit={tidbit}
          onClose={handleLearnMoreClose}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.lightGray },
  muted: { fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: Colors.gray },

  goWrap: { flex: 1, justifyContent: 'center', padding: Spacing.lg },

  handoff: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl, gap: Spacing.md },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  handoffTitle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xl, color: Colors.dark, textAlign: 'center' },
  handoffBody: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    textAlign: 'center',
    lineHeight: 22,
  },
  handoffHint: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray, textAlign: 'center' },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.md,
  },
  doneText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.white },
});
