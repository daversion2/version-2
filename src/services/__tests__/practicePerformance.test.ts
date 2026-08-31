import { buildPracticePerformance, buildResistanceOverview } from '../practicePerformance';
import { CompletionLog } from '../../types';
import { getPractice } from '../../data/practices';

// Fixed "today" for deterministic week bucketing: 2026-07-12 is a Sunday, so the
// current Monday-based week is Jul 6–12 and the 8-week window starts May 18.
const TODAY = '2026-07-12';
const WEEK_STARTS = [
  '2026-05-18',
  '2026-05-25',
  '2026-06-01',
  '2026-06-08',
  '2026-06-15',
  '2026-06-22',
  '2026-06-29',
  '2026-07-06',
];

let logCounter = 0;
const makeLog = (overrides: Partial<CompletionLog> & { date: string }): CompletionLog => ({
  id: `log-${++logCounter}`,
  user_id: 'u1',
  type: 'nudge',
  reference_id: 'habit-1',
  points: 1,
  difficulty: 1,
  ...overrides,
});

const cold = getPractice('cold_exposure');
const meditation = getPractice('meditation');

/** n cold logs on consecutive days ending today, with per-index metrics. */
const coldSeries = (
  values: { duration?: number; temp?: number; difficulty?: number }[]
): CompletionLog[] =>
  values.map((v, i) => {
    const d = new Date(`${TODAY}T00:00:00`);
    d.setDate(d.getDate() - (values.length - 1 - i));
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
    const metrics: Record<string, number> = {};
    if (v.duration !== undefined) metrics.duration_min = v.duration;
    if (v.temp !== undefined) metrics.water_temp_f = v.temp;
    return makeLog({
      date,
      difficulty: v.difficulty ?? 1,
      metrics: Object.keys(metrics).length ? metrics : undefined,
    });
  });

describe('buildPracticePerformance', () => {
  describe('primary metric trend', () => {
    it('is null under 3 metric-bearing sessions even with more total sessions', () => {
      const logs = coldSeries([
        { duration: 2 },
        { duration: 3 },
        {}, // metrics skipped — must not count
        {},
        {},
      ]);
      const perf = buildPracticePerformance(logs, cold, TODAY);
      expect(perf.primaryTrend).toBeNull();
    });

    it('excludes metric-skipped sessions and caps display points at 12', () => {
      const values = Array.from({ length: 15 }, (_, i) => ({ duration: i + 1 }));
      const logs = [...coldSeries(values), makeLog({ date: TODAY })]; // one skipped
      const perf = buildPracticePerformance(logs, cold, TODAY);
      expect(perf.primaryTrend).not.toBeNull();
      expect(perf.primaryTrend!.points).toHaveLength(12);
      // last displayed point is the newest metric-bearing session
      expect(perf.primaryTrend!.points[11].value).toBe(15);
    });

    it('withholds the first-5 average under 10 metric-bearing sessions', () => {
      const logs = coldSeries(Array.from({ length: 9 }, () => ({ duration: 2 })));
      const perf = buildPracticePerformance(logs, cold, TODAY);
      expect(perf.primaryTrend!.firstAvg).toBeNull();
    });

    it('computes first-5 and last-5 averages over the full series, not the display cap', () => {
      const values = [
        ...Array.from({ length: 5 }, () => ({ duration: 1 })),
        ...Array.from({ length: 10 }, () => ({ duration: 2 })),
        ...Array.from({ length: 5 }, () => ({ duration: 3 })),
      ];
      const perf = buildPracticePerformance(coldSeries(values), cold, TODAY);
      expect(perf.primaryTrend!.firstAvg).toBe(1);
      expect(perf.primaryTrend!.recentAvg).toBe(3);
    });
  });

  describe('insights', () => {
    it('emits a progress insight only at ≥10 sessions and ≥15% change', () => {
      const rising = coldSeries([
        { duration: 1 },
        { duration: 1 },
        { duration: 1 },
        { duration: 1 },
        { duration: 1 },
        { duration: 2 },
        { duration: 2 },
        { duration: 2 },
        { duration: 2 },
        { duration: 2 },
      ]);
      const perf = buildPracticePerformance(rising, cold, TODAY);
      const progress = perf.insights.find((i) => i.text.includes('up 100%'));
      expect(progress).toBeDefined();
      expect(progress!.tone).toBe('progress');

      // 9 sessions: same shape, no progress insight
      const under = buildPracticePerformance(rising.slice(1), cold, TODAY);
      expect(under.insights.some((i) => i.text.includes('from your first 5'))).toBe(false);
    });

    it('stays silent on small changes', () => {
      const flat = coldSeries(Array.from({ length: 10 }, (_, i) => ({ duration: i < 5 ? 2 : 2.2 })));
      const perf = buildPracticePerformance(flat, cold, TODAY);
      expect(perf.insights.some((i) => i.text.includes('from your first 5'))).toBe(false);
    });

    it('emits a plateau nudge after 6 identical values, suggesting one step up', () => {
      const logs = coldSeries(Array.from({ length: 6 }, () => ({ duration: 2 })));
      const perf = buildPracticePerformance(logs, cold, TODAY);
      const plateau = perf.insights.find((i) => i.text.includes('try 3 min next time'));
      expect(plateau).toBeDefined();
      expect(plateau!.tone).toBe('nudge');
    });

    it('does not suggest exceeding the field max on a plateau', () => {
      // cold_exposure duration_min max is 12
      const logs = coldSeries(Array.from({ length: 6 }, () => ({ duration: 12 })));
      const perf = buildPracticePerformance(logs, cold, TODAY);
      expect(perf.insights.some((i) => i.text.includes('try 13'))).toBe(false);
    });

    it('emits an adaptation nudge when ≤2 of the last 10 rated reps were challenging', () => {
      const logs = coldSeries(
        Array.from({ length: 10 }, (_, i) => ({ duration: 2 + (i % 2), difficulty: i === 0 ? 2 : 1 }))
      );
      const perf = buildPracticePerformance(logs, cold, TODAY);
      expect(perf.insights.some((i) => i.text.includes('You may have adapted'))).toBe(true);
    });

    it('withholds the adaptation nudge under 8 rated reps', () => {
      const logs = coldSeries(Array.from({ length: 7 }, () => ({ duration: 2, difficulty: 1 })));
      const perf = buildPracticePerformance(logs, cold, TODAY);
      expect(perf.insights.some((i) => i.text.includes('You may have adapted'))).toBe(false);
    });

    it('caps insights at 3', () => {
      const logs = coldSeries(
        Array.from({ length: 20 }, (_, i) => ({
          duration: i < 14 ? 1 : 2, // progress (up 100%) but NOT a 6-flat plateau… actually last 6 are flat 2s
          difficulty: 1,
        }))
      ).map((l) => ({ ...l, mindTags: ['bargaining'], hitHardMoment: true }));
      const perf = buildPracticePerformance(logs, cold, TODAY);
      expect(perf.insights.length).toBeLessThanOrEqual(3);
    });
  });

  describe('weekly dose', () => {
    it('sums minutes × degrees-below-60 per week and excludes temp-less logs', () => {
      const logs = [
        // current week (Jul 6–12): 2 min @ 50°F = 20, 3 min @ 40°F = 60 → 80
        makeLog({ date: '2026-07-06', metrics: { duration_min: 2, water_temp_f: 50 } }),
        makeLog({ date: '2026-07-08', metrics: { duration_min: 3, water_temp_f: 40 } }),
        // previous week: 4 min @ 55°F = 20
        makeLog({ date: '2026-06-30', metrics: { duration_min: 4, water_temp_f: 55 } }),
        // temp skipped → contributes nothing
        makeLog({ date: '2026-07-07', metrics: { duration_min: 10 } }),
      ];
      const perf = buildPracticePerformance(logs, cold, TODAY);
      expect(perf.weeklyDose).not.toBeNull();
      expect(perf.weeklyDose!.values[7]).toBe(80);
      expect(perf.weeklyDose!.values[6]).toBe(20);
    });

    it('is null under 3 dose-bearing logs', () => {
      const logs = [
        makeLog({ date: '2026-07-06', metrics: { duration_min: 2, water_temp_f: 50 } }),
        makeLog({ date: '2026-07-08', metrics: { duration_min: 3, water_temp_f: 40 } }),
        makeLog({ date: '2026-07-07', metrics: { duration_min: 10 } }),
      ];
      const perf = buildPracticePerformance(logs, cold, TODAY);
      expect(perf.weeklyDose).toBeNull();
    });

    it('is null for practices without a dose config', () => {
      const logs = coldSeries(Array.from({ length: 5 }, () => ({ duration: 10, temp: 50 })));
      const perf = buildPracticePerformance(logs, meditation, TODAY);
      expect(perf.weeklyDose).toBeNull();
    });
  });

  describe('weekly challenging %', () => {
    it('buckets rated reps into Monday-based weeks', () => {
      const logs = [
        makeLog({ date: WEEK_STARTS[7], difficulty: 2 }),
        makeLog({ date: WEEK_STARTS[7], difficulty: 1 }),
        makeLog({ date: WEEK_STARTS[6], difficulty: 2 }),
        makeLog({ date: WEEK_STARTS[6], difficulty: 2 }),
        makeLog({ date: WEEK_STARTS[5], difficulty: 1 }),
        makeLog({ date: WEEK_STARTS[0], difficulty: 1 }),
      ];
      const perf = buildPracticePerformance(logs, cold, TODAY);
      expect(perf.weeklyChallenging).not.toBeNull();
      expect(perf.weeklyChallenging![7]).toEqual({ rated: 2, challenging: 1 });
      expect(perf.weeklyChallenging![6]).toEqual({ rated: 2, challenging: 2 });
      expect(perf.weeklyChallenging![5]).toEqual({ rated: 1, challenging: 0 });
      expect(perf.weeklyChallenging![1]).toEqual({ rated: 0, challenging: 0 });
    });

    it('is null under 6 rated reps in the window', () => {
      const logs = [
        ...Array.from({ length: 5 }, (_, i) => makeLog({ date: WEEK_STARTS[7], difficulty: 1 })),
        // old rep outside the 8-week window must not count toward the gate
        makeLog({ date: '2026-01-05', difficulty: 2 }),
      ];
      const perf = buildPracticePerformance(logs, cold, TODAY);
      expect(perf.weeklyChallenging).toBeNull();
    });
  });

  describe('choice breakdowns', () => {
    it('computes counts, shares, and per-option challenging % with a rated-reps gate', () => {
      const logs = [
        // breath: 4 reps, 1 challenging → 25%
        makeLog({ date: '2026-07-01', metrics: { technique: 'breath' }, difficulty: 2 }),
        makeLog({ date: '2026-07-02', metrics: { technique: 'breath' }, difficulty: 1 }),
        makeLog({ date: '2026-07-03', metrics: { technique: 'breath' }, difficulty: 1 }),
        makeLog({ date: '2026-07-04', metrics: { technique: 'breath' }, difficulty: 1 }),
        // open: 2 reps → under the 3-rated gate, challengingPct null
        makeLog({ date: '2026-07-05', metrics: { technique: 'open' }, difficulty: 2 }),
        makeLog({ date: '2026-07-06', metrics: { technique: 'open' }, difficulty: 2 }),
      ];
      const perf = buildPracticePerformance(logs, meditation, TODAY);
      const technique = perf.choiceBreakdowns.find((b) => b.field.key === 'technique');
      expect(technique).toBeDefined();
      const breath = technique!.options.find((o) => o.value === 'breath')!;
      expect(breath.count).toBe(4);
      expect(breath.pct).toBe(67);
      expect(breath.label).toBe('Breath focus');
      expect(breath.challengingPct).toBe(25);
      const open = technique!.options.find((o) => o.value === 'open')!;
      expect(open.challengingPct).toBeNull();
    });

    it('is omitted entirely under 3 logs with a value', () => {
      const logs = [
        makeLog({ date: '2026-07-01', metrics: { technique: 'breath' } }),
        makeLog({ date: '2026-07-02', metrics: { technique: 'breath' } }),
        makeLog({ date: '2026-07-03' }),
      ];
      const perf = buildPracticePerformance(logs, meditation, TODAY);
      expect(perf.choiceBreakdowns).toHaveLength(0);
    });
  });

  describe('mind patterns', () => {
    it('counts tags and reports the logged-hard-moment share', () => {
      const logs = [
        makeLog({ date: '2026-07-01', mindTags: ['bargaining', 'resisting'], hitHardMoment: true }),
        makeLog({ date: '2026-07-02', mindTags: ['bargaining'], hitHardMoment: true }),
        makeLog({ date: '2026-07-03' }),
        makeLog({ date: '2026-07-04' }),
      ];
      const perf = buildPracticePerformance(logs, cold, TODAY);
      expect(perf.mindPatterns).not.toBeNull();
      expect(perf.mindPatterns!.tags[0]).toEqual({ id: 'bargaining', label: 'Bargaining', count: 2 });
      expect(perf.mindPatterns!.hardMomentPct).toBe(50);
    });

    it('is null when nothing was ever logged', () => {
      const logs = coldSeries([{ duration: 2 }, { duration: 2 }, { duration: 2 }]);
      const perf = buildPracticePerformance(logs, cold, TODAY);
      expect(perf.mindPatterns).toBeNull();
    });
  });

  describe('records', () => {
    it('picks max duration, min cold temp (with dates), total time, and best week', () => {
      const logs = [
        makeLog({ date: '2026-07-06', metrics: { duration_min: 2, water_temp_f: 50 } }),
        makeLog({ date: '2026-07-07', metrics: { duration_min: 4, water_temp_f: 44 } }),
        makeLog({ date: '2026-07-08', metrics: { duration_min: 3, water_temp_f: 55 } }),
      ];
      const perf = buildPracticePerformance(logs, cold, TODAY);
      const byLabel = Object.fromEntries(perf.records.map((r) => [r.label, r]));

      expect(byLabel['Longest plunge'].value).toBe('4 min');
      expect(byLabel['Longest plunge'].date).toBe('2026-07-07');
      expect(byLabel['Coldest plunge'].value).toBe('44°F');
      expect(byLabel['Coldest plunge'].date).toBe('2026-07-07');
      expect(byLabel['Total time trained'].value).toBe('9 min');
      expect(byLabel['Best week'].value).toBe('3 reps');
      expect(byLabel['Best week'].date).toBe('2026-07-06');
    });

    it('formats long cumulative time in hours', () => {
      const logs = coldSeries(Array.from({ length: 15 }, () => ({ duration: 10 })));
      const perf = buildPracticePerformance(logs, cold, TODAY);
      const total = perf.records.find((r) => r.label === 'Total time trained')!;
      expect(total.value).toBe('2.5 hrs');
    });

    it('skips the best-week record for a lone rep', () => {
      const logs = [makeLog({ date: '2026-07-06', metrics: { duration_min: 2 } })];
      const perf = buildPracticePerformance(logs, cold, TODAY);
      expect(perf.records.some((r) => r.label === 'Best week')).toBe(false);
    });
  });

  it('handles a custom practice (no catalog entry) with charts gated off', () => {
    const logs = Array.from({ length: 10 }, (_, i) =>
      makeLog({ date: `2026-07-0${(i % 9) + 1}`, difficulty: i % 2 === 0 ? 2 : 1 })
    );
    const perf = buildPracticePerformance(logs, undefined, TODAY);
    expect(perf.primaryTrend).toBeNull();
    expect(perf.weeklyDose).toBeNull();
    expect(perf.weeklyChallenging).not.toBeNull(); // difficulty is always captured
    expect(perf.choiceBreakdowns).toHaveLength(0);
    expect(perf.records.some((r) => r.label === 'Best week')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Phase 3: resistance trend + config-driven dose/records.
// See docs/habit-template-unification.md.
// ---------------------------------------------------------------------------

/** n logs on consecutive days ending today, carrying a resistance rating. */
const resistanceSeries = (values: (number | undefined)[]): CompletionLog[] =>
  values.map((v, i) => {
    const d = new Date(`${TODAY}T00:00:00`);
    d.setDate(d.getDate() - (values.length - 1 - i));
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
    return makeLog({ date, ...(v === undefined ? {} : { resistance: v, resistance_scale: 3 }) });
  });

describe('resistance trend', () => {
  it('is null below the minimum number of rated logs', () => {
    const perf = buildPracticePerformance(resistanceSeries([3, 2]), meditation, TODAY);
    expect(perf.resistanceTrend).toBeNull();
  });

  it('reports a falling trend as a negative change', () => {
    // 10 logs: starts hard (8s), ends easy (2s).
    const perf = buildPracticePerformance(
      resistanceSeries([3, 3, 3, 3, 3, 1, 1, 1, 1, 1]),
      meditation,
      TODAY
    );
    const trend = perf.resistanceTrend!;
    expect(trend.rated).toBe(10);
    expect(trend.firstAvg).toBe(3);
    expect(trend.recentAvg).toBe(1);
    expect(trend.change).toBeLessThan(0);
  });

  it('leaves change null until there is enough history to compare', () => {
    const perf = buildPracticePerformance(resistanceSeries([3, 2, 2]), meditation, TODAY);
    expect(perf.resistanceTrend!.change).toBeNull();
  });

  it('excludes unrated logs rather than counting them as zero', () => {
    const perf = buildPracticePerformance(
      resistanceSeries([3, undefined, 3, undefined, 3]),
      meditation,
      TODAY
    );
    // difficulty defaults to 1 on the unrated logs, which maps to a legacy 3.
    expect(perf.resistanceTrend!.rated).toBe(5);
  });

  it('leads the insight list when resistance has moved a full point', () => {
    const perf = buildPracticePerformance(
      resistanceSeries([3, 3, 3, 3, 3, 1, 1, 1, 1, 1]),
      meditation,
      TODAY
    );
    expect(perf.insights[0].tone).toBe('progress');
    expect(perf.insights[0].text).toContain('getting easier');
  });

  it('flags a habit that is getting harder rather than staying silent', () => {
    const perf = buildPracticePerformance(
      resistanceSeries([1, 1, 1, 1, 1, 3, 3, 3, 3, 3]),
      meditation,
      TODAY
    );
    expect(perf.insights[0].tone).toBe('nudge');
    expect(perf.insights[0].text).toContain('harder');
  });

  it('plots legacy logs through their binary difficulty so history has no hole', () => {
    const legacy = resistanceSeries([undefined, undefined, undefined]).map((l) => ({
      ...l,
      difficulty: 2,
    }));
    const perf = buildPracticePerformance(legacy, meditation, TODAY);
    // 'challenging' maps to level 2 — see legacyDifficultyToResistance.
    expect(perf.resistanceTrend!.recentAvg).toBe(2);
  });
});

describe('config-driven dose (Phase 3)', () => {
  it('reads the dose config off the habit definition, not a hardcoded map', () => {
    expect(cold!.dose).toBeDefined();
    expect(cold!.dose!.magnitudeKey).toBe('water_temp_f');
    expect(cold!.dose!.direction).toBe('below');
  });

  it('carries record presentation on the tracking field itself', () => {
    const tempField = cold!.tracking!.find((f) => f.key === 'water_temp_f');
    expect(tempField!.record).toEqual({
      label: 'Coldest plunge',
      icon: 'snow-outline',
      pick: 'min',
    });
  });
});

describe('resistance overview (Progress headline)', () => {
  it('reports nothing to claim below the minimum rated logs', () => {
    const overview = buildResistanceOverview(resistanceSeries([3, 2]), TODAY);
    expect(overview.recentAvg).toBeNull();
    expect(overview.change).toBeNull();
    expect(overview.rated).toBe(2);
  });

  it('summarises a falling curve across all habits', () => {
    const overview = buildResistanceOverview(
      resistanceSeries([3, 3, 3, 3, 3, 1, 1, 1, 1, 1]),
      TODAY
    );
    expect(overview.firstAvg).toBe(3);
    expect(overview.recentAvg).toBe(1);
    expect(overview.change).toBeLessThan(0);
  });

  it('shows a current number without a change until there is history to compare', () => {
    const overview = buildResistanceOverview(resistanceSeries([3, 2, 2]), TODAY);
    expect(overview.recentAvg).toBeCloseTo(2.3, 1);
    expect(overview.change).toBeNull();
  });

  it('leaves an empty week null rather than zero, so a gap never reads as progress', () => {
    // Three logs this week only; the seven earlier buckets have nothing in them.
    const overview = buildResistanceOverview(resistanceSeries([2, 2, 2]), TODAY);
    expect(overview.weekly).toHaveLength(8);
    expect(overview.weekly.slice(0, 7).every((v) => v === null)).toBe(true);
    expect(overview.weekly[7]).toBe(2);
  });

  it('returns one week bucket per week, aligned with its start dates', () => {
    const overview = buildResistanceOverview(resistanceSeries([2, 2, 2]), TODAY);
    expect(overview.weekStarts).toEqual(WEEK_STARTS);
  });
});
