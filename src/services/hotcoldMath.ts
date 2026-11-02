import type { HotColdSession, TempUnit, ThermalKind } from '../types/hotcold';
import { FIRST_SESSION } from '../data/hotcold';
import { weekStreak } from './homeDashboard';
import { addDays } from './habitSchedule';
import { getWeekStart, toLocalDateString } from '../utils/date';

// =============================================================================
// HOT & COLD — every rule the app follows, pure so it can be tested. Screens
// format; they don't compute. Spec: docs/micro-apps/hotcold.md.
// =============================================================================

// --- Temperature -------------------------------------------------------------

export const toC = (f: number): number => ((f - 32) * 5) / 9;
export const fromC = (c: number): number => (c * 9) / 5 + 32;

const round1 = (n: number): number => Math.round(n * 10) / 10;

/** What the stepper shows: a whole number in the user's unit. */
export const displayTemp = (c: number, unit: TempUnit): number => Math.round(unit === 'C' ? c : fromC(c));

/** A stepper value back to storage: °C, one decimal — enough that it reads back the same in either unit. */
export const storedTemp = (value: number, unit: TempUnit): number => round1(unit === 'C' ? value : toC(value));

export const formatTemp = (c: number, unit: TempUnit): string => `${displayTemp(c, unit)} °${unit}`;

/** °F where the phone's region uses it, else °C. Accepts 'en-US' and 'en_US'. */
export const defaultUnit = (locale: string | undefined): TempUnit => {
  const region = (locale ?? '').split(/[-_]/)[1]?.toUpperCase();
  return region && ['US', 'LR', 'MM'].includes(region) ? 'F' : 'C';
};

const BOUNDS_C: Record<ThermalKind, { min: number; max: number }> = {
  cold: { min: -2, max: 25 },
  heat: { min: 40, max: 120 },
};

/** The temperature stepper's range and step, in the user's unit. */
export const tempBounds = (kind: ThermalKind, unit: TempUnit): { min: number; max: number; step: number } => {
  const { min, max } = BOUNDS_C[kind];
  return {
    min: displayTemp(min, unit),
    max: displayTemp(max, unit),
    // A sauna's thermometer is rough, and it changes in big jumps.
    step: kind === 'heat' ? 5 : 1,
  };
};

export const clampTemp = (kind: ThermalKind, c: number): number =>
  Math.min(BOUNDS_C[kind].max, Math.max(BOUNDS_C[kind].min, c));

// --- Duration ----------------------------------------------------------------

export const MIN_DURATION_SEC = 5;
/**
 * The longest session that can be logged. Cold stops at 30 min: past that it's
 * a timer left running, not a plunge — a forgotten clock used to log up to 2 h
 * of cold and take the record with it.
 */
export const MAX_DURATION_SEC: Record<ThermalKind, number> = { cold: 30 * 60, heat: 2 * 60 * 60 };

export const clampDuration = (sec: number, kind: ThermalKind): number =>
  Math.min(MAX_DURATION_SEC[kind], Math.max(MIN_DURATION_SEC, Math.round(sec)));

/** How far past the bell a cold clock can run before it looks forgotten. */
export const FORGOTTEN_PAST_BELL_SEC = 10 * 60;
/** A heat clock (no bell) this long looks forgotten. */
export const FORGOTTEN_HEAT_SEC = 60 * 60;

/**
 * Did the timer probably keep running after they got out? Cold: well past the
 * bell, or past the cold limit. Heat: over an hour. Done asks before logging it.
 */
export const looksForgotten = (kind: ThermalKind, elapsed: number, targetSec?: number): boolean => {
  if (kind === 'heat') return elapsed > FORGOTTEN_HEAT_SEC;
  if (elapsed > MAX_DURATION_SEC.cold) return true;
  return targetSec !== undefined && elapsed > targetSec + FORGOTTEN_PAST_BELL_SEC;
};

/** The duration stepper's step: cold moves in 15 s, heat in whole minutes. */
export const durationStep = (kind: ThermalKind): number => (kind === 'cold' ? 15 : 60);

/** "45 s", "2:30", "15 min". */
export const formatDuration = (sec: number): string => {
  const s = Math.max(0, Math.round(sec));
  if (s < 60) return `${s} s`;
  if (s % 60 === 0) return `${s / 60} min`;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** A running clock: "0:07", "12:45", "1:02:03". */
export const formatClock = (sec: number): string => {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};

/** Minutes for a weekly total: rounded, but any time at all shows as at least 1. */
export const totalMinutes = (sec: number): number => (sec <= 0 ? 0 : Math.max(1, Math.round(sec / 60)));

// --- Sessions ----------------------------------------------------------------

/** How far back History lists sessions. Records and the streak use every session. */
export const HISTORY_WEEKS = 12;

/** The sessions History lists: the last HISTORY_WEEKS weeks. */
export const recentSessions = (sessions: HotColdSession[], today: string): HotColdSession[] => {
  const from = addDays(today, -HISTORY_WEEKS * 7);
  return sessions.filter((s) => s.date >= from);
};

const newestFirst = (a: HotColdSession, b: HotColdSession): number =>
  b.date.localeCompare(a.date) || b.logged_at.localeCompare(a.logged_at);

/** The last session of this kind, or the first-session defaults. */
export const prefillFor = (
  kind: ThermalKind,
  sessions: HotColdSession[]
): { duration_sec: number; temp_c: number } => {
  const last = sessions.filter((s) => s.kind === kind).sort(newestFirst)[0];
  return last ? { duration_sec: last.duration_sec, temp_c: last.temp_c } : FIRST_SESSION[kind];
};

/** Newest day first; within a day, in the order they were logged. */
export const groupByDay = (sessions: HotColdSession[]): { date: string; sessions: HotColdSession[] }[] => {
  const byDate = new Map<string, HotColdSession[]>();
  for (const s of sessions) byDate.set(s.date, [...(byDate.get(s.date) ?? []), s]);
  return [...byDate.keys()]
    .sort((a, b) => b.localeCompare(a))
    .map((date) => ({
      date,
      sessions: byDate.get(date)!.sort((a, b) => a.logged_at.localeCompare(b.logged_at)),
    }));
};

const mondayOf = (date: string): string => toLocalDateString(getWeekStart(new Date(date + 'T00:00:00')));

export interface WeekSummary {
  /** Monday of this week. */
  start: string;
  sessions: number;
  goal: number;
  met: boolean;
  coldSec: number;
  heatSec: number;
}

/** This Monday-start week: sessions against the goal, and time per kind. */
export const weekSummary = (sessions: HotColdSession[], today: string, goal: number): WeekSummary => {
  const start = mondayOf(today);
  const end = addDays(start, 6);
  const week = sessions.filter((s) => s.date >= start && s.date <= end);
  const sum = (kind: ThermalKind) =>
    week.filter((s) => s.kind === kind).reduce((n, s) => n + s.duration_sec, 0);
  return {
    start,
    sessions: week.length,
    goal,
    met: week.length >= goal,
    coldSec: sum('cold'),
    heatSec: sum('heat'),
  };
};

/** Weeks in a row that met the goal (homeDashboard.weekStreak: this week never breaks it). */
export const streakWeeks = (sessions: HotColdSession[], today: string, goal: number): number =>
  weekStreak(
    sessions.map((s) => s.date),
    goal,
    today
  );

// --- Records -----------------------------------------------------------------

export type RecordId = 'longestCold' | 'coldest' | 'longestHeat';

export const RECORD_LABEL: Record<RecordId, string> = {
  longestCold: 'Longest cold',
  coldest: 'Coldest',
  longestHeat: 'Longest heat',
};

/**
 * Personal bests. No "hottest": the gym sets the sauna, and it isn't
 * something to chase. On a tie the earlier session keeps the record.
 */
export const records = (sessions: HotColdSession[]): Record<RecordId, HotColdSession | null> => {
  const ordered = [...sessions].sort((a, b) => -newestFirst(a, b)); // oldest first
  const best = (kind: ThermalKind, better: (a: HotColdSession, b: HotColdSession) => boolean) =>
    ordered
      .filter((s) => s.kind === kind)
      .reduce<HotColdSession | null>((top, s) => (!top || better(s, top) ? s : top), null);
  return {
    longestCold: best('cold', (a, b) => a.duration_sec > b.duration_sec),
    coldest: best('cold', (a, b) => a.temp_c < b.temp_c),
    longestHeat: best('heat', (a, b) => a.duration_sec > b.duration_sec),
  };
};

/**
 * Which records a just-saved session broke. A first session of a kind breaks
 * nothing — there was nothing to beat.
 */
export const newRecords = (session: HotColdSession, others: HotColdSession[]): RecordId[] => {
  const same = others.filter((s) => s.kind === session.kind && s.id !== session.id);
  if (same.length === 0) return [];
  const out: RecordId[] = [];
  const longest = Math.max(...same.map((s) => s.duration_sec));
  if (session.duration_sec > longest) out.push(session.kind === 'cold' ? 'longestCold' : 'longestHeat');
  if (session.kind === 'cold' && session.temp_c < Math.min(...same.map((s) => s.temp_c))) out.push('coldest');
  return out;
};

// --- Days --------------------------------------------------------------------

/** "Today", "Yesterday", or "Mon 27 Oct". */
export const dayLabel = (date: string, today: string): string => {
  if (date === today) return 'Today';
  if (date === addDays(today, -1)) return 'Yesterday';
  return new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
};
