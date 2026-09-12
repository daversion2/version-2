import {
  buildWeekRadar,
  formatRadarValue,
  radiusFactor,
} from '../weeklyRadar';
import { CompletionLog } from '../../types';

// Week of Mon 2026-09-07 … Sun 2026-09-13. "Today" is Wednesday the 9th, so
// Thu–Sun are future and Mon–Wed have happened.
const MON = '2026-09-07';
const TUE = '2026-09-08';
const WED = '2026-09-09';
const THU = '2026-09-10';
const TODAY = WED;

let counter = 0;
const log = (
  date: string,
  points: number,
  type: CompletionLog['type'] = 'nudge'
): CompletionLog => ({
  id: `log-${++counter}`,
  user_id: 'u1',
  type,
  reference_id: 'h1',
  points,
  difficulty: 1,
  date,
});

describe('buildWeekRadar', () => {
  it('counts habits per day, Monday first', () => {
    const radar = buildWeekRadar(
      [log(MON, 2), log(MON, 3), log(TUE, 1)],
      'habits',
      TODAY
    );
    expect(radar.days.map((d) => d.label)).toEqual([
      'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun',
    ]);
    expect(radar.days.map((d) => d.value)).toEqual([2, 1, 0, 0, 0, 0, 0]);
    expect(radar.total).toBe(3);
  });

  it('sums XP from the same logs when the metric flips', () => {
    const logs = [log(MON, 2), log(MON, 3), log(TUE, 1)];
    expect(buildWeekRadar(logs, 'xp', TODAY).days.map((d) => d.value)).toEqual([
      5, 1, 0, 0, 0, 0, 0,
    ]);
    // Same reps, two readings — the toggle must not change what counts.
    expect(buildWeekRadar(logs, 'xp', TODAY).total).toBe(6);
  });

  it('counts habit reps only — a challenge is not a habit', () => {
    // The hero stats at the top of Progress count both, so these two numbers
    // are meant to differ. See the module header.
    const radar = buildWeekRadar(
      [log(MON, 5, 'challenge'), log(MON, 2, 'nudge'), log(TUE, 9, 'program')],
      'habits',
      TODAY
    );
    expect(radar.days.map((d) => d.value)).toEqual([1, 0, 0, 0, 0, 0, 0]);
  });

  it('scores an empty elapsed day as a real zero, not as missing', () => {
    // The reflection chart this replaced left unlogged days off the outline,
    // because a missing reflection was an absence. Completing no habits is an
    // answer, and the shape has to show it.
    const radar = buildWeekRadar([log(MON, 2)], 'habits', TODAY);
    const tuesday = radar.days.find((d) => d.date === TUE)!;
    expect(tuesday.value).toBe(0);
    expect(tuesday.isFuture).toBe(false);
  });

  it('marks later days future and keeps them out of the maths', () => {
    const radar = buildWeekRadar(
      [log(MON, 4), log(MON, 4), log(TUE, 2)],
      'habits',
      TODAY
    );
    expect(radar.days.find((d) => d.date === THU)!.isFuture).toBe(true);
    expect(radar.elapsed).toBe(3); // Mon, Tue, Wed
    // Averaged over the 3 elapsed days (2, 1, 0), not over all 7 — otherwise
    // the reference ring collapses toward zero early in the week.
    expect(radar.average).toBeCloseTo(1);
  });

  it('ignores a log filed on a future day', () => {
    // Backdating can only reach the past, so this is bad data rather than a
    // real case — it must not become the week's max.
    const radar = buildWeekRadar([log(MON, 1), log(THU, 1)], 'habits', TODAY);
    expect(radar.max).toBe(1);
    expect(radar.best?.date).toBe(MON);
  });

  it('names the best day, earliest first on a tie', () => {
    const radar = buildWeekRadar(
      [log(MON, 1), log(MON, 1), log(TUE, 1), log(TUE, 1)],
      'habits',
      TODAY
    );
    expect(radar.max).toBe(2);
    expect(radar.best?.date).toBe(MON);
  });

  it('counts days strictly above the average', () => {
    // Mon 3, Tue 0, Wed 0 → average 1, so only Monday clears it.
    const radar = buildWeekRadar(
      [log(MON, 1), log(MON, 1), log(MON, 1)],
      'habits',
      TODAY
    );
    expect(radar.average).toBeCloseTo(1);
    expect(radar.aboveAverage).toBe(1);
  });

  it('reports an empty week as zero rather than throwing', () => {
    const radar = buildWeekRadar([], 'habits', TODAY);
    expect(radar.max).toBe(0);
    expect(radar.best).toBeNull();
    expect(radar.average).toBe(0);
  });

  it('is unmoved by logs from other weeks', () => {
    const radar = buildWeekRadar(
      [log('2026-08-31', 5), log(MON, 1), log('2026-09-14', 5)],
      'habits',
      TODAY
    );
    expect(radar.total).toBe(1);
  });
});

describe('radiusFactor', () => {
  it('puts the best day on the outer ring', () => {
    expect(radiusFactor(6, 6)).toBe(1);
  });

  it('scales everything else against it', () => {
    expect(radiusFactor(3, 6)).toBe(0.5);
    expect(radiusFactor(0, 6)).toBe(0);
  });

  it('survives an empty week without dividing by zero', () => {
    expect(radiusFactor(0, 0)).toBe(0);
  });

  it('clamps rather than drawing outside the chart', () => {
    expect(radiusFactor(9, 6)).toBe(1);
    expect(radiusFactor(-2, 6)).toBe(0);
  });
});

describe('formatRadarValue', () => {
  it('spells out the absolute number the shape hides', () => {
    expect(formatRadarValue(6, 'habits')).toBe('6 habits');
    expect(formatRadarValue(1, 'habits')).toBe('1 habit');
    expect(formatRadarValue(0, 'habits')).toBe('0 habits');
  });

  it('rounds XP and groups thousands', () => {
    expect(formatRadarValue(120, 'xp')).toBe('120 XP');
    expect(formatRadarValue(1250.4, 'xp')).toBe('1,250 XP');
  });
});
