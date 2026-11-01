import {
  FigureDemo,
  FigurePose,
  HEAD_RADIUS,
  Joint,
  lerpPose,
  Point,
  Segment,
  solvePose,
  THICKNESS,
} from './figure';

// =============================================================================
// What to draw for a pose: rounded bars between joints, and a circle head, in
// back-to-front order. Pure, so the app (ExerciseFigure.tsx) and any preview
// draw exactly the same thing.
// =============================================================================

export interface Capsule {
  kind: 'capsule';
  /** 'gap' is a background-coloured outline drawn under the arm, so it reads in front of the body. */
  fill: 'body' | 'gap';
  segment: Exclude<Segment, 'head'>;
  /** Centre, in figure units (y up). */
  cx: number;
  cy: number;
  /** End to end along the bar, round caps included. */
  length: number;
  thickness: number;
  /** Degrees, 0 = right, 90 = up. */
  angle: number;
}

export interface Circle {
  kind: 'circle';
  fill: 'body' | 'gap';
  cx: number;
  cy: number;
  r: number;
}

export type Shape = Capsule | Circle;

const BARS: [Exclude<Segment, 'head'>, Joint, Joint][] = [
  ['thigh', 'hip', 'knee'],
  ['shin', 'knee', 'ankle'],
  ['foot', 'ankle', 'toe'],
  ['torso', 'hip', 'shoulder'],
  ['upperArm', 'shoulder', 'elbow'],
  ['forearm', 'elbow', 'wrist'],
  ['hand', 'wrist', 'fingers'],
];

/** Width of the outline around the arm. */
export const GAP = 1.6;

const capsule = (segment: Exclude<Segment, 'head'>, a: Point, b: Point, fill: Capsule['fill'] = 'body'): Capsule => {
  const thickness = THICKNESS[segment] + (fill === 'gap' ? GAP * 2 : 0);
  return {
    kind: 'capsule',
    fill,
    segment,
    cx: (a.x + b.x) / 2,
    cy: (a.y + b.y) / 2,
    length: Math.hypot(b.x - a.x, b.y - a.y) + thickness,
    thickness,
    angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
  };
};

/** Legs, torso, head, then the arm in front with an outline under it. */
export function poseShapes(pose: FigurePose): Shape[] {
  const j = solvePose(pose);
  const bars = BARS.map(([s, a, b]) => capsule(s, j[a], j[b]));
  const armGap = BARS.slice(4).map(([s, a, b]) => capsule(s, j[a], j[b], 'gap'));
  const head: Circle = { kind: 'circle', fill: 'body', cx: j.head.x, cy: j.head.y, r: HEAD_RADIUS };
  return [...bars.slice(0, 4), head, ...armGap, ...bars.slice(4)];
}

export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

const shapeBounds = (s: Shape): Bounds => {
  // A capsule's extent along each axis: half its length projected, plus half its thickness.
  if (s.kind === 'circle') return { minX: s.cx - s.r, maxX: s.cx + s.r, minY: s.cy - s.r, maxY: s.cy + s.r };
  const r = s.thickness / 2;
  const hx = Math.abs(Math.cos((s.angle * Math.PI) / 180)) * (s.length / 2 - r) + r;
  const hy = Math.abs(Math.sin((s.angle * Math.PI) / 180)) * (s.length / 2 - r) + r;
  return { minX: s.cx - hx, maxX: s.cx + hx, minY: s.cy - hy, maxY: s.cy + hy };
};

/**
 * One frame that holds the whole movement, so the camera stays still while
 * the figure moves. Includes the floor when the demo has one.
 */
export function demoBounds(demo: FigureDemo, pad = 6): Bounds {
  const b: Bounds = { minX: Infinity, maxX: -Infinity, minY: demo.floor ? 0 : Infinity, maxY: -Infinity };
  const steps = demo.end ? 20 : 0;
  for (let i = 0; i <= steps; i++) {
    const pose = demo.end ? lerpPose(demo.start, demo.end, i / steps) : demo.start;
    for (const s of poseShapes(pose)) {
      const sb = shapeBounds(s);
      b.minX = Math.min(b.minX, sb.minX);
      b.maxX = Math.max(b.maxX, sb.maxX);
      b.minY = Math.min(b.minY, sb.minY);
      b.maxY = Math.max(b.maxY, sb.maxY);
    }
  }
  return { minX: b.minX - pad, maxX: b.maxX + pad, minY: b.minY - (demo.floor ? 0 : pad), maxY: b.maxY + pad };
}

/** Ease in and out, for a movement that slows at the top and bottom. */
export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
