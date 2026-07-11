import {
  Challenge,
  PracticeInstance,
  ProgramEnrollment,
  ProgramDay,
  HabitStreakInfo,
  ReflectionGrade,
  Goal,
  GoalFollowThrough,
} from '../../../types';

export interface WillpowerStatsData {
  totalPoints: number;
  currentStreak: number;
  multiplier: number;
}

export interface HomeData {
  activeChallenges: Challenge[];
  extendedChallenges: Challenge[];
  habits: PracticeInstance[];
  weeklyCounts: Record<string, number>;
  habitStreaks: Record<string, HabitStreakInfo>;
  activeProgram: ProgramEnrollment | null;
  todaysProgramDay: ProgramDay | null;
  programDayNumber: number;
  programCheckedIn: boolean;
  goals: Goal[];
  showReflectionBanner: boolean;
  reflectedToday: boolean;
  todaysGrade: ReflectionGrade | undefined;
  willpowerStats: WillpowerStatsData | null;
  goalFollowThrough: Record<string, GoalFollowThrough>;
  // Challenge unlock
  totalHabitsCompleted: number;
  // Mantra
  activeMantra: string | null;
  // Why Discovery
  whyStatement: string | null;
  hasCompletedWhyDiscovery: boolean;
  // Habit ids completed today (powers the hero counter + card "Done today" state)
  completedTodayIds: string[];
  // Practice catalog id picked as the starting point during onboarding
  startingPracticeId: string | null;
  // Display name for the hero greeting (null if none set)
  userName: string | null;
}

export interface HomeCallbacks {
  onNavigate: (screen: string, params?: any) => void;
  onHabitTap: (habit: PracticeInstance) => void;
  getItemColor: (goalIds?: string[]) => string;
  onGoalTap?: (goalId: string) => void;
  /** Persist a practice's weekly commitment (target_count_per_week). */
  onSetWeeklyGoal?: (habitId: string, target: number) => void;
}

export interface HomeSectionProps {
  data: HomeData;
  callbacks: HomeCallbacks;
}
