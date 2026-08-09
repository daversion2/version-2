import {
  Challenge,
  PracticeInstance,
  HabitStreakInfo,
  ReflectionGrade,
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
  showReflectionBanner: boolean;
  reflectedToday: boolean;
  todaysGrade: ReflectionGrade | undefined;
  willpowerStats: WillpowerStatsData | null;
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
  /** Start a practice — briefing → session → capture. */
  onHabitTap: (habit: PracticeInstance) => void;
  /** "I already did it" — straight to the compact log, no briefing or session. */
  onHabitLogIt: (habit: PracticeInstance) => void;
  /** Open the pre-practice briefing on its own, without starting the flow. */
  onHabitBriefing: (habit: PracticeInstance) => void;
  /** Persist a practice's weekly commitment (target_count_per_week). */
  onSetWeeklyGoal?: (habitId: string, target: number) => void;
}

export interface HomeSectionProps {
  data: HomeData;
  callbacks: HomeCallbacks;
}
