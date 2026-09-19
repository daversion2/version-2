import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, PanResponder, LayoutChangeEvent } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { ReflectionGrade } from '../../types';
import { REACH_STOPS, reachIndexOf } from '../../data/comfortZone';

const TRACK_HEIGHT = 44;
const LINE = 8;
const THUMB = 26;

/** Where the thumb parks before the first answer. Centre, claiming nothing. */
const MIDDLE_INDEX = Math.floor((REACH_STOPS.length - 1) / 2);

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

interface GradeSelectorProps {
  value: ReflectionGrade | null;
  onChange: (grade: ReflectionGrade) => void;
  /** Ignore input (the reflection is saved and not being edited). */
  readOnly?: boolean;
}

/**
 * "How hard did you push today?" — answered by dragging across a line rather
 * than picking one of five chips.
 *
 * An earlier version asked how far past the comfort zone the day got, and drew
 * the boundary on the track. That framing made the user locate an invisible
 * threshold before they could answer at all; the question now runs easier →
 * harder with no boundary to find, so the colour ramp and the stop labels carry
 * the whole gradient. "Comfort zone" survives as prose elsewhere in the app,
 * where it reads as ordinary English rather than as a ruler.
 *
 * Built on PanResponder for the same reason as <Slider>: no native module, so
 * this ships over the air.
 */
export const GradeSelector: React.FC<GradeSelectorProps> = ({
  value,
  onChange,
  readOnly = false,
}) => {
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);
  const trackRef = useRef<View>(null);
  const trackLeftRef = useRef(0);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const readOnlyRef = useRef(readOnly);
  readOnlyRef.current = readOnly;

  const lastIndex = REACH_STOPS.length - 1;

  const emitFromX = (x: number) => {
    if (readOnlyRef.current) return;
    const w = widthRef.current;
    if (w <= 0) return;
    const ratio = clamp(x / w, 0, 1);
    const index = Math.round(ratio * lastIndex);
    onChangeRef.current(REACH_STOPS[index].grade);
  };
  const emitFromXRef = useRef(emitFromX);
  emitFromXRef.current = emitFromX;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Claim the gesture so the surrounding ScrollView can't steal the drag.
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (_evt, gesture) => {
        // Re-measure on grab: this screen scrolls, so a layout-time measurement
        // goes stale as soon as the user moves the page.
        const x0 = gesture.x0;
        if (trackRef.current) {
          trackRef.current.measureInWindow((x) => {
            trackLeftRef.current = x;
            emitFromXRef.current(x0 - x);
          });
        } else {
          emitFromXRef.current(x0 - trackLeftRef.current);
        }
      },
      onPanResponderMove: (_evt, gesture) => {
        emitFromXRef.current(gesture.moveX - trackLeftRef.current);
      },
    })
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    widthRef.current = w;
    setWidth(w);
    trackRef.current?.measureInWindow((x) => {
      trackLeftRef.current = x;
    });
  };

  // No answer yet → park the thumb on the edge itself and grey everything out,
  // so an untouched control never reads as a claim about the day.
  const index = value ? reachIndexOf(value) : -1;
  const answered = index >= 0;
  const shownIndex = answered ? index : MIDDLE_INDEX;
  const stop = REACH_STOPS[shownIndex];
  const accent = answered ? stop.color : Colors.border;
  const ratio = shownIndex / lastIndex;
  const filled = ratio * width;

  return (
    <View style={styles.container}>
      <Text style={styles.question}>
        How hard did you push today? *
      </Text>

      <View
        ref={trackRef}
        style={styles.track}
        onLayout={onLayout}
        {...(readOnly ? {} : pan.panHandlers)}
        accessibilityRole="adjustable"
        accessibilityLabel="How hard did you push today?"
        accessibilityValue={{
          min: 1,
          max: REACH_STOPS.length,
          now: shownIndex + 1,
          text: answered ? stop.label : 'No answer yet',
        }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          if (readOnly) return;
          const dir = e.nativeEvent.actionName === 'increment' ? 1 : -1;
          onChange(REACH_STOPS[clamp(shownIndex + dir, 0, lastIndex)].grade);
        }}
      >
        <View style={styles.line} />
        {answered && (
          <View style={[styles.fill, { width: filled, backgroundColor: accent }]} />
        )}

        <View
          style={[
            styles.thumb,
            {
              left: clamp(filled - THUMB / 2, 0, Math.max(0, width - THUMB)),
              borderColor: accent,
            },
          ]}
          pointerEvents="none"
        />
      </View>

      {/* Stop markers, so the five discrete answers stay visible on a continuous-
          looking control. */}
      <View style={styles.ticks} pointerEvents="none">
        {REACH_STOPS.map((s, i) => (
          <View
            key={s.grade}
            style={[
              styles.tick,
              { left: (i / lastIndex) * Math.max(0, width - 3) },
              answered && i <= shownIndex && { backgroundColor: accent },
            ]}
          />
        ))}
      </View>

      {/* Direction only. The readout below names the actual answer, so these
          orient the drag without competing with it. */}
      <View style={styles.ends}>
        <Text style={styles.endLabel}>EASIER</Text>
        <Text style={styles.endLabel}>HARDER</Text>
      </View>

      <View style={styles.readout}>
        <Text style={[styles.answer, { color: answered ? accent : Colors.gray }]}>
          {answered ? stop.label : 'Drag to answer'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  question: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  track: {
    height: TRACK_HEIGHT,
    justifyContent: 'center',
    width: '100%',
  },
  line: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: LINE,
    borderRadius: LINE / 2,
    backgroundColor: Colors.lightGray,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fill: {
    position: 'absolute',
    left: 0,
    height: LINE,
    borderRadius: LINE / 2,
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 3,
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  ticks: {
    height: 4,
    marginTop: 2,
  },
  tick: {
    position: 'absolute',
    top: 0,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.border,
  },
  ends: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs + 2,
  },
  endLabel: {
    fontFamily: Fonts.secondary,
    fontSize: 9,
    letterSpacing: 0.7,
    color: Colors.gray,
  },
  readout: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm + 2,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  answer: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
  },
});
