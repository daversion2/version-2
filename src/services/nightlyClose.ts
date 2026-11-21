import { CompletionLog, DailyReflection, ReflectionGrade } from '../types';
import { logResistance, RESISTANCE_MAX } from '../constants/resistance';
import { appCheckinId, appIdFromCheckinId, TodayAppId } from './appCheckins';
import { addDays, inWeek } from './homeDashboard';
import { fetchAllNudgeLogs } from './practices';
import { getReflection, getReflections } from './reflections';
import { getCravingLogs } from './cravings';
import { listHotColdSessions } from './labHotCold';
import { listAvoidanceTasks } from './labAvoidance';

/** The Today apps with no session check-in, which count toward tonight too. */
export type RowAppId = 'craving' | 'hotcold' | 'avoidance';

// =============================================================================
// CLOSE OUT THE DAY — the evening micro-app as three beats: tonight's win,
// a grade for the effort, one app session planned for tomorrow. Pure helpers
// first; the screen (screens/Nightly/NightlyApp.tsx) loads data through
// loadNightlyClose and decides nothing on its own.
//
// Rebuilt around the apps on 2026-11-20 (founder's D3 call,
// docs/pivot-checklist.md): the win comes from today's app sessions and the
// plan is one session in one app, "After coffee, I'll do Workouts". Until then
// it read habits, which no longer show anywhere.
//
// Why this shape: implementation intentions ("when X, then Y") are the most
// reliable effect in behaviour change, and ending the night on a forward plan
// rather than a review of what went wrong is easier on sleep onset.
// =============================================================================

/** One app session logged today, with its ratings. */
export interface SessionToday {
  appId: TodayAppId;
  /** Getting started, 1–3, when rated. */
  start?: number;
  /** Staying with it, 1–3, when rated. */
  keepGoing?: number;
  completedAt?: string;
}

export type NightlyWin =
  | { kind: 'hardStart'; appId: TodayAppId }
  | { kind: 'hardStay'; appId: TodayAppId }
  | { kind: 'logged'; count: number; appIds: TodayAppId[]; rowIds: RowAppId[] }
  | null;

export interface PlanDraft {
  /** Set for a plan made since 2026-11-20: done once this app has a session. */
  appId?: TodayAppId;
  /** Older plans pointed at a habit. */
  habitId?: string;
  cue: string;
  response: string;
}

/** When tomorrow's session happens: the chips on the plan beat. */
export const PLAN_WHENS = ['After coffee', 'Before work', 'At lunch', 'After work', 'Before bed'] as const;

const level = (n: unknown): number | undefined =>
  typeof n === 'number' && n >= 1 && n <= RESISTANCE_MAX ? Math.round(n) : undefined;

/** Today's app sessions, from the day's logs. Meals' day rating isn't a session. */
export const sessionsToday = (logsToday: CompletionLog[]): SessionToday[] =>
  logsToday
    .map((l) => {
      const appId = appIdFromCheckinId(l.reference_id);
      if (!appId || appId === 'meals') return null;
      return {
        appId,
        start: level(logResistance(l)),
        keepGoing: level(l.keep_going),
        completedAt: l.completed_at,
      } as SessionToday;
    })
    .filter((s): s is SessionToday => s !== null);

/** The apps that had anything logged today: a session, or Meals' day. */
export const appsLoggedToday = (logsToday: CompletionLog[]): TodayAppId[] => {
  const ids = new Set<TodayAppId>();
  for (const l of logsToday) {
    const id = appIdFromCheckinId(l.reference_id);
    if (id) ids.add(id);
  }
  return [...ids];
};

const latestFirst = (a: SessionToday, b: SessionToday) => (b.completedAt ?? '').localeCompare(a.completedAt ?? '');

/**
 * Craving Crusher, Hot & Cold and Avoidance Training used today: an urge
 * faced, a session logged, a task cleared. They have no check-in log, so
 * the evening reads their own records (code review, 2026-11-21: a day with
 * only these used to read as "Nothing logged today").
 */
export const rowsActiveToday = (
  input: { urgeDates: string[]; plungeDates: string[]; clearedDates: string[] },
  today: string
): RowAppId[] => {
  const rows: RowAppId[] = [];
  if (input.urgeDates.includes(today)) rows.push('craving');
  if (input.plungeDates.includes(today)) rows.push('hotcold');
  if (input.clearedDates.includes(today)) rows.push('avoidance');
  return rows;
};

/**
 * The win to name tonight. Starting when the start took everything (a 3)
 * beats everything: doing it anyway is the moment worth reinforcing. Then
 * staying with it when that took everything. Otherwise, what got done, in
 * any app.
 */
export const pickWin = (sessions: SessionToday[], loggedApps: TodayAppId[], rowsToday: RowAppId[] = []): NightlyWin => {
  const hardStart = sessions.filter((s) => s.start === RESISTANCE_MAX).sort(latestFirst)[0];
  if (hardStart) return { kind: 'hardStart', appId: hardStart.appId };
  const hardStay = sessions.filter((s) => s.keepGoing === RESISTANCE_MAX).sort(latestFirst)[0];
  if (hardStay) return { kind: 'hardStay', appId: hardStay.appId };
  if (loggedApps.length === 0 && rowsToday.length === 0) return null;
  return {
    kind: 'logged',
    count: Math.max(sessions.length, loggedApps.length) + rowsToday.length,
    appIds: loggedApps,
    rowIds: rowsToday,
  };
};

/**
 * A bad day gets the kinder framing and a small plan. Once graded, the
 * user's own call decides: D or F. Before that, a day with nothing logged.
 */
export const isBadDay = (input: { grade: ReflectionGrade | null; loggedToday: number }): boolean => {
  if (input.grade) return input.grade === 'D' || input.grade === 'F';
  return input.loggedToday === 0;
};

/**
 * The app to suggest for tomorrow: the one furthest behind its weekly goal
 * (by share met), first in the given order on a tie. Null with no apps.
 */
export const suggestPlanApp = (
  apps: TodayAppId[],
  weekCounts: Partial<Record<TodayAppId, number>>,
  goals: Partial<Record<TodayAppId, number>>
): TodayAppId | null => {
  let best: TodayAppId | null = null;
  let bestShare = Infinity;
  for (const id of apps) {
    const goal = Math.max(1, goals[id] ?? 1);
    const share = (weekCounts[id] ?? 0) / goal;
    if (share < bestShare) {
      best = id;
      bestShare = share;
    }
  }
  return best;
};

const PLAN_ACTION: Record<TodayAppId, { full: string; small: string }> = {
  meditate: { full: 'do Meditate', small: 'do a 5-minute sit' },
  workouts: { full: 'do Workouts', small: 'do one short workout' },
  meals: { full: 'log my meals in Meals', small: 'log one meal in Meals' },
};

/** Tomorrow's plan for an app and a when. A bad day aims at the small version. */
export const appPlan = (appId: TodayAppId, when: string, badDay: boolean): PlanDraft => ({
  appId,
  cue: when.trim(),
  response: badDay ? PLAN_ACTION[appId].small : PLAN_ACTION[appId].full,
});

/** The last 7 nights, oldest first, ending today: each night's grade or null. */
export const lastNights = (
  reflections: Pick<DailyReflection, 'date' | 'grade'>[],
  today: string
): { date: string; grade: ReflectionGrade | null }[] => {
  const byDate = new Map(reflections.map((r) => [r.date, r.grade]));
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6);
    return { date, grade: byDate.get(date) ?? null };
  });
};

/** Sessions this week (Monday start) per app, from the logs. */
export const weekCounts = (logs: CompletionLog[], today: string): Partial<Record<TodayAppId, number>> => {
  const counts: Partial<Record<TodayAppId, number>> = {};
  for (const l of logs) {
    const id = appIdFromCheckinId(l.reference_id);
    if (!id || !l.date || !inWeek(l.date, today)) continue;
    counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
};

export interface NightlyCloseData {
  sessions: SessionToday[];
  /** Apps with anything logged today. */
  loggedApps: TodayAppId[];
  /** Craving Crusher, Hot & Cold and Avoidance used today. */
  rowsToday: RowAppId[];
  win: NightlyWin;
  weekCounts: Partial<Record<TodayAppId, number>>;
  nights: { date: string; grade: ReflectionGrade | null }[];
  /** Tonight's reflection, if already saved (closing out again edits it). */
  tonight: DailyReflection | null;
}

/** Everything the evening app needs: the last 14 days of logs and the last week of reflections. */
export const loadNightlyClose = async (userId: string, today: string): Promise<NightlyCloseData> => {
  // The three row apps are read separately and allowed to fail: tonight still works without them.
  const quiet = <T,>(p: Promise<T[]>) => p.catch(() => [] as T[]);
  const [logs, reflections, tonight, urges, plunges, tasks] = await Promise.all([
    fetchAllNudgeLogs(userId, addDays(today, -13)),
    getReflections(userId, addDays(today, -6), today),
    getReflection(userId, today),
    quiet(getCravingLogs(userId, today)),
    quiet(listHotColdSessions(userId, today)),
    quiet(listAvoidanceTasks(userId)),
  ]);
  const logsToday = logs.filter((l) => l.date === today);
  const sessions = sessionsToday(logsToday);
  const loggedApps = appsLoggedToday(logsToday);
  const rowsToday = rowsActiveToday(
    {
      urgeDates: urges.map((u) => u.date),
      plungeDates: plunges.map((p) => p.date),
      clearedDates: tasks.filter((t) => t.status === 'done' && t.done_date).map((t) => t.done_date as string),
    },
    today
  );
  return {
    sessions,
    loggedApps,
    rowsToday,
    win: pickWin(sessions, loggedApps, rowsToday),
    weekCounts: weekCounts(logs, today),
    nights: lastNights(reflections, today),
    tonight,
  };
};

/** The plan saved in a reflection, or null when it holds none. */
export const planFromReflection = (reflection: DailyReflection | null): PlanDraft | null => {
  const cue = reflection?.prompt_ifthen_cue?.trim() ?? '';
  const response = reflection?.prompt_ifthen_response?.trim() ?? '';
  if (!cue && !response) return null;
  return { appId: reflection?.plan_app_id, habitId: reflection?.plan_habit_id, cue, response };
};

/**
 * The plan as one sentence. An app plan: "After coffee, I’ll do Workouts."
 * An older habit plan: "When I get home, then Workout."
 */
export const formatPlan = (plan: { appId?: TodayAppId; cue?: string; response?: string }): string => {
  const cue = plan.cue?.trim();
  const response = plan.response?.trim();
  if (plan.appId && cue && response) return `${cue}, I’ll ${response}.`;
  if (cue && response) return `When ${cue}, then ${response}.`;
  if (cue) return `When ${cue}.`;
  return response ?? '';
};

/** A plan is done once its app (or, for an older plan, its habit) is logged on the day. */
export const isPlanDone = (plan: PlanDraft, logs: CompletionLog[], date: string): boolean => {
  const ref = plan.appId ? appCheckinId(plan.appId) : plan.habitId;
  return !!ref && logs.some((l) => l.reference_id === ref && l.date === date);
};

/** Yesterday evening's plan, for Today — or null if there was none. */
export const getPlanForToday = async (userId: string, today: string): Promise<PlanDraft | null> =>
  planFromReflection(await getReflection(userId, addDays(today, -1)));
