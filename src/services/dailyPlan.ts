import {
  doc,
  setDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  PlannedItem,
  TomorrowPlan,
  TomorrowChallenge,
  Challenge,
  Nudge,
  ProgramEnrollment,
  ProgramDay,
} from '../types';
import { Colors } from '../constants/theme';
import { getCurrentDayNumber, createChallenge } from './challenges';

// ============================================================================
// TODAY'S PLAN — CLIENT-SIDE AGGREGATION
// ============================================================================

/**
 * Build the unified Today's Plan from already-loaded HomeData.
 * Pure function — no Firestore calls. All data comes from the
 * HomeScreen's existing Promise.all fetch.
 */
export function buildTodaysPlan(params: {
  activeChallenges: Challenge[];
  extendedChallenges: Challenge[];
  habits: Nudge[];
  weeklyCounts: Record<string, number>;
  activeProgram: ProgramEnrollment | null;
  todaysProgramDay: ProgramDay | null;
  programDayNumber: number;
  programCheckedIn: boolean;
  getCatColor: (catName: string) => string;
  plannedHabitIds?: string[];
}): PlannedItem[] {
  const items: PlannedItem[] = [];

  // 1. Daily challenges
  for (const ch of params.activeChallenges) {
    items.push({
      id: ch.id,
      type: 'daily_challenge',
      title: ch.name,
      subtitle: ch.description ? ch.description.slice(0, 60) : undefined,
      status: 'pending',
      icon: 'trophy-outline',
      iconColor: Colors.secondary,
      deadline: ch.deadline || undefined,
      sortKey: ch.deadline
        ? deadlineToSortKey(ch.deadline.slice(11, 16), false)
        : 500,
      calendarTitle: ch.name,
      calendarNotes: ch.success_criteria,
      calendarStartDate: ch.deadline ? new Date(ch.deadline) : undefined,
      calendarEndDate: ch.deadline
        ? addMinutes(new Date(ch.deadline), 30)
        : undefined,
      sourceData: { challenge: ch },
    });
  }

  // 2. Extended challenge milestones (today's check-in)
  for (const ec of params.extendedChallenges) {
    if (!ec.milestones || !ec.start_date) continue;
    const dayNum = getCurrentDayNumber(ec.start_date);
    const todayMilestone = ec.milestones.find((m) => m.day_number === dayNum);
    const isCheckedIn = todayMilestone?.completed ?? false;
    items.push({
      id: ec.id,
      type: 'extended_milestone',
      title: ec.name,
      subtitle: `Day ${dayNum} of ${ec.duration_days}`,
      status: isCheckedIn ? 'completed' : 'pending',
      icon: isCheckedIn ? 'checkmark-circle' : 'trending-up-outline',
      iconColor: Colors.primary,
      sortKey: isCheckedIn ? 900 : 400,
      calendarTitle: `${ec.name} — Day ${dayNum}`,
      sourceData: { challenge: ec },
    });
  }

  // 3. Habits — show planned habits + those needing attention (behind pace)
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const daysPassedThisWeek = dayOfWeek === 0 ? 7 : dayOfWeek; // Mon=1 start
  const daysRemaining = 7 - daysPassedThisWeek;
  const plannedSet = new Set(params.plannedHabitIds || []);

  for (const habit of params.habits) {
    const doneThisWeek = params.weeklyCounts[habit.id] || 0;
    const target = habit.target_count_per_week;
    const remaining = target - doneThisWeek;
    const isPlanned = plannedSet.has(habit.id);

    // Show if planned, or if behind pace and still needs completions
    if (remaining <= 0 && !isPlanned) continue;
    const isUrgent = remaining > 0 && remaining > daysRemaining;

    let subtitle = `${doneThisWeek}/${target} this week`;
    if (isPlanned && remaining <= 0) subtitle = 'Planned';
    else if (isPlanned) subtitle = `Planned · ${doneThisWeek}/${target} this week`;

    items.push({
      id: habit.id,
      type: 'habit',
      title: habit.name,
      subtitle,
      status: 'pending',
      icon: 'repeat-outline',
      iconColor: params.getCatColor(habit.category_id),
      sortKey: isPlanned ? 250 : isUrgent ? 300 : 600,
      calendarTitle: habit.name,
      sourceData: { habit },
    });
  }

  // 4. Program check-in
  if (params.activeProgram && params.todaysProgramDay) {
    items.push({
      id: params.activeProgram.id,
      type: 'program_checkin',
      title: params.activeProgram.program_name,
      subtitle: `Day ${params.programDayNumber}: ${params.todaysProgramDay.challenge_name}`,
      status: params.programCheckedIn ? 'completed' : 'pending',
      icon: params.programCheckedIn ? 'checkmark-circle' : 'rocket-outline',
      iconColor: Colors.primary,
      sortKey: params.programCheckedIn ? 950 : 200,
      calendarTitle: `${params.activeProgram.program_name} — Day ${params.programDayNumber}`,
      calendarNotes: params.todaysProgramDay.challenge_description,
      sourceData: {
        program: params.activeProgram,
        programDay: params.todaysProgramDay,
      },
    });
  }

  // Sort: completed items sink to bottom; pending sorted by sortKey
  return items.sort((a, b) => {
    if (a.status === 'completed' && b.status !== 'completed') return 1;
    if (a.status !== 'completed' && b.status === 'completed') return -1;
    return a.sortKey - b.sortKey;
  });
}

// ============================================================================
// TOMORROW PLAN — CRUD
// ============================================================================

/**
 * Save a tomorrow plan. Uses the target date as document ID.
 */
export async function saveTomorrowPlan(
  userId: string,
  plan: Omit<TomorrowPlan, 'id'>
): Promise<void> {
  const docRef = doc(db, 'users', userId, 'tomorrowPlans', plan.date);
  const cleanData = Object.fromEntries(
    Object.entries(plan).filter(([_, v]) => v !== undefined)
  );
  await setDoc(docRef, cleanData);
}

/**
 * Get tomorrow plan for a specific date.
 */
export async function getTomorrowPlan(
  userId: string,
  date: string
): Promise<TomorrowPlan | null> {
  const docRef = doc(db, 'users', userId, 'tomorrowPlans', date);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as TomorrowPlan;
}

/**
 * Convert tomorrow's planned challenges into real Challenge documents.
 * Called once when the day arrives (on HomeScreen load).
 * Idempotent — checks `converted` flag on each planned item.
 */
export async function convertPlannedChallengesToChallenges(
  userId: string,
  todayStr: string
): Promise<number> {
  const plan = await getTomorrowPlan(userId, todayStr);
  if (!plan || !plan.planned_challenges || plan.planned_challenges.length === 0) return 0;

  let convertedCount = 0;
  const updated = [...plan.planned_challenges];

  for (let i = 0; i < updated.length; i++) {
    if (updated[i].converted) continue;
    try {
      await createChallenge(userId, {
        name: updated[i].name,
        category_id: updated[i].category_id,
        date: todayStr,
        difficulty_expected: updated[i].difficulty_expected,
        description: updated[i].description,
      });
      updated[i] = { ...updated[i], converted: true };
      convertedCount++;
    } catch (err) {
      console.warn('Could not convert planned challenge:', err);
      break;
    }
  }

  // Update the plan to mark converted items
  if (convertedCount > 0) {
    const docRef = doc(db, 'users', userId, 'tomorrowPlans', todayStr);
    await setDoc(docRef, { planned_challenges: updated }, { merge: true });
  }

  return convertedCount;
}

/**
 * Generate habit suggestions for tomorrow planning.
 * Returns habits that still need completions this week and are behind pace.
 */
export function suggestHabitsForTomorrow(
  habits: Nudge[],
  weeklyCounts: Record<string, number>
): Nudge[] {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysPassedThisWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
  const daysRemaining = 7 - daysPassedThisWeek;

  return habits.filter((habit) => {
    const done = weeklyCounts[habit.id] || 0;
    const remaining = habit.target_count_per_week - done;
    // Suggest habits that still need attention this week
    return remaining > 0 && remaining >= daysRemaining;
  });
}

// ============================================================================
// HELPERS
// ============================================================================

function deadlineToSortKey(hhmm: string, isCompleted: boolean): number {
  if (isCompleted) return 1000;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function addMinutes(date: Date, mins: number): Date {
  return new Date(date.getTime() + mins * 60000);
}
