import { CompletionLog, DailyReflection, PracticeInstance, ReflectionGrade } from '../types';
import { logResistance, normalizeResistance, RESISTANCE_MAX } from '../constants/resistance';
import { addDays, isDayScheduled, isDueOn } from './habitSchedule';
import { fetchAllNudgeLogs, getActiveHabits } from './practices';
import { getReflection } from './reflections';

// =============================================================================
// NIGHTLY CLOSE — the evening reflection as three beats: recognise one win,
// grade the effort, set tomorrow's if-then. Pure helpers first; the screen
// loads data through loadNightlyClose and decides nothing on its own.
//
// Why this shape: implementation intentions ("when X, then Y") are the most
// reliable effect in behaviour change, and ending the night on a forward plan
// rather than a review of what went wrong is easier on sleep onset.
// =============================================================================

/** How far back a habit's ratings count toward "how hard is this lately". */
export const RECENT_RESISTANCE_DAYS = 14;

/** A rating with no history behind it sits in the middle of the scale. */
const DEFAULT_RESISTANCE = 2;

export type NightlyWin =
  | { kind: 'hard'; habitName: string }
  | { kind: 'logged'; count: number }
  | null;

export interface PlanDraft {
  habitId?: string;
  cue: string;
  response: string;
}

export interface NightlyCloseData {
  win: NightlyWin;
  /** Habits logged today (distinct). */
  loggedToday: number;
  /** Day-scheduled habits that were due today and not logged. */
  missedScheduledToday: number;
  /** Habits due tomorrow, toughest first. The first is the default plan. */
  planCandidates: PracticeInstance[];
}

const isLive = (h: PracticeInstance): boolean => h.is_active && !h.archived_at;

/**
 * The win to name tonight. The most recent log rated Hard beats everything:
 * doing it when it was hard is the moment worth reinforcing. Otherwise, a plain
 * count of what got done. Logs for habits no longer on Home are ignored.
 */
export const pickWin = (
  logsToday: CompletionLog[],
  habitsById: Record<string, PracticeInstance>
): NightlyWin => {
  const known = logsToday.filter((l) => habitsById[l.reference_id]);
  if (known.length === 0) return null;

  const hard = known
    .filter((l) => logResistance(l) === RESISTANCE_MAX)
    .sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''));
  if (hard.length > 0) return { kind: 'hard', habitName: habitsById[hard[0].reference_id].name };

  return { kind: 'logged', count: new Set(known.map((l) => l.reference_id)).size };
};

/**
 * A bad day gets the self-compassion framing and a minimum-version plan. Once
 * graded, the user's own call decides: D or F. Before that, a day with nothing
 * logged while a habit was pinned to it. A count habit can't be "missed" on a
 * given day, so it never counts toward that rule.
 */
export const isBadDay = (input: {
  grade: ReflectionGrade | null;
  loggedToday: number;
  missedScheduledToday: number;
}): boolean => {
  if (input.grade) return input.grade === 'D' || input.grade === 'F';
  return input.loggedToday === 0 && input.missedScheduledToday > 0;
};

const averageResistance = (habit: PracticeInstance, recentLogs: CompletionLog[]): number => {
  const ratings = recentLogs
    .filter((l) => l.reference_id === habit.id)
    .map(logResistance)
    .filter((r): r is number => typeof r === 'number');
  if (ratings.length > 0) return ratings.reduce((a, b) => a + b, 0) / ratings.length;
  if (typeof habit.expected_resistance === 'number') {
    return normalizeResistance(habit.expected_resistance, habit.expected_resistance_scale ?? RESISTANCE_MAX);
  }
  return DEFAULT_RESISTANCE;
};

/**
 * Habits due tomorrow, toughest first: highest recent average resistance, then
 * day-scheduled before flexible (a pinned day is a firmer promise), then name.
 */
export const rankPlanCandidates = (
  habits: PracticeInstance[],
  recentLogs: CompletionLog[],
  tomorrow: string
): PracticeInstance[] =>
  habits
    .filter((h) => isLive(h) && isDueOn(h, tomorrow))
    .map((h) => ({ h, score: averageResistance(h, recentLogs) }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(isDayScheduled(b.h)) - Number(isDayScheduled(a.h)) ||
        a.h.name.localeCompare(b.h.name)
    )
    .map(({ h }) => h);

/**
 * Anchors are written to complete "After I ___", so they read as a cue once
 * the "I" is put back. Legacy free-text cues are used as written.
 */
const cueFromHabit = (habit: PracticeInstance): string => {
  const anchor = habit.action_plan?.anchor?.trim();
  if (anchor) return /^i\b/i.test(anchor) ? anchor : `I ${anchor}`;
  return habit.action_plan?.cue?.trim() ?? '';
};

/** The pre-filled if-then for a habit. On a bad day, aim at the minimum version. */
export const draftPlan = (habit: PracticeInstance | undefined, badDay: boolean): PlanDraft => {
  if (!habit) return { cue: '', response: '' };
  const minimum = habit.action_plan?.minimum_version?.trim();
  return {
    habitId: habit.id,
    cue: cueFromHabit(habit),
    response: badDay && minimum ? minimum : habit.name,
  };
};

/** The plan saved in a reflection, or null when it holds none. */
export const planFromReflection = (reflection: DailyReflection | null): PlanDraft | null => {
  const cue = reflection?.prompt_ifthen_cue?.trim() ?? '';
  const response = reflection?.prompt_ifthen_response?.trim() ?? '';
  if (!cue && !response) return null;
  return { habitId: reflection?.plan_habit_id, cue, response };
};

/** The plan as one sentence: "When I get home, then Workout." */
export const formatPlan = (plan: { cue?: string; response?: string }): string => {
  const cue = plan.cue?.trim();
  const response = plan.response?.trim();
  if (cue && response) return `When ${cue}, then ${response}.`;
  if (cue) return `When ${cue}.`;
  return response ?? '';
};

/** A plan tied to a habit is done once that habit is logged on the day. */
export const isPlanDone = (plan: PlanDraft, logs: CompletionLog[], date: string): boolean =>
  !!plan.habitId && logs.some((l) => l.reference_id === plan.habitId && l.date === date);

/** Everything the evening screen needs, from one habits read and one logs read. */
export const loadNightlyClose = async (userId: string, today: string): Promise<NightlyCloseData> => {
  const [habits, recentLogs] = await Promise.all([
    getActiveHabits(userId),
    fetchAllNudgeLogs(userId, addDays(today, -(RECENT_RESISTANCE_DAYS - 1))),
  ]);
  const live = habits.filter(isLive);
  const habitsById = Object.fromEntries(live.map((h) => [h.id, h]));
  const logsToday = recentLogs.filter((l) => l.date === today);
  const loggedIds = new Set(logsToday.filter((l) => habitsById[l.reference_id]).map((l) => l.reference_id));

  return {
    win: pickWin(logsToday, habitsById),
    loggedToday: loggedIds.size,
    missedScheduledToday: live.filter(
      (h) => isDayScheduled(h) && isDueOn(h, today) && !loggedIds.has(h.id)
    ).length,
    planCandidates: rankPlanCandidates(live, recentLogs, addDays(today, 1)),
  };
};

/** Yesterday evening's plan, for Today — or null if there was none. */
export const getPlanForToday = async (userId: string, today: string): Promise<PlanDraft | null> =>
  planFromReflection(await getReflection(userId, addDays(today, -1)));
