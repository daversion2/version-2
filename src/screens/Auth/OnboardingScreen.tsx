import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { Button } from '../../components/common/Button';
import { FadeRise } from '../../components/common/FadeRise';
import { useAuth } from '../../context/AuthContext';
import { showAlert } from '../../utils/alert';
import { markOnboardingComplete, setStartingPractice } from '../../services/users';
import { createHabit, ensureCuratedPractices, updateHabit } from '../../services/practices';
import { syncHabitReminder } from '../../services/habitReminders';
import { saveJourneyCheckin, CheckinAnswers } from '../../services/checkins';
import { HabitDefinition } from '../../data/practices';
import {
  HabitSetupDraft,
  ONBOARDING_BEATS,
  OnboardingBeatKey,
  buildHabitCreationPayload,
  deriveHabitSetupDraft,
  isBeatComplete,
} from '../../services/onboardingSetup';
import { OnboardingPremise } from '../../components/onboarding/OnboardingPremise';
import { OnboardingHabitPicker } from '../../components/onboarding/OnboardingHabitPicker';
import { OnboardingPromise } from '../../components/onboarding/OnboardingPromise';
import { OnboardingRehearsal } from '../../components/onboarding/OnboardingRehearsal';
import { OnboardingLanding } from '../../components/onboarding/OnboardingLanding';

// ============================================================================
// ONBOARDING — five beats, about ninety seconds.
//
//   1 premise    the friction is the training           (stores nothing)
//   2 pick       one habit, from the real catalog       practice_id
//   3 promise    amount · days · anchor · reminder      the commitment
//   4 rehearse   the one forward-looking guess          expected_resistance
//                plus where they are today              journey_checkins.baseline
//   5 land       confirm, write, drop onto Today        has_completed_onboarding
//
// THE RULE: every beat stores a value. Beat 1 is the single deliberate
// exception — a screen that stores nothing is a slide, and one slide is the
// budget. The flow this replaced was five of them; it is kept, unrouted and
// still compiling, in screens/Auth/_archived/.
//
// This file is PRESENTATION AND ORCHESTRATION ONLY. Everything decidable —
// what a habit's defaults are, when a beat is answered, what gets written —
// lives in services/onboardingSetup.ts, because jest's testMatch excludes .tsx
// and logic that ends up here is logic nothing is guarding.
// ============================================================================

/** Middle of the 1–5 scale. A defaulted extreme would bias every later delta. */
const BASELINE_DEFAULT: CheckinAnswers = { mood: 3, focus: 3, motivation: 3 };

export const OnboardingScreen: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const [beatIndex, setBeatIndex] = useState(0);
  const [definition, setDefinition] = useState<HabitDefinition | null>(null);
  const [draft, setDraft] = useState<HabitSetupDraft | null>(null);
  const [resistance, setResistance] = useState<number | null>(null);
  const [baseline, setBaseline] = useState<CheckinAnswers>(BASELINE_DEFAULT);
  const [saving, setSaving] = useState(false);

  const beat = ONBOARDING_BEATS[beatIndex];
  const isLast = beatIndex === ONBOARDING_BEATS.length - 1;
  const progress = { definitionId: definition?.id ?? null, draft, resistance };
  const canAdvance = isBeatComplete(beat.key, progress);

  // Direction of travel, so a beat slides in from the side it came from.
  const directionRef = useRef<1 | -1>(1);
  const goTo = (index: number) => {
    const next = Math.max(0, Math.min(index, ONBOARDING_BEATS.length - 1));
    directionRef.current = next >= beatIndex ? 1 : -1;
    setBeatIndex(next);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const handleSelectHabit = (selected: HabitDefinition) => {
    if (selected.id === definition?.id) return;
    setDefinition(selected);
    // Re-seed rather than patch: a draft carried over from a different habit
    // would keep the previous habit's amount and anchor, which is a worse
    // starting point than the one this habit's own definition supplies.
    setDraft(deriveHabitSetupDraft(selected));
    // The guess in beat 4 is about a specific habit. Going back and changing
    // the habit makes it a prediction about something else, so it is cleared
    // rather than silently attached to the new one.
    setResistance(null);
  };

  // --------------------------------------------------------------------------
  // Completion
  // --------------------------------------------------------------------------

  /**
   * "Just take me to the app." No habit is created, and no starting practice is
   * recorded — which is exactly what makes ensureCuratedPractices fall back to
   * seeding the core protocol, so Today still has something on it.
   */
  const handleSkip = async () => {
    if (!user || saving) return;
    setSaving(true);
    try {
      try {
        await ensureCuratedPractices(user.uid);
      } catch (seedErr) {
        console.warn('Failed to seed core practices on skip:', seedErr);
      }
      await markOnboardingComplete(user.uid);
      await refreshProfile();
    } catch (error: any) {
      showAlert('Something went wrong', error?.message ?? 'Please try again.');
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!user || !definition || !draft || saving) return;
    setSaving(true);
    try {
      const habitId = await createHabit(
        user.uid,
        buildHabitCreationPayload(definition, draft, resistance)
      );

      // The reminder is a second write because createHabit doesn't take one, and
      // syncHabitReminder reads the saved habit rather than taking the value.
      if (draft.reminderEnabled) {
        await updateHabit(user.uid, habitId, {
          reminder: { time: draft.reminderTime, enabled: true },
        });
        try {
          await syncHabitReminder(user.uid, habitId);
        } catch (err) {
          // A denied notification permission must not cost the user the habit
          // they just set up. The reminder is saved either way and gets picked
          // up by reconcileHabitReminders on a later launch.
          console.warn('Habit reminder sync failed:', err);
        }
      }

      // AFTER the habit exists. This id is what tells ensureCuratedPractices the
      // user made an explicit choice and the core protocol must not be seeded on
      // top of it — writing it before a failed create would leave an account
      // with no habits and no fallback.
      await setStartingPractice(user.uid, definition.id);

      try {
        await saveJourneyCheckin(user.uid, 'baseline', baseline);
      } catch (err) {
        // A missing baseline costs the day-14/28 comparison, not the account.
        console.warn('Failed to save journey baseline:', err);
      }

      // Last: this flips RootNavigator into the app.
      await markOnboardingComplete(user.uid);
      await refreshProfile();
    } catch (error: any) {
      showAlert('Something went wrong', error?.message ?? 'Failed to finish setup. Please try again.');
      setSaving(false);
    }
  };

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  const renderBeat = (key: OnboardingBeatKey) => {
    switch (key) {
      case 'premise':
        return <OnboardingPremise />;
      case 'pick':
        return (
          <OnboardingHabitPicker selectedId={definition?.id ?? null} onSelect={handleSelectHabit} />
        );
      case 'promise':
        return definition && draft ? (
          <OnboardingPromise definition={definition} draft={draft} onChange={setDraft} />
        ) : null;
      case 'rehearse':
        return (
          <OnboardingRehearsal
            habitName={definition?.name ?? 'your habit'}
            resistance={resistance}
            onSelectResistance={setResistance}
            baseline={baseline}
            onChangeBaseline={setBaseline}
          />
        );
      case 'land':
        return definition && draft ? (
          <OnboardingLanding definition={definition} draft={draft} />
        ) : null;
    }
  };

  // Offered only before the user has invested anything. Past the pick, "skip"
  // would silently discard a commitment they just spent a minute making.
  const canSkip = beat.key === 'premise' || beat.key === 'pick';

  return (
    <View style={styles.screen}>
      <View style={[styles.progressRow, { paddingTop: insets.top + Spacing.sm }]}>
        {ONBOARDING_BEATS.map((b, i) => (
          <View
            key={b.key}
            style={[
              styles.segment,
              i < beatIndex && styles.segmentDone,
              i === beatIndex && styles.segmentActive,
            ]}
          />
        ))}
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Keyed by beat: each change remounts, sliding in from the direction of
            travel and replaying the staggered reveals inside. */}
        <FadeRise
          key={beat.key}
          duration={300}
          distance={0}
          horizontalDistance={56 * directionRef.current}
          style={{ flex: 1 }}
        >
          {renderBeat(beat.key)}
        </FadeRise>
      </ScrollView>

      <View
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md) + Spacing.sm }]}
      >
        {!canAdvance && !!beat.hint && <Text style={styles.hint}>{beat.hint}</Text>}
        <View style={styles.footerRow}>
          {beatIndex > 0 ? (
            <TouchableOpacity onPress={() => goTo(beatIndex - 1)} style={styles.back}>
              <Ionicons name="arrow-back" size={20} color={Colors.primary} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          ) : (
            <View />
          )}
          <Button
            title={beat.cta}
            onPress={isLast ? handleComplete : () => goTo(beatIndex + 1)}
            disabled={!canAdvance || saving}
            loading={isLast && saving}
            style={styles.cta}
          />
        </View>
        {canSkip && (
          <TouchableOpacity onPress={handleSkip} disabled={saving} style={styles.skip}>
            <Text style={styles.skipText}>Just take me to the app</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.white },
  scroll: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xl, flexGrow: 1 },

  progressRow: {
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  segment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: Colors.border },
  segmentDone: { backgroundColor: Colors.primary },
  segmentActive: { backgroundColor: Colors.secondary },

  footer: {
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
    backgroundColor: Colors.white,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: Spacing.sm },
  backText: { fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: Colors.primary },
  cta: { minWidth: 180 },
  hint: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textAlign: 'right',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  skip: { alignItems: 'center', paddingTop: Spacing.sm },
  skipText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textDecorationLine: 'underline',
  },
});
