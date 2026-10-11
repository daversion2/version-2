import { CompletionLog } from '../types';
import { logResistance } from '../constants/resistance';
import { addDays, daysBetween } from './habitSchedule';

// =============================================================================
// FRICTION YOU CAN HANDLE — the Progress headline.
//
// Two numbers per 7-day window:
//   faced — each check-in counted at how hard its habit was when the user
//           STARTED it (the mean of that habit's first few ratings)
//   felt  — what those same check-ins cost now (the ratings actually tapped)
//
// Why not an average or plain XP: an average rises the moment someone takes on
// a harder habit, and summed ratings fall as habits get easier. Both punish the
// growth the app exists to show. `faced` never drops because a habit got
// easier, and climbs when the user carries more or harder habits; the gap
// below it is the strength they've gained.
//
// Rolling 7-day windows, not calendar weeks, so the headline never collapses
// to zero on a Monday morning.
// =============================================================================

/** 7-day windows on the chart, oldest → newest; the last one is the last 7 days. */
export const FRICTION_WINDOWS = 8;
/** How many of a habit's first ratings set its starting difficulty. */
export const BASELINE_SAMPLE = 3;
/** Below this many rated check-ins the card says nothing about trends. */
export const MIN_RATED_FOR_FRICTION = 3;
/** "Your first weeks" means the first 14 days, once there are 21 days of history. */
const FIRST_WEEKS_DAYS = 14;
const MIN_HISTORY_FOR_COMPARISON_DAYS = 21;

export interface FrictionWindow {
  start: string;
  end: string;
  faced: number;
  felt: number;
}

export interface FrictionOverview {
  /** Oldest → newest. The last window is the last 7 days. */
  windows: FrictionWindow[];
  /** The last 7 days, rounded for display. */
  faced: number;
  felt: number;
  /** Faced per 7 days over the user's first two weeks; null until there is history to compare. */
  firstWeeksFaced: number | null;
  /** Habit check-ins carrying a rating, all time. */
  rated: number;
}

interface RatedLog {
  habitId: string;
  date: string;
  order: string;
  felt: number;
}

const sum = (nums: number[]): number => nums.reduce((s, n) => s + n, 0);

const ratedHabitLogs = (logs: CompletionLog[]): RatedLog[] =>
  logs
    .filter((l) => l.type === 'nudge')
    .map((l) => ({
      habitId: l.reference_id,
      date: l.date,
      order: `${l.date}|${l.completed_at ?? ''}`,
      felt: logResistance(l),
    }))
    .filter((l): l is RatedLog => typeof l.felt === 'number')
    .sort((a, b) => a.order.localeCompare(b.order));

/** Each habit's starting difficulty: the mean of its first few ratings. */
export const startingDifficulty = (logs: CompletionLog[]): Record<string, number> => {
  const firstRatings: Record<string, number[]> = {};
  for (const l of ratedHabitLogs(logs)) {
    const list = (firstRatings[l.habitId] ??= []);
    if (list.length < BASELINE_SAMPLE) list.push(l.felt);
  }
  return Object.fromEntries(
    Object.entries(firstRatings).map(([id, rs]) => [id, sum(rs) / rs.length])
  );
};

export const buildFrictionOverview = (logs: CompletionLog[], today: string): FrictionOverview => {
  const rated = ratedHabitLogs(logs);
  const baseline = startingDifficulty(logs);

  const totals = (start: string, end: string) => {
    const inRange = rated.filter((l) => l.date >= start && l.date <= end);
    return {
      faced: sum(inRange.map((l) => baseline[l.habitId])),
      felt: sum(inRange.map((l) => l.felt)),
    };
  };

  const windows: FrictionWindow[] = [];
  for (let i = FRICTION_WINDOWS - 1; i >= 0; i--) {
    const end = addDays(today, -7 * i);
    const start = addDays(end, -6);
    windows.push({ start, end, ...totals(start, end) });
  }

  let firstWeeksFaced: number | null = null;
  if (rated.length > 0 && daysBetween(rated[0].date, today) >= MIN_HISTORY_FOR_COMPARISON_DAYS) {
    const first = rated[0].date;
    firstWeeksFaced = totals(first, addDays(first, FIRST_WEEKS_DAYS - 1)).faced / 2;
  }

  const latest = windows[windows.length - 1];
  return {
    windows,
    faced: Math.round(latest.faced),
    felt: Math.round(latest.felt),
    firstWeeksFaced,
    rated: rated.length,
  };
};

/** "an 18", "a 13" — numbers read aloud, so 8, 11, 18 and 80s take "an". */
export const withArticle = (n: number): string => {
  const s = String(n);
  return `${s.startsWith('8') || n === 11 || n === 18 ? 'an' : 'a'} ${s}`;
};

/** "Twice your first weeks", "1.5× your first weeks" — or null when there's nothing to celebrate. */
export const growthLabel = (overview: FrictionOverview): string | null => {
  const { firstWeeksFaced, faced } = overview;
  if (!firstWeeksFaced) return null;
  const ratio = faced / firstWeeksFaced;
  if (ratio >= 1.95 && ratio < 2.05) return 'Twice your first weeks';
  if (ratio >= 1.15) return `${Number(ratio.toFixed(1))}× your first weeks`;
  if (ratio >= 0.85) return 'Same as your first weeks';
  // Carrying less than at the start is not something to put in a headline.
  return null;
};

/** The sentence that explains the card without explaining the maths. */
export const frictionSentence = (overview: FrictionOverview): string => {
  const { faced, felt } = overview;
  if (faced === 0) return 'Nothing logged in the last 7 days. The bars pick up the moment you do.';
  if (faced - felt >= 1) {
    return `Your last 7 days would have felt like ${withArticle(faced)} when you started. They felt like ${withArticle(felt)}.`;
  }
  if (felt - faced >= 1) {
    return 'Your last 7 days felt harder than when you started. A tough stretch, not a step back.';
  }
  return 'Your last 7 days felt about as hard as when you started. As habits bed in, the gap opens up.';
};
