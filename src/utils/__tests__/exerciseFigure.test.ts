import { EXERCISE_FIGURES } from '../../data/exerciseFigures';
import {
  bodyLineBend,
  chestClearance,
  directionOf,
  headOffset,
  jointAngle,
  lerpPose,
  reachElbow,
  solvePose,
  THICKNESS,
} from '../exerciseFigure/figure';

const pushUp = EXERCISE_FIGURES['push-up'];
const end = pushUp.end!;

describe('figure geometry', () => {
  it('pins the anchor joint, and plants the reached wrist', () => {
    const j = solvePose(pushUp.start);
    expect(j.toe).toEqual(pushUp.start.anchor.at);
    expect(j.wrist).toEqual(pushUp.start.reach!.wrist);
  });

  it('bends an arm to reach a point, keeping both bone lengths', () => {
    const elbow = reachElbow({ x: 0, y: 0 }, { x: 10, y: 0 }, 6, 6, 1);
    expect(elbow.x).toBeCloseTo(5);
    expect(elbow.y).toBeCloseTo(Math.sqrt(11)); // bend 1 = elbow counter-clockwise (above)
    expect(reachElbow({ x: 0, y: 0 }, { x: 10, y: 0 }, 6, 6, -1).y).toBeCloseTo(-Math.sqrt(11));
  });

  it('blends half-way between two poses, the short way round', () => {
    const mid = lerpPose(pushUp.start, end, 0.5);
    expect(mid.angles.torso).toBeCloseTo((162.6 + 182.2) / 2);
    expect(mid.angles.upperArm).toBeCloseTo(339.6); // 270 → 49.2 turns up through 360
    expect(mid.scale?.upperArm).toBeCloseTo((1 + end.scale!.upperArm!) / 2);
  });
});

// The form a coach would check. These are the faults the generated photos had.
describe('push-up form', () => {
  it.each([
    ['start', pushUp.start],
    ['end', end],
  ])('%s: head neutral, in line with the spine', (_, pose) => {
    expect(headOffset(pose)).toBeLessThan(5);
  });

  it.each([
    ['start', pushUp.start],
    ['end', end],
  ])('%s: body in one straight line, head to heels', (_, pose) => {
    expect(bodyLineBend(pose)).toBeLessThan(3);
  });

  it.each([
    ['start', pushUp.start],
    ['end', end],
  ])('%s: hands and toes on the floor', (_, pose) => {
    const j = solvePose(pose);
    expect(j.wrist.y).toBeCloseTo(THICKNESS.hand / 2, 1);
    expect(j.fingers.y).toBeCloseTo(THICKNESS.hand / 2, 1);
    expect(j.toe.y).toBeCloseTo(THICKNESS.foot / 2, 0);
  });

  it('keeps hands and toes planted all the way down, and the arms whole', () => {
    for (let t = 0; t <= 1; t += 0.1) {
      const j = solvePose(lerpPose(pushUp.start, end, t));
      expect(j.toe).toEqual(pushUp.start.anchor.at);
      expect(j.wrist).toEqual(pushUp.start.reach!.wrist);
      expect(Math.hypot(j.wrist.x - j.elbow.x, j.wrist.y - j.elbow.y)).toBeCloseTo(14, 1);
    }
  });

  it('starts with straight arms, shoulders over the hands', () => {
    const j = solvePose(pushUp.start);
    expect(jointAngle(directionOf(j.shoulder, j.elbow), directionOf(j.elbow, j.wrist))).toBeGreaterThan(170);
    expect(Math.abs(j.shoulder.x - j.wrist.x)).toBeLessThan(1);
  });

  it('goes all the way down: chest about an inch off the floor', () => {
    // A figure unit is ~1.6 cm (the athlete is ~110 tall), so an inch is ~1.6.
    expect(chestClearance(end)).toBeGreaterThan(0.5);
    expect(chestClearance(end)).toBeLessThan(2.5);
  });

  it('ends with the arms meeting the body: the elbow lands on the upper arm', () => {
    const j = solvePose(end);
    const elbowFromShoulder = Math.hypot(j.elbow.x - j.shoulder.x, j.elbow.y - j.shoulder.y);
    expect(elbowFromShoulder).toBeCloseTo(17 * end.scale!.upperArm!, 0);
    // Forearm within 30° of vertical at the bottom, leaning back toward the feet.
    const lean = Math.abs(90 - Math.abs(directionOf(j.wrist, j.elbow)));
    expect(lean).toBeLessThan(30);
  });
});
