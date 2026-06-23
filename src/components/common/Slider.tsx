import React, { useRef, useState } from 'react';
import { View, PanResponder, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Colors } from '../../constants/theme';

interface Props {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  color?: string;
}

const THUMB = 26;
const TRACK_HEIGHT = 40;
const LINE = 5;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * A dependency-free slider built on PanResponder (no native module → OTA-safe).
 * Tap or drag along the track to set a snapped value between min and max.
 */
export const Slider: React.FC<Props> = ({ value, min, max, step = 1, onChange, color = Colors.primary }) => {
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);
  const startXRef = useRef(0);
  // Keep the latest onChange so the once-created PanResponder never goes stale.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const valueFromX = (x: number): number => {
    const w = widthRef.current;
    if (w <= 0) return value;
    const ratio = clamp(x / w, 0, 1);
    const snapped = Math.round((min + ratio * (max - min)) / step) * step;
    return clamp(snapped, min, max);
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const x = evt.nativeEvent.locationX;
        startXRef.current = x;
        onChangeRef.current(valueFromX(x));
      },
      onPanResponderMove: (_evt, gesture) => {
        onChangeRef.current(valueFromX(startXRef.current + gesture.dx));
      },
    }),
  ).current;

  const ratio = max === min ? 0 : (clamp(value, min, max) - min) / (max - min);
  const filled = ratio * width;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    widthRef.current = w;
    setWidth(w);
  };

  return (
    <View style={styles.track} onLayout={onLayout} {...pan.panHandlers}>
      <View style={styles.line} />
      <View style={[styles.fill, { width: filled, backgroundColor: color }]} />
      <View
        style={[
          styles.thumb,
          { left: clamp(filled - THUMB / 2, 0, Math.max(0, width - THUMB)), borderColor: color },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: { height: TRACK_HEIGHT, justifyContent: 'center', width: '100%' },
  line: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: LINE,
    borderRadius: LINE / 2,
    backgroundColor: Colors.border,
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
    shadowRadius: 2,
    elevation: 2,
  },
});
