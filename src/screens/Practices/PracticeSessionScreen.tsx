import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { PracticeSessionParams } from '../../types/navigation';
import { getPractice, PRACTICE_GROUPS } from '../../data/practices';
import { useAuth } from '../../context/AuthContext';
import { completePractice } from '../../services/practices';
import { PracticeCompletionInput } from '../../types';
import { PracticeReady } from '../../components/habits/PracticeReady';
import { PracticeTimer } from '../../components/habits/PracticeTimer';
import { PracticeCaptureForm } from '../../components/habits/PracticeCaptureForm';
import { HabitCelebrationModal } from '../../components/habits/HabitCelebrationModal';

// Structural props (only `route.params` + `navigation.goBack`) so the same screen
// can be registered in any stack — Practices tab and Home tab both host it.
interface Props {
  route: { params: PracticeSessionParams };
  navigation: { goBack: () => void };
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
  const { practiceId, habitId, habitName, teamId } = route.params;
  const practice = getPractice(practiceId);
  const { user } = useAuth();

  const accent = PRACTICE_GROUPS.find((g) => g.id === practice?.group)?.color ?? Colors.primary;

  const [step, setStep] = useState<Step>('ready');
  // Minutes measured by the timer, carried into Capture as a seed (null = untimed).
  const [timerMinutes, setTimerMinutes] = useState<number | null>(null);
  const [celebration, setCelebration] = useState<{ points: number; streak: number } | null>(null);

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

  const handleSubmit = async (input: PracticeCompletionInput) => {
    if (!user) return;
    const result = await completePractice(
      user.uid,
      { id: habitId, name: habitName },
      input,
      { teamId }
    );
    setCelebration({ points: result.pointsEarned, streak: result.willpower.newStreak });
  };

  const dismissCelebration = () => {
    setCelebration(null);
    navigation.goBack();
  };

  return (
    <View style={styles.screen}>
      {step === 'ready' && <PracticeReady practice={practice} onBegin={handleBegin} />}

      {step === 'go' && practice.flow === 'timer' && (
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
          {!!practice.ready?.overrideUrge && (
            <Text style={styles.handoffBody}>{practice.ready.overrideUrge}</Text>
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
        <ScrollView
          contentContainerStyle={styles.captureContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.captureTitle}>{habitName}</Text>
          <PracticeCaptureForm
            practiceId={practiceId}
            initialMetrics={timerMinutes != null ? { duration_min: timerMinutes } : undefined}
            initialExpanded={timerMinutes != null}
            onSubmit={handleSubmit}
            onCancel={() => navigation.goBack()}
          />
        </ScrollView>
      )}

      <HabitCelebrationModal
        visible={!!celebration}
        pointsEarned={celebration?.points ?? 0}
        streakDays={celebration?.streak ?? 0}
        onDismiss={dismissCelebration}
      />
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

  captureContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  captureTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
});
