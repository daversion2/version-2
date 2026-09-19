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
import { HabitDefinition } from '../../data/practices';
import {
  ONBOARDING_BEATS,
  OnboardingBeatKey,
  beatAllowsSkip,
  buildHabitCreationPayload,
  deriveHabitSetupDraft,
  isBeatComplete,
} from '../../services/onboardingSetup';
import { OnboardingPremise } from '../../components/onboarding/OnboardingPremise';
import { OnboardingNeurons } from '../../components/onboarding/OnboardingNeurons';
import { OnboardingThesis } from '../../components/onboarding/OnboardingThesis';
import {
  OnboardingLoopHabit,
  OnboardingLoopRating,
  OnboardingLoopReflect,
} from '../../components/onboarding/OnboardingLoop';
import { OnboardingHabitPicker } from '../../components/onboarding/OnboardingHabitPicker';

// ============================================================================
// ONBOARDING — seven beats, about a minute, one of them a question.
//
//   1 premise      the friction is the training
//   2 neurons      what repeating the override wires
//   3 thesis       leaving the comfort zone IS the habit
//   4 loopHabit    it sits on Today; you tap it after
//   5 loopRating   one question, three answers, and the line comes down
//   6 loopReflect  optional, encouraged, and why
//   7 pick         one habit → practice_id · has_completed_onboarding
//
// The five-beat flow this replaces asked for a commitment (amount, days,
// anchor, reminder) and a rehearsal (a resistance guess and three baseline
// sliders) from someone who had not yet done the habit once. Both are gone.
// Their components are kept, unrouted and still compiling, in
// components/onboarding/_archived/ — see onboardingSetup.ts for what that cost
// and where each value went.
//
// This file is PRESENTATION AND ORCHESTRATION ONLY. Everything decidable —
// what a habit's defaults are, when a beat is answered, what gets written —
// lives in services/onboardingSetup.ts, because jest's testMatch excludes .tsx
// and logic that ends up here is logic nothing is guarding.
// ============================================================================

export const OnboardingScreen: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const [beatIndex, setBeatIndex] = useState(0);
  const [definition, setDefinition] = useState<HabitDefinition | null>(null);
  const [saving, setSaving] = useState(false);

  const beat = ONBOARDING_BEATS[beatIndex];
  const isLast = beatIndex === ONBOARDING_BEATS.length - 1;
  const canAdvance = isBeatComplete(beat.key, { definitionId: definition?.id ?? null });

  // Direction of travel, so a beat slides in from the side it came from.
  const directionRef = useRef<1 | -1>(1);
  const goTo = (index: number) => {
    const next = Math.max(0, Math.min(index, ONBOARDING_BEATS.length - 1));
    directionRef.current = next >= beatIndex ? 1 : -1;
    setBeatIndex(next);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const handleSelectHabit = (selected: HabitDefinition) => setDefinition(selected);

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
    if (!user || !definition || saving) return;
    setSaving(true);
    try {
      // Derived here rather than held in state: nothing edits it any more, so
      // a stored draft could only ever disagree with the habit it describes.
      const draft = deriveHabitSetupDraft(definition);
      const habitId = await createHabit(user.uid, buildHabitCreationPayload(definition, draft));

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

      // NO BASELINE CHECK-IN IS WRITTEN. The rehearsal beat used to capture
      // mood/focus/motivation here; asking for three sliders before the user
      // has done anything was most of what made the old flow heavy. The
      // day-14/28 check-ins fall back to the earliest take on record instead —
      // see referenceCheckin in services/checkins.ts.

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
      case 'neurons':
        return <OnboardingNeurons />;
      case 'thesis':
        return <OnboardingThesis />;
      case 'loopHabit':
        return <OnboardingLoopHabit />;
      case 'loopRating':
        return <OnboardingLoopRating />;
      case 'loopReflect':
        return <OnboardingLoopReflect />;
      case 'pick':
        return (
          <OnboardingHabitPicker selectedId={definition?.id ?? null} onSelect={handleSelectHabit} />
        );
    }
  };

  const canSkip = beatAllowsSkip(beat.key);

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
