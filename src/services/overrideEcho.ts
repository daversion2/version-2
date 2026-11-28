import type { CompletionLog } from '../types';
import { logResistance, RESISTANCE_MAX } from '../constants/resistance';
import { appCheckinId, TodayAppId } from './appCheckins';

// =============================================================================
// THE OVERRIDE, ANSWERED BACK.
//
// The 1–3 after a session is the user's override: what it took to start
// anyway. Until 2026-11-01 tapping it changed nothing (the toast read the same
// after a 1 as after a 3), so the rating felt like paperwork. This is the one
// line the toast now says back, picked from the rating.
//
// The effort is the reward (founder, 2026-11-20). The toast never compares a
// rating with earlier ones: a few weeks is too little data to call a trend,
// and promising "it gets easier" makes a hard week read as failing. Every
// line says what this session's effort was worth, whatever the level. Until
// 2026-11-20 a falling start (first two weeks against this week) won the
// toast; that line is gone.
//
// Two variants for levels 1 and 2, alternating, so a daily rating doesn't
// meet the same sentence every day. A 3 gets one line, no applause (founder,
// 2026-11-28, docs/brand.md "Wins").
// =============================================================================

export interface RatedDay {
  date: string;
  /** On the current 1–3 scale. */
  resistance: number;
}

const LEVEL_LINES: Record<1 | 2 | 3, string[]> = {
  1: [
    'Barely thought about it, and you’re in. Easy days count too.',
    'Woah… look at you making it look easy!',
  ],
  2: [
    'You had to talk yourself into it, and you did. That’s the override at work.',
    'It took some convincing, and you started anyway. That convincing is the training.',
  ],
  3: [
    'Nice work! Now refrain from posting about it on Instagram.',
  ],
};

/** One app's earlier ratings, on the current scale. `excludeId` drops the log just written. */
export const appRatedDays = (logs: CompletionLog[], appId: TodayAppId, excludeId?: string): RatedDay[] => {
  const ref = appCheckinId(appId);
  return logs
    .filter((l) => l.reference_id === ref && l.id !== excludeId && !!l.date)
    .map((l) => ({ date: l.date as string, resistance: logResistance(l) }))
    .filter((r): r is RatedDay => typeof r.resistance === 'number');
};

/** The line the toast says back after a rating. */
export const overrideEcho = (args: {
  level: number;
  /** This app's ratings before this one (appRatedDays): only their count is used, to alternate the line. */
  history: RatedDay[];
}): string => {
  const level = Math.min(RESISTANCE_MAX, Math.max(1, Math.round(args.level))) as 1 | 2 | 3;
  const lines = LEVEL_LINES[level];
  return lines[args.history.length % lines.length];
};

// --- The override, twice (2026-11-20) -------------------------------------------
//
// A session carries the start AND keep going (constants/resistance.ts, "THE
// OVERRIDE, TWICE"). The pair says more than either: a 3 then a 1 is "getting
// there was the win", a 1 then a 3 is the override doing its second job. A 3
// is never a bad mark, and no line compares with earlier sessions.

/** The line for a session rated on both. */
export const pairEcho = (args: { override: number; keepGoing: number }): string => {
  const start = Math.min(RESISTANCE_MAX, Math.max(1, Math.round(args.override)));
  const keepGoing = Math.min(RESISTANCE_MAX, Math.max(1, Math.round(args.keepGoing)));
  if (start === 3 && keepGoing === 3) return 'Overrode it twice today, getting in and staying in. That’s the whole skill.';
  const hardStart = start >= 2;
  const hardMiddle = keepGoing >= 2;
  if (hardStart && hardMiddle) return 'Hard to start and hard to keep going, and you did both. Two overrides, one session.';
  if (hardStart) return 'Getting started was the hard part today. Once you were in, you were in.';
  if (hardMiddle) return 'Easy to start, hard to keep going, and you kept going. That’s the override doing its second job.';
  return 'Easy in, easy through. The easy days count as much as the hard ones.';
};

/** The line for a session rated on keep going alone (logged days late). */
export const keepGoingEcho = (level: number): string => {
  const keepGoing = Math.min(RESISTANCE_MAX, Math.max(1, Math.round(level)));
  if (keepGoing === 3) return 'You wanted to quit and didn’t. Those are the minutes doing the training.';
  if (keepGoing === 2) return 'The urge to stop showed up and you kept going. That’s the override at work.';
  return 'Never wanted to stop. A steady session counts.';
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
  return 'An easy day of eating well. Those count too.';
};
