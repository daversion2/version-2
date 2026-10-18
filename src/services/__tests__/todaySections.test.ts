import { buildTodaySectionViews, RowClass } from '../todaySections';
import { HabitPace } from '../habitPace';
import { prefillMetrics, stepMetric, buildQuickSheetInput } from '../lastMetrics';
import { requestDetailedLog, takeDetailedLogRequest } from '../todayRequests';
import { displayStreak } from '../streakDisplay';
import { sectionForCategory, sectionOfHabit } from '../../data/habitSections';
import { CompletionLog } from '../../types';
import type { TrackingField } from '../../data/practices';

const pace = (habitId: string, p: Partial<HabitPace> = {}): HabitPace =>
  ({
    habitId,
    target: 3,
    completed: 0,
    doneDates: [],
    isDone: false,
    remaining: 3,
    daysLeft: 4,
    status: 'on_pace',
    urgency: 0,
    doneToday: false,
    dayScheduled: false,
    dueToday: false,
    missed: 0,
    dueDates: [],
    scheduleLabel: '3× a week',
    todayTarget: 0,
    ...p,
  }) as HabitPace;

describe('buildTodaySectionViews', () => {
  const classes: Record<string, RowClass> = {
    meditate: { section: 'mind', kind: 'app', appId: 'meditate' },
    bedtime: { section: 'mind', kind: 'plain' },
    focus: { section: 'mind', kind: 'plain' },
    nophone: { section: 'mind', kind: 'plain' },
    workout: { section: 'movement', kind: 'app', appId: 'workouts' },
    cold: { section: 'movement', kind: 'plain' },
  };
  const classify = (id: string) => classes[id] ?? null;

  it('puts what needs you today on top, app first, and folds the rest away', () => {
    const views = buildTodaySectionViews(
      [
        // Pace order: the most pressing first.
        pace('bedtime', { dueToday: true, dayScheduled: true }),
        pace('cold', { status: 'behind' }),
        pace('focus'), // open: nothing owed today
        pace('meditate'), // open, but an app — stays on top
        pace('nophone', { doneToday: true }),
        pace('workout', { doneToday: true }),
      ],
      classify
    );

    expect(views.map((v) => v.id)).toEqual(['mind', 'movement']);
    const [mind, movement] = views;
    expect(mind.rows.map((r) => r.habitId)).toEqual(['meditate', 'bedtime']);
    expect(mind.weekRows.map((r) => r.habitId)).toEqual(['focus']);
    expect(mind.doneRows.map((r) => r.habitId)).toEqual(['nophone']);
    expect(mind.allDone).toBe(false);

    expect(movement.rows.map((r) => r.habitId)).toEqual(['cold']);
    expect(movement.rows[0].kind).toBe('plain');
    expect(movement.doneRows.map((r) => r.habitId)).toEqual(['workout']);
  });

  it('drops empty sections and marks a finished one done', () => {
    const views = buildTodaySectionViews([pace('workout', { doneToday: true })], classify);
    expect(views).toHaveLength(1);
    expect(views[0]).toMatchObject({ id: 'movement', allDone: true, rows: [] });
  });

  it('skips habits it cannot place', () => {
    expect(buildTodaySectionViews([pace('ghost')], classify)).toEqual([]);
  });
});

describe('habit sections', () => {
  it('files Sleep and Focus under Mind, and Money nowhere', () => {
    expect(sectionForCategory('Sleep')).toBe('mind');
    expect(sectionForCategory('Focus')).toBe('mind');
    expect(sectionForCategory('Move')).toBe('movement');
    expect(sectionForCategory('Fuel')).toBe('meals');
    expect(sectionForCategory('Money')).toBeUndefined();
  });

  it('places a library habit by its catalog category and a custom one by its own', () => {
    expect(sectionOfHabit({ practice_id: 'workout' })).toBe('movement');
    expect(sectionOfHabit({ practice_id: 'meals' })).toBe('meals');
    expect(sectionOfHabit({ category_id: 'Fuel' })).toBe('meals');
    // Unplaceable: lands in Mind rather than vanishing off Today.
    expect(sectionOfHabit({ category_id: 'Connection' })).toBe('mind');
  });
});

describe('prefillMetrics', () => {
  const fields: TrackingField[] = [
    { key: 'duration_min', label: 'How long?', type: 'duration', unit: 'min', min: 1, max: 20, step: 1, default: 2 },
    { key: 'water_temp_f', label: 'Water', type: 'number', unit: '°F', min: 32, max: 70, step: 1, default: 55 },
    { key: 'technique', label: 'Technique', type: 'choice', options: [{ value: 'a', label: 'A' }] },
  ];
  const log = (date: string, metrics: Record<string, number | string>, extra: Partial<CompletionLog> = {}) =>
    ({ id: date, reference_id: 'cold', type: 'nudge', date, metrics, ...extra }) as CompletionLog;

  it('takes the newest logged value for each number, and ignores choices', () => {
    const out = prefillMetrics(fields, { id: 'cold' }, [
      log('2026-10-10', { duration_min: 2, water_temp_f: 58 }),
      log('2026-10-15', { duration_min: 3 }),
      log('2026-10-16', { duration_min: 9 }, { reference_id: 'other' }),
    ]);
    expect(out).toEqual({ duration_min: 3, water_temp_f: 58 });
  });

  it('falls back to the commitment, then the default', () => {
    expect(prefillMetrics(fields, { id: 'cold', metric_goals: { duration_min: 5 } }, [])).toEqual({
      duration_min: 5,
      water_temp_f: 55,
    });
  });

  it('returns nothing for a habit with no numbers to track', () => {
    expect(prefillMetrics(undefined, { id: 'x' }, [])).toEqual({});
  });

  it('steps on the field grid within its bounds', () => {
    expect(stepMetric(fields[0], 3, 1)).toBe(4);
    expect(stepMetric(fields[0], 1, -1)).toBe(1);
    expect(stepMetric(fields[0], 20, 1)).toBe(20);
  });
});

describe('buildQuickSheetInput', () => {
  it('flags amounts carried over unchanged', () => {
    expect(buildQuickSheetInput(2, { duration_min: 3 }, { duration_min: 3 })).toEqual({
      resistance: 2,
      difficulty: expect.any(String),
      metrics: { duration_min: 3 },
      metrics_assumed: true,
      logged_via: 'quick',
    });
  });

  it('treats an adjusted amount as measured, and carries a date', () => {
    const input = buildQuickSheetInput(3, { duration_min: 4 }, { duration_min: 3 }, '2026-10-17');
    expect(input.metrics_assumed).toBe(false);
    expect(input.date).toBe('2026-10-17');
  });

  it('writes no metrics for a habit without numbers', () => {
    const input = buildQuickSheetInput(1, {}, {});
    expect(input.metrics).toBeUndefined();
    expect(input.metrics_assumed).toBeUndefined();
  });
});

describe('detailed-log handoff', () => {
  it('is read once', () => {
    requestDetailedLog({ habitId: 'h1' });
    expect(takeDetailedLogRequest()).toEqual({ habitId: 'h1' });
    expect(takeDetailedLogRequest()).toBeNull();
  });
});

describe('displayStreak', () => {
  it('shows the streak while it is alive and 0 once it has lapsed', () => {
    expect(displayStreak(12, '2026-10-18', '2026-10-18')).toBe(12);
    expect(displayStreak(12, '2026-10-17', '2026-10-18')).toBe(12);
    expect(displayStreak(12, '2026-10-16', '2026-10-18')).toBe(0);
    expect(displayStreak(5, '2026-09-30', '2026-10-01')).toBe(5);
    expect(displayStreak(undefined, undefined, '2026-10-18')).toBe(0);
  });
});

describe('formatMetricValue', () => {
  const { formatMetricValue } = require('../lastMetrics');
  it('reads like the user wrote it', () => {
    expect(formatMetricValue({ key: 'm', label: '', type: 'duration', unit: 'min' }, 3)).toBe('3 min');
    expect(formatMetricValue({ key: 't', label: '', type: 'number', unit: '°F' }, 50)).toBe('50°F');
    expect(formatMetricValue({ key: 's', label: '', type: 'number' }, 10400)).toBe('10,400');
    expect(formatMetricValue({ key: 'g', label: '', type: 'scale', valueLabels: { 5: 'A', 4: 'B' } }, 5)).toBe('A');
  });
});
