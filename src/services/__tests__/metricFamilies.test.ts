import { buildMetricFamilyReports, formatMetric } from '../metricFamilies';
import { resolveHabitTrackingFields } from '../../data/habitTemplates';
import { familyForField } from '../../data/metricFamilies';
import { getPractice } from '../../data/practices';
import { CompletionLog, PracticeInstance } from '../../types';

// Fixed "today" so week bucketing is deterministic: 2026-07-12 is a Sunday, so
// the current Monday-based week is Jul 6–12.
const TODAY = '2026-07-12';

let habitCounter = 0;
const habit = (overrides: Partial<PracticeInstance> & { name: string }): PracticeInstance => ({
  id: `habit-${++habitCounter}`,
  user_id: 'u1',
  is_active: true,
  created_by_user: false,
  target_count_per_week: 3,
  ...overrides,
});

let logCounter = 0;
const log = (
  habitId: string,
  metrics: Record<string, number | string> | undefined,
  date: string = TODAY
): CompletionLog => ({
  id: `log-${++logCounter}`,
  user_id: 'u1',
  type: 'nudge',
  reference_id: habitId,
  points: 1,
  difficulty: 1,
  date,
  metrics,
});

const byId = (reports: ReturnType<typeof buildMetricFamilyReports>, id: string) =>
  reports.find((r) => r.id === id);

describe('buildMetricFamilyReports', () => {
  describe('cross-habit rollup', () => {
    // The headline case: three separate custom habits all using the Distance
    // preset add up to one number.
    const run = habit({ name: 'Morning run', created_by_user: true, template_id: 'distance' });
    const walk = habit({ name: 'Evening walk', created_by_user: true, template_id: 'distance' });
    const bike = habit({ name: 'Bike commute', created_by_user: true, template_id: 'distance' });

    const logs = [
      log(run.id, { distance_mi: 4 }),
      log(run.id, { distance_mi: 6 }),
      log(walk.id, { distance_mi: 2 }),
      log(bike.id, { distance_mi: 12 }),
    ];

    const reports = buildMetricFamilyReports(logs, [run, walk, bike], TODAY);
    const distance = byId(reports, 'distance')!;

    it('groups every habit tracking the same metric into one family', () => {
      expect(distance).toBeDefined();
      expect(distance.habits).toHaveLength(3);
      expect(distance.logged).toBe(4);
    });

    it('sums the family into one headline number', () => {
      expect(distance.combinable).toBe(true);
      expect(distance.value).toBe(24); // 4 + 6 + 2 + 12
      expect(distance.formattedValue).toBe('24 mi');
    });

    it('breaks the total down per habit, biggest contributor first', () => {
      expect(distance.habits.map((h) => [h.name, h.value])).toEqual([
        ['Bike commute', 12],
        ['Morning run', 10],
        ['Evening walk', 2],
      ]);
    });

    it('names the best single rep and the habit that set it', () => {
      expect(distance.best).toEqual(
        expect.objectContaining({ value: 12, formatted: '12 mi', habitName: 'Bike commute' })
      );
    });
  });

  it('merges curated and custom habits that share a metric key', () => {
    // Curated habits keep their template on the catalog, custom ones on a
    // preset. Grouping by template_id alone would drop both curated habits.
    const meditate = habit({ name: 'Meditation', practice_id: 'meditation' });
    const read = habit({ name: 'Read', practice_id: 'trad-read' });
    const guitar = habit({ name: 'Guitar', created_by_user: true, template_id: 'time' });

    const reports = buildMetricFamilyReports(
      [
        log(meditate.id, { duration_min: 20 }),
        log(meditate.id, { duration_min: 10 }),
        log(read.id, { duration_min: 30 }),
        log(guitar.id, { duration_min: 15 }),
      ],
      [meditate, read, guitar],
      TODAY
    );

    const time = byId(reports, 'time')!;
    expect(time.habits).toHaveLength(3);
    expect(time.value).toBe(75);
    expect(time.formattedValue).toBe('75 min');
  });

  it('merges grade and adherence, and averages rather than sums them', () => {
    // Two names for the same 1–5 "how well did you hold to it" question. A
    // summed grade would be meaningless.
    const noSugar = habit({ name: 'No sugar', practice_id: 'trad-no-sugar' });
    const custom = habit({ name: 'Practice piano', created_by_user: true, template_id: 'grade' });

    const reports = buildMetricFamilyReports(
      [
        log(noSugar.id, { adherence: 2 }),
        log(custom.id, { grade: 5 }),
        log(custom.id, { grade: 5 }),
      ],
      [noSugar, custom],
      TODAY
    );

    const grade = byId(reports, 'grade')!;
    expect(grade.aggregate).toBe('avg');
    expect(grade.value).toBe(4); // mean of 5, 5, 2 — not the sum, 12
    expect(grade.habits.map((h) => [h.name, h.value])).toEqual([
      ['Practice piano', 5],
      ['No sugar', 2],
    ]);
  });

  it('refuses to combine habits that count different things', () => {
    // Both are the Count template, but one counts gratitude "things" and the
    // other is an unlabelled tally. 5 pages + 3 gratitudes is not 8 of anything.
    const gratitude = habit({ name: 'Gratitude', practice_id: 'trad-gratitude' });
    const pages = habit({ name: 'Pages read', created_by_user: true, template_id: 'count' });

    const reports = buildMetricFamilyReports(
      [
        log(gratitude.id, { count: 3 }),
        log(gratitude.id, { count: 4 }),
        log(pages.id, { count: 50 }),
      ],
      [gratitude, pages],
      TODAY
    );

    const count = byId(reports, 'count')!;
    expect(count.combinable).toBe(false);
    expect(count.value).toBeNull();
    expect(count.formattedValue).toBeNull();
    expect(count.best).toBeNull();
    // The per-habit rows still stand on their own.
    expect(count.habits).toHaveLength(2);
    expect(count.logged).toBe(3);
  });

  it('picks the minimum as the best when lower is the win', () => {
    const cold = habit({ name: 'Cold plunge', practice_id: 'cold_exposure' });

    const reports = buildMetricFamilyReports(
      [
        log(cold.id, { water_temp_f: 55 }),
        log(cold.id, { water_temp_f: 42 }),
        log(cold.id, { water_temp_f: 50 }),
      ],
      [cold],
      TODAY
    );

    const coldFamily = byId(reports, 'cold')!;
    expect(coldFamily.direction).toBe('down');
    expect(coldFamily.best?.value).toBe(42);
    expect(coldFamily.best?.formatted).toBe('42°F');
    expect(coldFamily.value).toBe(49); // mean, not a sum of temperatures
  });

  it('leaves skipped metrics out of the math rather than counting them as zero', () => {
    const run = habit({ name: 'Run', created_by_user: true, template_id: 'distance' });

    const reports = buildMetricFamilyReports(
      [
        log(run.id, { distance_mi: 4 }),
        log(run.id, undefined), // logged the rep, skipped the metric
        log(run.id, {}), // ditto
        log(run.id, { distance_mi: 6 }),
      ],
      [run],
      TODAY
    );

    const distance = byId(reports, 'distance')!;
    expect(distance.logged).toBe(2);
    expect(distance.value).toBe(10);
    expect(distance.habits[0].average).toBe(5); // not 2.5
  });

  it('ignores non-numeric choice metrics', () => {
    // Meditation tracks duration_min AND a 'technique' choice. A choice can't be
    // summed or averaged, so it gets no family.
    const meditate = habit({ name: 'Meditation', practice_id: 'meditation' });

    const reports = buildMetricFamilyReports(
      [log(meditate.id, { duration_min: 20, technique: 'breath' })],
      [meditate],
      TODAY
    );

    expect(reports.map((r) => r.id)).toEqual(['time']);
  });

  it('attributes nothing to habits the user does not have', () => {
    const run = habit({ name: 'Run', created_by_user: true, template_id: 'distance' });

    const reports = buildMetricFamilyReports(
      [log('some-deleted-habit', { distance_mi: 99 }), log(run.id, { distance_mi: 3 })],
      [run],
      TODAY
    );

    expect(byId(reports, 'distance')!.value).toBe(3);
  });

  it('ignores logs that are not habit reps', () => {
    const run = habit({ name: 'Run', created_by_user: true, template_id: 'distance' });
    const challengeLog: CompletionLog = {
      ...log(run.id, { distance_mi: 99 }),
      type: 'challenge',
    };

    const reports = buildMetricFamilyReports(
      [challengeLog, log(run.id, { distance_mi: 3 })],
      [run],
      TODAY
    );

    expect(byId(reports, 'distance')!.value).toBe(3);
  });

  it('orders registered families ahead of derived ones', () => {
    const run = habit({ name: 'Run', created_by_user: true, template_id: 'distance' });
    const meditate = habit({ name: 'Meditation', practice_id: 'meditation' });

    const reports = buildMetricFamilyReports(
      [log(run.id, { distance_mi: 3 }), log(meditate.id, { duration_min: 20 })],
      [run, meditate],
      TODAY
    );

    // Time is order 1, Distance order 2.
    expect(reports.map((r) => r.id)).toEqual(['time', 'distance']);
  });

  it('returns nothing when no numeric metrics were logged', () => {
    const bed = habit({ name: 'Make the bed', created_by_user: true, template_id: 'none' });
    expect(buildMetricFamilyReports([log(bed.id, undefined)], [bed], TODAY)).toEqual([]);
  });

  describe('weekly buckets', () => {
    const run = habit({ name: 'Run', created_by_user: true, template_id: 'distance' });
    // Jun 29 (Mon) and Jul 12 (Sun) — one week with nothing in between.
    const reports = buildMetricFamilyReports(
      [log(run.id, { distance_mi: 5 }, '2026-06-29'), log(run.id, { distance_mi: 3 }, TODAY)],
      [run],
      TODAY
    );
    const weekly = byId(reports, 'distance')!.weekly;

    it('covers every week in the window, oldest first', () => {
      expect(weekly.map((w) => w.weekStart)).toEqual(['2026-06-29', '2026-07-06']);
    });

    it('marks weeks with no reps so they render as gaps, not zeroes', () => {
      const empty = buildMetricFamilyReports(
        [log(run.id, { distance_mi: 5 }, '2026-06-22'), log(run.id, { distance_mi: 3 }, TODAY)],
        [run],
        TODAY
      );
      const buckets = byId(empty, 'distance')!.weekly;
      expect(buckets.map((b) => b.weekStart)).toEqual([
        '2026-06-22',
        '2026-06-29',
        '2026-07-06',
      ]);
      expect(buckets.find((b) => b.weekStart === '2026-06-29')?.logged).toBe(0);
    });

    it('aggregates each week the same way as the family headline', () => {
      expect(weekly.map((w) => w.value)).toEqual([5, 3]);
    });
  });
});

describe('resolveHabitTrackingFields', () => {
  it('reads a curated habit template from the catalog', () => {
    expect(resolveHabitTrackingFields({ practice_id: 'meditation' }).map((f) => f.key)).toEqual(
      getPractice('meditation')!.tracking!.map((f) => f.key)
    );
  });

  it('reads a custom habit template from its preset', () => {
    expect(resolveHabitTrackingFields({ template_id: 'distance' }).map((f) => f.key)).toEqual([
      'distance_mi',
    ]);
  });

  it('returns nothing for a habit with no template either way', () => {
    expect(resolveHabitTrackingFields({})).toEqual([]);
    expect(resolveHabitTrackingFields({ template_id: 'none' })).toEqual([]);
  });
});

describe('familyForField', () => {
  it('derives a single-metric family for an unregistered numeric key', () => {
    const derived = familyForField({
      key: 'pullups_max',
      label: 'Max set',
      type: 'number',
      unit: 'reps',
    })!;
    expect(derived.id).toBe('metric:pullups_max');
    expect(derived.label).toBe('Max set');
    expect(derived.aggregate).toBe('sum');
  });

  it('averages a derived scale and follows record.pick for direction', () => {
    const derived = familyForField({
      key: 'soreness',
      label: 'Soreness',
      type: 'scale',
      record: { pick: 'min' },
    })!;
    expect(derived.aggregate).toBe('avg');
    expect(derived.direction).toBe('down');
  });

  it('gives choice fields no family', () => {
    expect(
      familyForField({ key: 'technique', label: 'Technique', type: 'choice' })
    ).toBeUndefined();
  });
});

describe('formatMetric', () => {
  it('groups thousands', () => {
    expect(formatMetric(84000, 'steps')).toBe('84,000 steps');
  });

  it('renders currency as a prefix', () => {
    expect(formatMetric(1500, '$')).toBe('$1,500');
  });

  it('renders degrees without a space', () => {
    expect(formatMetric(42, '°F')).toBe('42°F');
  });

  it('rounds to one decimal and drops a trailing .0', () => {
    expect(formatMetric(4.25, 'mi')).toBe('4.3 mi');
    expect(formatMetric(4.0, 'mi')).toBe('4 mi');
  });

  it('omits the unit when there is none', () => {
    expect(formatMetric(4)).toBe('4');
  });
});
