import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { FadeRise } from '../common/FadeRise';
import { Slider } from '../common/Slider';
import { RESISTANCE_LEVELS } from '../../constants/resistance';
import {
  CHECKIN_METRICS,
  CHECKIN_SCALE_HIGH,
  CHECKIN_SCALE_LOW,
  CheckinAnswers,
} from '../../services/checkins';
import { ob } from './onboardingStyles';

// ============================================================================
// BEAT 4 — THE ONE GUESS
//
// Resistance is the app's headline metric and its whole proof of change, and
// until now a user met it as a surprise question after their first rep. Here
// they answer it once, on the same three levels the real check-in uses, about
// THE HABIT THEY JUST COMMITTED TO — so the scale is learned by using it rather
// than explained in a slide.
//
// IT IS POINTED FORWARD, AND ONLY HERE. An earlier cut asked how hard getting
// out of bed had been that morning. It taught the scale, but it was a question
// about nothing: disconnected from the habit they had just spent a beat
// setting up, and producing an answer with no home, which broke this flow's own
// rule that every beat stores a value.
//
// Because it is the only backwards-facing question in the product, the screen
// says so twice — before the chips and again in the payoff. A user who came
// away thinking the app asks them to predict their days would have learned the
// wrong thing about how it works.
//
// THE GUESS IS NOT A REP. It is stored on the habit as `expected_resistance`,
// deliberately outside the resistance series — folding a prediction into the
// trend would open every user's curve with a point they never earned. Its only
// job is to be the "before" in a sentence the app can eventually say.
//
// The BASELINE underneath repairs a separate broken chain: services/checkins.ts
// documents onboarding as the thing that captures `journey_checkins.baseline`,
// but the archived flow had no such step, so the day-14 and day-28 retakes the
// rules engine schedules had no "before" to compare against.
// ============================================================================

interface Props {
  /** Name of the habit they just set up, for the payoff line. */
  habitName: string;
  resistance: number | null;
  onSelectResistance: (value: number) => void;
  baseline: CheckinAnswers;
  onChangeBaseline: (next: CheckinAnswers) => void;
}

export const OnboardingRehearsal: React.FC<Props> = ({
  habitName,
  resistance,
  onSelectResistance,
  baseline,
  onChangeBaseline,
}) => (
  <View style={{ flex: 1 }}>
    <Text style={ob.eyebrow}>Asking ahead — just this once</Text>
    <Text style={ob.headline}>
      The first time you do {habitName} — how hard do you think it'll be?
    </Text>
    <Text style={ob.body}>
      This is the only time we'll ask you to guess.{' '}
      <Text style={ob.bodyStrong}>
        Every time after this, the question comes once you've logged the habit — how hard it
        actually was.
      </Text>{' '}
      Today's answer just gives that something to be measured against.
    </Text>

    <View style={styles.levels}>
      {RESISTANCE_LEVELS.map((level) => {
        const on = resistance === level.value;
        return (
          <TouchableOpacity
            key={level.value}
            style={[styles.level, ob.choice, on && styles.levelOn]}
            onPress={() => onSelectResistance(level.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            activeOpacity={0.8}
          >
            <Text style={[styles.levelLabel, on && styles.levelLabelOn]}>{level.label}</Text>
            <Text style={styles.levelSublabel}>{level.sublabel}</Text>
          </TouchableOpacity>
        );
      })}
    </View>

    {resistance === null ? (
      <Text style={[ob.helper, styles.spaced]}>
        Three levels, because nobody reliably tells a 6 from a 7.
      </Text>
    ) : (
      <FadeRise>
        <View style={styles.payoff}>
          <Text style={styles.payoffText}>
            That's the whole check-in.{' '}
            <Text style={styles.payoffStrong}>
              From here it comes after you log {habitName}, never before
            </Text>{' '}
            — how hard it actually was, not how hard you thought it would be. We plot the weekly
            average, and when that line falls it isn't that the habit got easier.{' '}
            <Text style={styles.payoffStrong}>It's that you adapted to it.</Text>
          </Text>
          <Text style={styles.payoffAside}>
            We'll hold on to today's guess so there's a starting point to measure from.
          </Text>
        </View>
      </FadeRise>
    )}

    <View style={styles.baseline}>
      <Text style={ob.label}>Before we start — where are you today?</Text>
      <Text style={[ob.helper, { marginBottom: Spacing.md }]}>
        We'll ask again at two weeks and four weeks, and show you the difference.
      </Text>

      {CHECKIN_METRICS.map((metric) => (
        <View key={metric.key} style={styles.sliderRow}>
          <View style={styles.sliderTop}>
            <Text style={styles.sliderLabel}>{metric.label}</Text>
            <Text style={styles.sliderValue}>{baseline[metric.key]}/5</Text>
          </View>
          <Slider
            value={baseline[metric.key]}
            min={1}
            max={5}
            step={1}
            onChange={(value) => onChangeBaseline({ ...baseline, [metric.key]: value })}
          />
          <View style={styles.ends}>
            <Text style={styles.endLabel}>{CHECKIN_SCALE_LOW}</Text>
            <Text style={styles.endLabel}>{CHECKIN_SCALE_HIGH}</Text>
          </View>
        </View>
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
  levels: { gap: Spacing.sm },
  level: { padding: Spacing.md },
  // Orange, not teal: throughout onboarding orange means resistance.
  levelOn: { borderColor: Colors.secondary, backgroundColor: Colors.secondary + '0D' },
  levelLabel: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.md, color: Colors.dark },
  levelLabelOn: { color: Colors.secondary },
  levelSublabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 2,
  },
  spaced: { marginTop: Spacing.md },

  payoff: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.secondary + '0F',
    borderWidth: 1,
    borderColor: Colors.secondary + '30',
  },
  payoffText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 21,
  },
  payoffStrong: { fontFamily: Fonts.secondaryBold, color: Colors.dark },
  payoffAside: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    lineHeight: 17,
    marginTop: Spacing.sm,
  },

  baseline: {
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  sliderRow: { marginBottom: Spacing.md },
  sliderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sliderLabel: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.dark },
  sliderValue: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.primary },
  ends: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -Spacing.xs },
  endLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    letterSpacing: 0.8,
  },
});
