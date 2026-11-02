import {
  cleanTaskText,
  clearedStats,
  clearedTasks,
  dayLabel,
  daysAvoided,
  describeAvoided,
  dreadVsReality,
  importable,
  importedIds,
  notYetImported,
  openTasks,
  outcome,
  streakWeeks,
  todaysRep,
  weekSummary,
} from '../avoidanceMath';
import type { AvoidanceTask } from '../../types/avoidance';
import type { AvoidanceTask as OldAvoidanceTask } from '../../types';

let n = 0;
const task = (over: Partial<AvoidanceTask>): AvoidanceTask => {
  n++;
  return {
    id: `t${n}`,
    text: `Task ${n}`,
    created_at: `2026-10-01T09:00:${String(n % 60).padStart(2, '0')}.000Z`,
    created_date: '2026-10-01',
    status: 'open',
    ...over,
  };
};
const done = (done_date: string, over: Partial<AvoidanceTask> = {}) =>
  task({ status: 'done', done_date, done_at: `${done_date}T12:00:00.000Z`, ...over });

// 2026-11-01 is a Sunday; its Monday-start week began 2026-10-26.
const TODAY = '2026-11-01';

describe('daysAvoided', () => {
  it('counts to today while open, and stops when cleared', () => {
    expect(daysAvoided(task({ created_date: '2026-10-09' }), TODAY)).toBe(23);
    expect(daysAvoided(task({ created_date: TODAY }), TODAY)).toBe(0);
    expect(daysAvoided(done('2026-10-05', { created_date: '2026-10-01' }), TODAY)).toBe(4);
  });

  it('crosses a month boundary', () => {
    expect(daysAvoided(task({ created_date: '2026-10-31' }), TODAY)).toBe(1);
  });

  it('reads as a sentence', () => {
    expect(describeAvoided(0)).toBe('Added today');
    expect(describeAvoided(1)).toBe('Avoided for 1 day');
    expect(describeAvoided(23)).toBe('Avoided for 23 days');
  });
});

describe('openTasks and todaysRep', () => {
  it('puts the oldest first; on the same day, the most dreaded', () => {
    const a = task({ created_date: '2026-10-20', forecast: 1 });
    const b = task({ created_date: '2026-10-05' });
    const c = task({ created_date: '2026-10-20', forecast: 3 });
    const gone = done('2026-10-30', { created_date: '2026-09-01' });
    expect(openTasks([a, b, c, gone]).map((t) => t.id)).toEqual([b.id, c.id, a.id]);
  });

  it('picks the oldest you haven’t passed over, or nothing', () => {
    const a = task({ created_date: '2026-10-01' });
    const b = task({ created_date: '2026-10-10' });
    expect(todaysRep([a, b], [])).toBe(a);
    expect(todaysRep([a, b], [a.id])).toBe(b);
    expect(todaysRep([a, b], [a.id, b.id])).toBeNull();
    expect(todaysRep([], [])).toBeNull();
  });
});

describe('clearedTasks', () => {
  it('is newest first, by day then time', () => {
    const a = done('2026-10-20');
    const b = done('2026-10-30', { done_at: '2026-10-30T08:00:00.000Z' });
    const c = done('2026-10-30', { done_at: '2026-10-30T18:00:00.000Z' });
    expect(clearedTasks([a, task({}), b, c]).map((t) => t.id)).toEqual([c.id, b.id, a.id]);
  });
});

describe('weekSummary and streakWeeks', () => {
  it('counts only this Monday-to-Sunday week', () => {
    const tasks = [done('2026-10-25'), done('2026-10-26'), done('2026-11-01'), task({})];
    expect(weekSummary(tasks, TODAY, 3)).toEqual({ cleared: 2, goal: 3, met: false });
    expect(weekSummary(tasks, TODAY, 2).met).toBe(true);
    expect(weekSummary([], TODAY, 3)).toEqual({ cleared: 0, goal: 3, met: false });
  });

  it('counts weeks in a row meeting the goal; an unmet week so far doesn’t break it', () => {
    const tasks = [done('2026-10-13'), done('2026-10-15'), done('2026-10-20'), done('2026-10-22'), done('2026-10-27')];
    expect(streakWeeks(tasks, TODAY, 2)).toBe(2);
    expect(streakWeeks([...tasks, done('2026-10-31')], TODAY, 2)).toBe(3);
    expect(streakWeeks([], TODAY, 2)).toBe(0);
  });
});

describe('dread vs reality', () => {
  it('compares the forecast with the rating', () => {
    expect(outcome(3, 1)).toBe('easier');
    expect(outcome(2, 2)).toBe('as_expected');
    expect(outcome(1, 3)).toBe('harder');
    expect(outcome(undefined, 2)).toBeNull();
    expect(outcome(2, undefined)).toBeNull();
  });

  it('counts only cleared tasks with both ratings, from a date if given', () => {
    const tasks = [
      done('2026-10-30', { forecast: 3, resistance: 1 }),
      done('2026-10-29', { forecast: 3, resistance: 2 }),
      done('2026-10-28', { forecast: 2, resistance: 2 }),
      done('2026-09-01', { forecast: 1, resistance: 3 }),
      done('2026-10-27', { resistance: 1 }), // no forecast
      task({ forecast: 3 }), // still open
    ];
    expect(dreadVsReality(tasks)).toEqual({ easier: 2, as_expected: 1, harder: 1, rated: 4 });
    expect(dreadVsReality(tasks, '2026-10-02')).toEqual({ easier: 2, as_expected: 1, harder: 0, rated: 3 });
    expect(dreadVsReality([])).toEqual({ easier: 0, as_expected: 0, harder: 0, rated: 0 });
  });
});

describe('clearedStats', () => {
  it('counts and averages days avoided', () => {
    expect(clearedStats([])).toEqual({ count: 0, avgDaysAvoided: null });
    const tasks = [
      done('2026-10-11', { created_date: '2026-10-01' }), // 10
      done('2026-10-04', { created_date: '2026-10-01' }), // 3
      task({}),
    ];
    expect(clearedStats(tasks)).toEqual({ count: 2, avgDaysAvoided: 7 });
  });
});

describe('cleanTaskText', () => {
  it('makes one trimmed line, refuses empty, caps the length', () => {
    expect(cleanTaskText('  Book   the\ndentist ')).toBe('Book the dentist');
    expect(cleanTaskText('   ')).toBeNull();
    expect(cleanTaskText('x'.repeat(200))).toHaveLength(120);
  });
});

describe('importable', () => {
  const old = (over: Partial<OldAvoidanceTask>): OldAvoidanceTask => ({
    id: 'o1',
    userId: 'u1',
    text: 'Clean the garage',
    createdAt: '2026-09-10T12:00:00.000Z',
    status: 'active',
    ...over,
  });
  let k = 0;
  const newId = () => `new${++k}`;

  it('brings over open tasks once, keeping their added date', () => {
    const out = importable([old({}), old({ id: 'o2', status: 'done' }), old({ id: 'o3', text: '  ' })], [], newId);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      text: 'Clean the garage',
      created_at: '2026-09-10T12:00:00.000Z',
      created_date: '2026-09-10',
      status: 'open',
      imported_from: 'o1',
    });
    expect(importable([old({})], out, newId)).toEqual([]);
  });

  it('counts a task with no readable date from now', () => {
    const now = new Date('2026-11-01T10:00:00.000Z');
    const [t] = importable([old({ createdAt: '' })], [], newId, now);
    expect(t.created_at).toBe('2026-11-01T10:00:00.000Z');
    expect(t.created_date).toBe('2026-11-01');
  });

  it('never offers a brought-over task again, even after it was deleted here', () => {
    const [brought] = importable([old({})], [], newId);
    const remembered = importedIds([brought]);
    expect(remembered).toEqual(['o1']);
    // Deleted from the new list: the task is gone, but prefs remember it.
    expect(importable([old({})], [], newId, new Date(), remembered)).toEqual([]);
    expect(notYetImported([old({})], [], remembered)).toEqual([]);
    // Without the remembered ids it would have come back.
    expect(notYetImported([old({})], [])).toHaveLength(1);
  });

  it('remembers ids from prefs and from tasks that still carry them, once each', () => {
    const t = task({ imported_from: 'o2' });
    expect(importedIds([t, task({})], ['o1', 'o2']).sort()).toEqual(['o1', 'o2']);
  });

  it('offers only what it would actually bring over — not a blank or cleared old task', () => {
    const list = [old({}), old({ id: 'o2', text: '  ' }), old({ id: 'o3', status: 'done' })];
    expect(notYetImported(list, []).map((o) => o.id)).toEqual(['o1']);
  });
});

describe('dayLabel', () => {
  it('names today and yesterday, across a month boundary', () => {
    expect(dayLabel('2026-11-01', TODAY)).toBe('Today');
    expect(dayLabel('2026-10-31', TODAY)).toBe('Yesterday');
    expect(dayLabel('2026-10-29', TODAY)).not.toMatch(/Today|Yesterday/);
  });
});
