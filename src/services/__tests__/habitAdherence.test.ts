import { buildAdherence, describeAdherence } from '../habitAdherence';
import { Schedulable } from '../habitSchedule';

// Four full weeks: Mon 2026-08-03 .. Sun 2026-08-30.
const START = '2026-08-03';
const SUN = '2026-08-30';

const count = (target: number): Schedulable => ({ target_count_per_week: target });
/** Mon/Wed/Fri. Weekdays are JS-style: 0 = Sunday. */
const mwf: Schedulable = { scheduled_days: [1, 3, 5], target_count_per_week: 3 };

/** Every date from `from` to `to` whose weekday is in `days`. */
const datesOn = (days: number[], from: string, to: string): string[] => {
  const out: string[] = [];
  for (let d = new Date(from + 'T00:00:00'); d <= new Date(to + 'T00:00:00'); d.setDate(d.getDate() + 1)) {
    if (days.includes(d.getDay())) {
      out.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      );
    }
  }
  return out;
};

describe('day-scheduled adherence', () => {
  it('measures kept days against the days actually asked for', () => {
    // 12 Mon/Wed/Fris in the four weeks; keep 9 of them.
    const due = datesOn([1, 3, 5], START, SUN);
    const result = buildAdherence(mwf, due.slice(0, 9), SUN, { startedOn: START });
    expect(result.due).toBe(12);
    expect(result.kept).toBe(9);
    expect(result.rate).toBe(75);
  });

  it('gives no credit for a rep on a day it never asked about', () => {
    // Every Tuesday and Sunday, and not one scheduled day: diligent, but not
    // evidence that Monday was kept.
    const bonus = datesOn([2, 0], START, SUN);
    expect(buildAdherence(mwf, bonus, SUN, { startedOn: START }).rate).toBe(0);
  });

  it('does not count an unfinished today as a miss', () => {
    // Monday 2026-08-24 is due and unlogged, but the day is not over. The
    // window stops at Sunday, so the rate reads 100 rather than dipping.
    const due = datesOn([1, 3, 5], START, '2026-08-23');
    const result = buildAdherence(mwf, due, '2026-08-24', { startedOn: START });
    expect(result.to).toBe('2026-08-23');
    expect(result.rate).toBe(100);
  });
});

describe('count-scheduled adherence', () => {
  it('measures kept days against target × weeks', () => {
    // Evaluated on the Monday AFTER the four weeks, so all 28 days are settled:
    // 4×/week = 16 asked for, 12 kept.
    const dates = datesOn([1, 2, 3], START, SUN); // 12 days
    const result = buildAdherence(count(4), dates, '2026-08-31', { startedOn: START });
    expect(result.days).toBe(28);
    expect(result.due).toBe(16);
    expect(result.kept).toBe(12);
    expect(result.rate).toBe(75);
  });

  it('prorates a partial span rather than charging a full week', () => {
    // Adopted Monday, 7×/week, kept Mon–Wed, evaluated Thursday: 3 of 3.
    const result = buildAdherence(count(7), ['2026-08-24', '2026-08-25', '2026-08-26'], '2026-08-27', {
      startedOn: '2026-08-24',
    });
    expect(result.due).toBe(3);
    expect(result.rate).toBe(100);
  });

  it('caps at 100 rather than reporting over-delivery as reliability', () => {
    const dates = datesOn([0, 1, 2, 3, 4, 5, 6], START, SUN); // every day
    expect(buildAdherence(count(3), dates, SUN, { startedOn: START }).rate).toBe(100);
  });

  it('has no verdict for a habit with no goal', () => {
    expect(buildAdherence(count(0), ['2026-08-24'], SUN, { startedOn: START }).rate).toBeNull();
  });
});

describe('the window', () => {
  it('never reaches back past the day the habit started', () => {
    // A habit adopted three days ago, judged over a 28-day window, is asked
    // about three days — not a month it was never around for.
    const result = buildAdherence(count(7), ['2026-08-27', '2026-08-28'], '2026-08-29', {
      windowDays: 28,
      startedOn: '2026-08-27',
    });
    expect(result.from).toBe('2026-08-27');
    expect(result.days).toBe(2); // today excluded — not done yet
  });

  it('clips to the window when the habit is older than it', () => {
    const dates = datesOn([1, 3, 5], START, SUN);
    const result = buildAdherence(mwf, dates, SUN, { windowDays: 7, startedOn: START });
    expect(result.from).toBe('2026-08-24');
    expect(result.due).toBe(3);
  });

  it('reports nothing rather than zero before anything has been due', () => {
    // A habit adopted today has been asked for nothing. "0%" would be a verdict.
    const result = buildAdherence(count(7), [], '2026-08-24', { startedOn: '2026-08-24' });
    expect(result.rate).toBeNull();
    expect(result.due).toBe(0);
  });

  it('falls back to the first rep when the habit has no start date', () => {
    // Instances created before creation dates were recorded.
    const result = buildAdherence(count(7), ['2026-08-28', '2026-08-29'], SUN);
    expect(result.from).toBe('2026-08-28');
  });
});

describe('describeAdherence', () => {
  it('reads the number back in words', () => {
    expect(describeAdherence(95)).toBe('Rock solid');
    expect(describeAdherence(80)).toBe('Holding well');
    expect(describeAdherence(20)).toBe('Not really happening yet');
    expect(describeAdherence(null)).toBe('Not enough history yet');
  });
});
