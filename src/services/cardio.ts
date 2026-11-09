import type { CardioZone, CompletedWorkoutSession, Exercise } from '../types/workouts';
import { CARDIO_WEEKLY_GOAL_MIN, CARDIO_ZONES, CARDIO_ZONE_ORDER } from '../data/cardioZones';
import { weekBounds } from './weeklyVolume';

// =============================================================================
// CARDIO THIS WEEK — minutes by zone, and how they add up toward 150.
//
// Every `cardio` set counts, in the zone it was logged at. A `distance` set (a
// timed mile, a 5K for time) is a race against the clock, so its time counts
// as above VT2. Weeks start Monday and a session belongs to the week its
// finished_at falls in, the same as This week and Stats.
//
// Toward the goal, a minute below VT1 counts once and a minute above it counts
// twice (WHO: 150 moderate or 75 vigorous minutes, or a mix).
// =============================================================================

export interface CardioWeek {
  /** Minutes actually done in each zone, unrounded. */
  minutesByZone: Record<CardioZone, number>;
  totalMin: number;
  /** Minutes toward the goal: zone 1 once, zones 2 and 3 twice. */
  creditMin: number;
  goalMin: number;
  /** Share of the minutes done below VT1, 0–1; 0 when there are none. */
  easyShare: number;
}

const ZERO: Record<CardioZone, number> = { 1: 0, 2: 0, 3: 0 };

export const cardioWeek = (opts: {
  sessions: CompletedWorkoutSession[];
  exercisesById: Record<string, Exercise>;
  now: Date;
  goalMin?: number;
}): CardioWeek => {
  const { start, end } = weekBounds(opts.now);
  const minutesByZone = { ...ZERO };
  for (const session of opts.sessions) {
    const at = new Date(session.finished_at).getTime();
    if (at < start.getTime() || at >= end.getTime()) continue;
    for (const set of session.blocks.flatMap((b) => b.sets)) {
      const kind = opts.exercisesById[set.exerciseId]?.kind;
      if (kind !== 'cardio' && kind !== 'distance') continue;
      const zone: CardioZone = kind === 'distance' ? 3 : set.zone ?? 1;
      minutesByZone[zone] += (set.seconds ?? 0) / 60;
    }
  }
  const totalMin = CARDIO_ZONE_ORDER.reduce((n, z) => n + minutesByZone[z], 0);
  const creditMin = CARDIO_ZONE_ORDER.reduce((n, z) => n + minutesByZone[z] * CARDIO_ZONES[z].weight, 0);
  return {
    minutesByZone,
    totalMin,
    creditMin,
    goalMin: opts.goalMin ?? CARDIO_WEEKLY_GOAL_MIN,
    easyShare: totalMin > 0 ? minutesByZone[1] / totalMin : 0,
  };
};

/** "95 of 150 min", "Goal met · 180 of 150 min". */
export const describeCardioCredit = (week: Pick<CardioWeek, 'creditMin' | 'goalMin'>): string => {
  const credit = Math.round(week.creditMin);
  return credit >= week.goalMin ? `Goal met · ${credit} of ${week.goalMin} min` : `${credit} of ${week.goalMin} min`;
};

/** A zone mid-sentence: "below VT1", "VT1 – VT2", "above VT2". */
export const zoneInLine = (zone: CardioZone): string => {
  const label = CARDIO_ZONES[zone].label;
  // "Below" and "Above" go lower case; "VT1 – VT2" starts with a name.
  return /^[A-Z][a-z]/.test(label) ? label.charAt(0).toLowerCase() + label.slice(1) : label;
};

/** "below 142 bpm", "142–168 bpm", "above 168 bpm" — only with the thresholds it needs. */
export const zoneHeartRate = (zone: CardioZone, vt1?: number, vt2?: number): string | null => {
  if (zone === 1) return vt1 ? `below ${vt1} bpm` : null;
  if (zone === 3) return vt2 ? `above ${vt2} bpm` : null;
  return vt1 && vt2 ? `${vt1}–${vt2} bpm` : null;
};

/** VT2 has to sit above VT1. Either may be unset (0 / undefined). */
export const validThresholds = (vt1?: number, vt2?: number): boolean => !vt1 || !vt2 || vt2 > vt1;
