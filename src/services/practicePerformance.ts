import { CompletionLog } from '../types';
import { Practice, TrackingField } from '../data/practices';
import { getMindTagLabel } from '../data/mindTags';

// =============================================================================
// PRACTICE PERFORMANCE — per-practice detailed reporting for the practice
// detail screen (the "Performance" section). Pure aggregation over already-
// fetched CompletionLogs — no Firestore reads.
//
// Data-honesty rules (see the design discussion):
// - Sessions missing a metric are excluded from that metric's math, never
//   counted as zero.
// - Every insight is gated on a minimum sample size; with thin data we show
//   nothing rather than a noisy claim.
// - Mind-tag stats are phrased as what the user *logged*, not what they felt —
//   tag counts also reflect logging habits, not just experience.
// =============================================================================

export interface MetricPoint {
  value: number;
  date: string; // YYYY-MM-DD
}

export interface MetricTrend {
  field: TrackingField;
  /** Chronological, metric-bearing sessions only. Capped to the most recent DISPLAY_SESSIONS. */
  points: MetricPoint[];
  /** Mean of the last 5 metric-bearing sessions. */
  recentAvg: number;
  /** Mean of the first 5 metric-bearing sessions — only when ≥ MIN_PROGRESS_SESSIONS exist. */
  firstAvg: number | null;
}

/** One Monday-based week of difficulty ratings (oldest → newest, last 8 weeks). */
export interface WeeklyRate {
  challenging: number;
  rated: number;
}

export interface ChoiceStat {
  value: string;
  label: string;
  count: number;
  /** Share of this field's logged sessions, 0–100. */
  pct: number;
  /** % of this option's rated reps marked "challenging"; null under MIN_OPTION_RATED. */
  challengingPct: number | null;
}

export interface ChoiceBreakdown {
  field: TrackingField;
  options: ChoiceStat[];
}

export interface WeeklyDose {
  /** Oldest → newest, last 8 weeks. */
  values: number[];
  title: string;
  description: string;
}

export interface MindPatternStats {
  tags: { id: string; label: string; count: number }[];
  /** % of reps where any hard moment was logged. */
  hardMomentPct: number;
}

export interface PerformanceRecord {
  icon: string;
  label: string;
  value: string;
  /** YYYY-MM-DD of the rep that set it; undefined for cumulative records. */
  date?: string;
}

export interface PerformanceInsight {
  tone: 'progress' | 'nudge';
  icon: string;
  text: string;
}

export interface PracticePerformance {
  loggedSessions: number;
  insights: PerformanceInsight[];
  primaryTrend: MetricTrend | null;
  weeklyDose: WeeklyDose | null;
  weeklyChallenging: WeeklyRate[] | null;
  choiceBreakdowns: ChoiceBreakdown[];
  mindPatterns: MindPatternStats | null;
  records: PerformanceRecord[];
}

// ---- Gates: minimum sample sizes before a chart/insight is shown ----
export const MIN_SECTION_SESSIONS = 3;
const DISPLAY_SESSIONS = 12;
const MIN_TREND_SESSIONS = 3;
const MIN_PROGRESS_SESSIONS = 10;
const MIN_PLATEAU_SESSIONS = 6;
const MIN_PROGRESS_CHANGE_PCT = 15;
const MIN_RATED_FOR_CHART = 6;
const MIN_RATED_FOR_ADAPTATION = 8;
const ADAPTATION_WINDOW = 10;
const ADAPTATION_MAX_CHALLENGING = 2;
const MIN_OPTION_RATED = 3;
const MIN_OPTION_LOGS = 3;
const MIN_TAG_COUNT_INSIGHT = 5;
const MIN_DOSE_SESSIONS = 3;
const WEEKS = 8;

// ---- Per-practice config overlay (everything else is derived generically) ----

interface DoseConfig {
  durationKey: string;
  tempKey: string;
  /** Dose = minutes × degrees past this baseline (below it for cold, above for heat). */
  baseline: number;
  direction: 'below' | 'above';
  title: string;
  description: string;
}

const DOSE_CONFIGS: Record<string, DoseConfig> = {
  cold_exposure: {
    durationKey: 'duration_min',
    tempKey: 'water_temp_f',
    baseline: 60,
    direction: 'below',
    title: 'Weekly Cold Dose',
    description: 'Intensity score: minutes × degrees below 60°F',
  },
  heat_exposure: {
    durationKey: 'duration_min',
    tempKey: 'temp_f',
    baseline: 120,
    direction: 'above',
    title: 'Weekly Heat Dose',
    description: 'Intensity score: minutes × degrees above 120°F',
  },
};

interface RecordOverride {
  label?: string;
  icon?: string;
  /** For number fields: which extreme is the record. Defaults to 'max'. */
  pick?: 'max' | 'min';
}

const RECORD_OVERRIDES: Record<string, Record<string, RecordOverride>> = {
  meditation: { duration_min: { label: 'Longest sit', icon: 'flower-outline' } },
  cold_exposure: {
    duration_min: { label: 'Longest plunge', icon: 'timer-outline' },
    water_temp_f: { label: 'Coldest plunge', icon: 'snow-outline', pick: 'min' },
  },
  heat_exposure: {
    duration_min: { label: 'Longest session', icon: 'timer-outline' },
    temp_f: { label: 'Hottest session', icon: 'flame-outline' },
  },
};

// ---- Date helpers (local-time, matching getHabitStats' week bucketing) ----

const toDateStr = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const addDays = (dateStr: string, days: number): string => {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return toDateStr(d);
};

/** Monday of the week containing dateStr. */
const mondayOf = (dateStr: string): string => {
  const d = new Date(dateStr + 'T00:00:00');
  const dow = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
  return toDateStr(d);
};

/** The last n Monday-based weeks including the current one, oldest → newest. */
const lastNWeeks = (todayStr: string, n: number): { start: string; end: string }[] => {
  const currentMonday = mondayOf(todayStr);
  const weeks: { start: string; end: string }[] = [];
  for (let offset = n - 1; offset >= 0; offset--) {
    const start = addDays(currentMonday, -offset * 7);
    weeks.push({ start, end: addDays(start, 6) });
  }
  return weeks;
};

// ---- Formatting ----

const fmtNum = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export const withUnit = (value: number, unit?: string): string => {
  const v = fmtNum(value);
  if (!unit) return v;
  return unit.startsWith('°') ? `${v}${unit}` : `${v} ${unit}`;
};

// ---- Extraction ----

const numericValues = (logs: CompletionLog[], key: string): MetricPoint[] =>
  logs
    .map((l) => ({ value: l.metrics?.[key], date: l.date }))
    .filter((p): p is MetricPoint => typeof p.value === 'number' && isFinite(p.value));

const isRated = (l: CompletionLog): boolean => l.difficulty === 1 || l.difficulty === 2;

const avg = (nums: number[]): number => nums.reduce((s, n) => s + n, 0) / nums.length;

const round1 = (n: number): number => Math.round(n * 10) / 10;

// =============================================================================

export const buildPracticePerformance = (
  logs: CompletionLog[],
  practice: Practice | undefined,
  todayStr: string = toDateStr(new Date())
): PracticePerformance => {
  // Chronological by log date (backdating supported), then by logged-at time.
  const sorted = [...logs].sort((a, b) =>
    a.date === b.date
      ? (a.completed_at || '').localeCompare(b.completed_at || '')
      : a.date.localeCompare(b.date)
  );
  const weeks = lastNWeeks(todayStr, WEEKS);
  const fields = practice?.tracking || [];

  // ---- Primary metric trend (first duration field, else first number field) ----
  const primaryField =
    fields.find((f) => f.type === 'duration') || fields.find((f) => f.type === 'number');
  let primaryTrend: MetricTrend | null = null;
  let primarySeries: MetricPoint[] = [];
  if (primaryField) {
    primarySeries = numericValues(sorted, primaryField.key);
    if (primarySeries.length >= MIN_TREND_SESSIONS) {
      primaryTrend = {
        field: primaryField,
        points: primarySeries.slice(-DISPLAY_SESSIONS),
        recentAvg: round1(avg(primarySeries.slice(-5).map((p) => p.value))),
        firstAvg:
          primarySeries.length >= MIN_PROGRESS_SESSIONS
            ? round1(avg(primarySeries.slice(0, 5).map((p) => p.value)))
            : null,
      };
    }
  }

  // ---- Weekly dose (cold / heat exposure) ----
  let weeklyDose: WeeklyDose | null = null;
  const doseConfig = practice ? DOSE_CONFIGS[practice.id] : undefined;
  if (doseConfig) {
    const doseOf = (l: CompletionLog): number | null => {
      const mins = l.metrics?.[doseConfig.durationKey];
      const temp = l.metrics?.[doseConfig.tempKey];
      if (typeof mins !== 'number' || typeof temp !== 'number') return null;
      const degrees =
        doseConfig.direction === 'below' ? doseConfig.baseline - temp : temp - doseConfig.baseline;
      return Math.max(0, mins * Math.max(0, degrees));
    };
    const doseLogs = sorted
      .map((l) => ({ date: l.date, dose: doseOf(l) }))
      .filter((d): d is { date: string; dose: number } => d.dose !== null);
    if (doseLogs.length >= MIN_DOSE_SESSIONS) {
      const values = weeks.map((w) =>
        Math.round(
          doseLogs
            .filter((d) => d.date >= w.start && d.date <= w.end)
            .reduce((s, d) => s + d.dose, 0)
        )
      );
      if (values.some((v) => v > 0)) {
        weeklyDose = { values, title: doseConfig.title, description: doseConfig.description };
      }
    }
  }

  // ---- Weekly challenging % (every practice rates difficulty on each rep) ----
  const ratedInWindow = sorted.filter(
    (l) => isRated(l) && l.date >= weeks[0].start && l.date <= weeks[WEEKS - 1].end
  );
  let weeklyChallenging: WeeklyRate[] | null = null;
  if (ratedInWindow.length >= MIN_RATED_FOR_CHART) {
    weeklyChallenging = weeks.map((w) => {
      const inWeek = ratedInWindow.filter((l) => l.date >= w.start && l.date <= w.end);
      return {
        rated: inWeek.length,
        challenging: inWeek.filter((l) => l.difficulty === 2).length,
      };
    });
  }

  // ---- Choice breakdowns (technique / pace / meal distributions) ----
  const choiceBreakdowns: ChoiceBreakdown[] = [];
  for (const field of fields) {
    if (field.type !== 'choice') continue;
    const withValue = sorted.filter((l) => {
      const v = l.metrics?.[field.key];
      return typeof v === 'string' && v !== '';
    });
    if (withValue.length < MIN_OPTION_LOGS) continue;

    const counts = new Map<string, CompletionLog[]>();
    withValue.forEach((l) => {
      const v = String(l.metrics![field.key]);
      counts.set(v, [...(counts.get(v) || []), l]);
    });

    const options: ChoiceStat[] = [...counts.entries()]
      .map(([value, optionLogs]) => {
        const rated = optionLogs.filter(isRated);
        return {
          value,
          label: field.options?.find((o) => o.value === value)?.label || value,
          count: optionLogs.length,
          pct: Math.round((optionLogs.length / withValue.length) * 100),
          challengingPct:
            rated.length >= MIN_OPTION_RATED
              ? Math.round((rated.filter((l) => l.difficulty === 2).length / rated.length) * 100)
              : null,
        };
      })
      .sort((a, b) => b.count - a.count);

    choiceBreakdowns.push({ field, options });
  }

  // ---- Mind patterns ----
  const tagCounts = new Map<string, number>();
  sorted.forEach((l) =>
    (l.mindTags || []).forEach((id) => tagCounts.set(id, (tagCounts.get(id) || 0) + 1))
  );
  const hardMomentCount = sorted.filter((l) => l.hitHardMoment === true).length;
  let mindPatterns: MindPatternStats | null = null;
  if (sorted.length > 0 && (tagCounts.size > 0 || hardMomentCount > 0)) {
    mindPatterns = {
      tags: [...tagCounts.entries()]
        .map(([id, count]) => ({ id, label: getMindTagLabel(id), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6),
      hardMomentPct: Math.round((hardMomentCount / sorted.length) * 100),
    };
  }

  // ---- Records ----
  const records: PerformanceRecord[] = [];
  const overrides = practice ? RECORD_OVERRIDES[practice.id] || {} : {};

  for (const field of fields) {
    if (field.type === 'choice') continue;
    const series = numericValues(sorted, field.key);
    if (series.length === 0) continue;
    const override = overrides[field.key] || {};
    const pick = field.type === 'duration' ? 'max' : override.pick || 'max';
    const best = series.reduce((a, b) =>
      pick === 'max' ? (b.value >= a.value ? b : a) : b.value <= a.value ? b : a
    );
    records.push({
      icon: override.icon || (field.type === 'duration' ? 'timer-outline' : 'speedometer-outline'),
      label: override.label || (field.type === 'duration' ? 'Longest session' : `Best ${field.label.toLowerCase()}`),
      value: withUnit(best.value, field.unit),
      date: best.date,
    });
  }

  // Total time trained (minute-denominated duration fields only)
  const minutesField = fields.find((f) => f.type === 'duration' && f.unit === 'min');
  if (minutesField) {
    const total = numericValues(sorted, minutesField.key).reduce((s, p) => s + p.value, 0);
    if (total > 0) {
      records.push({
        icon: 'hourglass-outline',
        label: 'Total time trained',
        value: total >= 120 ? `${round1(total / 60)} hrs` : `${Math.round(total)} min`,
      });
    }
  }

  // Best calendar week (Mon–Sun) by rep count
  const weekCounts = new Map<string, number>();
  sorted.forEach((l) => {
    const wk = mondayOf(l.date);
    weekCounts.set(wk, (weekCounts.get(wk) || 0) + 1);
  });
  const bestWeek = [...weekCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (bestWeek && bestWeek[1] >= 2) {
    records.push({
      icon: 'trophy-outline',
      label: 'Best week',
      value: `${bestWeek[1]} reps`,
      date: bestWeek[0],
    });
  }

  // ---- Insights (each gated; max 3, in priority order) ----
  const insights: PerformanceInsight[] = [];

  // 1. Progress: first 5 vs last 5 metric-bearing sessions.
  if (primaryTrend && primaryTrend.firstAvg !== null && primaryTrend.firstAvg > 0) {
    const changePct = Math.round(
      ((primaryTrend.recentAvg - primaryTrend.firstAvg) / primaryTrend.firstAvg) * 100
    );
    if (Math.abs(changePct) >= MIN_PROGRESS_CHANGE_PCT) {
      const up = changePct > 0;
      insights.push({
        tone: up ? 'progress' : 'nudge',
        icon: up ? 'trending-up-outline' : 'trending-down-outline',
        text: `Your last 5 sessions average ${withUnit(primaryTrend.recentAvg, primaryField!.unit)} — ${
          up ? 'up' : 'down'
        } ${Math.abs(changePct)}% from your first 5.`,
      });
    }
  }

  // 2. Plateau: the last 6 metric-bearing sessions all logged the same value.
  if (primaryField && primarySeries.length >= MIN_PLATEAU_SESSIONS) {
    const tail = primarySeries.slice(-MIN_PLATEAU_SESSIONS);
    const value = tail[0].value;
    const flat = tail.every((p) => p.value === value);
    if (flat && (primaryField.max === undefined || value < primaryField.max)) {
      const next = value + (primaryField.step || 1);
      insights.push({
        tone: 'nudge',
        icon: 'flag-outline',
        text: `You've logged ${withUnit(value, primaryField.unit)} for your last ${MIN_PLATEAU_SESSIONS} sessions — try ${withUnit(next, primaryField.unit)} next time.`,
      });
    }
  }

  // 3. Adaptation: almost nothing in the recent window felt challenging.
  const rated = sorted.filter(isRated);
  if (rated.length >= MIN_RATED_FOR_ADAPTATION) {
    const window = rated.slice(-ADAPTATION_WINDOW);
    const challenging = window.filter((l) => l.difficulty === 2).length;
    if (challenging <= ADAPTATION_MAX_CHALLENGING) {
      insights.push({
        tone: 'nudge',
        icon: 'barbell-outline',
        text: `Only ${challenging} of your last ${window.length} reps felt challenging. You may have adapted — consider raising the dose.`,
      });
    }
  }

  // 4. Most-logged mind pattern (phrased as logged, not felt).
  const topTag = mindPatterns?.tags[0];
  if (topTag && topTag.count >= MIN_TAG_COUNT_INSIGHT && insights.length < 3) {
    insights.push({
      tone: 'progress',
      icon: 'sparkles-outline',
      text: `"${topTag.label}" is your most-logged mind pattern (${topTag.count} reps). Watch for it mid-session — naming it weakens it.`,
    });
  }

  return {
    loggedSessions: sorted.length,
    insights: insights.slice(0, 3),
    primaryTrend,
    weeklyDose,
    weeklyChallenging,
    choiceBreakdowns,
    mindPatterns,
    records,
  };
};
