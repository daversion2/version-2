import {
  Challenge,
  Nudge,
  Category,
  Team,
  TeamMemberActivitySummary,
  BuddyChallenge,
  ProgramEnrollment,
  ProgramDay,
  MicroGoal,
  HabitStreakInfo,
  FunFact,
  ReflectionGrade,
  Goal,
  GoalFollowThrough,
  PlannedItem,
  TomorrowChallenge,
  TomorrowPlan,
} from '../../../types';

export interface WillpowerStatsData {
  totalPoints: number;
  currentStreak: number;
  multiplier: number;
  level: number;
  title: string;
  progressToNextLevel: number;
  pointsToNextLevel: number | null;
}

export interface HomeData {
  activeChallenges: Challenge[];
  extendedChallenges: Challenge[];
  habits: Nudge[];
  categories: Category[];
  team: Team | null;
  teamSummary: TeamMemberActivitySummary[];
  weeklyCounts: Record<string, number>;
  habitStreaks: Record<string, HabitStreakInfo>;
  funFact: FunFact | null;
  pendingInvites: number;
  buddyChallenges: BuddyChallenge[];
  activeProgram: ProgramEnrollment | null;
  todaysProgramDay: ProgramDay | null;
  programDayNumber: number;
  programCheckedIn: boolean;
  microGoals: MicroGoal[];
  goals: Goal[];
  showReflectionBanner: boolean;
  reflectedToday: boolean;
  todaysGrade: ReflectionGrade | undefined;
  willpowerStats: WillpowerStatsData | null;
  goalFollowThrough: Record<string, GoalFollowThrough>;
  // Challenge unlock
  totalHabitsCompleted: number;
  // Why Discovery
  whyStatement: string | null;
  hasCompletedWhyDiscovery: boolean;
  // Plan Tomorrow
  plannedHabitIds: string[];
  // Weekly plans for planner context (future dates -> TomorrowPlan)
  weeklyPlans: Record<string, TomorrowPlan>;
}

export interface HomeCallbacks {
  onNavigate: (screen: string, params?: any) => void;
  onHabitTap: (habit: Nudge) => void;
  onMicroGoalComplete: (id: string) => void;
  onMicroGoalDelete: (id: string) => void;
  onMicroGoalAdd: (description: string, deadline: string) => Promise<void>;
  onMicroGoalPressMore: () => void;
  getCatColor: (catName: string) => string;
  onGoalTap?: (goalId: string) => void;
  onCalendarExport?: (item: PlannedItem) => void;
  onPlannedItemPress?: (item: PlannedItem) => void;
  onAddTodayChallenge?: (challenge: TomorrowChallenge) => Promise<void>;
  onToggleTodayHabit?: (habitId: string) => void;
}

export interface HomeSectionProps {
  data: HomeData;
  callbacks: HomeCallbacks;
}
