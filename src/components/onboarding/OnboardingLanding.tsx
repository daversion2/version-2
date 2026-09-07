import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { FadeRise } from '../common/FadeRise';
import { HabitDefinition } from '../../data/practices';
import {
  HabitSetupDraft,
  describePromise,
  formatReminderTime,
} from '../../services/onboardingSetup';
import { ob } from './onboardingStyles';

// ============================================================================
// BEAT 5 — LAND
//
// Deliberately NOT a reveal checklist ("you sat still for 60 seconds ✓"). The
// old flow's summary congratulated the user for having read screens, which is
// not an achievement. This one states the promise they just made, once, and
// then gets out of the way — the CTA writes everything and drops them straight
// onto the real Today with that one habit due.
//
// It also names what is deliberately absent, because a near-empty first screen
// reads as a broken app unless you say it was a choice. Everything withheld is
// already gated elsewhere in the codebase (the science page on first open, the
// tactic question on the first hard rep, the playbook on the second repeated
// tactic, the raise suggestion at 8 logs). Onboarding's remaining job is to not
// pre-empt those gates.
// ============================================================================

interface Props {
  definition: HabitDefinition;
  draft: HabitSetupDraft;
}

export const OnboardingLanding: React.FC<Props> = ({ definition, draft }) => (
  <View style={styles.container}>
    <FadeRise>
      <Text style={ob.eyebrow}>Ready</Text>
      <Text style={ob.headline}>Here's what you committed to.</Text>
    </FadeRise>

    <FadeRise delay={300}>
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Ionicons
            name={(definition.icon as any) ?? 'ellipse-outline'}
            size={20}
            color={Colors.primary}
          />
          <Text style={styles.cardName}>{definition.name}</Text>
        </View>
        <Text style={styles.cardPromise}>{describePromise(definition, draft)}</Text>
        {draft.reminderEnabled && (
          <Text style={styles.cardReminder}>
            We'll remind you at {formatReminderTime(draft.reminderTime)}.
          </Text>
        )}
      </View>
    </FadeRise>

    <FadeRise delay={700}>
      <Text style={ob.body}>
        <Text style={ob.bodyStrong}>That's the whole screen.</Text> One habit, due, ready to log.
      </Text>
      <Text style={ob.body}>
        The library, the science behind this habit, and everything the app can show you about your
        progress all arrive as you earn them — not stacked on you in minute two.
      </Text>
    </FadeRise>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingVertical: Spacing.lg },
  card: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '0A',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cardName: {
    flex: 1,
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  cardPromise: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.primary,
    lineHeight: 25,
    marginTop: Spacing.sm,
  },
  cardReminder: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: Spacing.sm,
  },
});
