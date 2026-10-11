import {
  buildFrictionOverview,
  startingDifficulty,
  withArticle,
  growthLabel,
  frictionSentence,
  FrictionOverview,
} from '../frictionCapacity';
import { addDays } from '../habitSchedule';
import { CompletionLog } from '../../types';

const TODAY = '2026-10-14';

let seq = 0;
const log = (habitId: string, date: string, resistance: number, over: Partial<CompletionLog> = {}): CompletionLog =>
  ({
    id: `l${seq++}`,
    user_id: 'u1',
    type: 'nudge',
    reference_id: habitId,
    points: resistance,
    difficulty: resistance === 1 ? 1 : 2,
    resistance,
    resistance_scale: 3,
    date,
    completed_at: `${date}T0${seq % 10}:00:00Z`,
    ...over,
  }) as CompletionLog;

/** Window w (0 = oldest of 8) ends on this date; the last window ends today. */
const windowEnd = (w: number) => addDays(TODAY, -7 * (7 - w));

/** Lay ratings into a window on consecutive days ending at its last day. */
const inWindow = (w: number, habitId: string, ratings: number[]) =>
  ratings.map((r, i) => log(habitId, addDays(windowEnd(w), -(ratings.length - 1 - i)), r));

/** The mockup's user: Workout gets easier, then Cold Exposure is added in window 6. */
const mockupLogs = (): CompletionLog[] => [
  ...inWindow(0, 'workout', [3, 3, 3]),
  ...inWindow(1, 'workout', [3, 3, 3]),
  ...inWindow(2, 'workout', [3, 3, 2]),
  ...inWindow(3, 'workout', [3, 2, 2]),
  ...inWindow(4, 'workout', [2, 2, 2]),
  ...inWindow(5, 'workout', [2, 2, 2]),
  ...inWindow(5, 'cold', [3, 3]),
  ...inWindow(6, 'workout', [2, 2, 2]),
  ...inWindow(6, 'cold', [3, 3, 3]),
  ...inWindow(7, 'workout', [2, 2, 1]),
  ...inWindow(7, 'cold', [3, 3, 2]),
];

describe('buildFrictionOverview', () => {
  it('reproduces the mockup: faced climbs 9 → 18 while felt is 13', () => {
    const o = buildFrictionOverview(mockupLogs(), TODAY);
    expect(o.windows.map((w) => w.faced)).toEqual([9, 9, 9, 9, 9, 15, 18, 18]);
    expect(o.windows.map((w) => w.felt)).toEqual([9, 9, 8, 7, 6, 12, 15, 13]);
    expect(o.faced).toBe(18);
    expect(o.felt).toBe(13);
    expect(o.firstWeeksFaced).toBe(9);
  });

  it('never lets a habit getting easier reduce what was faced', () => {
    // Windows 0 and 4: the same three workouts, Hard then Med.
    const o = buildFrictionOverview(mockupLogs(), TODAY);
    expect(o.windows[4].faced).toBe(o.windows[0].faced);
    expect(o.windows[4].felt).toBeLessThan(o.windows[0].felt);
  });

  it('ends the last window today, so a new week never zeroes the headline', () => {
    const o = buildFrictionOverview([log('w', TODAY, 2)], TODAY);
    expect(o.windows[o.windows.length - 1].end).toBe(TODAY);
    expect(o.faced).toBe(2);
  });

  it('counts habit check-ins only — not challenges or cravings', () => {
    const o = buildFrictionOverview(
      [
        log('w', TODAY, 3),
        log('c', TODAY, 3, { type: 'challenge' }),
        log('k', TODAY, 2, { type: 'craving' }),
      ],
      TODAY
    );
    expect(o.faced).toBe(3);
    expect(o.rated).toBe(1);
  });

  it('holds off on "your first weeks" until there are three weeks of history', () => {
    const o = buildFrictionOverview([log('w', addDays(TODAY, -10), 3), log('w', TODAY, 2)], TODAY);
    expect(o.firstWeeksFaced).toBeNull();
  });
});

describe('startingDifficulty', () => {
  it('averages only the first few ratings, in the order they happened', () => {
    const logs = [
      log('w', '2026-09-03', 1),
      log('w', '2026-09-01', 3),
      log('w', '2026-09-02', 3),
      log('w', '2026-09-04', 1),
    ];
    // First three by date: 3, 3, 1.
    expect(startingDifficulty(logs).w).toBeCloseTo(7 / 3);
  });
});

describe('withArticle', () => {
  it('reads numbers the way they are said', () => {
    expect(withArticle(18)).toBe('an 18');
    expect(withArticle(8)).toBe('an 8');
    expect(withArticle(11)).toBe('an 11');
    expect(withArticle(83)).toBe('an 83');
    expect(withArticle(13)).toBe('a 13');
    expect(withArticle(1)).toBe('a 1');
  });
});

describe('growthLabel', () => {
  const overview = (faced: number, firstWeeksFaced: number | null): FrictionOverview =>
    ({ windows: [], faced, felt: 0, firstWeeksFaced, rated: 10 });

  it('celebrates growth in plain words', () => {
    expect(growthLabel(overview(18, 9))).toBe('Twice your first weeks');
    expect(growthLabel(overview(15, 10))).toBe('1.5× your first weeks');
    expect(growthLabel(overview(30, 10))).toBe('3× your first weeks');
    expect(growthLabel(overview(10, 10))).toBe('Same as your first weeks');
  });

  it('says nothing when carrying less, or with no history to compare', () => {
    expect(growthLabel(overview(5, 10))).toBeNull();
    expect(growthLabel(overview(18, null))).toBeNull();
  });
});

describe('frictionSentence', () => {
  const overview = (faced: number, felt: number): FrictionOverview =>
    ({ windows: [], faced, felt, firstWeeksFaced: null, rated: 10 });

  it('is the then-vs-now sentence when things got easier', () => {
    expect(frictionSentence(overview(18, 13))).toBe(
      'Your last 7 days would have felt like an 18 when you started. They felt like a 13.'
    );
  });

  it('copes with a quiet week, a hard stretch, and no change yet', () => {
    expect(frictionSentence(overview(0, 0))).toMatch(/Nothing logged/);
    expect(frictionSentence(overview(9, 12))).toMatch(/felt harder/);
    expect(frictionSentence(overview(9, 9))).toMatch(/about as hard/);
  });
});
