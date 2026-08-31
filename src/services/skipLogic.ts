import { CompletionLog, PracticeInstance, SkipLog } from '../types';
import { getSkipReason, SkipReasonKind } from '../data/skipReasons';

// =============================================================================
// SKIP LOGIC — pure functions behind the weekly skip review.
//
// No Firestore here on purpose: shortfall detection is the part most likely to
// be subtly wrong (week boundaries, backdated logs, habits added mid-week), so
// it is kept testable in isolation. services/skips.ts wraps this with I/O.
//
// WHY WEEKLY, NOT DAILY: habits carry a weekly target ("4 times a week"), not
// assigned days. A 3x/week habit has four legitimately empty days, so treating
// "no log yesterday" as a skip would manufacture four false skips a week and
// poison every pattern built on top. A skip is a WEEK that fell short.
// =============================================================================

/** Max habits asked about in one review. See REVIEW_CAP rationale below. */
export const REVIEW_CAP = 3;

export interface SkipCandidate {
  habitId: string;
  habitName: string;
  practiceId?: string;
  target: number;
  completed: number;
  /** target − completed, always ≥ 1 for a candidate. */
  missed: number;
  /** Dates the habit WAS done that week — shown to jog memory. */
  doneDates: string[];
}

export interface PendingSkipReview {
  /** Monday of the closed week being reviewed. */
  weekStart: string;
  weekEnd: string;
  /** Habits to ask about, biggest shortfall first, capped at REVIEW_CAP. */
  items: SkipCandidate[];
  /** Shortfalls beyond the cap — reported, never silently dropped. */
  hiddenCount: number;
}

const toDateStr = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const addDays = (dateStr: string, days: number): string => {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return toDateStr(d);
};

/** Monday of the week containing dateStr. */
export const mondayOf = (dateStr: string): string => {
  const d = new Date(dateStr + 'T00:00:00');
  const dow = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
  return toDateStr(d);
};

/**
 * The most recently CLOSED week relative to today — i.e. last week. The current
 * week is never reviewed: it isn't over, so "falling short" is not yet a fact.
 */
export const lastClosedWeek = (todayStr: string): { start: string; end: string } => {
  const start = addDays(mondayOf(todayStr), -7);
  return { start, end: addDays(start, 6) };
};

/**
 * Work out which habits fell short of their weekly target in the given week.
 *
 * `logs` should be completion logs of type 'nudge'. Only logs dated inside the
 * week count, so a backdated log lands in the week it was FOR, not the week it
 * was entered — which is the behaviour a user would expect and the reason this
 * filters on `date` rather than `completed_at`.
 */
export const findShortfalls = (
  habits: PracticeInstance[],
  logs: CompletionLog[],
  weekStart: string,
  weekEnd: string
): SkipCandidate[] => {
  const inWeek = logs.filter((l) => l.date >= weekStart && l.date <= weekEnd);

  return habits
    .filter((h) => h.is_active)
    .map((habit) => {
      const mine = inWeek.filter((l) => l.reference_id === habit.id);
      // Count DISTINCT DAYS, not logs: two reps on one day is one day's worth of
      // the weekly target, and counting both would hide a real shortfall.
      const doneDates = [...new Set(mine.map((l) => l.date))].sort();
      const target = habit.target_count_per_week ?? 0;
      const completed = doneDates.length;
      return {
        habitId: habit.id,
        habitName: habit.name,
        practiceId: habit.practice_id,
        target,
        completed,
        missed: Math.max(0, target - completed),
        doneDates,
      };
    })
    .filter((c) => c.target > 0 && c.missed > 0);
};

/**
 * Build the review to show, excluding anything already answered and capping the
 * number of questions.
 *
 * THE CAP EXISTS BECAUSE: one question per short habit is fine for someone
 * tracking three habits and hostile for someone tracking ten. A review that
 * feels like an interrogation is one people learn to dismiss, and a dismissed
 * review captures nothing at all. Asking about the three biggest shortfalls and
 * reporting the rest gets most of the signal at a fraction of the friction.
 */
export const buildPendingReview = (
  habits: PracticeInstance[],
  logs: CompletionLog[],
  todayStr: string,
  answeredHabitIds: string[] = []
): PendingSkipReview | null => {
  const { start, end } = lastClosedWeek(todayStr);
  const answered = new Set(answeredHabitIds);

  const all = findShortfalls(habits, logs, start, end)
    .filter((c) => !answered.has(c.habitId))
    // Biggest shortfall first; ties broken by name so the order is stable.
    .sort((a, b) => b.missed - a.missed || a.habitName.localeCompare(b.habitName));

  if (all.length === 0) return null;

  return {
    weekStart: start,
    weekEnd: end,
    items: all.slice(0, REVIEW_CAP),
    hiddenCount: Math.max(0, all.length - REVIEW_CAP),
  };
};

// ---- Pattern aggregation ---------------------------------------------------

export interface SkipReasonStat {
  reasonId: string;
  label: string;
  kind: SkipReasonKind;
  /** Total missed reps attributed to this reason. */
  count: number;
  /** Share of classified misses, 0–100. */
  pct: number;
}

export interface SkipPatterns {
  /** Total missed reps across all answered shortfalls. */
  totalMissed: number;
  /** How many distinct weeks were answered. */
  weeksAnswered: number;
  reasons: SkipReasonStat[];
  internalPct: number | null;
  externalPct: number | null;
}

/** Minimum answered misses before the split is worth stating. */
export const MIN_MISSES_FOR_SPLIT = 3;

/**
 * Aggregate answered skips into the reason mix and the internal/external split.
 *
 * Weighted by `missed_count`, not by number of answers: a week that fell three
 * short says more about a habit than a week that fell one short, and counting
 * both as "1 × dreaded" would flatten exactly the signal being looked for.
 */
export const buildSkipPatterns = (skips: SkipLog[]): SkipPatterns => {
  const byReason = new Map<string, number>();
  let totalMissed = 0;
  const weeks = new Set<string>();

  for (const skip of skips) {
    // Guard against a malformed or retired reason rather than bucketing it
    // arbitrarily — an unknown reason is excluded, not guessed at.
    const reason = getSkipReason(skip.reason_id);
    if (!reason) continue;
    const weight = Math.max(1, skip.missed_count || 1);
    byReason.set(reason.id, (byReason.get(reason.id) ?? 0) + weight);
    totalMissed += weight;
    weeks.add(skip.week_start);
  }

  const reasons: SkipReasonStat[] = [...byReason.entries()]
    .map(([reasonId, count]) => {
      const reason = getSkipReason(reasonId)!;
      return {
        reasonId,
        label: reason.label,
        kind: reason.kind,
        count,
        pct: totalMissed ? Math.round((count / totalMissed) * 100) : 0,
      };
    })
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const internal = reasons
    .filter((r) => r.kind === 'internal')
    .reduce((s, r) => s + r.count, 0);

  const enough = totalMissed >= MIN_MISSES_FOR_SPLIT;

  return {
    totalMissed,
    weeksAnswered: weeks.size,
    reasons,
    internalPct: enough ? Math.round((internal / totalMissed) * 100) : null,
    externalPct: enough ? 100 - Math.round((internal / totalMissed) * 100) : null,
  };
};
