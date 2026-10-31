import React from 'react';
import { View } from 'react-native';
import { clampPct, nestedRingSizes, ringEndCap } from '../../utils/ringMath';

interface RingProps {
  /** 0–1. */
  pct: number;
  color: string;
  size?: number;
  stroke?: number;
  /** Defaults to `color` at low opacity, like Apple's activity rings. */
  trackColor?: string;
}

/**
 * One progress ring from plain Views (no SVG in the binary): two half-ring
 * borders, each clipped to one half of the circle and rotated into view, with
 * a dot on each end so the arc reads as rounded. Starts at 12 o'clock.
 * Decorative: the caller labels it (AppRings does).
 */
export const ProgressRing: React.FC<RingProps> = ({ pct, color, size = 62, stroke = 7, trackColor }) => {
  const p = clampPct(pct);
  const deg = p * 360;
  const half = size / 2;
  const arc = {
    position: 'absolute' as const,
    width: size,
    height: size,
    borderRadius: half,
    borderWidth: stroke,
    borderColor: 'transparent',
    borderTopColor: color,
    borderRightColor: color,
  };
  const cap = (x: number, y: number) => ({
    position: 'absolute' as const,
    left: x - stroke / 2,
    top: y - stroke / 2,
    width: stroke,
    height: stroke,
    borderRadius: stroke / 2,
    backgroundColor: color,
  });
  const end = ringEndCap(p, size, stroke);

  return (
    <View style={{ width: size, height: size }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: half,
          borderWidth: stroke,
          borderColor: trackColor ?? color + '29',
        }}
      />
      {/* Each half only when it has something to show: a parked half leaves a
          hairline where its edge meets the clip. */}
      {deg > 0 && (
        <View style={{ position: 'absolute', left: half, width: half, height: size, overflow: 'hidden' }}>
          <View style={[arc, { left: -half, transform: [{ rotate: `${-135 + Math.min(deg, 180)}deg` }] }]} />
        </View>
      )}
      {deg > 180 && (
        <View style={{ position: 'absolute', left: 0, width: half, height: size, overflow: 'hidden' }}>
          <View style={[arc, { transform: [{ rotate: `${45 + (deg - 180)}deg` }] }]} />
        </View>
      )}
      {p > 0 && <View style={cap(half, stroke / 2)} />}
      {p > 0 && <View style={cap(end.x, end.y)} />}
    </View>
  );
};

interface AppRingsProps {
  /** Outermost first. */
  rings: { pct: number; color: string }[];
  /** Read out in place of the drawing, e.g. "Meditate 3 of 5, Workouts 2 of 3". */
  accessibilityLabel: string;
  size?: number;
  stroke?: number;
  gap?: number;
}

/** Rings nested one inside the next, Apple Fitness style — Today's headline. */
export const AppRings: React.FC<AppRingsProps> = ({ rings, accessibilityLabel, size = 140, stroke = 13, gap = 4 }) => {
  const sizes = nestedRingSizes(rings.length, size, stroke, gap);
  return (
    <View
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      {rings.map((r, i) => (
        <View key={i} style={{ position: 'absolute' }}>
          <ProgressRing pct={r.pct} color={r.color} size={sizes[i]} stroke={stroke} />
        </View>
      ))}
    </View>
  );
};
