import type { CompletionLog } from '../../types';
import { appRatedDays, mealsDayEcho, overrideEcho, overrideTrend, pairEcho, RatedDay } from '../overrideEcho';

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

describe('overrideTrend', () => {
  it('compares the first two weeks with the last 7 days', () => {
    const trend = overrideTrend(fallingHistory, rated(0, 1), TODAY);
    expect(trend).toEqual({ first: 2.75, recent: 1 });
  });

  it('waits until the two windows no longer overlap', () => {
    const history = [rated(15, 3), rated(14, 3), rated(13, 3), rated(2, 1)];
    expect(overrideTrend(history, rated(0, 1), TODAY)).toBeNull();
  });

  it('needs three ratings in the first weeks', () => {
    const history = [rated(30, 3), rated(29, 3), rated(3, 1)];
    expect(overrideTrend(history, rated(0, 1), TODAY)).toBeNull();
  });

  it('needs two ratings this week, counting the new one', () => {
    const history = [rated(30, 3), rated(29, 3), rated(28, 3)];
    expect(overrideTrend(history, rated(0, 1), TODAY)).toBeNull();
  });
});

describe('overrideEcho', () => {
  const base = { appName: 'Workouts', date: TODAY, today: TODAY };

  it('says the trend when the override has fallen', () => {
    expect(overrideEcho({ ...base, level: 1, history: fallingHistory })).toBe(
      'Your Workouts override: 2.8 of 3 your first two weeks, 1.0 this week.'
    );
  });

  it('keeps the trend after a hard rating, said kindly', () => {
    const history = [rated(30, 3), rated(29, 3), rated(27, 3), rated(25, 3), rated(3, 1), rated(2, 1)];
    expect(overrideEcho({ ...base, level: 3, history })).toBe(
      'A hard one today, but your Workouts override is still down: 3.0 of 3 your first two weeks, 1.7 this week.'
    );
  });

  it('never puts a rising override in the toast', () => {
    const history = [rated(30, 1), rated(29, 1), rated(27, 1), rated(3, 3)];
    expect(overrideEcho({ ...base, level: 3, history })).not.toMatch(/first two weeks/);
  });

  it('ignores a fall smaller than half a level', () => {
    // 2.3 → 2.0
    const history = [rated(30, 2), rated(29, 2), rated(27, 3), rated(3, 2)];
    expect(overrideEcho({ ...base, level: 2, history })).not.toMatch(/first two weeks/);
  });

  it('says what the level means when there is no trend yet', () => {
    expect(overrideEcho({ ...base, level: 3, history: [] })).toMatch(/started anyway/);
    expect(overrideEcho({ ...base, level: 2, history: [] })).toMatch(/push/);
    expect(overrideEcho({ ...base, level: 1, history: [] })).toMatch(/override/i);
  });

  it('alternates the level line so a daily rating varies', () => {
    const first = overrideEcho({ ...base, level: 2, history: [] });
    const second = overrideEcho({ ...base, level: 2, history: [rated(1, 2)] });
    expect(first).not.toBe(second);
  });

  it('clamps a value outside 1–3', () => {
    expect(overrideEcho({ ...base, level: 7, history: [] })).toMatch(/started anyway/);
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
  const base = { appName: 'Workouts', history: [] as RatedDay[], date: '2026-11-11', today: '2026-11-11' };

  it('reads a hard start and an easy session as getting started being the win', () => {
    expect(pairEcho({ ...base, override: 3, push: 1 })).toMatch(/Getting started was the win/);
  });

  it('gives each pairing its own line', () => {
    const lines = new Set([
      pairEcho({ ...base, override: 3, push: 3 }),
      pairEcho({ ...base, override: 2, push: 2 }),
      pairEcho({ ...base, override: 2, push: 1 }),
      pairEcho({ ...base, override: 1, push: 3 }),
      pairEcho({ ...base, override: 1, push: 1 }),
    ]);
    expect(lines.size).toBe(5);
  });

  it('still leads with a falling override when there is one', () => {
    const history: RatedDay[] = [
      { date: '2026-10-01', resistance: 3 },
      { date: '2026-10-03', resistance: 3 },
      { date: '2026-10-05', resistance: 3 },
      { date: '2026-11-09', resistance: 1 },
    ];
    expect(pairEcho({ ...base, history, override: 1, push: 2 })).toMatch(/^Your Workouts override: 3\.0 of 3/);
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
