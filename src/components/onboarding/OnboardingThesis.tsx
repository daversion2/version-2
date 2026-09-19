import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { FadeRise } from '../common/FadeRise';
import { REACH_STOPS, EDGE_STOP_INDEX } from '../../data/comfortZone';
import { ob } from './onboardingStyles';

// ============================================================================
// BEAT 3 — THE THESIS
//
// The point of the whole flow, and the screen the five-beat version never had.
// The argument so far is about one habit getting easier; this is where the app
// says what it actually believes:
//
//   the habit you pick is a vehicle. The thing being trained is the move from
//   "I don't want to" to doing it — so leaving your comfort zone becomes the
//   habit, and that is what the nightly reflection has always measured.
//
// This is stated as the app's premise, NOT as a research finding. It is the
// same claim overrideTactics.ts is built on (one shared tactic vocabulary
// across every practice, so a move that transfers is observable at all), and
// cross-domain transfer of self-control is genuinely contested — so the copy
// says what the app asks of you, and never that a study proved it.
//
// THE FIGURE IS THE REAL SCALE. It renders REACH_STOPS with the dashed edge at
// EDGE_STOP_INDEX, which is the nightly reflection slider — so the first time
// that screen appears for real, its vocabulary is already familiar. Reading
// both constants rather than restating them means a re-labelled scale (this one
// has been re-labelled twice) can never leave onboarding describing the old one.
// ============================================================================

/** Dashes in the edge marker. RN's dashed borders are unreliable; these are Views. */
const EDGE_DASHES = 5;

/** Days shown past the edge, of the five stops. Illustrative, not the user's data. */
const FILLED_FROM = EDGE_STOP_INDEX + 1;

export const OnboardingThesis: React.FC = () => (
  <View style={styles.container}>
    <FadeRise>
      <Text style={ob.eyebrow}>The real habit</Text>
      <Text style={ob.headline}>
        The pathway isn't any specific habit. It's turning{' '}
        <Text style={ob.headlineAccent}>"I didn't want to" into "I did it anyway."</Text>
      </Text>
    </FadeRise>

    <FadeRise delay={400}>
      <View
        style={styles.figure}
        accessible
        accessibilityRole="image"
        accessibilityLabel={`A scale from "${REACH_STOPS[0].label}" to "${
          REACH_STOPS[REACH_STOPS.length - 1].label
        }", with recent days landing past the edge of the comfort zone.`}
      >
        <Text style={styles.edgeLabel}>THE EDGE</Text>

        <View style={styles.track}>
          <View style={styles.trackInside} />
          <View style={styles.trackBeyond} />

          {/* The edge marker, drawn over the rail it divides. */}
          <View style={styles.edgeMarker}>
            {Array.from({ length: EDGE_DASHES }).map((_, i) => (
              <View key={i} style={styles.edgeDash} />
            ))}
          </View>

          <View style={styles.stops}>
            {REACH_STOPS.map((stop, i) => (
              <View
                key={stop.grade}
                style={[styles.stop, i >= FILLED_FROM ? styles.stopPast : styles.stopShort]}
              />
            ))}
          </View>
        </View>

        <View style={styles.captionRow}>
          <Text style={styles.caption}>{REACH_STOPS[0].label}</Text>
          <Text style={styles.caption}>{REACH_STOPS[REACH_STOPS.length - 1].label}</Text>
        </View>
      </View>
    </FadeRise>

    <FadeRise delay={800}>
      <Text style={ob.body}>
        The habit you pick is only the vehicle. What you're actually training is the move itself —
        from "I don't want to" to doing it regardless. Every night the app asks one question about
        that move, not about the habit.{' '}
        <Text style={ob.bodyStrong}>Leaving your comfort zone becomes the habit.</Text>
      </Text>
    </FadeRise>
  </View>
);

const TRACK_HEIGHT = 6;
const STOP = 13;

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingVertical: Spacing.md },

  figure: { marginBottom: Spacing.lg },
  edgeLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: 10,
    letterSpacing: 1.6,
    color: Colors.secondary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },

  track: {
    flexDirection: 'row',
    height: STOP,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  trackInside: {
    flex: 1,
    height: TRACK_HEIGHT,
    borderTopLeftRadius: TRACK_HEIGHT / 2,
    borderBottomLeftRadius: TRACK_HEIGHT / 2,
    backgroundColor: Colors.border,
  },
  trackBeyond: {
    flex: 1,
    height: TRACK_HEIGHT,
    borderTopRightRadius: TRACK_HEIGHT / 2,
    borderBottomRightRadius: TRACK_HEIGHT / 2,
    backgroundColor: Colors.secondary + '33',
  },

  edgeMarker: {
    position: 'absolute',
    left: '50%',
    top: -6,
    bottom: -6,
    width: 1.5,
    marginLeft: -0.75,
    justifyContent: 'space-between',
  },
  edgeDash: { width: 1.5, height: 3, backgroundColor: Colors.secondary },

  // Laid over the rail rather than inside it, so the dots sit ON the line.
  stops: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stop: { width: STOP, height: STOP, borderRadius: STOP / 2 },
  stopShort: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: '#C8C8C8',
  },
  stopPast: { backgroundColor: Colors.secondary },

  captionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  caption: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray },
});
