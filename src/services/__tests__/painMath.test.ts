import {
  activePlan,
  clampScore,
  compareActivities,
  comparePain,
  dayLabel,
  daysUntilRetest,
  describeChange,
  endPlan,
  isFlare,
  isPlanDay,
  isRetestDue,
  itemAdherence,
  newPlan,
  nextPlanFrom,
  painAverage,
  painWord,
  planOn,
  planResult,
  planStreak,
  planVerdict,
  planWeek,
  prefillPain,
  recentPain,
  recordRetest,
  resultNotes,
  retestDateFor,
  suggestNext,
  weekSummary,
} from '../painMath';
import type { PainDay, PainItemId, PainPlan } from '../../types/pain';

// 2026-11-20 is a Friday; its Monday-start week began 2026-11-16.
const TODAY = '2026-11-20';
const NOW = new Date('2026-11-20T20:00:00.000Z');

const day = (date: string, pain: number, done: PainItemId[] = []): PainDay => ({
  date,
  pain,
  done,
  logged_at: `${date}T20:00:00.000Z`,
});

const plan = (over: Partial<PainPlan> = {}): PainPlan => ({
  ...newPlan({
    id: 'p1',
    onset: 'long',
    items: ['walk', 'core'],
    weeks: 3,
    today: '2026-11-09',
    baseline: { pain_week: 5, activities: [{ label: 'Sitting for 30 minutes', score: 4 }] },
    now: new Date('2026-11-09T20:00:00.000Z'),
  }),
  ...over,
});

describe('the scale', () => {
  it('names the clinical bands', () => {
    expect([0, 1, 3, 4, 6, 7, 10].map(painWord)).toEqual([
      'No pain',
      'Mild',
      'Mild',
      'Moderate',
      'Moderate',
      'Severe',
      'Severe',
    ]);
  });

  it('clamps and rounds scores', () => {
    expect(clampScore(-1)).toBe(0);
    expect(clampScore(11)).toBe(10);
    expect(clampScore(4.6)).toBe(5);
  });

  it('labels today and yesterday', () => {
    expect(dayLabel(TODAY, TODAY)).toBe('Today');
    expect(dayLabel('2026-11-19', TODAY)).toBe('Yesterday');
    expect(dayLabel('2026-11-10', TODAY)).not.toMatch(/day$/i);
  });
});

describe('averages and the prefill', () => {
  it('has nothing to say with no history', () => {
    expect(painAverage([], TODAY)).toEqual({ avg: null, count: 0 });
    expect(prefillPain([], TODAY)).toBeUndefined();
    expect(recentPain([], TODAY, 3)).toEqual([null, null, null]);
  });

  it('averages only the last 7 days ending today', () => {
    const days = [day('2026-11-13', 10), day('2026-11-14', 4), day('2026-11-17', 6), day(TODAY, 5)];
    expect(painAverage(days, TODAY)).toEqual({ avg: 5, count: 3 });
  });

  it('prefills only from 3 or more check-ins', () => {
    expect(prefillPain([day('2026-11-19', 4), day(TODAY, 6)], TODAY)).toBeUndefined();
    expect(prefillPain([day('2026-11-18', 4), day('2026-11-19', 5), day(TODAY, 5)], TODAY)).toBe(5);
  });

  it('lays out the bars oldest first with gaps', () => {
    expect(recentPain([day('2026-11-18', 4), day(TODAY, 0)], TODAY, 3)).toEqual([4, null, 0]);
  });
});

describe('plan dates', () => {
  it('sets the retest a whole number of weeks out', () => {
    expect(retestDateFor('2026-11-09', 3)).toBe('2026-11-30');
    expect(retestDateFor('2026-11-30', 2)).toBe('2026-12-14');
  });

  it('counts weeks and days to the retest', () => {
    const p = plan();
    expect(planWeek(p, '2026-11-09')).toBe(1);
    expect(planWeek(p, '2026-11-16')).toBe(2);
    expect(planWeek(p, TODAY)).toBe(2);
    expect(planWeek(p, '2026-12-25')).toBe(3);
    expect(daysUntilRetest(p, TODAY)).toBe(10);
  });

  it('opens the retest on the retest date, for active plans only', () => {
    expect(isRetestDue(plan(), '2026-11-29')).toBe(false);
    expect(isRetestDue(plan(), '2026-11-30')).toBe(true);
    expect(isRetestDue(plan({ status: 'ended' }), '2026-12-01')).toBe(false);
  });

  it('finds the active plan', () => {
    expect(activePlan([])).toBeUndefined();
    expect(activePlan([plan({ id: 'a', status: 'complete' }), plan({ id: 'b' })])?.id).toBe('b');
  });
});

describe('which plan a day belongs to', () => {
  const first = recordRetest(plan(), { pain_week: 3, scores: [7] }, '2026-11-30', NOW);
  const second = nextPlanFrom(first, {
    id: 'p2',
    onset: 'long',
    items: ['walk', 'yoga'],
    weeks: 2,
    today: '2026-11-30',
    now: NOW,
  });

  it('runs from the start until it closes, and the newer plan wins a handover day', () => {
    expect(planOn([first, second], '2026-11-08')).toBeUndefined();
    expect(planOn([first, second], '2026-11-29')?.id).toBe('p1');
    expect(planOn([first, second], '2026-11-30')?.id).toBe('p2');
    expect(planOn([first, second], '2026-12-10')?.id).toBe('p2');
  });

  it('stops an ended plan before today', () => {
    const ended = endPlan(plan(), TODAY, NOW);
    expect(ended.closed_on).toBe('2026-11-19');
    expect(planOn([ended], '2026-11-19')?.id).toBe('p1');
    expect(planOn([ended], TODAY)).toBeUndefined();
  });

  it('never covers a day when ended the day it started', () => {
    const p = endPlan(plan({ start_date: TODAY }), TODAY, NOW);
    expect(planOn([p], TODAY)).toBeUndefined();
  });
});

describe('plan days, the weekly goal and the streak', () => {
  const p = plan();

  it('needs every item ticked, and a plan', () => {
    expect(isPlanDay({ done: ['walk', 'core'] }, p)).toBe(true);
    expect(isPlanDay({ done: ['walk'] }, p)).toBe(false);
    expect(isPlanDay({ done: ['walk', 'core'] }, undefined)).toBe(false);
  });

  it('counts this week’s plan days from Monday', () => {
    const days = [
      day('2026-11-15', 4, ['walk', 'core']), // Sunday: last week
      day('2026-11-16', 4, ['walk', 'core']),
      day('2026-11-17', 4, ['walk']),
      day('2026-11-19', 4, ['walk', 'core']),
    ];
    expect(weekSummary(days, [p], TODAY, 2)).toEqual({ planDays: 2, goal: 2, met: true });
    expect(weekSummary([], [p], TODAY, 5)).toEqual({ planDays: 0, goal: 5, met: false });
  });

  it('streaks over plan days, and an empty today doesn’t break it', () => {
    const days = [
      day('2026-11-17', 4, ['walk', 'core']),
      day('2026-11-18', 4, ['walk', 'core']),
      day('2026-11-19', 4, ['walk', 'core']),
    ];
    expect(planStreak(days, [p], TODAY)).toBe(3);
    // Half done today: still the day to finish it, so the run stands.
    expect(planStreak([...days, day(TODAY, 4, ['walk'])], [p], TODAY)).toBe(3);
    expect(planStreak([day('2026-11-17', 4, ['walk', 'core']), day('2026-11-18', 4, ['walk']), day('2026-11-19', 4, ['walk', 'core'])], [p], TODAY)).toBe(1);
    expect(planStreak([...days, day(TODAY, 4, ['walk', 'core'])], [p], TODAY)).toBe(4);
    expect(planStreak([], [p], TODAY)).toBe(0);
  });
});

describe('adherence', () => {
  it('counts calendar days in the window, missing check-ins as not done', () => {
    const p = plan(); // started 2026-11-09
    const days = [day('2026-11-08', 5, ['walk', 'core']), day('2026-11-09', 5, ['walk', 'core']), day('2026-11-10', 5, ['walk'])];
    const a = itemAdherence(p, days, '2026-11-10');
    expect(a.possible).toBe(2);
    expect(a.items).toEqual([
      { id: 'walk', done: 2 },
      { id: 'core', done: 1 },
    ]);
    expect(a.planDays).toBe(1);
    expect(a.pct).toBe(0.75);
  });

  it('stops at the planned weeks however late the retest', () => {
    const p = recordRetest(plan(), { pain_week: 4, scores: [5] }, '2026-12-05', NOW);
    const a = itemAdherence(p, [day('2026-12-03', 3, ['walk', 'core'])], '2026-12-10');
    expect(a.possible).toBe(21);
    expect(a.items[0].done).toBe(0);
  });

  it('is empty before a plan’s first day', () => {
    const p = endPlan(plan({ start_date: TODAY, retest_date: '2026-12-11' }), TODAY, NOW);
    expect(itemAdherence(p, [], TODAY)).toEqual({ possible: 0, items: [{ id: 'walk', done: 0 }, { id: 'core', done: 0 }], planDays: 0, pct: null });
  });
});

describe('comparing the retest', () => {
  it('calls 2 points, or 30% and a point, a real drop in pain', () => {
    expect(comparePain(6, 4).verdict).toBe('better');
    expect(comparePain(3, 2).verdict).toBe('better'); // 33%, 1 point
    expect(comparePain(6, 5).verdict).toBe('same'); // 17%
    expect(comparePain(2, 2).verdict).toBe('same');
    expect(comparePain(0, 0)).toEqual({ before: 0, after: 0, diff: 0, pct: 0, verdict: 'same' });
    expect(comparePain(4, 6).verdict).toBe('worse');
    expect(comparePain(4, 5).verdict).toBe('same');
  });

  it('averages the activities and needs 2 points either way', () => {
    const before = [
      { label: 'Sitting', score: 4 },
      { label: 'Shoes', score: 6 },
    ];
    expect(compareActivities(before, [7, 7])).toMatchObject({ beforeAvg: 5, afterAvg: 7, diff: 2, verdict: 'better' });
    expect(compareActivities(before, [5, 6])?.verdict).toBe('same');
    expect(compareActivities(before, [2, 4])?.verdict).toBe('worse');
    expect(compareActivities([], [])).toBeNull();
    expect(compareActivities(before, [])).toBeNull();
  });

  it('combines pain and activities into one verdict', () => {
    expect(planVerdict('better', 'same')).toBe('better');
    expect(planVerdict('same', 'better')).toBe('better');
    expect(planVerdict('better', 'worse')).toBe('mixed');
    expect(planVerdict('same', 'worse')).toBe('worse');
    expect(planVerdict('same', 'same')).toBe('same');
    expect(planVerdict('worse', null)).toBe('worse');
  });

  it('has no result before the retest', () => {
    expect(planResult(plan())).toBeNull();
    const done = recordRetest(plan(), { pain_week: 3, scores: [7] }, '2026-11-30', NOW);
    expect(planResult(done)?.verdict).toBe('better');
    expect(done).toMatchObject({ status: 'complete', closed_on: '2026-11-30', retest: { pain_week: 3, scores: [7] } });
  });
});

describe('the small print', () => {
  it('flags recent pain and a plan barely done', () => {
    expect(resultNotes({ onset: 'long' }, 0.9)).toHaveLength(1);
    const notes = resultNotes({ onset: 'recent' }, 0.4);
    expect(notes[0]).toMatch(/40%/);
    expect(notes[1]).toMatch(/six weeks/);
    expect(resultNotes({ onset: 'months' }, null)).toHaveLength(1);
  });
});

describe('flares', () => {
  const p = plan(); // baseline 5, so 8+ is a flare

  it('needs two back-to-back days, ending today or yesterday, both 3 above the start', () => {
    expect(isFlare([day('2026-11-19', 8), day(TODAY, 9)], p, TODAY)).toBe(true);
    expect(isFlare([day('2026-11-18', 8), day('2026-11-19', 8)], p, TODAY)).toBe(true);
    expect(isFlare([day('2026-11-19', 8), day(TODAY, 7)], p, TODAY)).toBe(false);
    expect(isFlare([day('2026-11-18', 8), day(TODAY, 9)], p, TODAY)).toBe(false);
    expect(isFlare([day('2026-11-17', 9), day('2026-11-18', 9)], p, TODAY)).toBe(false);
  });

  it('needs a plan, and days inside it', () => {
    expect(isFlare([day('2026-11-19', 9), day(TODAY, 9)], undefined, TODAY)).toBe(false);
    expect(isFlare([day('2026-11-08', 9), day('2026-11-09', 9)], p, '2026-11-09')).toBe(false);
  });
});

describe('what next', () => {
  it('fixes consistency first', () => {
    expect(suggestNext('better', 0.5).key).toBe('consistency');
  });

  it('keeps a working plan and changes one thing otherwise', () => {
    expect(suggestNext('better', 0.9).key).toBe('keep');
    expect(suggestNext('same', 0.9).key).toBe('swap');
    expect(suggestNext('mixed', null).key).toBe('swap');
    expect(suggestNext('worse', 0.9).why).toMatch(/doctor/);
  });

  it('describes the change in words', () => {
    expect(describeChange(['walk', 'core'], ['walk', 'core'])).toBe('Same plan');
    expect(describeChange(['walk', 'core'], ['walk', 'yoga'])).toBe('Swapped Core strength for Yoga or pilates');
    expect(describeChange(['walk', 'core'], ['walk'])).toBe('Dropped Core strength');
    expect(describeChange(['walk'], ['walk', 'heat'])).toBe('Added Heat');
    expect(describeChange(['walk', 'core'], ['heat'])).toBe('Dropped Walk and Core strength, added Heat');
  });
});

describe('building plans', () => {
  it('starts a first plan today', () => {
    const p = plan();
    expect(p).toMatchObject({
      number: 1,
      status: 'active',
      start_date: '2026-11-09',
      retest_date: '2026-11-30',
      previous_plan_id: undefined,
    });
  });

  it('cleans the starting test', () => {
    const p = newPlan({
      id: 'x',
      onset: 'recent',
      items: ['heat'],
      weeks: 2,
      today: TODAY,
      baseline: { pain_week: 12, activities: [{ label: '  Driving ', score: -2 }] },
      now: NOW,
    });
    expect(p.baseline).toEqual({ pain_week: 10, activities: [{ label: 'Driving', score: 0 }] });
  });

  it('chains the next plan from the last retest', () => {
    const first = recordRetest(plan(), { pain_week: 3, scores: [7] }, '2026-11-30', NOW);
    const next = nextPlanFrom(first, { id: 'p2', onset: 'long', items: ['walk'], weeks: 4, today: '2026-11-30', now: NOW });
    expect(next).toMatchObject({
      number: 2,
      previous_plan_id: 'p1',
      change: 'Dropped Core strength',
      retest_date: '2026-12-28',
      baseline: { pain_week: 3, activities: [{ label: 'Sitting for 30 minutes', score: 7 }] },
    });
  });

  it('falls back to the old start when the last plan was never retested', () => {
    const next = nextPlanFrom(endPlan(plan(), TODAY, NOW), {
      id: 'p2',
      onset: 'long',
      items: ['walk', 'core'],
      weeks: 3,
      today: TODAY,
      now: NOW,
    });
    expect(next.baseline.pain_week).toBe(5);
  });
});
