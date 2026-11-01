// =============================================================================
// A drawn exercise figure: one side-view body, posed by the direction of each
// body segment. Pure geometry — the app draws the result (ExerciseFigure.tsx),
// and tests check the form itself: head neutral, body straight, full depth.
//
// Units are figure units (the athlete is about 110 tall), y points UP, and the
// floor is y = 0. Angles are degrees: 0 = pointing right, 90 = up, 180 = left.
// =============================================================================

export type Segment = 'torso' | 'head' | 'upperArm' | 'forearm' | 'hand' | 'thigh' | 'shin' | 'foot';
export type Joint = 'hip' | 'shoulder' | 'head' | 'elbow' | 'wrist' | 'fingers' | 'knee' | 'ankle' | 'toe';

export interface Point {
  x: number;
  y: number;
}

/** Shoulder→head is to the head's centre; every other length is joint to joint. */
export const LENGTHS: Record<Segment, number> = {
  torso: 30,
  head: 12.5,
  upperArm: 17,
  forearm: 14,
  hand: 5,
  thigh: 25,
  shin: 23,
  foot: 8,
};
export const HEAD_RADIUS = 6;
/** How thick each part is drawn. Torso is chest depth, so "chest to the floor" is measured off it. */
export const THICKNESS: Record<Exclude<Segment, 'head'>, number> = {
  torso: 11,
  upperArm: 5,
  forearm: 4.5,
  hand: 3.5,
  thigh: 7,
  shin: 5.5,
  foot: 3.5,
};

export interface FigurePose {
  /**
   * Which way each segment points. Torso: hip → shoulder. Head: shoulder →
   * head. Arms and legs: away from the body (shoulder → elbow → wrist → fingers,
   * hip → knee → ankle → toe).
   */
  angles: Record<Segment, number>;
  /**
   * Shrinks a segment's drawn length when it points toward the camera — an
   * upper arm angled out at 45° looks shorter from the side. 1 when left out.
   */
  scale?: Partial<Record<Segment, number>>;
  /** This joint is pinned here; the rest of the body hangs off it. */
  anchor: { joint: Joint; at: Point };
  /**
   * A second planted point: the arm bends to put the wrist here, whatever the
   * body does (hands on the floor in a push-up, the toes being the anchor).
   * The upperArm/forearm angles are then ignored. `bend` picks which way the
   * elbow points: 1 = counter-clockwise of the shoulder→wrist line, -1 = clockwise.
   */
  reach?: { wrist: Point; bend: 1 | -1 };
}

const rad = (deg: number) => (deg * Math.PI) / 180;

const step = (from: Point, deg: number, length: number): Point => ({
  x: from.x + Math.cos(rad(deg)) * length,
  y: from.y + Math.sin(rad(deg)) * length,
});

/** Where every joint sits for this pose. */
export function solvePose(pose: FigurePose): Record<Joint, Point> {
  const a = pose.angles;
  const len = (s: Segment) => LENGTHS[s] * (pose.scale?.[s] ?? 1);
  const hip = { x: 0, y: 0 };
  const shoulder = step(hip, a.torso, len('torso'));
  const elbow = step(shoulder, a.upperArm, len('upperArm'));
  const wrist = step(elbow, a.forearm, len('forearm'));
  const knee = step(hip, a.thigh, len('thigh'));
  const ankle = step(knee, a.shin, len('shin'));
  const joints: Record<Joint, Point> = {
    hip,
    shoulder,
    head: step(shoulder, a.head, len('head')),
    elbow,
    wrist,
    fingers: step(wrist, a.hand, len('hand')),
    knee,
    ankle,
    toe: step(ankle, a.foot, len('foot')),
  };
  const pinned = joints[pose.anchor.joint];
  const dx = pose.anchor.at.x - pinned.x;
  const dy = pose.anchor.at.y - pinned.y;
  for (const j of Object.keys(joints) as Joint[]) joints[j] = { x: joints[j].x + dx, y: joints[j].y + dy };

  if (pose.reach) {
    joints.elbow = reachElbow(joints.shoulder, pose.reach.wrist, len('upperArm'), len('forearm'), pose.reach.bend);
    joints.wrist = pose.reach.wrist;
    joints.fingers = step(joints.wrist, a.hand, len('hand'));
  }
  return joints;
}

/**
 * Two-bone reach: where the elbow goes so a shoulder→elbow of length `l1` and
 * elbow→wrist of `l2` end at `target`. Out of reach, the arm points straight at it.
 */
export function reachElbow(shoulder: Point, target: Point, l1: number, l2: number, bend: 1 | -1): Point {
  const dx = target.x - shoulder.x;
  const dy = target.y - shoulder.y;
  const d = Math.min(Math.max(Math.hypot(dx, dy), Math.abs(l1 - l2) + 1e-6), l1 + l2);
  const toward = Math.atan2(dy, dx);
  const cos = Math.min(1, Math.max(-1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)));
  const a = toward + bend * Math.acos(cos);
  return { x: shoulder.x + Math.cos(a) * l1, y: shoulder.y + Math.sin(a) * l1 };
}

/** Which way a segment points, from the solved joints. */
export const directionOf = (from: Point, to: Point) => (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;

/** Turn by the short way round, so 350° → 10° doesn't spin the long way. */
const lerpAngle = (a: number, b: number, t: number) => {
  const d = ((((b - a) % 360) + 540) % 360) - 180;
  return a + d * t;
};

/** A pose part-way from `a` to `b` (t from 0 to 1). Both must pin the same joint. */
export function lerpPose(a: FigurePose, b: FigurePose, t: number): FigurePose {
  if (a.anchor.joint !== b.anchor.joint) throw new Error('Poses pin different joints — they can’t be blended');
  const segs = Object.keys(a.angles) as Segment[];
  const scale: Partial<Record<Segment, number>> = {};
  for (const s of segs) {
    const sa = a.scale?.[s] ?? 1;
    const sb = b.scale?.[s] ?? 1;
    if (sa !== 1 || sb !== 1) scale[s] = sa + (sb - sa) * t;
  }
  const reach =
    a.reach && b.reach
      ? {
          wrist: { x: a.reach.wrist.x + (b.reach.wrist.x - a.reach.wrist.x) * t, y: a.reach.wrist.y + (b.reach.wrist.y - a.reach.wrist.y) * t },
          bend: a.reach.bend,
        }
      : undefined;
  return {
    angles: Object.fromEntries(segs.map((s) => [s, lerpAngle(a.angles[s], b.angles[s], t)])) as Record<Segment, number>,
    scale,
    ...(reach ? { reach } : {}),
    anchor: {
      joint: a.anchor.joint,
      at: { x: a.anchor.at.x + (b.anchor.at.x - a.anchor.at.x) * t, y: a.anchor.at.y + (b.anchor.at.y - a.anchor.at.y) * t },
    },
  };
}

// -----------------------------------------------------------------------------
// Form checks — what the tests hold each pose to
// -----------------------------------------------------------------------------

/** How far two directions differ, 0–180. */
export const angleBetween = (a: number, b: number) => Math.abs(((((b - a) % 360) + 540) % 360) - 180);

/** The bend at a joint: 180 = straight, smaller = more bent. */
export const jointAngle = (incoming: number, outgoing: number) => 180 - angleBetween(incoming, outgoing);

/** Head in line with the torso: 0 = perfectly neutral. */
export const headOffset = (pose: FigurePose) => angleBetween(pose.angles.torso, pose.angles.head);

/** Shoulder–hip–knee–ankle in one line: the worst bend along it, 0 = straight. */
export const bodyLineBend = (pose: FigurePose) =>
  Math.max(angleBetween(pose.angles.torso + 180, pose.angles.thigh), angleBetween(pose.angles.thigh, pose.angles.shin));

/** Gap between the bottom of the chest and the floor, at the shoulder end of the torso. */
export const chestClearance = (pose: FigurePose) => solvePose(pose).shoulder.y - THICKNESS.torso / 2;

/** Every exercise's figure poses: start, and end if it has one. */
export interface FigureDemo {
  start: FigurePose;
  end?: FigurePose;
  /** Props drawn with the figure, in figure units. Just the floor for now. */
  floor?: boolean;
}
