import { collection, query, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { CompletionLog, Challenge, PracticeInstance } from '../types';
import {
  TrackingField,
  getPractice,
  compareByIntensity,
  DEFAULT_PRACTICE_COLOR,
} from '../data/practices';
import { resolveHabitTrackingFields } from '../data/habitTemplates';
import { getCurrentWeekBounds } from './practices';
import {
  buildMetricFamilyReports,
  formatMetric,
  MetricFamilyReport,
} from './metricFamilies';

// =============================================================================
// PRACTICE PROGRESS — the Progress screen aggregation for the practice-protocol
// era. Replaces the arena-based proof layer (arenaProgress.ts):
//
// - Override Score = ALL practice + challenge completions this week (the old
//   arena gate excluded untagged reps, which undercounts now that the curated
//   roster carries no arena tags).
// - Training Volume = per-practice reps/points plus metric aggregates derived
//   from CompletionLog.metrics, keyed by the catalog's TrackingField defs, so
//   admin-added practices get stats with no code change. Skipped metrics are
//   excluded from totals/averages — never counted as zero.
// =============================================================================

export interface PracticeVolume {
  habitId: string;
  practiceId?: string;
  name: string;
  icon: string;
  color: string;
  reps: number;
  points: number;
  /** Formatted secondary stats, e.g. ["186 min total", "avg 49°F"]. Max 2. */
  metricLines: string[];
}

export interface ChallengeSummary {
  completions: number;
  points: number;
  /** Mean difficulty_actual (1–5) of the period's challenge logs; null if none rated. */
  avgDifficulty: number | null;
}

export interface TrainingQuality {
  /** Reps where a hardest moment was described (practice logs' hitHardMoment + completed challenges' reflection). */
  hardMoments: number;
  /** % of the period's practice reps rated "challenging" (vs "easy"); null if none. */
  challengingPct: number | null;
  /** Same % for the previous equal-length window; null on the "all" filter or no data. */
  prevChallengingPct: number | null;
}

export interface PersonalRecord {
  icon: string;
  label: string;
  value: string;
}

export interface PracticeProgress {
  practices: PracticeVolume[];
  challenges: ChallengeSummary;
  quality: TrainingQuality;
  weekScore: number;
  lastWeekScore: number;
  records: PersonalRecord[];
  /**
   * The same period reps sliced by what they MEASURED rather than which habit
   * logged them — every distance habit under Distance, every timed one under
   * Time. Derived from logs already fetched here; costs no extra reads.
   */
  metricFamilies: MetricFamilyReport[];
}

const logsRef = (uid: string) => collection(db, 'users', uid, 'completionLogs');
const habitsRef = (uid: string) => collection(db, 'users', uid, 'habits');
const challengesRef = (uid: string) => collection(db, 'users', uid, 'challenges');

const toDateStr = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const addDays = (dateStr: string, days: number): string => {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return toDateStr(d);
};

const daysBetween = (fromStr: string, toStr: string): number => {
  const from = new Date(fromStr + 'T00:00:00');
  const to = new Date(toStr + 'T00:00:00');
  return Math.round((to.getTime() - from.getTime()) / 86400000);
};

const withUnit = (value: number, unit?: string): string => {
  if (!unit) return String(value);
  return unit.startsWith('°') ? `${value}${unit}` : `${value} ${unit}`;
};

/**
 * Turn a practice's logged metrics into up to two display lines, by field type:
 * duration → sum, number → average, choice → mode. Reps where a metric was
 * skipped are simply left out of that metric's math.
 */
const buildMetricLines = (
  fields: TrackingField[] | undefined,
  habitLogs: CompletionLog[]
): string[] => {
  if (!fields || habitLogs.length === 0) return [];
  const lines: string[] = [];

  for (const field of fields) {
    if (lines.length >= 2) break;
    const values = habitLogs
      .map((l) => l.metrics?.[field.key])
      .filter((v): v is number | string => v !== undefined && v !== null && v !== '');
    if (values.length === 0) continue;

    if (field.type === 'duration' || field.type === 'number') {
      const nums = values.filter((v): v is number => typeof v === 'number' && isFinite(v));
      if (nums.length === 0) continue;
      if (field.type === 'duration') {
        const total = Math.round(nums.reduce((s, n) => s + n, 0));
        lines.push(`${withUnit(total, field.unit)} total`);
      } else {
        const avg = Math.round(nums.reduce((s, n) => s + n, 0) / nums.length);
        lines.push(`avg ${withUnit(avg, field.unit)}`);
      }
    } else {
      const counts = new Map<string, number>();
      values.forEach((v) => counts.set(String(v), (counts.get(String(v)) || 0) + 1));
      const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
      const label = field.options?.find((o) => o.value === top[0])?.label || top[0];
      lines.push(`mostly ${label.toLowerCase()}`);
    }
  }

  return lines;
};

/**
 * How many metric-backed records the card will show before it stops being a
 * highlight reel. Best-supported (most reps behind them) win the slots.
 */
const MAX_METRIC_RECORDS = 6;

/** A completed practice rep or challenge counts as one override. */
const isOverride = (log: CompletionLog): boolean =>
  log.type === 'nudge' || log.type === 'challenge';

const challengingPctOf = (nudgeLogs: CompletionLog[]): number | null => {
  const rated = nudgeLogs.filter((l) => l.difficulty === 1 || l.difficulty === 2);
  if (rated.length === 0) return null;
  const challenging = rated.filter((l) => l.difficulty === 2).length;
  return Math.round((challenging / rated.length) * 100);
};

export const getPracticeProgress = async (
  userId: string,
  startDate?: string
): Promise<PracticeProgress> => {
  const [logSnap, habitSnap, challengeSnap] = await Promise.all([
    getDocs(query(logsRef(userId))),
    getDocs(query(habitsRef(userId))),
    getDocs(query(challengesRef(userId))),
  ]);

  const logs = logSnap.docs.map((d) => ({ id: d.id, ...d.data() } as CompletionLog));
  const habits = habitSnap.docs.map((d) => ({ id: d.id, ...d.data() } as PracticeInstance));
  const challenges = challengeSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Challenge));

  const inPeriod = (date?: string) => !!date && (!startDate || date >= startDate);
  const periodLogs = logs.filter((l) => inPeriod(l.date));

  // ---- Override Score (weekly, filter-independent) ----
  const { mondayStr } = getCurrentWeekBounds();
  const lastMondayStr = addDays(mondayStr, -7);
  const lastSundayStr = addDays(mondayStr, -1);
  let weekScore = 0;
  let lastWeekScore = 0;
  logs.forEach((l) => {
    if (!isOverride(l)) return;
    if (l.date >= mondayStr) weekScore++;
    else if (l.date >= lastMondayStr && l.date <= lastSundayStr) lastWeekScore++;
  });

  // ---- Training Volume (per adopted practice, in period) ----
  const periodNudgeLogsByHabit = new Map<string, CompletionLog[]>();
  periodLogs.forEach((l) => {
    if (l.type !== 'nudge') return;
    const list = periodNudgeLogsByHabit.get(l.reference_id) || [];
    list.push(l);
    periodNudgeLogsByHabit.set(l.reference_id, list);
  });

  // One flat list — every practice trains the same thing (the override), so
  // there's no Activate/Calm/Restrain grouping. Ordered gentle → extreme to
  // match the Home practices section.
  const practices: PracticeVolume[] = habits
    .filter((h) => h.is_active)
    .sort(compareByIntensity)
    .map((h) => {
      const catalog = getPractice(h.practice_id);
      const habitLogs = periodNudgeLogsByHabit.get(h.id) || [];
      return {
        habitId: h.id,
        practiceId: h.practice_id,
        name: h.name,
        icon: catalog?.icon || 'sparkles-outline',
        color: catalog?.color || DEFAULT_PRACTICE_COLOR,
        reps: habitLogs.length,
        points: habitLogs.reduce((s, l) => s + (l.points || 0), 0),
        // Resolves BOTH sources. Reading catalog?.tracking alone left every
        // custom habit — the ones using the six presets — with no metric lines
        // at all, even though their metrics were being captured.
        metricLines: buildMetricLines(resolveHabitTrackingFields(h), habitLogs),
      };
    });

  // ---- Challenges summary (in period) ----
  const challengeLogs = periodLogs.filter((l) => l.type === 'challenge');
  const ratedChallenges = challengeLogs.filter((l) => (l.difficulty || 0) > 0);
  const challengeSummary: ChallengeSummary = {
    completions: challengeLogs.length,
    points: challengeLogs.reduce((s, l) => s + (l.points || 0), 0),
    avgDifficulty: ratedChallenges.length
      ? Math.round(
          (ratedChallenges.reduce((s, l) => s + l.difficulty, 0) / ratedChallenges.length) * 10
        ) / 10
      : null,
  };

  // ---- Training Quality ----
  const hardMomentsFromLogs = periodLogs.filter((l) => l.hitHardMoment === true).length;
  const hardMomentsFromChallenges = challenges.filter((c) => {
    if (c.status !== 'completed') return false;
    if (!(c.reflection_hardest_moment || '').trim()) return false;
    const completedDate = c.completed_at?.split('T')[0] || c.date;
    return inPeriod(completedDate);
  }).length;

  const periodNudgeLogs = periodLogs.filter((l) => l.type === 'nudge');
  let prevChallengingPct: number | null = null;
  if (startDate) {
    const windowLen = Math.max(1, daysBetween(startDate, toDateStr(new Date())));
    const prevStart = addDays(startDate, -windowLen);
    const prevNudgeLogs = logs.filter(
      (l) => l.type === 'nudge' && l.date >= prevStart && l.date < startDate
    );
    prevChallengingPct = challengingPctOf(prevNudgeLogs);
  }

  const quality: TrainingQuality = {
    hardMoments: hardMomentsFromLogs + hardMomentsFromChallenges,
    challengingPct: challengingPctOf(periodNudgeLogs),
    prevChallengingPct,
  };

  // ---- Personal records (all-time) ----
  const records: PersonalRecord[] = [];

  // Derived from every adopted habit's `TrackingField.record` config rather than
  // a hardcoded list of practice ids — so a new habit with an interesting metric
  // gets a record with no code change. (The old map named three practices and
  // ignored the record labels the catalog already authored.)
  const allNudgeLogsByHabit = new Map<string, CompletionLog[]>();
  logs.forEach((l) => {
    if (l.type !== 'nudge') return;
    const list = allNudgeLogsByHabit.get(l.reference_id) || [];
    list.push(l);
    allNudgeLogsByHabit.set(l.reference_id, list);
  });

  const metricRecords: (PersonalRecord & { support: number; habitName: string })[] = [];
  habits.forEach((h) => {
    const habitLogs = allNudgeLogsByHabit.get(h.id) || [];
    if (habitLogs.length === 0) return;

    resolveHabitTrackingFields(h).forEach((field) => {
      if (!field.record) return;
      const values = habitLogs
        .map((l) => l.metrics?.[field.key])
        .filter((v): v is number => typeof v === 'number' && isFinite(v));
      if (values.length === 0) return;
      const best =
        field.record.pick === 'min' ? Math.min(...values) : Math.max(...values);
      metricRecords.push({
        icon: field.record.icon || 'stats-chart-outline',
        label: field.record.label || field.label,
        value: formatMetric(best, field.unit),
        support: values.length,
        habitName: h.name,
      });
    });
  });

  // "Longest session" is authored on several habits. Left alone the card would
  // compare a sauna against a language lesson under one row, so any label
  // claimed by more than one habit gets the habit name appended.
  const labelCounts = new Map<string, number>();
  metricRecords.forEach((r) => labelCounts.set(r.label, (labelCounts.get(r.label) || 0) + 1));

  metricRecords
    .sort((a, b) => b.support - a.support)
    .slice(0, MAX_METRIC_RECORDS)
    .forEach((r) => {
      records.push({
        icon: r.icon,
        label: (labelCounts.get(r.label) || 0) > 1 ? `${r.label} · ${r.habitName}` : r.label,
        value: r.value,
      });
    });

  // Best streak of consecutive active days
  const uniqueDates = [...new Set(logs.map((l) => l.date))].sort();
  let bestStreak = uniqueDates.length > 0 ? 1 : 0;
  let run = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    if (daysBetween(uniqueDates[i - 1], uniqueDates[i]) === 1) {
      run++;
      if (run > bestStreak) bestStreak = run;
    } else {
      run = 1;
    }
  }
  if (bestStreak > 0) {
    records.push({ icon: 'flame', label: 'Best streak', value: `${bestStreak} days` });
  }

  // Best rolling 7-day window of overrides
  const overrideLogs = logs.filter(isOverride);
  let bestWeek = 0;
  uniqueDates.forEach((start) => {
    const end = addDays(start, 6);
    const count = overrideLogs.filter((l) => l.date >= start && l.date <= end).length;
    if (count > bestWeek) bestWeek = count;
  });
  if (bestWeek > 0) {
    records.push({ icon: 'trophy', label: 'Best week', value: `${bestWeek} overrides` });
  }

  return {
    practices,
    challenges: challengeSummary,
    quality,
    weekScore,
    lastWeekScore,
    records,
    // Period-scoped, like Training Volume beside it. All habits are passed, not
    // just active ones: a mile logged under a habit since archived still counts.
    metricFamilies: buildMetricFamilyReports(periodLogs, habits),
  };
};
