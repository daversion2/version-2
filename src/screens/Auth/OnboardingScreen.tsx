import React, { useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { Button } from '../../components/common/Button';
import { Copy } from '../../components/common/Copy';
import { useCopy } from '../../context/CopyContext';
import { FadeRise } from '../../components/common/FadeRise';
import { useAuth } from '../../context/AuthContext';
import { showAlert } from '../../utils/alert';
import { markOnboardingComplete } from '../../services/users';
import { AppSetup, defaultAppSetup, resolveStartApp, saveAppSetup } from '../../services/appSetup';
import { setCloseOutReminder } from '../../services/closeOutReminder';
import { DEFAULT_CLOSEOUT_TIME, formatReminderTime } from '../../services/closeOutTimes';
import {
  ONBOARDING_BEATS,
  OnboardingBeatKey,
  beatAllowsSkip,
} from '../../services/onboardingSetup';
import {
  OnboardingApps,
  OnboardingGoals,
  OnboardingReminder,
  OnboardingWhy,
} from '../../components/onboarding/OnboardingSetupBeats';

// ============================================================================
// ONBOARDING — four screens, no habit (decided 2026-11-01).
//
//   1 why        the friction is the training
//   2 apps       all three on; switch off any you won't use
//   3 goals      3 / 3 / 5 prefilled, and "start with this one"
//   4 reminder   evening close-out nudge — picking a time asks iOS
//
// Then Today, with the start app as Today's plan. The rating isn't shown
// here: the sheet explains itself the first time it opens after a session.
//
// This file is PRESENTATION AND ORCHESTRATION ONLY. The order, the skip and the
// labels are in services/onboardingSetup.ts; the setup and its rules in
// services/appSetup.ts; the reminder in services/closeOutReminder.ts.
// ============================================================================

export const OnboardingScreen: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const t = useCopy();
  const scrollRef = useRef<ScrollView>(null);

  const [beatIndex, setBeatIndex] = useState(0);
  const [setup, setSetup] = useState<AppSetup>(defaultAppSetup);
  const [reminderTime, setReminderTime] = useState<string | null>(DEFAULT_CLOSEOUT_TIME);
  const [saving, setSaving] = useState(false);

  const beat = ONBOARDING_BEATS[beatIndex];
  const isLast = beatIndex === ONBOARDING_BEATS.length - 1;

  // Direction of travel, so a beat slides in from the side it came from.
  const directionRef = useRef<1 | -1>(1);
  const goTo = (index: number) => {
    const next = Math.max(0, Math.min(index, ONBOARDING_BEATS.length - 1));
    directionRef.current = next >= beatIndex ? 1 : -1;
    setBeatIndex(next);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  // Switching off the start app moves "start here" to the first app still on.
  const setHidden = (hidden: AppSetup['hidden']) =>
    setSetup((s) => ({ ...s, hidden, startApp: resolveStartApp(s.startApp, hidden) }));

  // --------------------------------------------------------------------------
  // Completion
  // --------------------------------------------------------------------------

  /**
   * Save the setup, maybe the reminder, then flip into the app. `skipped`
   * saves the defaults with no reminder — Today still has goals to count.
   */
  const finish = async (skipped: boolean) => {
    if (!user || saving) return;
    setSaving(true);
    try {
      await saveAppSetup(user.uid, skipped ? defaultAppSetup() : setup);
      if (!skipped && reminderTime) {
        // A refused prompt or a simulator just means no reminder — not a failure.
        await setCloseOutReminder(user.uid, reminderTime).catch((e) =>
          console.warn('Close-out reminder failed:', e)
        );
      }
      // Last: this flips RootNavigator into the app.
      await markOnboardingComplete(user.uid);
      await refreshProfile();
    } catch (error: any) {
      showAlert(
        t('onboarding.error.title', 'Something went wrong'),
        error?.message ?? t('onboarding.error.finishRetry', 'Failed to finish setup. Please try again.')
      );
      setSaving(false);
    }
  };

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  const renderBeat = (key: OnboardingBeatKey) => {
    switch (key) {
      case 'why':
        return <OnboardingWhy />;
      case 'apps':
        return <OnboardingApps hidden={setup.hidden} onChange={setHidden} />;
      case 'goals':
        return <OnboardingGoals setup={setup} onChange={setSetup} />;
      case 'reminder':
        return <OnboardingReminder time={reminderTime} onChange={setReminderTime} />;
    }
  };

  const canSkip = beatAllowsSkip(beat.key);
  const ctaTitle =
    beat.key === 'reminder'
      ? reminderTime
        ? t('onboarding.cta.reminderOn', 'Remind me at {time}', { time: formatReminderTime(reminderTime) })
        : t('onboarding.cta.reminder', beat.cta)
      : t(`onboarding.cta.${beat.key}`, beat.cta);

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
        <View style={styles.footerRow}>
          {beatIndex > 0 ? (
            <TouchableOpacity onPress={() => goTo(beatIndex - 1)} style={styles.back}>
              <Ionicons name="arrow-back" size={20} color={Colors.primary} />
              <Copy id="onboarding.cta.back" style={styles.backText}>
                {'Back'}
              </Copy>
            </TouchableOpacity>
          ) : (
            <View />
          )}
          <Button
            title={ctaTitle}
            onPress={isLast ? () => finish(false) : () => goTo(beatIndex + 1)}
            disabled={saving}
            loading={isLast && saving}
            style={styles.cta}
          />
        </View>
        {canSkip && (
          <TouchableOpacity onPress={() => finish(true)} disabled={saving} style={styles.skip}>
            <Copy id="onboarding.cta.skip" style={styles.skipText}>
              {'Just take me to the app'}
            </Copy>
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
  skip: { alignItems: 'center', paddingTop: Spacing.sm },
  skipText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textDecorationLine: 'underline',
  },
});
