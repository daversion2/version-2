import { CompletionLog, PracticeInstance } from '../types';
import { TrackingField, getPractice, DEFAULT_PRACTICE_COLOR } from '../data/practices';
import { scaleLabel } from '../data/gradeScale';
import { resolveHabitTrackingFields } from '../data/habitTemplates';
import {
  METRIC_FAMILIES,
  MetricAggregate,
  MetricDirection,
  MetricFamily,
  familyForField,
} from '../data/metricFamilies';

// =============================================================================
// METRIC FAMILY REPORTS — cross-habit rollup for the Progress screen.
//
// Training Volume slices reps by habit. This slices the same reps by what they
// MEASURED: every habit that logs miles lands in Distance, every habit that logs
// minutes lands in Time. Nothing here hits Firestore — getPracticeProgress
// already fetches every log and every habit, so this is a second pass over data
// that is already in memory.
//
// Two rules keep the numbers honest:
//   1. A family only shows a combined headline when every contributing habit
//      logs in the SAME unit. "5 glasses of water + 3 things I'm grateful for"
//      are both the Count template and must never be added up.
//   2. Reps where a metric was skipped are left out of that metric's math —
//      never counted as zero. Same rule the per-habit stats already follow.
// =============================================================================

export interface MetricFamilyHabit {
  habitId: string;
  name: string;
  icon: string;
  color: string;
  /** Reps in the window that carried one of this family's metrics. */
  logged: number;
  /** Total of the logged values, in this habit's own unit. */
  total: number;
  average: number;
  /** Best single rep, by the family's direction. */
  best: number;
  unit?: string;
  /** This habit's contribution to the family headline — total, or mean if the family averages. */
  value: number;
  /** Preformatted `value` with unit, e.g. "42 mi". */
  formattedValue: string;
}

export interface MetricFamilyWeek {
  /** Monday of the week, YYYY-MM-DD local. */
  weekStart: string;
  /** Aggregate for the week. Meaningless when `logged` is 0 — render as a gap, not a zero. */
  value: number;
  logged: number;
}

export interface MetricFamilyBest {
  value: number;
  formatted: string;
  date: string;
  habitName: string;
}

export interface MetricFamilyReport {
  id: string;
  label: string;
  icon: string;
  aggregate: MetricAggregate;
  direction: MetricDirection;
  unit?: string;
  /**
   * False when contributing habits log in different units, which makes a single
   * combined number nonsense. The per-habit rows still stand on their own.
   */
  combinable: boolean;
  /** The headline number. Null when !combinable. */
  value: number | null;
  /** Preformatted `value`, e.g. "186 min" or "B". Null when !combinable. */
  formattedValue: string | null;
  /** Named stops, when this family's metric is lettered rather than counted. */
  valueLabels?: Record<number, string>;
  /** Total reps across the family that carried the metric. */
  logged: number;
  /** Contributing habits, biggest contribution first. */
  habits: MetricFamilyHabit[];
  /** Weekly buckets across the window, oldest → newest. */
  weekly: MetricFamilyWeek[];
  /** Best single rep in the window. Null when !combinable — no shared unit to compare across. */
  best: MetricFamilyBest | null;
}

// ---- Formatting ----

const withThousands = (s: string): string => {
  const [whole, frac] = s.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return frac ? `${grouped}.${frac}` : grouped;
};

/**
 * Not practicePerformance's `withUnit`: this one has to render '$' as a prefix
 * and group thousands, because step counts and dollar amounts both land here.
 */
export const formatMetric = (
  value: number,
  unit?: string,
  /**
   * Named stops, when the metric has them — a grade reads "B", not "4". Wins
   * over the unit outright: a letter with a unit glued on says nothing.
   */
  valueLabels?: Record<number, string>
): string => {
  const labelled = scaleLabel({ valueLabels }, value);
  if (labelled) return labelled;
  const rounded = Math.round(value * 10) / 10;
  const num = withThousands(Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1));
  if (!unit) return num;
  if (unit === '$') return `$${num}`;
  if (unit.startsWith('°')) return `${num}${unit}`;
  return `${num} ${unit}`;
};

// ---- Date helpers (local-time, Monday-based — matches practicePerformance) ----

const toDateStr = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const addDays = (dateStr: string, days: number): string => {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toDateStr(d);
};

const mondayOf = (dateStr: string): string => {
  const d = new Date(`${dateStr}T00:00:00`);
  const dow = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
  return toDateStr(d);
};

/** Most recent 12 weeks are plenty for a bar chart this size. */
const MAX_WEEK_BUCKETS = 12;

const weekBuckets = (fromDateStr: string, todayStr: string): string[] => {
  const first = mondayOf(fromDateStr);
  const last = mondayOf(todayStr);
  const weeks: string[] = [];
  let cursor = first;
  while (cursor <= last && weeks.length < 500) {
    weeks.push(cursor);
    cursor = addDays(cursor, 7);
  }
  return weeks.slice(-MAX_WEEK_BUCKETS);
};

// ---- Aggregation ----

const sum = (nums: number[]): number => nums.reduce((s, n) => s + n, 0);
const mean = (nums: number[]): number => sum(nums) / nums.length;

const aggregateOf = (nums: number[], aggregate: MetricAggregate): number =>
  aggregate === 'avg' ? mean(nums) : sum(nums);

const bestOf = (nums: number[], direction: MetricDirection): number =>
  direction === 'down' ? Math.min(...nums) : Math.max(...nums);

interface Sample {
  value: number;
  date: string;
  habitId: string;
}

interface FamilyAccumulator {
  family: MetricFamily;
  /** Every unit seen across contributing fields — a family is only combinable when this has one entry. */
  units: Set<string>;
  /**
   * Named stops for this family's values, from the first contributing field
   * that has them. Gathered like units: the Grade family merges 'grade' and
   * 'adherence', and both letter their scale, so the family headline can too.
   */
  valueLabels?: Record<number, string>;
  samples: Sample[];
  byHabit: Map<string, { field: TrackingField; samples: Sample[] }>;
}

/**
 * Build one report per metric family the user has actually logged in.
 *
 * @param logs   Completion logs already narrowed to the selected time window.
 * @param habits The user's habits — pass ALL of them, active or not. A mile you
 *               ran under a habit you have since archived is still a mile you ran.
 */
export const buildMetricFamilyReports = (
  logs: CompletionLog[],
  habits: PracticeInstance[],
  todayStr: string = toDateStr(new Date())
): MetricFamilyReport[] => {
  const habitById = new Map(habits.map((h) => [h.id, h]));

  // Resolve each habit's fields once. Both sources matter: curated habits keep
  // their template on the catalog, custom habits on their preset.
  const fieldsByHabit = new Map<string, TrackingField[]>();
  habits.forEach((h) => fieldsByHabit.set(h.id, resolveHabitTrackingFields(h)));

  const accumulators = new Map<string, FamilyAccumulator>();

  logs.forEach((log) => {
    if (log.type !== 'nudge') return;
    const habit = habitById.get(log.reference_id);
    if (!habit || !log.metrics) return;
    const fields = fieldsByHabit.get(habit.id) || [];

    fields.forEach((field) => {
      const raw = log.metrics?.[field.key];
      if (typeof raw !== 'number' || !isFinite(raw)) return;
      const family = familyForField(field);
      if (!family) return;

      let acc = accumulators.get(family.id);
      if (!acc) {
        acc = { family, units: new Set(), samples: [], byHabit: new Map() };
        accumulators.set(family.id, acc);
      }
      // '' stands in for "no unit" so an unlabelled tally and a 'things' tally
      // register as the disagreement they are.
      acc.units.add(field.unit ?? '');
      if (!acc.valueLabels && field.valueLabels) acc.valueLabels = field.valueLabels;

      const sample: Sample = { value: raw, date: log.date, habitId: habit.id };
      acc.samples.push(sample);

      let perHabit = acc.byHabit.get(habit.id);
      if (!perHabit) {
        perHabit = { field, samples: [] };
        acc.byHabit.set(habit.id, perHabit);
      }
      perHabit.samples.push(sample);
    });
  });

  const windowStart = logs.reduce<string | null>(
    (earliest, l) => (l.date && (!earliest || l.date < earliest) ? l.date : earliest),
    null
  );

  const reports: MetricFamilyReport[] = [];

  accumulators.forEach((acc) => {
    const { family, samples } = acc;
    if (samples.length === 0) return;

    const combinable = acc.units.size === 1;
    // The registry's unit wins when it has one — it names the canonical unit for
    // merged families (grade + adherence). Otherwise take the single agreed unit.
    const familyUnit = family.unit ?? ([...acc.units][0] || undefined);

    const habitRows: MetricFamilyHabit[] = [...acc.byHabit.entries()]
      .map(([habitId, { field, samples: habitSamples }]) => {
        const habit = habitById.get(habitId)!;
        const values = habitSamples.map((s) => s.value);
        const catalog = getPractice(habit.practice_id);
        const value = aggregateOf(values, family.aggregate);
        const unit = field.unit ?? family.unit;
        return {
          habitId,
          name: habit.name,
          icon: catalog?.icon || 'sparkles-outline',
          color: catalog?.color || DEFAULT_PRACTICE_COLOR,
          logged: values.length,
          total: sum(values),
          average: mean(values),
          best: bestOf(values, family.direction),
          unit,
          value,
          formattedValue: formatMetric(value, unit, field.valueLabels),
        };
      })
      .sort((a, b) => b.value - a.value);

    const allValues = samples.map((s) => s.value);
    const value = combinable ? aggregateOf(allValues, family.aggregate) : null;

    // Weekly buckets over the window. Absent a window start (no logs at all we
    // could reach here), fall back to the earliest sample.
    const bucketFrom =
      windowStart ?? samples.reduce((min, s) => (s.date < min ? s.date : min), samples[0].date);
    const buckets = weekBuckets(bucketFrom, todayStr);
    const byWeek = new Map<string, number[]>();
    samples.forEach((s) => {
      const week = mondayOf(s.date);
      const list = byWeek.get(week);
      if (list) list.push(s.value);
      else byWeek.set(week, [s.value]);
    });
    const weekly: MetricFamilyWeek[] = buckets.map((weekStart) => {
      const values = byWeek.get(weekStart) || [];
      return {
        weekStart,
        value: values.length ? aggregateOf(values, family.aggregate) : 0,
        logged: values.length,
      };
    });

    let best: MetricFamilyBest | null = null;
    if (combinable) {
      const bestValue = bestOf(allValues, family.direction);
      const bestSample = samples.find((s) => s.value === bestValue)!;
      best = {
        value: bestValue,
        formatted: formatMetric(bestValue, familyUnit, acc.valueLabels),
        date: bestSample.date,
        habitName: habitById.get(bestSample.habitId)?.name ?? '',
      };
    }

    reports.push({
      id: family.id,
      label: family.label,
      icon: family.icon,
      aggregate: family.aggregate,
      direction: family.direction,
      unit: familyUnit,
      combinable,
      value,
      formattedValue: value === null ? null : formatMetric(value, familyUnit, acc.valueLabels),
      valueLabels: acc.valueLabels,
      logged: samples.length,
      habits: habitRows,
      weekly,
      best,
    });
  });

  // Registry order first, then derived families. Within the same order, the
  // family carrying more reps leads — the chip row should open on real data.
  return reports.sort((a, b) => {
    const orderA = orderOf(a.id);
    const orderB = orderOf(b.id);
    if (orderA !== orderB) return orderA - orderB;
    return b.logged - a.logged;
  });
};

/** Read off the registry so the ordering is stated in exactly one place. */
const FAMILY_ORDER: Record<string, number> = METRIC_FAMILIES.reduce(
  (acc, f) => {
    acc[f.id] = f.order;
    return acc;
  },
  {} as Record<string, number>
);

const orderOf = (familyId: string): number => FAMILY_ORDER[familyId] ?? 100;
