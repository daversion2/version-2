import { cardioWeek, describeCardioCredit, validThresholds, zoneHeartRate, zoneInLine } from '../cardio';
import {
  applySetsToRecord,
  describeRecord,
  formatCardio,
  formatPace,
  formatSetValues,
  formatTarget,
  fromDisplayDistance,
  prefillFor,
  recordLines,
  toDisplayDistance,
} from '../workoutMath';
import { cleanValues, describeWeekRow, isLoggableSet, prefillFrom } from '../weeklyVolume';
import { estimateWorkoutMinutes, prescribedValues, startSession, logSet } from '../workoutSession';
import { CompletedWorkoutSession, Exercise, LoggedSet, Workout } from '../../types/workouts';

const EX: Record<string, Exercise> = {
  run: { id: 'run', name: 'Run', kind: 'cardio', muscle: 'full_body' },
  bike: { id: 'bike', name: 'Bike', kind: 'cardio', muscle: 'full_body' },
  mile: { id: 'mile', name: 'Mile Run', kind: 'distance', muscle: 'full_body', distanceM: 1609.344 },
  bench: { id: 'bench', name: 'Bench', kind: 'weight', muscle: 'chest' },
};

// Wednesday 2026-11-04, local time; the week runs Mon 2 – Sun 8.
const NOW = new Date(2026, 10, 4, 12, 0);
const set = (exerciseId: string, v: Partial<LoggedSet>): LoggedSet => ({ exerciseId, round: 0, at: NOW.toISOString(), ...v });
const session = (id: string, finished: Date, sets: LoggedSet[]): CompletedWorkoutSession => ({
  id,
  workout_name: 'W',
  started_at: finished.toISOString(),
  finished_at: finished.toISOString(),
  duration_sec: 0,
  total_sets: sets.length,
  total_volume_kg: 0,
  prs: [],
  blocks: [{ id: 'b', type: 'single', items: [], rounds: 1, restSec: 0, plannedRounds: 1, skipped: false, added: false, sets }],
});

describe('cardio this week', () => {
  const sessions = [
    session('a', new Date(2026, 10, 2, 7), [set('run', { seconds: 40 * 60, zone: 1 }), set('bench', { reps: 5, weightKg: 100 })]),
    session('b', new Date(2026, 10, 3, 7), [set('bike', { seconds: 20 * 60, zone: 2 }), set('bike', { seconds: 5 * 60, zone: 3 })]),
    session('c', new Date(2026, 10, 4, 7), [set('mile', { seconds: 8 * 60 })]),
    // Untagged cardio counts as easy.
    session('d', new Date(2026, 10, 4, 8), [set('run', { seconds: 10 * 60 })]),
    // Last week and next week don't count.
    session('old', new Date(2026, 10, 1, 23), [set('run', { seconds: 60 * 60, zone: 1 })]),
    session('next', new Date(2026, 10, 9, 1), [set('run', { seconds: 60 * 60, zone: 1 })]),
  ];

  it('sums minutes by zone, a timed distance as above VT2', () => {
    const w = cardioWeek({ sessions, exercisesById: EX, now: NOW });
    expect(w.minutesByZone).toEqual({ 1: 50, 2: 20, 3: 13 });
    expect(w.totalMin).toBe(83);
    expect(w.easyShare).toBeCloseTo(50 / 83);
  });

  it('counts minutes above VT1 twice toward 150', () => {
    const w = cardioWeek({ sessions, exercisesById: EX, now: NOW });
    expect(w.creditMin).toBe(50 + 2 * 33);
    expect(w.goalMin).toBe(150);
    expect(describeCardioCredit(w)).toBe('116 of 150 min');
    expect(describeCardioCredit({ creditMin: 151.4, goalMin: 150 })).toBe('Goal met · 151 of 150 min');
  });

  it('is empty with no cardio', () => {
    const w = cardioWeek({ sessions: [], exercisesById: EX, now: NOW });
    expect(w).toMatchObject({ totalMin: 0, creditMin: 0, easyShare: 0 });
  });

  it('names a zone mid-sentence', () => {
    expect([1, 2, 3].map((z) => zoneInLine(z as 1 | 2 | 3))).toEqual(['below VT1', 'VT1 – VT2', 'above VT2']);
  });

  it('shows heart-rate ranges only when the thresholds are known', () => {
    expect(zoneHeartRate(1, 142, 168)).toBe('below 142 bpm');
    expect(zoneHeartRate(2, 142, 168)).toBe('142–168 bpm');
    expect(zoneHeartRate(3, 142, 168)).toBe('above 168 bpm');
    expect(zoneHeartRate(2, 142)).toBeNull();
    expect(zoneHeartRate(3)).toBeNull();
    expect(validThresholds(142, 168)).toBe(true);
    expect(validThresholds(170, 160)).toBe(false);
    expect(validThresholds(undefined, 160)).toBe(true);
  });
});

describe('cardio sets', () => {
  it('formats time, distance in the user’s unit, and zone', () => {
    expect(formatCardio({ seconds: 1800, distanceM: 5000, zone: 1 }, 'kg')).toBe('30 min · 5 km · Below VT1');
    expect(formatCardio({ seconds: 1830, zone: 3 }, 'lb')).toBe('30:30 · Above VT2');
    expect(formatSetValues({ seconds: 2700, distanceM: 8046.72, zone: 2 }, 'cardio', 'lb')).toBe('45 min · 5 mi · VT1 – VT2');
    expect(formatTarget({}, 'cardio', 'kg')).toBe('30 min · Below VT1');
    expect(formatPace(1800, 5000, 'kg')).toBe('6:00 /km');
    expect(formatPace(1800, 0, 'kg')).toBeNull();
    expect(toDisplayDistance(fromDisplayDistance(3.1, 'lb'), 'lb')).toBe(3.1);
  });

  it('keeps the plan’s zone, and last time’s time and distance', () => {
    const last = [set('run', { seconds: 2400, distanceM: 6000, zone: 1 })];
    expect(prefillFor('cardio', { seconds: 1200, zone: 3 }, last, 0).values).toEqual({ seconds: 2400, distanceM: 6000, zone: 3 });
    expect(prefillFor('cardio', {}, [], 0).values).toEqual({ seconds: 1800, zone: 1 });
    expect(prescribedValues('cardio', { seconds: 1200, zone: 3 }, { seconds: 2400, distanceM: 6000, zone: 1 })).toEqual({
      seconds: 1200,
      distanceM: 6000,
      zone: 3,
    });
  });

  it('sets longest and farthest records, after a baseline', () => {
    const first = applySetsToRecord('run', 'cardio', [set('run', { seconds: 1800, distanceM: 5000, zone: 1 })]);
    expect(first.prs).toEqual([]);
    expect(first.record).toMatchObject({ longestSec: 1800, farthestM: 5000 });
    const next = applySetsToRecord('run', 'cardio', [set('run', { seconds: 2400, distanceM: 7000, zone: 1 })], first.record);
    expect(next.prs.map((p) => p.type)).toEqual(['longest_hold', 'farthest']);
    const farthest = next.prs.find((p) => p.type === 'farthest')!;
    expect(describeRecord(farthest, 'Run', 'kg')).toEqual({ title: 'Run — farthest yet', detail: '7 km (was 5 km)' });
    expect(recordLines(next.record, 'kg')).toEqual(['Longest 40:00', 'Farthest 7 km']);
  });

  it('can be added on This week, and keeps only cardio numbers', () => {
    expect(isLoggableSet('cardio', { seconds: 600 })).toBe(true);
    expect(isLoggableSet('cardio', { seconds: 0 })).toBe(false);
    expect(cleanValues('cardio', { seconds: 600.4, distanceM: 0, reps: 9, zone: 2 })).toEqual({ seconds: 600, zone: 2 });
    expect(cleanValues('cardio', { seconds: 600 })).toEqual({ seconds: 600, zone: 1 });
    const s = [session('a', NOW, [set('run', { seconds: 2000, distanceM: 5000, zone: 2 })])];
    expect(prefillFrom(s, EX.run)).toEqual({ seconds: 2000, distanceM: 5000, zone: 2 });
    expect(prefillFrom([], EX.run)).toEqual({ seconds: 1800, zone: 1 });
    expect(describeWeekRow({ kind: 'cardio', sets: 2, seconds: 3600 } as Parameters<typeof describeWeekRow>[0], 'kg')).toBe('60 min · 2 times');
  });

  it('logs distance and zone through a live session, and estimates its length', () => {
    const workout: Workout = {
      id: 'w',
      name: 'Easy run',
      created_at: NOW.toISOString(),
      updated_at: NOW.toISOString(),
      blocks: [{ id: 'b', type: 'single', items: [{ exerciseId: 'run', target: { seconds: 2400, zone: 1 } }], rounds: 1, restSec: 0 }],
    };
    const s = logSet(startSession({ id: 's', workout, now: NOW }), { seconds: 2500, distanceM: 6200, zone: 1 }, NOW).session;
    expect(s.blocks[0].sets[0]).toMatchObject({ seconds: 2500, distanceM: 6200, zone: 1 });
    expect(estimateWorkoutMinutes(workout, EX)).toBe(40);
  });
});
