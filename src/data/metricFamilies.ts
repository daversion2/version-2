import { TrackingField } from './practices';

// =============================================================================
// METRIC FAMILIES — the cross-habit axis of the Progress screen.
//
// Training Volume answers "which habits did I show up for". This answers the
// other question: "what did all those reps add up to". Run 4 miles, walk 2,
// cycle 10 — three habits, one number worth seeing.
//
// The grouping key is the TRACKING FIELD KEY, not the template id. Only CUSTOM
// habits carry `template_id`; curated ones resolve their fields from the catalog
// via `practice_id`. Grouping by template would silently drop all 17 curated
// habits that track `duration_min`. Grouping by field key catches both.
//
// This registry only encodes the MERGES and the OVERRIDES. Any numeric key it
// doesn't mention still gets a family, derived from the field itself at report
// time — so an admin-added metric shows up with no code change, and nothing is
// ever silently dropped. See services/metricFamilies.ts.
// =============================================================================

/**
 * How a family's reps combine into one headline number.
 *
 * 'sum' for quantities you accumulate (minutes, miles, ounces); 'avg' for levels
 * you hold (a 1–5 grade, water temperature, a fasting window). Summing a
 * temperature is meaningless, and averaging miles hides the month's mileage.
 */
export type MetricAggregate = 'sum' | 'avg';

/**
 * Which way is progress. 'down' for the metrics you're trying to shrink —
 * screen hours, plunge temperature — so a falling line reads as a win.
 */
export type MetricDirection = 'up' | 'down';

export interface MetricFamily {
  id: string;
  /** Chip label, e.g. "Time". */
  label: string;
  icon: string;
  /** Tracking field keys that roll up together. */
  keys: string[];
  aggregate: MetricAggregate;
  direction: MetricDirection;
  /**
   * Noun for the headline, e.g. "3 habits · 186 min total". Omitted families
   * fall back to the field's own unit.
   */
  unit?: string;
  /** Sort order in the chip row. Lower first. */
  order: number;
}

export const METRIC_FAMILIES: MetricFamily[] = [
  // The big one: 17 curated habits plus the 'time' preset all write duration_min.
  {
    id: 'time',
    label: 'Time',
    icon: 'timer-outline',
    keys: ['duration_min'],
    aggregate: 'sum',
    direction: 'up',
    unit: 'min',
    order: 1,
  },
  {
    id: 'distance',
    label: 'Distance',
    icon: 'map-outline',
    keys: ['distance_mi'],
    aggregate: 'sum',
    direction: 'up',
    unit: 'mi',
    order: 2,
  },
  {
    id: 'steps',
    label: 'Steps',
    icon: 'walk-outline',
    keys: ['steps'],
    aggregate: 'sum',
    direction: 'up',
    unit: 'steps',
    order: 3,
  },
  {
    id: 'reps',
    label: 'Reps',
    icon: 'barbell-outline',
    keys: ['reps'],
    aggregate: 'sum',
    direction: 'up',
    unit: 'reps',
    order: 4,
  },
  // A real merge: 'grade' (the custom preset) and 'adherence' (no-sugar,
  // water-only) are the same 1–5 "how well did you hold to it" question under
  // two names. Averaged, never summed — a total grade means nothing.
  {
    id: 'grade',
    label: 'Grade',
    icon: 'ribbon-outline',
    keys: ['grade', 'adherence'],
    aggregate: 'avg',
    direction: 'up',
    order: 5,
  },
  {
    id: 'count',
    label: 'Count',
    icon: 'list-outline',
    keys: ['count'],
    aggregate: 'sum',
    direction: 'up',
    order: 6,
  },
  {
    id: 'water',
    label: 'Water',
    icon: 'water-outline',
    keys: ['water_oz'],
    aggregate: 'sum',
    direction: 'up',
    unit: 'oz',
    order: 7,
  },
  {
    id: 'servings',
    label: 'Servings',
    icon: 'nutrition-outline',
    keys: ['servings'],
    aggregate: 'sum',
    direction: 'up',
    unit: 'servings',
    order: 8,
  },
  {
    id: 'meals',
    label: 'Meals',
    icon: 'restaurant-outline',
    keys: ['meals'],
    aggregate: 'sum',
    direction: 'up',
    unit: 'meals',
    order: 9,
  },
  // Deliberately NOT merged into 'time'. A 16-hour fasting window is not sixteen
  // hours of training — summed into total minutes it would swamp every other
  // habit on the chart. The meaningful stat is the average window.
  {
    id: 'fasting',
    label: 'Fasting',
    icon: 'time-outline',
    keys: ['duration_hrs'],
    aggregate: 'avg',
    direction: 'up',
    unit: 'hrs',
    order: 10,
  },
  // Less is the win here, and an average day is the honest read — a sum just
  // grows forever and says nothing about whether the habit is working.
  {
    id: 'screens',
    label: 'Screen time',
    icon: 'phone-portrait-outline',
    keys: ['screen_hrs'],
    aggregate: 'avg',
    direction: 'down',
    unit: 'hrs',
    order: 11,
  },
  // Cold and heat stay apart on purpose: both are °F, but colder is the win for
  // one and hotter for the other. One "Temperature" family would average a
  // plunge against a sauna and mean nothing.
  {
    id: 'cold',
    label: 'Cold',
    icon: 'snow-outline',
    keys: ['water_temp_f'],
    aggregate: 'avg',
    direction: 'down',
    unit: '°F',
    order: 12,
  },
  {
    id: 'heat',
    label: 'Heat',
    icon: 'flame-outline',
    keys: ['temp_f'],
    aggregate: 'avg',
    direction: 'up',
    unit: '°F',
    order: 13,
  },
  {
    id: 'money',
    label: 'Money',
    icon: 'wallet-outline',
    keys: ['amount'],
    aggregate: 'sum',
    direction: 'up',
    unit: '$',
    order: 14,
  },
];

const FAMILY_BY_KEY: Record<string, MetricFamily> = METRIC_FAMILIES.reduce(
  (acc, family) => {
    family.keys.forEach((key) => {
      acc[key] = family;
    });
    return acc;
  },
  {} as Record<string, MetricFamily>
);

/** The registered family a tracking key rolls into, if any. */
export const getMetricFamilyForKey = (key: string): MetricFamily | undefined =>
  FAMILY_BY_KEY[key];

/**
 * The family for a key the registry doesn't know about — one metric, its own
 * chip, labelled from the field. Keeps admin-added metrics from vanishing.
 *
 * Aggregation is inferred the way the field itself is shaped: durations and
 * plain numbers accumulate, a scale is a level you hold, so it averages.
 * Direction comes from `record.pick`, which authors already set on the metrics
 * where lower is better.
 */
export const deriveMetricFamily = (field: TrackingField): MetricFamily => ({
  id: `metric:${field.key}`,
  label: field.record?.label || field.label,
  icon: field.record?.icon || 'stats-chart-outline',
  keys: [field.key],
  aggregate: field.type === 'scale' ? 'avg' : 'sum',
  direction: field.record?.pick === 'min' ? 'down' : 'up',
  unit: field.unit,
  // After every registered family, so the curated ones lead the chip row.
  order: 100,
});

/**
 * The family a field belongs to: its registered one, or a derived single-metric
 * family. Non-numeric fields have no family — a 'choice' like "breath vs cold
 * shower" can't be summed or averaged, and is already broken down per-habit on
 * the habit detail screen.
 */
export const familyForField = (field: TrackingField): MetricFamily | undefined => {
  if (field.type === 'choice') return undefined;
  return getMetricFamilyForKey(field.key) || deriveMetricFamily(field);
};
