import type { CompletionLog } from '../types';
import type { CompletedMeditateSession, MeditateMode } from '../types/meditate';
import { asLevel, logResistance } from '../constants/resistance';
import { toLocalDateString } from '../utils/date';
import { appCheckinId } from './appCheckins';
import { sessionsByDay } from './homeDashboard';
import { describeSession, MODE_ORDER, MODES } from './meditateMath';
import type { WeekRatings, WeekWindow } from './workoutWeek';

// =============================================================================
// YOUR WEEK IN MEDITATE (founder, 2026-11-23): the same frames and counting as
// Workouts' week (services/workoutWeek.ts). A day's count is the larger of its
// saved sessions and its unpaired ratings, as Today's ring counts it.
// =============================================================================

export const LOGGED_MEDITATE_NAME = 'Meditate';

export interface MeditateDaySession {
  /** The saved session, or null for a check-in with no session behind it. */
  session: CompletedMeditateSession | null;
  name: string;
  ratings: WeekRatings;
}

export type MeditateDayKind = MeditateMode | 'mixed' | 'logged' | 'rest' | 'ahead';

export interface MeditateDay {
  date: string;
  isToday: boolean;
  ahead: boolean;
  sessions: MeditateDaySession[];
  kind: MeditateDayKind;
  /** Under the day in the strip: the first session's kind, "+1" for more. */
  caption: string;
}

export interface MeditateModeWeek {
  mode: MeditateMode;
  label: string;
  sec: number;
  sessions: number;
}

export interface MeditateWeek {
  window: WeekWindow;
  days: MeditateDay[];
  count: number;
  activeDays: number;
  sec: number;
  priorSec: number;
  /** Whole percent on the window before, or null with nothing there. */
  changePct: number | null;
  longestSec: number;
  byMode: MeditateModeWeek[];
  ratings: WeekRatings;
}

const average = (xs: number[]): number | null => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

const meditateRatings = (logs: CompletionLog[]): CompletionLog[] =>
  logs.filter((l) => l.reference_id === appCheckinId('meditate') && !l.mirror_of);

const ratingsOf = (logs: CompletionLog[]): WeekRatings => ({
  start: average(logs.map(logResistance).filter((v): v is number => typeof v === 'number')),
  stay: average(logs.flatMap((l) => asLevel(l.keep_going) ?? [])),
});

const dayKind = (sessions: MeditateDaySession[], ahead: boolean): MeditateDayKind => {
  if (sessions.length === 0) return ahead ? 'ahead' : 'rest';
  const modes = new Set(sessions.flatMap((s) => (s.session ? [s.session.mode] : [])));
  if (modes.size > 1) return 'mixed';
  return modes.size === 1 ? [...modes][0] : 'logged';
};

const buildDays = (opts: {
  inside: CompletedMeditateSession[];
  ratings: CompletionLog[];
  dates: string[];
  today: string;
}): MeditateDay[] => {
  const { inside, ratings, dates, today } = opts;
  const counts = sessionsByDay(
    inside.map((s) => ({ id: s.id, date: s.date })),
    ratings
      .filter((l) => dates.includes(l.date))
      .map((l) => (l.session_id ? { date: l.date, sessionId: l.session_id } : { date: l.date }))
  );
  return dates.map((date) => {
    const saved = inside
      .filter((s) => s.date === date)
      .sort((a, b) => a.started_at.localeCompare(b.started_at))
      .map<MeditateDaySession>((s) => ({
        session: s,
        name: describeSession(s),
        ratings: ratingsOf(ratings.filter((l) => l.session_id === s.id)),
      }));
    const unpaired = ratings.filter(
      (l) => l.date === date && (!l.session_id || !saved.some((d) => d.session?.id === l.session_id))
    );
    const extra = Math.max(0, (counts.get(date) ?? 0) - saved.length);
    const logged = Array.from({ length: extra }, (_, i) => ({
      session: null,
      name: LOGGED_MEDITATE_NAME,
      ratings: ratingsOf(unpaired.slice(i, i + 1)),
    }));
    const sessions = [...saved, ...logged];
    const ahead = date > today;
    const first = sessions[0]?.session ? MODES[sessions[0].session.mode].label : sessions[0]?.name ?? '';
    const caption = sessions.length > 1 ? `${first} +${sessions.length - 1}` : first;
    return { date, isToday: date === today, ahead, sessions, kind: dayKind(sessions, ahead), caption };
  });
};

export const buildMeditateDay = (opts: {
  sessions: CompletedMeditateSession[];
  logs: CompletionLog[];
  date: string;
  now: Date;
}): MeditateDay =>
  buildDays({
    inside: opts.sessions.filter((s) => s.date === opts.date),
    ratings: meditateRatings(opts.logs),
    dates: [opts.date],
    today: toLocalDateString(opts.now),
  })[0];

export const buildMeditateWeek = (opts: {
  sessions: CompletedMeditateSession[];
  logs: CompletionLog[];
  window: WeekWindow;
  /** The window before it, for the change in minutes. */
  prior: WeekWindow;
  now: Date;
}): MeditateWeek => {
  const { sessions, window: w, prior, now } = opts;
  const ratings = meditateRatings(opts.logs);
  const inside = sessions.filter((s) => w.dates.includes(s.date));
  const days = buildDays({ inside, ratings, dates: w.dates, today: toLocalDateString(now) });
  const sum = (list: CompletedMeditateSession[]) => list.reduce((n, s) => n + s.duration_sec, 0);
  const sec = sum(inside);
  const priorSec = sum(sessions.filter((s) => prior.dates.includes(s.date)));
  return {
    window: w,
    days,
    count: days.reduce((n, d) => n + d.sessions.length, 0),
    activeDays: days.filter((d) => d.sessions.length > 0).length,
    sec,
    priorSec,
    changePct: priorSec > 0 ? Math.round(((sec - priorSec) / priorSec) * 100) : null,
    longestSec: Math.max(0, ...inside.map((s) => s.duration_sec)),
    byMode: MODE_ORDER.map((mode) => {
      const list = inside.filter((s) => s.mode === mode);
      return { mode, label: MODES[mode].label, sec: sum(list), sessions: list.length };
    }),
    ratings: ratingsOf(ratings.filter((l) => w.dates.includes(l.date))),
  };
};

/**
 * Entered with Done it rather than run: those are filed at exactly local noon
 * (meditateMath.pastSession), a placeholder that shouldn't read as a real time.
 */
export const wasLoggedAfter = (s: Pick<CompletedMeditateSession, 'started_at'>): boolean => {
  const at = new Date(s.started_at);
  return at.getHours() === 12 && at.getMinutes() === 0 && at.getSeconds() === 0 && at.getMilliseconds() === 0;
};

/** "2 of 3 sessions" for this Monday week, against the goal; otherwise "2 sessions". */
export const describeMeditateWeek = (week: Pick<MeditateWeek, 'count' | 'window'>, goal: number): string => {
  const noun = (n: number) => (n === 1 ? 'session' : 'sessions');
  if (week.window.view === 'calendar' && week.window.offset === 0) return `${week.count} of ${goal} ${noun(goal)}`;
  return `${week.count} ${noun(week.count)}`;
};
