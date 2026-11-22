import { getWeekStart, toLocalDateString } from '../utils/date';
import { addDays } from './homeDashboard';

// =============================================================================
// TODAY'S WEEK CARD (2026-11-22): the founder picked three ways to show the
// week, and people swipe between them on Today, which remembers the last one.
//   rings — a small ring per app, three to a row
//   bars  — a progress bar per app
//   grid  — a row per app and a cell per day, Monday to Sunday
// They replace the nested rings, which stopped reading well past three apps.
// Mockup: https://claude.ai/artifact/XPp116zTm1TgtRcxdECtZy (A, B, D).
// =============================================================================

export type WeekViewId = 'rings' | 'bars' | 'grid';
export const WEEK_VIEWS: { id: WeekViewId; label: string }[] = [
  { id: 'rings', label: 'Rings' },
  { id: 'bars', label: 'Bars' },
  { id: 'grid', label: 'Week grid' },
];

/** A stored view id, or the first view for anything else. */
export const weekViewOf = (stored: string | null | undefined): WeekViewId =>
  WEEK_VIEWS.find((v) => v.id === stored)?.id ?? 'rings';

/** One day in the grid: used, not used yet (past or today), or still ahead. */
export type DayMark = 'done' | 'open' | 'today' | 'future';

/** Monday to Sunday of today's week, as YYYY-MM-DD. */
export const weekDays = (today: string): string[] => {
  const monday = toLocalDateString(getWeekStart(new Date(`${today}T12:00:00`)));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
};

/** Today's column in the week, 0 = Monday … 6 = Sunday. */
export const weekDayIndex = (today: string): number => (new Date(`${today}T12:00:00`).getDay() + 6) % 7;

/** Each day of the week for one app, from the dates it was used. */
export const dayMarks = (dates: readonly string[], today: string): DayMark[] => {
  const used = new Set(dates);
  return weekDays(today).map((d) => (used.has(d) ? 'done' : d === today ? 'today' : d > today ? 'future' : 'open'));
};

/** One app on the week card. */
export interface WeekApp {
  id: string;
  title: string;
  color: string;
  done: number;
  goal: number;
  /** 0–1, capped. */
  pct: number;
  days: DayMark[];
}

export const weekApp = (
  app: { id: string; title: string; color: string; done: number; goal: number; dates: readonly string[] },
  today: string
): WeekApp => ({
  id: app.id,
  title: app.title,
  color: app.color,
  done: app.done,
  goal: app.goal,
  pct: app.goal > 0 ? Math.min(1, app.done / app.goal) : 0,
  days: dayMarks(app.dates, today),
});

/** "13 of 22 this week": sessions toward goals, each app counted up to its goal. */
export const weekTotal = (apps: readonly Pick<WeekApp, 'done' | 'goal'>[]): { done: number; goal: number } => ({
  done: apps.reduce((n, a) => n + Math.min(a.done, a.goal), 0),
  goal: apps.reduce((n, a) => n + a.goal, 0),
});
