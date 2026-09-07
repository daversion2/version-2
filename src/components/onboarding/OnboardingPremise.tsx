import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { FadeRise } from '../common/FadeRise';
import { ob } from './onboardingStyles';

// ============================================================================
// BEAT 1 — THE PREMISE
//
// The one screen in the flow that stores nothing, and the only one. It runs in
// three moves:
//
//   RECOGNITION  three friction moments the user reads and thinks "that's me"
//   REFRAME      that friction isn't a flaw you keep failing to beat — it's the
//                stimulus you're training against
//   MECHANISM    repeat a behaviour against resistance and the brain shifts it
//                from deliberate effort toward automatic, so the friction falls
//
// That last move is what earns the resistance question in beat 4. Without it,
// a user meets the app's headline metric as a surprise after their first rep.
//
// NO CITATION HERE, DELIBERATELY. The mechanism is stated as prose. Per the
// policy in data/habitScience.ts — verified or absent — naming a study would
// mean sourcing and checking one first, and an unsourced claim is acceptable
// where a fabricated citation in a health app is not.
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
        That's not a character flaw you have to beat. It's resistance — and pushing through it is
        the rep that counts.
      </Text>
    </FadeRise>

    <FadeRise delay={1200}>
      <Text style={ob.body}>
        Do it enough and your brain adapts. The work shifts from deliberate effort toward something
        closer to automatic, and the friction genuinely drops.{' '}
        <Text style={ob.bodyStrong}>
          That drop is real growth — and unlike motivation, you can measure it.
        </Text>
      </Text>
    </FadeRise>

    <FadeRise delay={1600}>
      <Text style={ob.body}>
        So after every rep we ask one question: how much resistance was there? Then we show you that
        line come down.
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
