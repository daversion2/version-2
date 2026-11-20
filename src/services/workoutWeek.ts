import type { CompletionLog } from '../types';
import type { CompletedWorkoutSession, Exercise, ExerciseKind, LoggedSet, MuscleGroup } from '../types/workouts';
import { asLevel, logResistance } from '../constants/resistance';
import { getWeekStart, toLocalDateString } from '../utils/date';
import { appCheckinId } from './appCheckins';
import { cardioWeek, CardioWeek } from './cardio';
import { sessionsByDay } from './homeDashboard';

// =============================================================================
// YOUR WEEK IN WORKOUTS (founder, 2026-11-20) — the Week screen and the card at
// the top of the Workouts home: what you did, day by day, at a glance, and
// everything behind it a tap away.
//
// Two ways to frame it, the user's choice (WorkoutPrefs.week_view):
//   'rolling'   the last 7 days, today last — the default
//   'calendar'  Monday to Sunday, the same weeks as the goal and Today's ring
// ‹ › step back and forward a whole window at a time either way.
//
// A session belongs to the day it started, the same as Today's ring. A day's
// count is the larger of its saved sessions and its unpaired ratings, again as
// the ring counts (homeDashboard.sessionsByDay): "Log a past workout" saves a
// rating and no session, so it shows as a workout with no details.
// =============================================================================

export type WeekView = 'rolling' | 'calendar';

export const DEFAULT_WEEK_VIEW: WeekView = 'rolling';

export const WEEK_VIEW_LABELS: Record<WeekView, string> = { rolling: 'Last 7 days', calendar: 'This week' };

const DAYS = 7;

const addDaysTo = (d: Date, n: number): Date => {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
};

const midnight = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export interface WeekWindow {
  view: WeekView;
  /** 0 = the window holding today; 1 = the one before it. */
  offset: number;
  /** Local midnight that opens it, and the one that closes it. */
  start: Date;
  end: Date;
  /** Its seven local days, oldest first. */
  dates: string[];
}

/** The window `offset` steps back from the one holding `now`. */
export const weekWindow = (view: WeekView, now: Date, offset = 0): WeekWindow => {
  const first =
    view === 'calendar' ? getWeekStart(now) : addDaysTo(midnight(now), -(DAYS - 1));
  const start = addDaysTo(first, -DAYS * offset);
  const end = addDaysTo(start, DAYS);
  const dates = Array.from({ length: DAYS }, (_, i) => toLocalDateString(addDaysTo(start, i)));
  return { view, offset, start, end, dates };
};

const shortDate = (d: Date): string => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/** "Last 7 days", "This week", "Last week", or the span. */
export const windowTitle = (w: WeekWindow): string => {
  if (w.offset === 0) return WEEK_VIEW_LABELS[w.view];
  if (w.offset === 1 && w.view === 'calendar') return 'Last week';
  if (w.offset === 1) return 'The 7 days before';
  return windowSpan(w);
};

/** "Nov 14 – 20", or "Oct 28 – Nov 3" across a month. */
export const windowSpan = (w: WeekWindow): string => {
  const last = addDaysTo(w.end, -1);
  const sameMonth = last.getMonth() === w.start.getMonth();
  return `${shortDate(w.start)} – ${sameMonth ? last.getDate() : shortDate(last)}`;
};

// --- What a session was ---------------------------------------------------------

export type SessionKind = 'strength' | 'cardio' | 'mixed' | 'unknown';

const isCardioKind = (kind: ExerciseKind | undefined): boolean => kind === 'cardio' || kind === 'distance';

/** Strength, cardio, both, or nothing logged to tell. */
export const sessionKind = (session: CompletedWorkoutSession, exercisesById: Record<string, Exercise>): SessionKind => {
  let cardio = false;
  let strength = false;
  for (const set of session.blocks.flatMap((b) => b.sets)) {
    const kind = exercisesById[set.exerciseId]?.kind;
    if (!kind) continue;
    if (isCardioKind(kind)) cardio = true;
    else strength = true;
  }
  return cardio && strength ? 'mixed' : cardio ? 'cardio' : strength ? 'strength' : 'unknown';
};

/** The local day a session started on. */
export const sessionDay = (s: Pick<CompletedWorkoutSession, 'started_at'>): string =>
  toLocalDateString(new Date(s.started_at));

// --- The two ratings, from Today's check-ins -------------------------------------

export interface WeekRatings {
  /** Getting started, 1–3, or null with none rated. */
  start: number | null;
  /** Staying with it, 1–3, or null with none rated. */
  stay: number | null;
}

const average = (xs: number[]): number | null => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

const workoutRatings = (logs: CompletionLog[]): CompletionLog[] =>
  logs.filter((l) => l.reference_id === appCheckinId('workouts') && !l.mirror_of);

const ratingsOf = (logs: CompletionLog[]): WeekRatings => ({
  start: average(logs.map(logResistance).filter((v): v is number => typeof v === 'number')),
  stay: average(logs.flatMap((l) => asLevel(l.keep_going) ?? [])),
});

// --- One day ------------------------------------------------------------------------

export interface DaySession {
  /** The saved session, or null for a workout logged with no details. */
  session: CompletedWorkoutSession | null;
  name: string;
  kind: SessionKind;
  ratings: WeekRatings;
}

export type DayKind = 'strength' | 'cardio' | 'mixed' | 'logged' | 'rest' | 'ahead';

export interface WeekDay {
  date: string;
  isToday: boolean;
  /** After today: nothing yet, and not a rest day. */
  ahead: boolean;
  sessions: DaySession[];
  /** What the strip draws for the day. */
  kind: DayKind;
  /** Under the day in the strip: the first session's name, "+1" for more. */
  caption: string;
}

/** The strip's mark for a day, from what was done on it. */
const dayKind = (sessions: DaySession[], ahead: boolean): DayKind => {
  if (sessions.length === 0) return ahead ? 'ahead' : 'rest';
  const kinds = new Set(sessions.map((s) => s.kind));
  if (kinds.has('mixed') || (kinds.has('strength') && kinds.has('cardio'))) return 'mixed';
  if (kinds.has('strength')) return 'strength';
  if (kinds.has('cardio')) return 'cardio';
  return 'logged';
};

/** The name to show for a workout logged with no details. */
export const LOGGED_WORKOUT_NAME = 'Workout';

// --- The week ----------------------------------------------------------------------

export interface MuscleWeek {
  muscle: MuscleGroup;
  sets: number;
  /** The exercises behind it, most sets first. */
  exercises: { exerciseId: string; sets: number }[];
}

/** The muscles the strip lists, every week, in this order. Full body and cardio only when done. */
export const MUSCLE_ORDER: MuscleGroup[] = ['chest', 'back', 'shoulders', 'legs', 'arms', 'core'];

export interface WorkoutWeek {
  window: WeekWindow;
  days: WeekDay[];
  workouts: number;
  activeDays: number;
  /** Time on the clock: sessions run or logged with a length. Sets added on This week have none. */
  durationSec: number;
  sets: number;
  volumeKg: number;
  priorVolumeKg: number;
  /** Whole percent on the window before, or null with nothing there. */
  volumeChangePct: number | null;
  prs: number;
  cardio: CardioWeek;
  muscles: MuscleWeek[];
  ratings: WeekRatings;
  /** Every saved session in the window, newest first. */
  sessions: CompletedWorkoutSession[];
}

const inWindow = (date: string, w: WeekWindow): boolean => w.dates.includes(date);

const muscleWeeks = (sessions: CompletedWorkoutSession[], exercisesById: Record<string, Exercise>): MuscleWeek[] => {
  const byMuscle = new Map<MuscleGroup, Map<string, number>>();
  for (const set of sessions.flatMap((s) => s.blocks.flatMap((b) => b.sets as LoggedSet[]))) {
    const exercise = exercisesById[set.exerciseId];
    if (!exercise || isCardioKind(exercise.kind)) continue;
    const exercises = byMuscle.get(exercise.muscle) ?? new Map<string, number>();
    exercises.set(set.exerciseId, (exercises.get(set.exerciseId) ?? 0) + 1);
    byMuscle.set(exercise.muscle, exercises);
  }
  const order = [...MUSCLE_ORDER, ...(['full_body', 'cardio'] as MuscleGroup[]).filter((m) => byMuscle.has(m))];
  return order.map((muscle) => {
    const exercises = [...(byMuscle.get(muscle) ?? new Map<string, number>())]
      .map(([exerciseId, sets]) => ({ exerciseId, sets }))
      .sort((a, b) => b.sets - a.sets);
    return { muscle, sets: exercises.reduce((n, e) => n + e.sets, 0), exercises };
  });
};

/** The days in `dates`, each with its workouts — saved sessions first, then any logged with no details. */
const buildDays = (opts: {
  inside: CompletedWorkoutSession[];
  ratings: CompletionLog[];
  dates: string[];
  today: string;
  exercisesById: Record<string, Exercise>;
}): WeekDay[] => {
  const { inside, ratings, dates, today, exercisesById } = opts;
  // How many workouts each day had: the ring's count, so the two agree.
  const counts = sessionsByDay(
    inside.map((s) => ({ id: s.id, date: sessionDay(s) })),
    ratings
      .filter((l) => dates.includes(l.date))
      .map((l) => (l.session_id ? { date: l.date, sessionId: l.session_id } : { date: l.date }))
  );
  return dates.map((date) => {
    const saved = inside
      .filter((s) => sessionDay(s) === date)
      .sort((a, b) => a.started_at.localeCompare(b.started_at))
      .map<DaySession>((s) => ({
        session: s,
        name: s.workout_name,
        kind: sessionKind(s, exercisesById),
        ratings: ratingsOf(ratings.filter((l) => l.session_id === s.id)),
      }));
    // Ratings with no session doc behind them: workouts logged without details.
    const unpaired = ratings.filter(
      (l) => l.date === date && (!l.session_id || !saved.some((d) => d.session?.id === l.session_id))
    );
    const extra = Math.max(0, (counts.get(date) ?? 0) - saved.length);
    const logged = Array.from({ length: extra }, (_, i) => ({
      session: null,
      name: LOGGED_WORKOUT_NAME,
      kind: 'unknown' as SessionKind,
      ratings: ratingsOf(unpaired.slice(i, i + 1)),
    }));
    const sessions = [...saved, ...logged];
    const ahead = date > today;
    const caption =
      sessions.length === 0 ? '' : sessions.length === 1 ? sessions[0].name : `${sessions[0].name} +${sessions.length - 1}`;
    return { date, isToday: date === today, ahead, sessions, kind: dayKind(sessions, ahead), caption };
  });
};

/** One day on its own, for the Day screen. */
export const buildWorkoutDay = (opts: {
  sessions: CompletedWorkoutSession[];
  exercisesById: Record<string, Exercise>;
  logs: CompletionLog[];
  date: string;
  now: Date;
}): WeekDay =>
  buildDays({
    inside: opts.sessions.filter((s) => sessionDay(s) === opts.date),
    ratings: workoutRatings(opts.logs),
    dates: [opts.date],
    today: toLocalDateString(opts.now),
    exercisesById: opts.exercisesById,
  })[0];

export const buildWorkoutWeek = (opts: {
  sessions: CompletedWorkoutSession[];
  exercisesById: Record<string, Exercise>;
  /** The account's nudge logs: the ratings, and workouts logged with no session. */
  logs: CompletionLog[];
  window: WeekWindow;
  now: Date;
}): WorkoutWeek => {
  const { exercisesById, window: w, now } = opts;
  const today = toLocalDateString(now);
  const ratings = workoutRatings(opts.logs);
  const inside = opts.sessions
    .filter((s) => inWindow(sessionDay(s), w))
    .sort((a, b) => b.started_at.localeCompare(a.started_at));
  const days = buildDays({ inside, ratings, dates: w.dates, today, exercisesById });

  const prior = weekWindow(w.view, now, w.offset + 1);
  const priorVolumeKg = opts.sessions
    .filter((s) => inWindow(sessionDay(s), prior))
    .reduce((n, s) => n + (s.total_volume_kg ?? 0), 0);
  const volumeKg = inside.reduce((n, s) => n + (s.total_volume_kg ?? 0), 0);

  return {
    window: w,
    days,
    workouts: days.reduce((n, d) => n + d.sessions.length, 0),
    activeDays: days.filter((d) => d.sessions.length > 0).length,
    durationSec: inside.filter((s) => !s.logged_sets).reduce((n, s) => n + (s.duration_sec ?? 0), 0),
    sets: inside.reduce((n, s) => n + (s.total_sets ?? 0), 0),
    volumeKg,
    priorVolumeKg,
    volumeChangePct: priorVolumeKg > 0 ? Math.round(((volumeKg - priorVolumeKg) / priorVolumeKg) * 100) : null,
    prs: inside.reduce((n, s) => n + (s.prs?.length ?? 0), 0),
    cardio: cardioWeek({ sessions: opts.sessions, exercisesById, now, range: { start: w.start, end: w.end } }),
    muscles: muscleWeeks(inside, exercisesById),
    ratings: ratingsOf(ratings.filter((l) => inWindow(l.date, w))),
    sessions: inside,
  };
};

// --- Words -------------------------------------------------------------------------

/** "3 of 4 workouts" for this calendar week (the goal's own week), else "3 workouts". */
export const describeWorkouts = (week: Pick<WorkoutWeek, 'workouts' | 'window'>, goal: number): string => {
  const noun = (n: number) => `${n === 1 ? 'workout' : 'workouts'}`;
  if (week.window.view === 'calendar' && week.window.offset === 0) return `${week.workouts} of ${goal} ${noun(goal)}`;
  return `${week.workouts} ${noun(week.workouts)}`;
};

/** "1.6 of 3", or null with none rated. */
export const describeRating = (avg: number | null): string | null => (avg === null ? null : `${avg.toFixed(1)} of 3`);

/** One exercise's sets in a session, in the order done, for the day view. */
export interface ExerciseInSession {
  exerciseId: string;
  sets: LoggedSet[];
}

/** A session's exercises, each once, in the order first done. */
export const exercisesInSession = (session: CompletedWorkoutSession): ExerciseInSession[] => {
  const out: ExerciseInSession[] = [];
  for (const set of session.blocks.flatMap((b) => b.sets as LoggedSet[])) {
    const found = out.find((e) => e.exerciseId === set.exerciseId);
    if (found) found.sets.push(set);
    else out.push({ exerciseId: set.exerciseId, sets: [set] });
  }
  return out;
};

/** The day a window would be for a date: for opening a day from the strip. */
export const dayOf = (week: Pick<WorkoutWeek, 'days'>, date: string): WeekDay | undefined =>
  week.days.find((d) => d.date === date);
