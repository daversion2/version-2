import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { FadeRise } from '../common/FadeRise';
import { RESISTANCE_LEVELS } from '../../constants/resistance';
import { TACTIC_PROMPT, OFFERED_TACTICS } from '../../data/overrideTactics';
import { ob } from './onboardingStyles';

// ============================================================================
// BEATS 4–6 — HOW IT WORKS
//
// The daily loop, one beat per step: the habit sits on Today, you say how hard
// it was, and then — optionally — you say what got you through.
//
// NONE OF THESE STORE ANYTHING, which the five-beat flow's rule forbade. They
// earn their place a different way: the resistance question and the tactic
// prompt are the two things a new user used to meet cold, mid-rep, with no idea
// why they were being asked. Explaining them here costs three taps and removes
// the only moments in the product that read as paperwork.
//
// THE MOCK-UPS ARE STATIC, and deliberately so — they are pictures of the real
// screens, not live ones. But the CONTENT is read from the same constants the
// real screens read (RESISTANCE_LEVELS, TACTIC_PROMPT, OFFERED_TACTICS), so
// the walkthrough cannot drift into describing a version of the app that no
// longer exists. Only the layout is restated here.
//
// Kept in one file because the three share an eyebrow, a card treatment and a
// type rhythm; split across three they drift.
// ============================================================================

/** The eyebrow, so the user can see how much walkthrough is left. */
const step = (n: number) => `How it works · ${n} of 3`;

/** Illustrative rows for the Today mock. Not the user's habits. */
const TODAY_ROWS = [
  { name: 'Cold shower', detail: '2 minutes · every morning', muted: false },
  { name: 'Read', detail: '10 pages · Mon, Wed, Fri', muted: true },
];

/** Which level the mock shows as chosen — the middle one, so neither end reads as the "right" answer. */
const MOCK_LEVEL = 2;

/** Weekly averages behind the falling line. Illustrative; the real chart is on Progress. */
const TREND = [2.9, 2.7, 2.5, 2.35, 1.95, 1.8];

// ---------------------------------------------------------------- beat 4

export const OnboardingLoopHabit: React.FC = () => (
  <View style={styles.container}>
    <FadeRise>
      <Text style={ob.eyebrow}>{step(1)}</Text>
      <Text style={ob.headline}>Complete a habit.</Text>
    </FadeRise>

    <FadeRise delay={400}>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>TODAY</Text>
        {TODAY_ROWS.map((row) => (
          <View key={row.name} style={[styles.row, row.muted && styles.rowMuted]}>
            <View style={styles.tick} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowName}>{row.name}</Text>
              <Text style={styles.rowDetail}>{row.detail}</Text>
            </View>
          </View>
        ))}
      </View>
    </FadeRise>

    <FadeRise delay={800}>
      <Text style={ob.body}>
        Do it in real life. Come back and tap it here.{' '}
        <Text style={ob.bodyStrong}>That's the loop</Text> — everything after this is optional.
      </Text>
    </FadeRise>
  </View>
);

// ---------------------------------------------------------------- beat 5

export const OnboardingLoopRating: React.FC = () => (
  <View style={styles.container}>
    <FadeRise>
      <Text style={ob.eyebrow}>{step(2)}</Text>
      <Text style={ob.headline}>Then say how hard it was.</Text>
    </FadeRise>

    <FadeRise delay={400}>
      <View style={styles.levels}>
        {RESISTANCE_LEVELS.map((level) => {
          const on = level.value === MOCK_LEVEL;
          return (
            <View key={level.value} style={[styles.level, on && styles.levelOn]}>
              <View style={[styles.levelNum, on && styles.levelNumOn]}>
                <Text style={[styles.levelNumText, on && styles.levelNumTextOn]}>{level.value}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.levelLabel, on && styles.levelLabelOn]}>{level.label}</Text>
                <Text style={styles.levelSub}>{level.sublabel}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </FadeRise>

    <FadeRise delay={800}>
      <View style={styles.trend}>
        <Trend />
        <View style={styles.captionRow}>
          <Text style={styles.caption}>Week 1</Text>
          <Text style={styles.caption}>Week 6</Text>
        </View>
      </View>
    </FadeRise>

    <FadeRise delay={1100}>
      <Text style={ob.body}>
        One question, three answers.{' '}
        <Text style={ob.bodyStrong}>Watching that line come down is watching the wiring change</Text>{' '}
        — and unlike motivation, you can actually see it.
      </Text>
    </FadeRise>
  </View>
);

/**
 * The falling resistance trend as a bar run rather than a line — a polyline
 * needs SVG, and six bars make the same point with Views. Height is inverted:
 * a tall bar is high resistance, so the run visibly descends.
 */
const Trend: React.FC = () => (
  <View
    style={styles.trendBars}
    accessible
    accessibilityRole="image"
    accessibilityLabel="Average resistance falling over six weeks."
  >
    {TREND.map((value, i) => {
      const fraction = (value - 1) / (RESISTANCE_LEVELS.length - 1);
      return (
        <View
          key={i}
          style={[
            styles.trendBar,
            { height: Math.max(4, fraction * TREND_HEIGHT) },
            i === TREND.length - 1 && styles.trendBarLast,
          ]}
        />
      );
    })}
  </View>
);

// ---------------------------------------------------------------- beat 6

export const OnboardingLoopReflect: React.FC = () => {
  // The first few real tactics, so the chips are the vocabulary they will
  // actually be offered rather than four invented for a mock-up.
  const tactics = OFFERED_TACTICS.slice(0, 4);

  return (
    <View style={styles.container}>
      <FadeRise>
        <Text style={ob.eyebrow}>{step(3)}</Text>
        <Text style={ob.headline}>Then reflect — if you want to.</Text>
      </FadeRise>

      <FadeRise delay={400}>
        <View style={styles.card}>
          <View style={styles.promptRow}>
            <Text style={styles.prompt}>{TACTIC_PROMPT}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>OPTIONAL</Text>
            </View>
          </View>
          <View style={styles.chips}>
            {tactics.map((tactic, i) => (
              <View key={tactic.id} style={[styles.chip, i === 0 && styles.chipOn]}>
                <Ionicons
                  name={tactic.icon as any}
                  size={13}
                  color={i === 0 ? Colors.primary : Colors.gray}
                />
                <Text style={[styles.chipText, i === 0 && styles.chipTextOn]}>{tactic.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </FadeRise>

      <FadeRise delay={800}>
        <Text style={ob.body}>
          Never required, always worth it. Putting words to what got you through is another pass
          over the same pathway — and it quietly builds a playbook of{' '}
          <Text style={ob.bodyStrong}>what actually works for you.</Text>
        </Text>
      </FadeRise>
    </View>
  );
};

const TREND_HEIGHT = 44;

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingVertical: Spacing.md },

  // ---- shared card treatment -----------------------------------------------
  card: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm + 2,
  },
  cardLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: 10,
    letterSpacing: 1.4,
    color: Colors.gray,
  },

  // ---- beat 4 --------------------------------------------------------------
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm + 3 },
  rowMuted: { opacity: 0.42 },
  tick: {
    width: 26,
    height: 26,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  rowName: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.dark },
  rowDetail: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 2,
  },

  // ---- beat 5 --------------------------------------------------------------
  levels: { gap: Spacing.sm, marginBottom: Spacing.md },
  level: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 3,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm + 2,
  },
  // Orange, not teal: throughout onboarding orange means resistance.
  levelOn: { borderColor: Colors.secondary, backgroundColor: Colors.secondary + '12' },
  levelNum: {
    width: 26,
    height: 26,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelNumOn: { backgroundColor: Colors.secondary },
  levelNumText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.sm, color: Colors.gray },
  levelNumTextOn: { color: Colors.white },
  levelLabel: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.sm, color: Colors.dark },
  levelLabelOn: { color: Colors.secondary },
  levelSub: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 1,
  },

  trend: { marginBottom: Spacing.md },
  trendBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: TREND_HEIGHT,
    marginBottom: Spacing.xs,
  },
  trendBar: {
    flex: 1,
    marginHorizontal: 3,
    borderRadius: 3,
    backgroundColor: Colors.secondary + '4D',
  },
  trendBarLast: { backgroundColor: Colors.secondary },

  // ---- beat 6 --------------------------------------------------------------
  promptRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  prompt: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.dark },
  badge: {
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.full,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  badgeText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: 9,
    letterSpacing: 0.8,
    color: Colors.gray,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs + 3 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.full,
    paddingVertical: 7,
    paddingHorizontal: 11,
  },
  chipOn: { borderColor: Colors.primary, backgroundColor: Colors.primary + '17' },
  chipText: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray },
  chipTextOn: { fontFamily: Fonts.secondaryBold, color: Colors.primary },

  // ---- shared captions -----------------------------------------------------
  captionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  caption: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray },
});
