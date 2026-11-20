import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BorderRadius, Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';

// =============================================================================
// THE OVERRIDE, DRAWN — one small picture per science screen in onboarding
// (OnboardingSetupBeats.tsx). Plain Views and Ionicons in the theme's colours:
// no image files, so they scale with the screen and change with the theme.
//
//   PredictionMeter  the brain's predicted cost, high, and the override going
//                    through it anyway
//   TwoMoments       one session as a line: the override at the start, and
//                    again partway in
//   EffortAdds       sessions rated up and down, and the XP they add up to,
//                    which only climbs
//
// Decorative only: each beat's text says everything the picture does, so they
// are hidden from screen readers.
// =============================================================================

const hidden = { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const };

/** 1 — the prediction: a cost meter near full, and the override breaking through it. */
export const PredictionMeter: React.FC = () => (
  <View style={styles.frame} {...hidden}>
    <View style={styles.meterHead}>
      <Ionicons name="pulse-outline" size={18} color={Colors.gray} />
      <Text style={styles.caption}>Predicted cost</Text>
    </View>
    <View style={styles.meterTrack}>
      <View style={styles.meterFill} />
      <View style={styles.meterBolt}>
        <Ionicons name="flash" size={18} color={Colors.white} />
      </View>
    </View>
    <View style={styles.meterScale}>
      <Text style={styles.tick}>Easy</Text>
      <Text style={styles.tick}>“I don’t want to”</Text>
    </View>
    <View style={styles.overrideRow}>
      <Ionicons name="arrow-forward-circle" size={20} color={Colors.secondary} />
      <Text style={[styles.caption, styles.overrideText]}>You do it anyway: the override</Text>
    </View>
  </View>
);

/** 2 — one session as a line, with the override at the start and partway in. */
export const TwoMoments: React.FC = () => (
  <View style={styles.frame} {...hidden}>
    <View style={styles.timeline}>
      <View style={styles.line} />
      <View style={[styles.marker, styles.markerStart]}>
        <Ionicons name="play" size={16} color={Colors.white} />
      </View>
      <View style={[styles.marker, styles.markerMiddle]}>
        <Ionicons name="flash" size={16} color={Colors.white} />
      </View>
      <View style={styles.lineEnd}>
        <Ionicons name="flag" size={16} color={Colors.gray} />
      </View>
    </View>
    <View style={styles.momentLabels}>
      <View style={styles.momentLabel}>
        <Text style={[styles.momentName, { color: Colors.primary }]}>Getting started</Text>
        <Text style={styles.tick}>“Not now”</Text>
      </View>
      <View style={[styles.momentLabel, styles.momentLabelMiddle]}>
        <Text style={[styles.momentName, { color: Colors.secondary }]}>Staying with it</Text>
        <Text style={styles.tick}>“That’s enough”</Text>
      </View>
    </View>
  </View>
);

// Six sessions' start ratings, 1–3: an illustration, not anyone's data. Up and
// down on purpose: the ratings don't need to fall, the total only climbs.
const SESSIONS = [2, 3, 1, 3, 2, 2];
const BAR_MAX = 56;
const TOTAL = SESSIONS.reduce((a, b) => a + b, 0);

/** 3 — the effort adds up: ratings that go up and down, and XP that only climbs. */
export const EffortAdds: React.FC = () => (
  <View style={[styles.frame, styles.charts]} {...hidden}>
    <View style={styles.chart}>
      <View style={styles.bars}>
        {SESSIONS.map((v, i) => (
          <View key={i} style={[styles.bar, { height: (v / 3) * BAR_MAX, backgroundColor: Colors.primary }]} />
        ))}
      </View>
      <Text style={[styles.momentName, { color: Colors.primary }]}>Each session</Text>
      <Text style={styles.tick}>Some easy, some hard</Text>
    </View>
    <View style={styles.total}>
      <Text style={styles.totalNumber}>{TOTAL}</Text>
      <Text style={[styles.momentName, { color: Colors.secondary }]}>Friction overcome</Text>
      <Text style={styles.tick}>Only goes up</Text>
    </View>
  </View>
);

const MARKER = 32;

const styles = StyleSheet.create({
  frame: {
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  caption: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.label2 },
  tick: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray },

  meterHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm },
  meterTrack: {
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.fill,
    justifyContent: 'center',
  },
  meterFill: { width: '86%', height: '100%', borderRadius: 11, backgroundColor: Colors.gray },
  meterBolt: {
    position: 'absolute',
    left: '80%',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meterScale: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs },
  overrideRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.md },
  overrideText: { color: Colors.secondary },

  timeline: { height: MARKER, justifyContent: 'center', marginHorizontal: MARKER / 2 },
  line: { height: 4, borderRadius: 2, backgroundColor: Colors.fill },
  marker: {
    position: 'absolute',
    width: MARKER,
    height: MARKER,
    borderRadius: MARKER / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerStart: { left: -MARKER / 2, backgroundColor: Colors.primary },
  markerMiddle: { left: '55%', marginLeft: -MARKER / 2, backgroundColor: Colors.secondary },
  lineEnd: { position: 'absolute', right: -MARKER / 2 + 4 },
  momentLabels: { flexDirection: 'row', marginTop: Spacing.sm },
  momentLabel: { flex: 1 },
  momentLabelMiddle: { alignItems: 'flex-end' },
  momentName: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm },

  charts: { flexDirection: 'row', gap: Spacing.lg },
  chart: { flex: 1, gap: 2 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: BAR_MAX, marginBottom: Spacing.xs },
  bar: { flex: 1, borderRadius: 3 },
  total: { flex: 1, gap: 2, justifyContent: 'flex-end' },
  totalNumber: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.hero, color: Colors.secondary, lineHeight: BAR_MAX },
});
