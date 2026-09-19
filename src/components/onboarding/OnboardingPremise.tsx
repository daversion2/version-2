import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { FadeRise } from '../common/FadeRise';
import { ob } from './onboardingStyles';

// ============================================================================
// BEAT 1 — THE PREMISE
//
// Two moves, and only two:
//
//   RECOGNITION  three friction moments the user reads and thinks "that's me"
//   REFRAME      that friction isn't a flaw you keep failing to beat — it's the
//                stimulus you're training against
//
// The MECHANISM used to live here as well, in two more paragraphs. It moved to
// beat 2, where a diagram can carry it — five stacked paragraphs was the most
// text anywhere in the app, on the screen with the least earned attention.
// ============================================================================

const FRICTION_MOMENTS = [
  'The pull to stay in bed.',
  'One more scroll.',
  '“I’ll start Monday.”',
];

export const OnboardingPremise: React.FC = () => (
  <View style={styles.container}>
    <FadeRise>
      <Text style={ob.eyebrow}>Neuro-Nudge</Text>
      <Text style={ob.headline}>
        The hardest part of a habit is the friction right before it.{' '}
        <Text style={ob.headlineAccent}>That friction is the training.</Text>
      </Text>
    </FadeRise>

    <FadeRise delay={400}>
      <View style={styles.friction}>
        {FRICTION_MOMENTS.map((line) => (
          <Text key={line} style={styles.frictionLine}>
            {line}
          </Text>
        ))}
      </View>
    </FadeRise>

    <FadeRise delay={800}>
      <Text style={ob.body}>
        That's not a character flaw you keep failing to beat. It's resistance — and it's the thing
        you're here to train against.
      </Text>
    </FadeRise>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingVertical: Spacing.md },
  // The orange rule is load-bearing: throughout onboarding, orange means
  // resistance. Nothing else in the flow borrows it.
  friction: {
    borderLeftWidth: 2,
    borderLeftColor: Colors.secondary,
    paddingLeft: Spacing.md,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  frictionLine: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    lineHeight: 28,
  },
});
