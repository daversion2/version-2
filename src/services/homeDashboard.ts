import type { CompletionLog } from '../types';
import type { CompletedMeditateSession, MeditateMode } from '../types/meditate';
import type { CompletedWorkoutSession, Exercise, TrainingPhase, WeightUnit } from '../types/workouts';
import type { FoodGroupId, MealsDay, MealsRules, WholeGroupId } from '../types/meals';
import { WHOLE_GROUPS } from '../data/mealGroups';
import { logResistance, RESISTANCE_MAX } from '../constants/resistance';
import { rulesForDay, scoreDay } from './mealsMath';
import { bestSetTrend, describeTrend, lowerIsBetter } from './workoutStats';
import { phaseWeek } from './trainingPhases';
import { appCheckinId, TodayAppId } from './appCheckins';
import { getWeekStart, toLocalDateString } from '../utils/date';

// =============================================================================
// HOME DASHBOARD — the numbers behind the new Home (Lab), from each app's OWN
// data rather than habit rows. Spec: docs/no-generic-habits-micro-apps.md,
// "Progress-screen tracking spec". Pure functions, no I/O.
//
// Everything reads a ROLLING 7 days ending today, compared with the 7 before.
// Friction is the one exception to "the app's own data": it still lives only
// on the `app:<id>` check-in logs Today writes.
// =============================================================================

export const WINDOW_DAYS = 7;

const localDate = (d: string): Date => {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day, 12);
};

export const addDays = (date: string, n: number): string => {
  const d = localDate(date);
  d.setDate(d.getDate() + n);
  return toLocalDateString(d);
};

/** The window's dates, oldest first. offset 1 = the 7 days before it. */
export const windowDates = (today: string, offset = 0): string[] =>
  Array.from({ length: WINDOW_DAYS }, (_, i) => addDays(today, i - (WINDOW_DAYS - 1) - offset * WINDOW_DAYS));

const inWindow = (date: string, today: string, offset = 0): boolean => {
  const end = addDays(today, -offset * WINDOW_DAYS);
  const start = addDays(end, -(WINDOW_DAYS - 1));
  return date >= start && date <= end;
};

/** Days in a row ending today. A today with nothing in it yet doesn't break the run. */
export const dayStreak = (active: Set<string>, today: string): number => {
  let day = active.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (active.has(day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
};

const weekOf = (date: string): string => toLocalDateString(getWeekStart(localDate(date)));

/** Monday-start weeks in a row that met the goal. The current week counts once met and never breaks the run. */
export const weekStreak = (dates: string[], goal: number, today: string): number => {
  const counts = new Map<string, number>();
  for (const d of dates) counts.set(weekOf(d), (counts.get(weekOf(d)) ?? 0) + 1);
  const thisWeek = weekOf(today);
  let n = (counts.get(thisWeek) ?? 0) >= goal ? 1 : 0;
  let week = addDays(thisWeek, -7);
  while ((counts.get(week) ?? 0) >= goal) {
    n++;
    week = addDays(week, -7);
  }
  return n;
};

const minutes = (sec: number): number => Math.round(sec / 60);

/** "+18 min vs the 7 days before". Null when both windows are empty. */
export const describeVsPrior = (current: number, prior: number, unit: string): string | null => {
  if (current === 0 && prior === 0) return null;
  const diff = current - prior;
  if (diff === 0) return 'Same as the 7 days before';
  const size = Math.abs(diff);
  // "1 day", "1 session" — the units passed are plural.
  const word = size === 1 && unit.endsWith('s') ? unit.slice(0, -1) : unit;
  return `${diff > 0 ? '+' : '−'}${size} ${word} vs the 7 days before`;
};

// --- Counting sessions ------------------------------------------------------------

/**
 * Sessions per day for one app: on each day, the larger of its saved sessions
 * and its ratings (docs/app-checkins-design.md §2). One rule covers every case
 * without a migration:
 *   - a rated session (1 doc, 1 rating) is 1;
 *   - a session whose rating was cancelled (1 doc, 0) still counts (Q1);
 *   - a Workouts past session (0 docs, 1 rating) still counts;
 *   - old ratings with no session id pair up with their docs by day.
 */
export const sessionsByDay = (docDates: string[], ratingDates: string[]): Map<string, number> => {
  const tally = (dates: string[]) => {
    const m = new Map<string, number>();
    for (const d of dates) m.set(d, (m.get(d) ?? 0) + 1);
    return m;
  };
  const docs = tally(docDates);
  const ratings = tally(ratingDates);
  const out = new Map<string, number>();
  for (const d of new Set([...docs.keys(), ...ratings.keys()])) {
    out.set(d, Math.max(docs.get(d) ?? 0, ratings.get(d) ?? 0));
  }
  return out;
};

/** The days an app's sessions were rated on — one entry per rating. */
export const ratingDates = (logs: CompletionLog[], appId: TodayAppId): string[] =>
  logs.filter((l) => l.reference_id === appCheckinId(appId) && !l.mirror_of).map((l) => l.date);

const countIn = (byDay: Map<string, number>, today: string, offset = 0): number => {
  let n = 0;
  for (const [d, c] of byDay) if (inWindow(d, today, offset)) n += c;
  return n;
};

// --- Meditate ------------------------------------------------------------------

export interface MeditateRecent {
  date: string;
  mode: MeditateMode;
  minutes: number;
}

export interface MeditateDashboard {
  minutes: number;
  priorMinutes: number;
  /** Sessions, not days: two sits on one day are two. */
  sessions: number;
  goal: number;
  lastSessionMinutes: number | null;
  /** Minutes per session, the last 8, oldest first. */
  series: number[];
  recent: MeditateRecent[];
  streakDays: number;
  activeDates: string[];
}

export const meditateDashboard = (
  sessions: CompletedMeditateSession[],
  goal: number,
  today: string,
  ratedOn: string[] = []
): MeditateDashboard => {
  const sorted = [...sessions].sort((a, b) => b.started_at.localeCompare(a.started_at));
  const current = sorted.filter((s) => inWindow(s.date, today));
  const prior = sorted.filter((s) => inWindow(s.date, today, 1));
  const byDay = sessionsByDay(
    sorted.map((s) => s.date),
    ratedOn
  );
  const active = [...byDay.keys()];
  const sum = (list: CompletedMeditateSession[]) => minutes(list.reduce((t, s) => t + s.duration_sec, 0));
  return {
    minutes: sum(current),
    priorMinutes: sum(prior),
    sessions: countIn(byDay, today),
    goal,
    lastSessionMinutes: sorted[0] ? minutes(sorted[0].duration_sec) : null,
    series: sorted.slice(0, 8).reverse().map((s) => minutes(s.duration_sec)),
    recent: sorted.slice(0, 4).map((s) => ({ date: s.date, mode: s.mode, minutes: minutes(s.duration_sec) })),
    streakDays: dayStreak(new Set(active), today),
    activeDates: active.filter((d) => inWindow(d, today)),
  };
};

// --- Workouts ------------------------------------------------------------------

export interface StandoutLift {
  exerciseId: string;
  name: string;
  /** "Up 10 lb over 6 sessions". */
  line: string;
}

export interface WorkoutWeekRow {
  date: string;
  name: string;
  sets: number;
}

export interface WorkoutsDashboard {
  sessions: number;
  priorSessions: number;
  goal: number;
  volumeKg: number;
  priorVolumeKg: number;
  /** Whole percent, null when there's nothing before to compare with. */
  volumeChangePct: number | null;
  /** Volume per session, the last 8, oldest first. */
  series: number[];
  standout: StandoutLift | null;
  week: WorkoutWeekRow[];
  streakWeeks: number;
  /** "Week 3 of 6" while a phase trains; "Baseline test to do" before it starts. */
  phaseLine: string | null;
  activeDates: string[];
}

const sessionDate = (s: CompletedWorkoutSession): string => toLocalDateString(new Date(s.started_at));

/** How far the trend moved, as a share of where it started, with "better" positive. */
const improvement = (values: number[], lowerBetter: boolean): number => {
  const first = values[0];
  const last = values[values.length - 1];
  if (!first) return last > 0 ? 1 : 0;
  const change = (last - first) / first;
  return lowerBetter ? -change : change;
};

/**
 * The exercise to call out: of everything trained in the last 4 weeks, the one
 * whose best set moved furthest the right way over its last 6 sessions.
 */
export const standoutLift = (
  sessions: CompletedWorkoutSession[],
  exercisesById: Record<string, Exercise>,
  unit: WeightUnit,
  today: string
): StandoutLift | null => {
  const since = addDays(today, -27);
  const ids = new Set(
    sessions
      .filter((s) => sessionDate(s) >= since)
      .flatMap((s) => s.blocks.flatMap((b) => b.sets.map((x) => x.exerciseId)))
  );
  let best: { lift: StandoutLift; score: number; points: number } | null = null;
  for (const id of ids) {
    const exercise = exercisesById[id];
    if (!exercise) continue;
    const points = bestSetTrend(sessions, id, exercise.kind, 6);
    const line = describeTrend(points, exercise.kind, unit);
    if (!line) continue;
    const score = improvement(points.map((p) => p.value), lowerIsBetter(exercise.kind));
    if (!best || score > best.score || (score === best.score && points.length > best.points)) {
      best = { lift: { exerciseId: id, name: exercise.name, line }, score, points: points.length };
    }
  }
  return best?.lift ?? null;
};

/** A phase waiting on its baseline hasn't started training, so it has no week yet. */
export const describePhase = (
  phase: Pick<TrainingPhase, 'status' | 'start_date' | 'weeks'> | undefined,
  today: string
): string | null => {
  if (!phase) return null;
  if (phase.status === 'baseline') return 'Baseline test to do';
  return `Week ${Math.min(phaseWeek(phase, today), phase.weeks)} of ${phase.weeks}`;
};

export const workoutsDashboard = (
  sessions: CompletedWorkoutSession[],
  goal: number,
  exercisesById: Record<string, Exercise>,
  unit: WeightUnit,
  phase: TrainingPhase | undefined,
  today: string,
  ratedOn: string[] = []
): WorkoutsDashboard => {
  const sorted = [...sessions].sort((a, b) => b.started_at.localeCompare(a.started_at));
  const current = sorted.filter((s) => inWindow(sessionDate(s), today));
  const prior = sorted.filter((s) => inWindow(sessionDate(s), today, 1));
  // A past session logged in Workouts is a rating with no session doc: it
  // counts as a session, though it has no sets or volume.
  const byDay = sessionsByDay(sorted.map(sessionDate), ratedOn);
  const active = [...byDay.keys()];
  const volume = (list: CompletedWorkoutSession[]) => list.reduce((t, s) => t + (s.total_volume_kg ?? 0), 0);
  const volumeKg = volume(current);
  const priorVolumeKg = volume(prior);
  return {
    sessions: countIn(byDay, today),
    priorSessions: countIn(byDay, today, 1),
    goal,
    volumeKg,
    priorVolumeKg,
    volumeChangePct: priorVolumeKg > 0 ? Math.round(((volumeKg - priorVolumeKg) / priorVolumeKg) * 100) : null,
    series: sorted.slice(0, 8).reverse().map((s) => s.total_volume_kg ?? 0),
    standout: standoutLift(sorted, exercisesById, unit, today),
    week: current.map((s) => ({ date: sessionDate(s), name: s.workout_name, sets: s.total_sets })),
    streakWeeks: weekStreak(
      [...byDay].flatMap(([d, n]) => Array<string>(n).fill(d)),
      goal,
      today
    ),
    phaseLine: describePhase(phase, today),
    activeDates: active.filter((d) => inWindow(d, today)),
  };
};

// --- Meals ---------------------------------------------------------------------

/** 'empty' = a past day with nothing logged; 'pending' = today, still open. */
export type MealsDayState = 'on' | 'off' | 'pending' | 'empty';

export interface Serving {
  group: WholeGroupId;
  count: number;
}

export interface MealsDashboard {
  /** `score` is the day's average plate score, null with nothing scored. */
  days: { date: string; state: MealsDayState; score: number | null }[];
  /** Every scored plate in the window, averaged — the way the week view averages. */
  averageScore: number | null;
  priorAverageScore: number | null;
  /** The score a day's average needs to be on target. */
  threshold: number;
  onTarget: number;
  priorOnTarget: number;
  goal: number;
  /** Whole-food groups, most servings first. */
  servings: Serving[];
  /** Days in a row with a meal logged — showing up, not hitting the target (Q2). */
  streakDays: number;
  onDates: string[];
  /** Days in the window with anything logged. */
  loggedDates: string[];
}

const hasAnything = (day: MealsDay | undefined): boolean =>
  !!day && (Object.keys(day.meals).length > 0 || day.extras.length > 0);

export const mealsDayState = (
  date: string,
  day: MealsDay | undefined,
  current: MealsRules,
  today: string
): MealsDayState => {
  if (day?.result) return day.result;
  if (!hasAnything(day)) return date === today ? 'pending' : 'empty';
  const status = scoreDay(day, rulesForDay(date, today, day, current)).status;
  if (status === 'pending') return date === today ? 'pending' : 'off';
  return status;
};

/**
 * One serving = one plate (a meal or an extra) with that group's chip on it
 * (founder, 2026-10-24). Tapping Veggies at lunch and again at dinner is two.
 */
export const countServings = (days: (MealsDay | undefined)[]): Partial<Record<FoodGroupId, number>> => {
  const out: Partial<Record<FoodGroupId, number>> = {};
  for (const day of days) {
    if (!day) continue;
    const plates = [
      ...Object.values(day.meals).flatMap((m) => (m.skipped ? [] : [m.groups])),
      ...day.extras.map((e) => e.groups),
    ];
    for (const groups of plates) {
      for (const g of new Set(groups)) out[g] = (out[g] ?? 0) + 1;
    }
  }
  return out;
};

const dayScore = (date: string, day: MealsDay | undefined, current: MealsRules, today: string) =>
  hasAnything(day) ? scoreDay(day, rulesForDay(date, today, day, current)) : null;

/** All scored plates across these days, averaged. Null with none. */
export const averagePlateScore = (
  dates: string[],
  daysByDate: Record<string, MealsDay>,
  current: MealsRules,
  today: string
): number | null => {
  const scores = dates.flatMap(
    (d) =>
      dayScore(d, daysByDate[d], current, today)
        ?.items.filter((i) => i.state === 'scored')
        .map((i) => i.score as number) ?? []
  );
  return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
};

export const mealsDashboard = (
  daysByDate: Record<string, MealsDay>,
  current: MealsRules,
  today: string,
  streakFrom: string[]
): MealsDashboard => {
  const dates = windowDates(today);
  const days = dates.map((date) => ({
    date,
    state: mealsDayState(date, daysByDate[date], current, today),
    score: dayScore(date, daysByDate[date], current, today)?.average ?? null,
  }));
  const priorOn = windowDates(today, 1).filter((d) => mealsDayState(d, daysByDate[d], current, today) === 'on');
  const counts = countServings(dates.map((d) => daysByDate[d]));
  const servings = WHOLE_GROUPS.map((g) => ({ group: g.id, count: counts[g.id] ?? 0 })).sort(
    (a, b) => b.count - a.count
  );
  const loggedAll = new Set(streakFrom.filter((d) => hasAnything(daysByDate[d])));
  const onDates = days.filter((d) => d.state === 'on').map((d) => d.date);
  return {
    days,
    averageScore: averagePlateScore(dates, daysByDate, current, today),
    priorAverageScore: averagePlateScore(windowDates(today, 1), daysByDate, current, today),
    threshold: current.scoring.on_target_threshold,
    onTarget: onDates.length,
    priorOnTarget: priorOn.length,
    goal: WINDOW_DAYS,
    servings,
    streakDays: dayStreak(loggedAll, today),
    onDates,
    loggedDates: dates.filter((d) => hasAnything(daysByDate[d])),
  };
};

// --- Friction ------------------------------------------------------------------

export interface FrictionSummary {
  avg: number | null;
  priorAvg: number | null;
  count: number;
}

const average = (xs: number[]): number | null => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** "How hard was it to start?" for one app, from its `app:<id>` check-ins. */
export const appFriction = (logs: CompletionLog[], appId: TodayAppId, today: string): FrictionSummary => {
  const ref = appCheckinId(appId);
  const rated = (offset: number) =>
    logs
      .filter((l) => l.reference_id === ref && inWindow(l.date, today, offset))
      .map((l) => logResistance(l))
      .filter((v): v is number => typeof v === 'number');
  const current = rated(0);
  return { avg: average(current), priorAvg: average(rated(1)), count: current.length };
};

/** The level an average sits nearest, in words a person would use. */
export const frictionWord = (avg: number): string => {
  if (avg < 1.5) return 'Mostly easy';
  if (avg < 2.5) return 'Mostly manageable';
  return 'Mostly hard';
};

/** "Mostly easy (1.6 of 3) · down from 2.1". Null with nothing rated in the window. */
export const describeFriction = (f: FrictionSummary): string | null => {
  if (f.avg === null) return null;
  const head = `${frictionWord(f.avg)} (${f.avg.toFixed(1)} of ${RESISTANCE_MAX})`;
  if (f.priorAvg === null) return head;
  const diff = f.avg - f.priorAvg;
  if (Math.abs(diff) < 0.05) return `${head} · same as the week before`;
  return `${head} · ${diff < 0 ? 'down' : 'up'} from ${f.priorAvg.toFixed(1)}`;
};

// --- The user doc --------------------------------------------------------------

// A type, not an interface, so it can be written as a plain Firestore patch.
export type ProfileActivity = {
  currentStreak?: number;
  lastActivityDate?: string | null;
  sessions_completed?: number;
  apps_tried?: number;
  apps_active?: number;
};

/**
 * The fields to write so the user doc agrees with the apps (design §3–4), or
 * null when it already does.
 *
 * The streak is corrected for PAST days only. Today belongs to the rating:
 * its updateWillpowerStats stamps today and, crossing a tier, raises the
 * streak celebration. Stamping today here first would make that rating find
 * the day already counted, and the celebration would never fire. So a day
 * with only an unrated session reaches the stored streak the next morning.
 * The screen never waits: it shows the dashboard's own count.
 *
 * The lifetime counters only ever rise: they're counted from what Today
 * loaded (a few months), which must not undercount a history read earlier.
 */
export const profileActivityPatch = (
  activity: AppActivity,
  today: string,
  profile: ProfileActivity
): ProfileActivity | null => {
  const patch: ProfileActivity = {};
  if (profile.lastActivityDate !== today) {
    const yesterday = addDays(today, -1);
    const days = new Set(activity.activeDays);
    const past = activity.activeDays.filter((d) => d < today);
    const last = past.length ? past[past.length - 1] : null;
    const streak = days.has(yesterday) ? dayStreak(new Set(past), yesterday) : 0;
    if ((profile.currentStreak ?? 0) !== streak) patch.currentStreak = streak;
    if ((profile.lastActivityDate ?? null) !== last) patch.lastActivityDate = last;
  }
  if (activity.sessionsCompleted > (profile.sessions_completed ?? 0)) {
    patch.sessions_completed = activity.sessionsCompleted;
  }
  if (activity.appsTried > (profile.apps_tried ?? 0)) patch.apps_tried = activity.appsTried;
  if (activity.appsActive !== profile.apps_active) patch.apps_active = activity.appsActive;
  return Object.keys(patch).length ? patch : null;
};

// --- Across the apps -----------------------------------------------------------

export interface AppProgress {
  appId: TodayAppId;
  done: number;
  goal: number;
  /** 0–1, capped: going past the goal still reads 100%. */
  pct: number;
}

export const progressOf = (appId: TodayAppId, done: number, goal: number): AppProgress => ({
  appId,
  done,
  goal,
  pct: goal > 0 ? Math.min(1, done / goal) : 0,
});

const APP_NAMES: Record<TodayAppId, string> = { meditate: 'Meditate', workouts: 'Workouts', meals: 'Meals' };

/**
 * "Most consistent: Meditate (100%) · Workouts has felt easiest lately".
 * Ranked by share of each app's own goal, so different goals still compare.
 * The friction note names the app rated easiest, and only once one has a rating.
 */
export const describeInsight = (
  rings: AppProgress[],
  friction: Partial<Record<TodayAppId, FrictionSummary>>
): string | null => {
  const ranked = [...rings].sort((a, b) => b.pct - a.pct);
  const top = ranked[0];
  if (!top || top.pct === 0) return null;
  const parts = [`Most consistent: ${APP_NAMES[top.appId]} (${Math.round(top.pct * 100)}%)`];
  const easiest = rings
    .map((r) => ({ appId: r.appId, avg: friction[r.appId]?.avg ?? null }))
    .filter((r): r is { appId: TodayAppId; avg: number } => r.avg !== null)
    .sort((a, b) => a.avg - b.avg)[0];
  if (easiest) parts.push(`${APP_NAMES[easiest.appId]} has felt easiest lately`);
  return parts.join(' · ');
};

export interface WeekGrid {
  /** The window's dates, oldest first — today is the last. */
  dates: string[];
  rows: Record<TodayAppId, boolean[]>;
}

/** Showed up that day: a session for Meditate and Workouts, on target for Meals. */
export const weekGrid = (today: string, active: Record<TodayAppId, string[]>): WeekGrid => {
  const dates = windowDates(today);
  const row = (list: string[]) => {
    const set = new Set(list);
    return dates.map((d) => set.has(d));
  };
  return { dates, rows: { meditate: row(active.meditate), workouts: row(active.workouts), meals: row(active.meals) } };
};

export interface HomeDashboardInput {
  today: string;
  meditateSessions: CompletedMeditateSession[];
  meditateGoal: number;
  workoutSessions: CompletedWorkoutSession[];
  workoutsGoal: number;
  exercisesById: Record<string, Exercise>;
  unit: WeightUnit;
  phase: TrainingPhase | undefined;
  mealsDays: Record<string, MealsDay>;
  mealsRules: MealsRules;
  logs: CompletionLog[];
}

/** What the user doc and the rules need, from the apps' own data (design §3–4). */
export interface AppActivity {
  /** Every day with an app session or a meal logged, oldest first. */
  activeDays: string[];
  /** App sessions over everything loaded; Meals counts logged days. */
  sessionsCompleted: number;
  /** Apps used at least once, 0–3. */
  appsTried: number;
  /** Apps used in the last 28 days, 0–3. */
  appsActive: number;
}

export interface HomeDashboard {
  activity: AppActivity;
  meditate: MeditateDashboard;
  workouts: WorkoutsDashboard;
  meals: MealsDashboard;
  friction: Record<TodayAppId, FrictionSummary>;
  rings: AppProgress[];
  combinedStreak: number;
  insight: string | null;
  grid: WeekGrid;
}

/** A log read back by a reload and also added on screen is still one log. */
const uniqueById = (logs: CompletionLog[]): CompletionLog[] => {
  const seen = new Set<string>();
  return logs.filter((l) => (l.id && seen.has(l.id) ? false : (seen.add(l.id), true)));
};

export const buildHomeDashboard = (raw: HomeDashboardInput): HomeDashboard => {
  const input = { ...raw, logs: uniqueById(raw.logs) };
  const { today } = input;
  const meditate = meditateDashboard(
    input.meditateSessions,
    input.meditateGoal,
    today,
    ratingDates(input.logs, 'meditate')
  );
  const workouts = workoutsDashboard(
    input.workoutSessions,
    input.workoutsGoal,
    input.exercisesById,
    input.unit,
    input.phase,
    today,
    ratingDates(input.logs, 'workouts')
  );
  const meals = mealsDashboard(input.mealsDays, input.mealsRules, today, Object.keys(input.mealsDays));
  const friction = {
    meditate: appFriction(input.logs, 'meditate', today),
    workouts: appFriction(input.logs, 'workouts', today),
    meals: appFriction(input.logs, 'meals', today),
  };
  const rings = [
    progressOf('meditate', meditate.sessions, meditate.goal),
    progressOf('workouts', workouts.sessions, workouts.goal),
    progressOf('meals', meals.onTarget, meals.goal),
  ];
  // One day streak (design §3): any app session, or any meal logged (Q2).
  // Craving Crusher doesn't count (Q3).
  const perApp: Record<TodayAppId, Map<string, number>> = {
    meditate: sessionsByDay(input.meditateSessions.map((s) => s.date), ratingDates(input.logs, 'meditate')),
    workouts: sessionsByDay(input.workoutSessions.map(sessionDate), ratingDates(input.logs, 'workouts')),
    meals: new Map(
      Object.keys(input.mealsDays)
        .filter((d) => hasAnything(input.mealsDays[d]))
        .map((d) => [d, 1] as [string, number])
    ),
  };
  const everyDay = new Set(Object.values(perApp).flatMap((m) => [...m.keys()]));
  const since = addDays(today, -27);
  const used = (recent: boolean) =>
    (Object.keys(perApp) as TodayAppId[]).filter((a) =>
      [...perApp[a].keys()].some((d) => d <= today && (!recent || d >= since))
    ).length;
  const activity: AppActivity = {
    activeDays: [...everyDay].filter((d) => d <= today).sort(),
    sessionsCompleted: Object.values(perApp).reduce(
      (n, m) => n + [...m].filter(([d]) => d <= today).reduce((t, [, c]) => t + c, 0),
      0
    ),
    appsTried: used(false),
    appsActive: used(true),
  };
  return {
    activity,
    meditate,
    workouts,
    meals,
    friction,
    rings,
    combinedStreak: dayStreak(everyDay, today),
    insight: describeInsight(rings, friction),
    grid: weekGrid(today, { meditate: meditate.activeDates, workouts: workouts.activeDates, meals: meals.loggedDates }),
  };
};
