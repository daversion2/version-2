import type { PainActivity, PainDay, PainItemId, PainOnset, PainPlan, PlanWeeks } from '../types/pain';
import { PAIN_ITEM } from '../data/painPlan';
import { dayStreak } from './homeDashboard';
import { addDays, daysBetween } from './habitSchedule';
import { getWeekStart, toLocalDateString } from '../utils/date';

// =============================================================================
// BACK PAIN — every rule the app follows, pure so it can be tested. Screens
// format; they don't compute. Spec: docs/micro-apps/pain.md.
// =============================================================================

// --- The 0–10 scale ----------------------------------------------------------

export const PAIN_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export const clampScore = (n: number): number => Math.min(10, Math.max(0, Math.round(n)));

/** The usual clinical bands: 0, 1–3, 4–6, 7–10. */
export const painWord = (n: number): string => {
  if (n <= 0) return 'No pain';
  if (n < 3.5) return 'Mild';
  if (n < 6.5) return 'Moderate';
  return 'Severe';
};

/** One decimal: "3.4", "5.0". */
export const formatAverage = (n: number): string => n.toFixed(1);

const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;

// --- Days --------------------------------------------------------------------

/** "Today", "Yesterday", or "Mon 27 Oct". */
export const dayLabel = (date: string, today: string): string => {
  if (date === today) return 'Today';
  if (date === addDays(today, -1)) return 'Yesterday';
  return shortDate(date);
};

/** "Thu 11 Dec". */
export const shortDate = (date: string): string =>
  new Date(date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

/** The check-ins of the last `n` days ending today, newest first. */
export const recentDays = (days: PainDay[], today: string, n: number): PainDay[] => {
  const from = addDays(today, -(n - 1));
  return days.filter((d) => d.date >= from && d.date <= today).sort((a, b) => b.date.localeCompare(a.date));
};

/** The bars on Home: oldest first, null where nothing was logged. */
export const recentPain = (days: PainDay[], today: string, n = 14): (number | null)[] => {
  const byDate = new Map(days.map((d) => [d.date, d.pain]));
  return Array.from({ length: n }, (_, i) => byDate.get(addDays(today, i - (n - 1))) ?? null);
};

/** Fewer check-ins than this in a week and their average isn't offered as a prefill. */
export const MIN_LOGS_FOR_AVERAGE = 3;

/** Mean pain over the last `n` days ending today, and how many days it's from. */
export const painAverage = (days: PainDay[], today: string, n = 7): { avg: number | null; count: number } => {
  const window = recentDays(days, today, n);
  return { avg: window.length ? mean(window.map((d) => d.pain)) : null, count: window.length };
};

/** What the "past 7 days" question starts on: the check-ins' average, if there are enough. */
export const prefillPain = (days: PainDay[], today: string): number | undefined => {
  const { avg, count } = painAverage(days, today, 7);
  return avg !== null && count >= MIN_LOGS_FOR_AVERAGE ? clampScore(avg) : undefined;
};

// --- Plans: dates ------------------------------------------------------------

export const retestDateFor = (start: string, weeks: PlanWeeks): string => addDays(start, weeks * 7);

/** 1-based week of the plan, held to its length (a late retest stays in the last week). */
export const planWeek = (plan: Pick<PainPlan, 'start_date' | 'weeks'>, today: string): number =>
  Math.min(plan.weeks, Math.max(1, Math.floor(daysBetween(plan.start_date, today) / 7) + 1));

export const daysUntilRetest = (plan: Pick<PainPlan, 'retest_date'>, today: string): number =>
  daysBetween(today, plan.retest_date);

export const isRetestDue = (plan: PainPlan, today: string): boolean =>
  plan.status === 'active' && today >= plan.retest_date;

const newestFirst = (a: PainPlan, b: PainPlan): number =>
  b.start_date.localeCompare(a.start_date) || b.created_at.localeCompare(a.created_at);

export const activePlan = (plans: PainPlan[]): PainPlan | undefined =>
  plans.filter((p) => p.status === 'active').sort(newestFirst)[0];

/**
 * The plan a day belongs to: it runs from its start until it's closed. On a
 * handover day (retested, next one started) the newer plan wins.
 */
export const planOn = (plans: PainPlan[], date: string): PainPlan | undefined =>
  plans.filter((p) => p.start_date <= date && (p.closed_on === undefined || date <= p.closed_on)).sort(newestFirst)[0];

/** Plans newest first, for History. */
export const sortPlans = (plans: PainPlan[]): PainPlan[] => [...plans].sort(newestFirst);

// --- Plan days, the weekly goal and the streak --------------------------------

/** Every item on the plan ticked. */
export const isPlanDay = (day: Pick<PainDay, 'done'>, plan: PainPlan | undefined): boolean =>
  !!plan && plan.items.length > 0 && plan.items.every((i) => day.done.includes(i));

const planDayDates = (days: PainDay[], plans: PainPlan[]): Set<string> =>
  new Set(days.filter((d) => isPlanDay(d, planOn(plans, d.date))).map((d) => d.date));

export interface PainWeek {
  planDays: number;
  goal: number;
  met: boolean;
}

/** This week's plan days (Monday to today) against the goal. */
export const weekSummary = (days: PainDay[], plans: PainPlan[], today: string, goal: number): PainWeek => {
  const monday = toLocalDateString(getWeekStart(new Date(today + 'T12:00:00')));
  const dates = planDayDates(days, plans);
  let planDays = 0;
  for (const d of dates) if (d >= monday && d <= today) planDays++;
  return { planDays, goal, met: planDays >= goal };
};

/** Days in a row with the whole plan done. A today with nothing yet never breaks it. */
export const planStreak = (days: PainDay[], plans: PainPlan[], today: string): number =>
  dayStreak(planDayDates(days, plans), today);

// --- Adherence -----------------------------------------------------------------

export interface Adherence {
  /** Calendar days in the planned window so far. A day with no check-in counts as not done. */
  possible: number;
  items: { id: PainItemId; done: number }[];
  /** Days with every item ticked. */
  planDays: number;
  /** Item-days done out of item-days possible, 0–1; null before the first day. */
  pct: number | null;
}

/** How much of the plan got done, inside its planned weeks (a late retest adds nothing). */
export const itemAdherence = (plan: PainPlan, days: PainDay[], today: string): Adherence => {
  const lastPlanned = addDays(plan.retest_date, -1);
  const cap = plan.closed_on ?? today;
  const end = lastPlanned < cap ? lastPlanned : cap;
  const possible = end < plan.start_date ? 0 : daysBetween(plan.start_date, end) + 1;
  const inWindow = days.filter((d) => d.date >= plan.start_date && d.date <= end);
  const items = plan.items.map((id) => ({ id, done: inWindow.filter((d) => d.done.includes(id)).length }));
  const doneTotal = items.reduce((a, i) => a + i.done, 0);
  return {
    possible,
    items,
    planDays: inWindow.filter((d) => isPlanDay(d, plan)).length,
    pct: possible && plan.items.length ? doneTotal / (possible * plan.items.length) : null,
  };
};

// --- The retest ----------------------------------------------------------------

export type Verdict = 'better' | 'same' | 'worse';
export type PlanVerdict = Verdict | 'mixed';

/** A real change in pain: 2 points, or 30% and at least 1 point (Ostelo 2008). */
export const PAIN_MCID = 2;
export const PAIN_MCID_PCT = 0.3;
/** A real change in the activities' average score (Stratford, PSFS). */
export const ACTIVITY_MCID = 2;

export interface PainComparison {
  before: number;
  after: number;
  /** Points less pain; negative is more. */
  diff: number;
  /** diff as a share of before, 0 when before was 0. */
  pct: number;
  verdict: Verdict;
}

export const comparePain = (before: number, after: number): PainComparison => {
  const diff = before - after;
  const pct = before > 0 ? diff / before : 0;
  const verdict: Verdict =
    diff >= PAIN_MCID || (pct >= PAIN_MCID_PCT && diff >= 1) ? 'better' : -diff >= PAIN_MCID ? 'worse' : 'same';
  return { before, after, diff, pct, verdict };
};

export interface ActivityComparison {
  rows: { label: string; before: number; after: number }[];
  beforeAvg: number;
  afterAvg: number;
  /** Points better on average; negative is worse. */
  diff: number;
  verdict: Verdict;
}

/** Null when the plan had no activities, or the retest has no scores. */
export const compareActivities = (before: PainActivity[], after: number[]): ActivityComparison | null => {
  const rows = before
    .map((a, i) => ({ label: a.label, before: a.score, after: after[i] }))
    .filter((r): r is { label: string; before: number; after: number } => typeof r.after === 'number');
  if (!rows.length) return null;
  const beforeAvg = mean(rows.map((r) => r.before));
  const afterAvg = mean(rows.map((r) => r.after));
  const diff = afterAvg - beforeAvg;
  const verdict: Verdict = diff >= ACTIVITY_MCID ? 'better' : diff <= -ACTIVITY_MCID ? 'worse' : 'same';
  return { rows, beforeAvg, afterAvg, diff, verdict };
};

export const planVerdict = (pain: Verdict, activities: Verdict | null | undefined): PlanVerdict => {
  if (!activities) return pain;
  const v = [pain, activities];
  const better = v.includes('better');
  const worse = v.includes('worse');
  if (better && worse) return 'mixed';
  if (better) return 'better';
  if (worse) return 'worse';
  return 'same';
};

export const VERDICT_HEADLINE: Record<PlanVerdict, string> = {
  better: 'Your back got better',
  same: 'No clear change yet',
  worse: 'Your back got worse',
  mixed: 'A mixed result',
};

export interface PlanResult {
  pain: PainComparison;
  activities: ActivityComparison | null;
  verdict: PlanVerdict;
}

/** Null until the plan has been retested. */
export const planResult = (plan: PainPlan): PlanResult | null => {
  if (!plan.retest) return null;
  const pain = comparePain(plan.baseline.pain_week, plan.retest.pain_week);
  const activities = compareActivities(plan.baseline.activities, plan.retest.scores);
  return { pain, activities, verdict: planVerdict(pain.verdict, activities?.verdict) };
};

/** Below this share of the plan done, the result says more about the weeks than the plan. */
export const LOW_ADHERENCE = 0.5;

/** The honest small print under a result. */
export const resultNotes = (plan: Pick<PainPlan, 'onset'>, adherencePct: number | null): string[] => {
  const notes: string[] = [];
  if (adherencePct !== null && adherencePct < LOW_ADHERENCE) {
    notes.push(
      `You did ${Math.round(adherencePct * 100)}% of the plan, so this says more about these weeks than about the plan itself.`
    );
  }
  if (plan.onset === 'recent') {
    notes.push('Most new back pain eases a lot within six weeks on its own, so some of this change is probably time.');
  }
  notes.push('Starting or stopping painkillers during the plan muddies the comparison.');
  return notes;
};

// --- Flares --------------------------------------------------------------------

/** Points above the plan's starting pain that count as a flare. */
export const FLARE_POINTS = 3;

/**
 * The two most recent days, back to back and ending today or yesterday, both
 * well above where the plan started.
 */
export const isFlare = (days: PainDay[], plan: PainPlan | undefined, today: string): boolean => {
  if (!plan) return false;
  const threshold = plan.baseline.pain_week + FLARE_POINTS;
  const byDate = new Map(days.map((d) => [d.date, d.pain]));
  const last = byDate.has(today) ? today : addDays(today, -1);
  const before = addDays(last, -1);
  const a = byDate.get(last);
  const b = byDate.get(before);
  return a !== undefined && b !== undefined && before >= plan.start_date && a >= threshold && b >= threshold;
};

// --- What next -------------------------------------------------------------------

/** Below this, the next plan should be easier to keep before anything is judged. */
export const CONSISTENCY_BAR = 0.6;

export interface NextStep {
  key: 'keep' | 'swap' | 'consistency';
  title: string;
  why: string;
}

export const suggestNext = (verdict: PlanVerdict, adherencePct: number | null): NextStep => {
  if (adherencePct !== null && adherencePct < CONSISTENCY_BAR) {
    return {
      key: 'consistency',
      title: 'Make the plan easier to keep',
      why: 'You did less than 60% of it. Drop one item, or swap it for something that fits your day, before judging the rest.',
    };
  }
  if (verdict === 'better') {
    return {
      key: 'keep',
      title: 'Keep going',
      why: 'It’s working. Run the same plan again so the change sticks, or swap one thing to see if you can do better.',
    };
  }
  if (verdict === 'worse') {
    return {
      key: 'swap',
      title: 'Change one thing',
      why: 'Drop anything that seemed to aggravate it. If it keeps getting worse, see a doctor or physio.',
    };
  }
  return {
    key: 'swap',
    title: 'Change one thing',
    why: 'Swap the item you believe in least for a new one. One change at a time is how you find what works.',
  };
};

const titles = (ids: PainItemId[]): string => ids.map((id) => PAIN_ITEM[id].title).join(' and ');

/** "Swapped Walk for Heat", "Dropped Heat", "Added Core strength", "Same plan". */
export const describeChange = (prev: PainItemId[], next: PainItemId[]): string => {
  const added = next.filter((i) => !prev.includes(i));
  const removed = prev.filter((i) => !next.includes(i));
  if (!added.length && !removed.length) return 'Same plan';
  if (added.length === 1 && removed.length === 1) return `Swapped ${titles(removed)} for ${titles(added)}`;
  if (!added.length) return `Dropped ${titles(removed)}`;
  if (!removed.length) return `Added ${titles(added)}`;
  return `Dropped ${titles(removed)}, added ${titles(added)}`;
};

// --- Building plans --------------------------------------------------------------

export const newPlan = (opts: {
  id: string;
  onset: PainOnset;
  items: PainItemId[];
  weeks: PlanWeeks;
  today: string;
  baseline: PainPlan['baseline'];
  now: Date;
  previous?: PainPlan;
  change?: string;
}): PainPlan => {
  const at = opts.now.toISOString();
  return {
    id: opts.id,
    number: opts.previous ? opts.previous.number + 1 : 1,
    previous_plan_id: opts.previous?.id,
    onset: opts.onset,
    items: opts.items,
    weeks: opts.weeks,
    start_date: opts.today,
    retest_date: retestDateFor(opts.today, opts.weeks),
    baseline: {
      pain_week: clampScore(opts.baseline.pain_week),
      activities: opts.baseline.activities.map((a) => ({ label: a.label.trim(), score: clampScore(a.score) })),
    },
    change: opts.change,
    status: 'active',
    screened_at: at,
    created_at: at,
    updated_at: at,
  };
};

/** The next plan in a chain starts where the last retest ended. */
export const nextPlanFrom = (
  prev: PainPlan,
  opts: { id: string; onset: PainOnset; items: PainItemId[]; weeks: PlanWeeks; today: string; now: Date }
): PainPlan =>
  newPlan({
    ...opts,
    previous: prev,
    change: describeChange(prev.items, opts.items),
    baseline: prev.retest
      ? {
          pain_week: prev.retest.pain_week,
          activities: prev.baseline.activities.map((a, i) => ({ label: a.label, score: prev.retest!.scores[i] ?? a.score })),
        }
      : prev.baseline,
  });

export const recordRetest = (
  plan: PainPlan,
  retest: { pain_week: number; scores: number[] },
  today: string,
  now: Date
): PainPlan => ({
  ...plan,
  retest: { pain_week: clampScore(retest.pain_week), scores: retest.scores.map(clampScore) },
  retest_at: now.toISOString(),
  closed_on: today,
  status: 'complete',
  updated_at: now.toISOString(),
});

/** Ended early: today's check-in no longer shows its items. */
export const endPlan = (plan: PainPlan, today: string, now: Date): PainPlan => ({
  ...plan,
  status: 'ended',
  closed_on: addDays(today, -1),
  updated_at: now.toISOString(),
});
