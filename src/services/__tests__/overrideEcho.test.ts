import type { CompletionLog } from '../../types';
import {
  appRatedDays,
  keepGoingEcho,
  mealsDayEcho,
  overrideEcho,
  pairEcho,
  RatedDay,
} from '../overrideEcho';

const TODAY = '2026-11-01';
const day = (n: number) => {
  // n days before TODAY
  const d = new Date(2026, 10, 1, 12);
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const rated = (daysAgo: number, resistance: number): RatedDay => ({ date: day(daysAgo), resistance });

// Four hard ratings a month ago, two easy ones this week.
const fallingHistory = [rated(30, 3), rated(29, 3), rated(27, 2), rated(25, 3), rated(3, 1)];

describe('overrideEcho', () => {
  it('never compares with earlier ratings, even when they have fallen', () => {
    // The effort is the reward (2026-11-20): no "first two weeks" line.
    for (const level of [1, 2, 3]) {
      expect(overrideEcho({ level, history: fallingHistory })).not.toMatch(/first two weeks|this week|down|easier/);
    }
  });

  it('says what the level is worth', () => {
    expect(overrideEcho({ level: 3, history: [] })).toMatch(/refrain from posting/);
    expect(overrideEcho({ level: 2, history: [] })).toMatch(/talk yourself into it/);
    expect(overrideEcho({ level: 1, history: [] })).toMatch(/count/i);
  });

  it('alternates the level line so a daily rating varies', () => {
    const first = overrideEcho({ level: 2, history: [] });
    const second = overrideEcho({ level: 2, history: [rated(1, 2)] });
    expect(first).not.toBe(second);
  });

  it('clamps a value outside 1–3', () => {
    expect(overrideEcho({ level: 7, history: [] })).toMatch(/refrain from posting/);
  });
});

describe('appRatedDays', () => {
  const log = (id: string, fields: Partial<CompletionLog>) =>
    ({ id, reference_id: 'app:workouts', date: TODAY, ...fields }) as CompletionLog;

  it("keeps this app's rated logs, minus the one just written", () => {
    const logs = [
      log('a', { resistance: 2, resistance_scale: 3 }),
      log('b', { resistance: 3, resistance_scale: 3 }),
      log('c', { reference_id: 'app:meditate', resistance: 1, resistance_scale: 3 }),
      log('d', {}),
    ];
    expect(appRatedDays(logs, 'workouts', 'b')).toEqual([{ date: TODAY, resistance: 2 }]);
  });
});

describe('pairEcho', () => {
  it('reads a hard start and an easy finish as getting started being the hard part', () => {
    expect(pairEcho({ override: 3, keepGoing: 1 })).toMatch(/Getting started was the hard part/);
  });

  it('credits keeping going when only the middle was hard', () => {
    expect(pairEcho({ override: 1, keepGoing: 3 })).toMatch(/you kept going/);
  });

  it('gives each pairing its own line, and never tells anyone to raise the bar', () => {
    const lines = [
      pairEcho({ override: 3, keepGoing: 3 }),
      pairEcho({ override: 2, keepGoing: 2 }),
      pairEcho({ override: 2, keepGoing: 1 }),
      pairEcho({ override: 1, keepGoing: 3 }),
      pairEcho({ override: 1, keepGoing: 1 }),
    ];
    expect(new Set(lines).size).toBe(5);
    expect(lines.some((l) => /raise the bar|push/i.test(l))).toBe(false);
  });

  it('never promises it will get easier', () => {
    const lines = [1, 2, 3].flatMap((o) => [1, 2, 3].map((k) => pairEcho({ override: o, keepGoing: k })));
    expect(lines.some((l) => /easier|less override|first two weeks/i.test(l))).toBe(false);
  });
});

describe('keepGoingEcho', () => {
  it('has a line for each level', () => {
    expect(new Set([keepGoingEcho(1), keepGoingEcho(2), keepGoingEcho(3)]).size).toBe(3);
    expect(keepGoingEcho(3)).toMatch(/wanted to quit/);
  });
});

describe('mealsDayEcho', () => {
  it('credits an off-target day that was fought for', () => {
    expect(mealsDayEcho(3, false)).toMatch(/fought for it/);
    expect(mealsDayEcho(1, false)).toMatch(/Off target/);
  });

  it('has a line for each on-target level', () => {
    expect(new Set([mealsDayEcho(1, true), mealsDayEcho(2, true), mealsDayEcho(3)]).size).toBe(3);
  });
});

describe('toast lines are admin-editable', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { setLiveCopyOverrides } = require('../appCopy');
  afterEach(() => setLiveCopyOverrides({}));

  it('uses the edit for a toast key', () => {
    setLiveCopyOverrides({ 'toast.start.3a': 'Edited hard start.' });
    expect(overrideEcho({ level: 3, history: [] })).toBe('Edited hard start.');
    setLiveCopyOverrides({ 'toast.keepGoing.1': 'Edited steady.' });
    expect(keepGoingEcho(1)).toBe('Edited steady.');
  });
});
