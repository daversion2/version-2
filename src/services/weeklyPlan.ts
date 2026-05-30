import {
  CompletionLog,
  PlannedItem,
  TomorrowPlan,
  Challenge,
  Nudge,
  ProgramEnrollment,
  ProgramDay,
} from '../types';
import { getCompletionLogs } from './progress';
import { getTomorrowPlan } from './dailyPlan';
import { buildTodaysPlan } from './dailyPlan';
import { getTodayString, isToday } from '../utils/date';

// ============================================================================
// TYPES
// ============================================================================

export interface DaySummary {
  date: string;
  isToday: boolean;
  isPast: boolean;

  // Completed items (from completionLogs)
  completions: CompletionLog[];
  challengesCompleted: number;
  habitsCompleted: number;

  // Plan data (for today + future days)
  plan: TomorrowPlan | null;

  // Today-specific: full PlannedItem list from buildTodaysPlan
  todayItems?: PlannedItem[];
}

export interface WeekData {
  weekStart: string;
  weekEnd: string;
  days: DaySummary[];
}

// Params needed to call buildTodaysPlan for the current day
export interface TodayBuildParams {
  activeChallenges: Challenge[];
  extendedChallenges: Challenge[];
  habits: Nudge[];
  weeklyCounts: Record<string, number>;
  activeProgram: ProgramEnrollment | null;
  todaysProgramDay: ProgramDay | null;
  programDayNumber: number;
  programCheckedIn: boolean;
  getItemColor: (goalIds?: string[]) => string;
  plannedHabitIds?: string[];
}

// ============================================================================
// LOAD WEEK DATA
// ============================================================================

export async function loadWeekData(
  userId: string,
  weekDates: string[],
  todayParams?: TodayBuildParams
): Promise<WeekData> {
  const todayStr = getTodayString();
  const weekStart = weekDates[0];
  const weekEnd = weekDates[6];

  // Batch load: completion logs for the entire week
  const allLogs = await getCompletionLogs(userId, weekStart, weekEnd);

  // Group logs by date
  const logsByDate = new Map<string, CompletionLog[]>();
  for (const log of allLogs) {
    const existing = logsByDate.get(log.date) || [];
    existing.push(log);
    logsByDate.set(log.date, existing);
  }

  // Load plans for future days (+ today) in parallel
  const planPromises = weekDates
    .filter((d) => d >= todayStr)
    .map(async (d) => {
      const plan = await getTomorrowPlan(userId, d);
      return { date: d, plan };
    });
  const planResults = await Promise.all(planPromises);
  const plansByDate = new Map<string, TomorrowPlan | null>();
  for (const { date, plan } of planResults) {
    plansByDate.set(date, plan);
  }

  // Build today's items if we have the params and it's in this week
  let todayItems: PlannedItem[] | undefined;
  if (todayParams && weekDates.includes(todayStr)) {
    todayItems = buildTodaysPlan(todayParams);
  }

  // Assemble day summaries
  const days: DaySummary[] = weekDates.map((date) => {
    const dateIsToday = date === todayStr;
    const isPast = date < todayStr;
    const logs = logsByDate.get(date) || [];

    return {
      date,
      isToday: dateIsToday,
      isPast,
      completions: logs,
      challengesCompleted: logs.filter((l) => l.type === 'challenge').length,
      habitsCompleted: logs.filter((l) => l.type === 'nudge').length,
      plan: plansByDate.get(date) || null,
      todayItems: dateIsToday ? todayItems : undefined,
    };
  });

  return { weekStart, weekEnd, days };
}

