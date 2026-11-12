import type { CompletionLog } from '../types';
import { logResistance, MEANINGFUL_RESISTANCE_CHANGE, RESISTANCE_MAX } from '../constants/resistance';
import { appCheckinId, TodayAppId } from './appCheckins';
import { addDays } from './homeDashboard';

// =============================================================================
// THE OVERRIDE, ANSWERED BACK.
//
// The 1–3 after a session is the user's override: what it took to start
// anyway. Until 2026-11-01 tapping it changed nothing (the toast read the same
// after a 1 as after a 3), so the rating felt like paperwork. This is the one
// line the toast now says back, picked from the rating and the app's history.
//
// Two kinds of line:
// - a TREND, once there's enough history to show the override falling: the
//   first two weeks against the last 7 days. That's the payoff the product
//   promises, so it wins whenever it's true.
// - otherwise a LEVEL line, saying what that rating means. Two variants each,
//   alternating, so a daily rating doesn't meet the same sentence every day.
//
// A rising override is never put in the toast: the Progress card already says
// "a tough stretch, not a step back", with room to say it properly.
// =============================================================================

export interface RatedDay {
  date: string;
  /** On the current 1–3 scale. */
  resistance: number;
}

/** The first weeks: the 14 days from an app's first rating. */
const FIRST_WEEKS_DAYS = 14;
/** "This week": the last 7 days, today included. */
const RECENT_DAYS = 7;
/** Enough ratings in each window for an average to mean something. */
const MIN_FIRST_WEEKS = 3;
const MIN_RECENT = 2;

const LEVEL_LINES: Record<1 | 2 | 3, string[]> = {
  1: [
    'Barely any override needed. That’s what the hard starts were building toward.',
    'An easy start. Needing less override is the progress showing.',
  ],
  2: [
    'You had to push, and you did. That’s your override getting stronger.',
    'It took a push to get going. Each one makes the next start a little easier.',
  ],
  3: [
    'That took everything, and you started anyway. Starts like this train your override most.',
    'A hard start, done. These are the ones doing the training.',
  ],
};

const average = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const oneDecimal = (n: number) => n.toFixed(1);

/** One app's earlier ratings, on the current scale. `excludeId` drops the log just written. */
export const appRatedDays = (logs: CompletionLog[], appId: TodayAppId, excludeId?: string): RatedDay[] => {
  const ref = appCheckinId(appId);
  return logs
    .filter((l) => l.reference_id === ref && l.id !== excludeId && !!l.date)
    .map((l) => ({ date: l.date as string, resistance: logResistance(l) }))
    .filter((r): r is RatedDay => typeof r.resistance === 'number');
};

/**
 * The first-weeks and this-week averages, or null when there isn't a fair
 * comparison yet: too few ratings, or the two windows would overlap.
 */
export const overrideTrend = (
  history: RatedDay[],
  latest: RatedDay,
  today: string
): { first: number; recent: number } | null => {
  const all = [...history, latest];
  const start = all.reduce((min, r) => (r.date < min ? r.date : min), all[0].date);
  const firstEnd = addDays(start, FIRST_WEEKS_DAYS - 1);
  const recentStart = addDays(today, -(RECENT_DAYS - 1));
  if (firstEnd >= recentStart) return null;

  const first = all.filter((r) => r.date <= firstEnd).map((r) => r.resistance);
  const recent = all.filter((r) => r.date >= recentStart && r.date <= today).map((r) => r.resistance);
  if (first.length < MIN_FIRST_WEEKS || recent.length < MIN_RECENT) return null;
  return { first: average(first), recent: average(recent) };
};

/** The line the toast says back after a rating. */
export const overrideEcho = (args: {
  level: number;
  appName: string;
  /** This app's ratings before this one (appRatedDays). */
  history: RatedDay[];
  /** The day the rating was logged for. */
  date: string;
  today: string;
}): string => {
  const level = Math.min(RESISTANCE_MAX, Math.max(1, Math.round(args.level))) as 1 | 2 | 3;
  const trend = overrideTrend(args.history, { date: args.date, resistance: level }, args.today);

  if (trend && trend.first - trend.recent >= MEANINGFUL_RESISTANCE_CHANGE) {
    const numbers = `${oneDecimal(trend.first)} of ${RESISTANCE_MAX} your first two weeks, ${oneDecimal(trend.recent)} this week.`;
    return level === 3
      ? `A hard one today, but your ${args.appName} override is still down: ${numbers}`
      : `Your ${args.appName} override: ${numbers}`;
  }

  const lines = LEVEL_LINES[level];
  return lines[args.history.length % lines.length];
};

// --- Two ratings, read together (2026-11-11) ------------------------------------
//
// A session now carries the override AND push (constants/resistance.ts). The
// pair says more than either: a 3 then a 1 is "getting there was the win", a 1
// then a 3 is effort put where it counts. The override trend still wins when
// it's true — falling starts are the payoff the product promises.

/** The line for a session rated on both. */
export const pairEcho = (args: {
  override: number;
  push: number;
  appName: string;
  history: RatedDay[];
  date: string;
  today: string;
}): string => {
  const override = Math.min(RESISTANCE_MAX, Math.max(1, Math.round(args.override)));
  const push = Math.min(RESISTANCE_MAX, Math.max(1, Math.round(args.push)));
  const trend = overrideTrend(args.history, { date: args.date, resistance: override }, args.today);
  if (trend && trend.first - trend.recent >= MEANINGFUL_RESISTANCE_CHANGE) {
    return `Your ${args.appName} override: ${oneDecimal(trend.first)} of ${RESISTANCE_MAX} your first two weeks, ${oneDecimal(trend.recent)} this week.`;
  }
  if (override === 3 && push === 3) return 'Nearly didn’t start, then gave it everything. That’s the whole point.';
  const hardStart = override >= 2;
  const pushed = push >= 2;
  if (hardStart && pushed) return 'Hard to start, and you still pushed once you were in. Both muscles, one session.';
  if (hardStart) return 'Getting started was the win today. Next time, see if you can push once you’re going.';
  if (pushed) return 'Easy start, real effort. When starting stops costing much, this is where the work goes.';
  return 'Easy in, easy through. Fine for a recovery day. Raise the bar when you’re ready.';
};

/** The line for a Meals day's rating. An off-target day is still a day you showed up for. */
export const mealsDayEcho = (rating: number, onTarget?: boolean): string => {
  const level = Math.min(RESISTANCE_MAX, Math.max(1, Math.round(rating)));
  if (onTarget === false) {
    return level >= 2
      ? 'Off target, but you fought for it. A hard day you showed up for still counts.'
      : 'Off target without much of a fight. Worth a look at what made it easy to drift.';
  }
  if (level === 3) return 'A day full of pull, and you held. That’s the hard version, done.';
  if (level === 2) return 'You said no when it mattered.';
  return 'An easy day of eating well. That’s it settling in.';
};
