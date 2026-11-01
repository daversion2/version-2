import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Colors } from '../../../../../constants/theme';
import { FigureDemo, lerpPose } from '../../../../../utils/exerciseFigure/figure';
import { demoBounds, easeInOut, poseShapes, Shape } from '../../../../../utils/exerciseFigure/shapes';
import { WORKOUTS_ACCENT } from './workoutsStyle';

/** One rep: down, hold at the bottom, up, rest at the top. Milliseconds. */
const DOWN = 1200;
const HOLD = 300;
const UP = 1200;
const REST = 500;
const CYCLE = DOWN + HOLD + UP + REST;

/** Where in the movement we are, 0 = start, 1 = end, for a time into the cycle. */
const phaseAt = (ms: number) => {
  const m = ms % CYCLE;
  if (m < DOWN) return easeInOut(m / DOWN);
  if (m < DOWN + HOLD) return 1;
  if (m < DOWN + HOLD + UP) return 1 - easeInOut((m - DOWN - HOLD) / UP);
  return 0;
};

const FLOOR_THICKNESS = 1.2;

/**
 * The drawn exercise figure: plain Views, so it needs no native module and
 * ships over the air. `show` picks a still (start or end) or the looping rep.
 * `background` must match what it sits on — the arm's outline is drawn in it.
 */
export const ExerciseFigure: React.FC<{
  demo: FigureDemo;
  width: number;
  show?: 'animate' | 'start' | 'end';
  background?: string;
}> = ({ demo, width, show = 'animate', background = Colors.white }) => {
  const bounds = useMemo(() => demoBounds(demo), [demo]);
  const scale = width / (bounds.maxX - bounds.minX);
  const height = (bounds.maxY - bounds.minY + (demo.floor ? FLOOR_THICKNESS : 0)) * scale;
  const animate = show === 'animate' && !!demo.end;
  const [t, setT] = useState(show === 'end' ? 1 : 0);

  useEffect(() => {
    if (!animate) {
      setT(show === 'end' ? 1 : 0);
      return;
    }
    let frame = 0;
    const began = Date.now();
    const tick = () => {
      setT(phaseAt(Date.now() - began));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [animate, show]);

  const pose = demo.end ? lerpPose(demo.start, demo.end, t) : demo.start;
  const toX = (x: number) => (x - bounds.minX) * scale;
  const toY = (y: number) => (bounds.maxY - y) * scale;

  const draw = (s: Shape, i: number) => {
    const color = s.fill === 'gap' ? background : WORKOUTS_ACCENT;
    if (s.kind === 'circle') {
      const d = s.r * 2 * scale;
      return (
        <View
          key={i}
          style={{ position: 'absolute', left: toX(s.cx) - d / 2, top: toY(s.cy) - d / 2, width: d, height: d, borderRadius: d / 2, backgroundColor: color }}
        />
      );
    }
    const w = s.length * scale;
    const h = s.thickness * scale;
    return (
      <View
        key={i}
        style={{
          position: 'absolute',
          left: toX(s.cx) - w / 2,
          top: toY(s.cy) - h / 2,
          width: w,
          height: h,
          borderRadius: h / 2,
          backgroundColor: color,
          transform: [{ rotate: `${-s.angle}deg` }],
        }}
      />
    );
  };

  return (
    <View style={{ width, height, overflow: 'hidden' }} accessible accessibilityRole="image">
      {poseShapes(pose).map(draw)}
      {demo.floor && (
        <View
          style={{ position: 'absolute', left: 0, top: toY(0), width, height: FLOOR_THICKNESS * scale, backgroundColor: Colors.border }}
        />
      )}
    </View>
  );
};
