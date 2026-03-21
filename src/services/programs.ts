import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  setDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import { updateWillpowerStats, getStreakMultiplier } from './willpower';
import { createHabit } from './habits';
import { getCurrentDayNumber } from './challenges';
import { createProgramCompletionFeedEntry } from './inspirationFeed';
import {
  ProgramTemplate,
  ProgramEnrollment,
  ProgramMilestone,
  ProgramBadge,
  ProgramMode,
  ProgramDay,
} from '../types';

// ============================================================================
// COLLECTION REFERENCES
// ============================================================================

const programsRef = () => collection(db, 'programs');

const enrollmentsRef = (userId: string) =>
  collection(db, 'users', userId, 'programEnrollments');

const badgesRef = (userId: string) =>
  collection(db, 'users', userId, 'programBadges');

const logsRef = (userId: string) =>
  collection(db, 'users', userId, 'completionLogs');

// ============================================================================
// PROGRAM TEMPLATE FUNCTIONS
// ============================================================================

/** Fetch all available program templates, ordered by display order. */
export const getAllPrograms = async (): Promise<ProgramTemplate[]> => {
  const q = query(programsRef(), orderBy('order', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as ProgramTemplate));
};

/** Fetch a single program template by ID. */
export const getProgramById = async (
  programId: string
): Promise<ProgramTemplate | null> => {
  const ref = doc(db, 'programs', programId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as ProgramTemplate;
};

// ============================================================================
// ENROLLMENT FUNCTIONS
// ============================================================================

/** Generate milestones for a program enrollment. */
export function generateProgramMilestones(durationDays: number): ProgramMilestone[] {
  return Array.from({ length: durationDays }, (_, i) => ({
    id: `day-${i + 1}`,
    day_number: i + 1,
    completed: false,
  }));
}

/** Calculate end date from start date and duration. */
function calculateEndDate(startDate: string, durationDays: number): string {
  const [year, month, day] = startDate.split('-').map(Number);
  const start = new Date(year, month - 1, day);
  start.setDate(start.getDate() + durationDays - 1);
  const y = start.getFullYear();
  const m = String(start.getMonth() + 1).padStart(2, '0');
  const d = String(start.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Get today's date as YYYY-MM-DD in local timezone. */
function getTodayLocal(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Enroll a user in a program.
 * Enforces one active program at a time.
 * Returns the enrollment ID.
 */
export const enrollInProgram = async (
  userId: string,
  programId: string,
  mode: ProgramMode
): Promise<string> => {
  // Check no active enrollment exists
  const existing = await getActiveEnrollment(userId);
  if (existing) {
    throw new Error('You already have an active program. Complete or abandon it first.');
  }

  // Fetch program template
  const program = await getProgramById(programId);
  if (!program) throw new Error('Program not found.');

  const startDate = getTodayLocal();
  const endDate = calculateEndDate(startDate, program.duration_days);
  const milestones = generateProgramMilestones(program.duration_days);

  const enrollment: Omit<ProgramEnrollment, 'id'> = {
    user_id: userId,
    program_id: programId,
    program_name: program.name,
    mode,
    status: 'active',
    start_date: startDate,
    end_date: endDate,
    duration_days: program.duration_days,
    milestones,
    grace_days_allowed: program.grace_days,
    grace_days_used: 0,
    missed_days: [],
    total_points_earned: 0,
    created_at: new Date().toISOString(),
  };

  const docRef = await addDoc(enrollmentsRef(userId), enrollment);

  // Set active_program_id on user document for fast home screen check
  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, { active_program_id: docRef.id }, { merge: true });

  return docRef.id;
};

/** Get the user's active program enrollment (at most one). */
export const getActiveEnrollment = async (
  userId: string
): Promise<ProgramEnrollment | null> => {
  const q = query(
    enrollmentsRef(userId),
    where('status', '==', 'active'),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as ProgramEnrollment;
};

/** Get all past (non-active) enrollments. */
export const getPastEnrollments = async (
  userId: string
): Promise<ProgramEnrollment[]> => {
  const q = query(
    enrollmentsRef(userId),
    where('status', 'in', ['completed', 'failed', 'abandoned']),
    orderBy('created_at', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as ProgramEnrollment));
};

/** Get a specific enrollment by ID. */
export const getEnrollmentById = async (
  userId: string,
  enrollmentId: string
): Promise<ProgramEnrollment | null> => {
  const ref = doc(db, 'users', userId, 'programEnrollments', enrollmentId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as ProgramEnrollment;
};

// ============================================================================
// DAILY CONTENT
// ============================================================================

/**
 * Get today's program content (challenge + educational blurb).
 * Returns null if the program is over or not found.
 */
export const getTodaysProgramContent = async (
  userId: string,
  enrollmentId: string
): Promise<{
  dayNumber: number;
  programDay: ProgramDay;
  isCheckedIn: boolean;
  isGraceDay: boolean;
} | null> => {
  const enrollment = await getEnrollmentById(userId, enrollmentId);
  if (!enrollment || enrollment.status !== 'active') return null;

  const dayNumber = getCurrentDayNumber(enrollment.start_date);
  if (dayNumber > enrollment.duration_days) return null;

  // Fetch the program template to get content
  const program = await getProgramById(enrollment.program_id);
  if (!program) return null;

  const days = enrollment.mode === 'cold_turkey'
    ? program.cold_turkey_days
    : program.gradual_build_days;

  const programDay = days.find(d => d.day_number === dayNumber);
  if (!programDay) return null;

  const milestone = enrollment.milestones.find(m => m.day_number === dayNumber);
  const isCheckedIn = milestone?.completed ?? false;
  const isGraceDay = milestone?.is_grace_day ?? false;

  return { dayNumber, programDay, isCheckedIn, isGraceDay };
};

/** Mark educational content as viewed for a specific day. */
export const markEducationalContentViewed = async (
  userId: string,
  enrollmentId: string,
  dayNumber: number
): Promise<void> => {
  const enrollment = await getEnrollmentById(userId, enrollmentId);
  if (!enrollment) throw new Error('Enrollment not found');

  const updatedMilestones = enrollment.milestones.map(m => {
    if (m.day_number === dayNumber) {
      return { ...m, educational_content_viewed: true };
    }
    return m;
  });

  const ref = doc(db, 'users', userId, 'programEnrollments', enrollmentId);
  await updateDoc(ref, { milestones: updatedMilestones });
};

// ============================================================================
// DAILY CHECK-IN
// ============================================================================

/**
 * Check in for a program day.
 * If succeeded: awards points via willpower system.
 * If not succeeded: uses a grace day if available, otherwise fails program.
 * Returns check-in result.
 */
export const completeProgramDay = async (
  userId: string,
  enrollmentId: string,
  dayNumber: number,
  succeeded: boolean,
  points: number,
  note?: string
): Promise<{
  graceDayUsed: boolean;
  programFailed: boolean;
  programCompleted: boolean;
  pointsAwarded: number;
  willpowerResult?: Awaited<ReturnType<typeof updateWillpowerStats>>;
}> => {
  const enrollment = await getEnrollmentById(userId, enrollmentId);
  if (!enrollment) throw new Error('Enrollment not found');
  if (enrollment.status !== 'active') throw new Error('Program is not active');

  const ref = doc(db, 'users', userId, 'programEnrollments', enrollmentId);
  let graceDayUsed = false;
  let programFailed = false;
  let pointsAwarded = 0;

  // Update the milestone
  const updatedMilestones = enrollment.milestones.map(m => {
    if (m.day_number === dayNumber) {
      const updated: ProgramMilestone = {
        ...m,
        completed: true,
        completed_at: new Date().toISOString(),
        succeeded,
        points_awarded: succeeded ? points : 0,
      };
      if (note) updated.note = note;
      if (!succeeded) updated.is_grace_day = true;
      return updated;
    }
    return m;
  });

  let newGraceDaysUsed = enrollment.grace_days_used;
  const newMissedDays = [...enrollment.missed_days];
  let newTotalPoints = enrollment.total_points_earned;

  if (succeeded) {
    pointsAwarded = points;
    newTotalPoints += points;
  } else {
    // Count as grace day
    newGraceDaysUsed += 1;
    newMissedDays.push(dayNumber);

    if (newGraceDaysUsed > enrollment.grace_days_allowed) {
      programFailed = true;
    } else {
      graceDayUsed = true;
    }
  }

  // Check if all milestones are now complete
  const allComplete = updatedMilestones.every(m => m.completed);

  // Update enrollment
  const updates: Record<string, unknown> = {
    milestones: updatedMilestones,
    grace_days_used: newGraceDaysUsed,
    missed_days: newMissedDays,
    total_points_earned: newTotalPoints,
  };

  if (programFailed) {
    updates.status = 'failed';
    updates.completed_at = new Date().toISOString();
  }

  await updateDoc(ref, updates);

  // Award willpower points if succeeded
  let willpowerResult;
  if (succeeded && pointsAwarded > 0) {
    willpowerResult = await updateWillpowerStats(userId, pointsAwarded);

    // Create completion log entry for streak tracking
    await addDoc(logsRef(userId), {
      user_id: userId,
      type: 'program',
      reference_id: enrollmentId,
      points: pointsAwarded,
      difficulty: points,
      date: getTodayLocal(),
      completed_at: new Date().toISOString(),
    });
  }

  // If program failed, clear active_program_id
  if (programFailed) {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, { active_program_id: null }, { merge: true });
  }

  return {
    graceDayUsed,
    programFailed,
    programCompleted: allComplete && !programFailed,
    pointsAwarded,
    willpowerResult,
  };
};

// ============================================================================
// GRACE DAY & MISSED DAY PROCESSING
// ============================================================================

/**
 * Check for missed days and apply grace days or fail the program.
 * Called on every home screen load to catch days missed while app was closed.
 */
export const checkAndProcessMissedDays = async (
  userId: string,
  enrollmentId: string
): Promise<{
  newGraceDaysUsed: number;
  programFailed: boolean;
  missedDayNumbers: number[];
}> => {
  const enrollment = await getEnrollmentById(userId, enrollmentId);
  if (!enrollment || enrollment.status !== 'active') {
    return { newGraceDaysUsed: 0, programFailed: false, missedDayNumbers: [] };
  }

  const currentDay = getCurrentDayNumber(enrollment.start_date);
  const ref = doc(db, 'users', userId, 'programEnrollments', enrollmentId);

  let graceDaysUsed = enrollment.grace_days_used;
  const missedDays = [...enrollment.missed_days];
  const newlyMissedDays: number[] = [];
  let programFailed = false;

  const updatedMilestones = [...enrollment.milestones];

  // Check all days before today for uncompleted milestones
  for (let day = 1; day < currentDay && day <= enrollment.duration_days; day++) {
    const milestone = updatedMilestones.find(m => m.day_number === day);
    if (milestone && !milestone.completed) {
      // This day was missed
      if (graceDaysUsed < enrollment.grace_days_allowed) {
        // Apply grace day
        const idx = updatedMilestones.findIndex(m => m.day_number === day);
        updatedMilestones[idx] = {
          ...milestone,
          completed: true,
          completed_at: new Date().toISOString(),
          succeeded: false,
          is_grace_day: true,
          points_awarded: 0,
        };
        graceDaysUsed += 1;
        missedDays.push(day);
        newlyMissedDays.push(day);
      } else {
        // No grace days left — program fails
        programFailed = true;
        break;
      }
    }
  }

  // Only update if something changed
  if (newlyMissedDays.length > 0 || programFailed) {
    const updates: Record<string, unknown> = {
      milestones: updatedMilestones,
      grace_days_used: graceDaysUsed,
      missed_days: missedDays,
    };

    if (programFailed) {
      updates.status = 'failed';
      updates.completed_at = new Date().toISOString();
    }

    await updateDoc(ref, updates);

    // Clear active_program_id if failed
    if (programFailed) {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, { active_program_id: null }, { merge: true });
    }
  }

  return {
    newGraceDaysUsed: graceDaysUsed,
    programFailed,
    missedDayNumbers: newlyMissedDays,
  };
};

// ============================================================================
// PROGRAM COMPLETION
// ============================================================================

/**
 * Complete a program successfully.
 * Awards completion bonus, creates badge, clears active program.
 */
export const completeProgram = async (
  userId: string,
  enrollmentId: string
): Promise<{
  totalPoints: number;
  bonusPoints: number;
  badge: ProgramBadge;
  willpowerResult: Awaited<ReturnType<typeof updateWillpowerStats>>;
}> => {
  const enrollment = await getEnrollmentById(userId, enrollmentId);
  if (!enrollment) throw new Error('Enrollment not found');

  const program = await getProgramById(enrollment.program_id);
  if (!program) throw new Error('Program template not found');

  const bonusPoints = program.completion_bonus_points;
  const totalPoints = enrollment.total_points_earned + bonusPoints;
  const daysSucceeded = enrollment.milestones.filter(m => m.succeeded).length;

  // Update enrollment status
  const enrollmentRef = doc(db, 'users', userId, 'programEnrollments', enrollmentId);
  await updateDoc(enrollmentRef, {
    status: 'completed',
    completed_at: new Date().toISOString(),
    total_points_earned: totalPoints,
    completion_bonus_earned: bonusPoints,
  });

  // Award completion bonus via willpower system
  const willpowerResult = await updateWillpowerStats(userId, bonusPoints);

  // Create completion log
  await addDoc(logsRef(userId), {
    user_id: userId,
    type: 'program',
    reference_id: enrollmentId,
    points: bonusPoints,
    difficulty: 5, // Program completion is max difficulty
    date: getTodayLocal(),
    completed_at: new Date().toISOString(),
    notes: `Completed ${program.name} program`,
  });

  // Create badge
  const badge: Omit<ProgramBadge, 'id'> = {
    user_id: userId,
    program_id: enrollment.program_id,
    program_name: enrollment.program_name,
    enrollment_id: enrollmentId,
    badge_name: program.completion_badge_name,
    mode: enrollment.mode,
    duration_days: enrollment.duration_days,
    days_succeeded: daysSucceeded,
    total_points_earned: totalPoints,
    earned_at: new Date().toISOString(),
  };

  const badgeDocRef = await addDoc(badgesRef(userId), badge);

  // Clear active_program_id
  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, { active_program_id: null }, { merge: true });

  // Create feed entry for community inspiration
  const userSnap = await getDoc(userRef);
  const username = userSnap.exists() ? (userSnap.data() as { username?: string }).username : undefined;
  await createProgramCompletionFeedEntry(
    userId,
    username,
    program.name,
    program.duration_days,
    enrollment.mode,
  );

  return {
    totalPoints,
    bonusPoints,
    badge: { id: badgeDocRef.id, ...badge },
    willpowerResult,
  };
};

/** Fail a program (too many missed days). */
export const failProgram = async (
  userId: string,
  enrollmentId: string
): Promise<void> => {
  const ref = doc(db, 'users', userId, 'programEnrollments', enrollmentId);
  await updateDoc(ref, {
    status: 'failed',
    completed_at: new Date().toISOString(),
  });

  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, { active_program_id: null }, { merge: true });
};

/** Abandon a program voluntarily. */
export const abandonProgram = async (
  userId: string,
  enrollmentId: string
): Promise<void> => {
  const ref = doc(db, 'users', userId, 'programEnrollments', enrollmentId);
  await updateDoc(ref, {
    status: 'abandoned',
    completed_at: new Date().toISOString(),
  });

  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, { active_program_id: null }, { merge: true });
};

// ============================================================================
// HABIT CONVERSION
// ============================================================================

/**
 * Convert suggested program habits into real habits after program completion.
 * Uses existing createHabit() from habits service.
 * Returns array of created habit IDs.
 */
export const convertProgramToHabits = async (
  userId: string,
  enrollmentId: string,
  selectedHabits: { name: string; category: string; target_count_per_week: number }[]
): Promise<string[]> => {
  const habitIds: string[] = [];

  for (const habit of selectedHabits) {
    const habitId = await createHabit(userId, {
      name: habit.name,
      category_id: habit.category,
      target_count_per_week: habit.target_count_per_week,
    });
    habitIds.push(habitId);
  }

  // Track which habits were created from this program
  const ref = doc(db, 'users', userId, 'programEnrollments', enrollmentId);
  await updateDoc(ref, { habits_created_from_program: habitIds });

  return habitIds;
};

// ============================================================================
// BADGE FUNCTIONS
// ============================================================================

/** Get all earned program badges for a user. */
export const getProgramBadges = async (
  userId: string
): Promise<ProgramBadge[]> => {
  const snap = await getDocs(badgesRef(userId));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as ProgramBadge));
};
