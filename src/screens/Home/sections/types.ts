import { RefObject } from 'react';
import { View } from 'react-native';
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
}

export interface HomeCallbacks {
  onNavigate: (screen: string, params?: any) => void;
  onHabitTap: (habit: Nudge) => void;
  onMicroGoalComplete: (id: string) => void;
  onMicroGoalDelete: (id: string) => void;
  onMicroGoalAdd: (description: string, deadline: string) => Promise<void>;
  onMicroGoalPressMore: () => void;
  getCatColor: (catName: string) => string;
}

export interface HomeRefs {
  challengeBtnRef: RefObject<View | null>;
  habitsAddRef: RefObject<View | null>;
  habitAreaRef: RefObject<View | null>;
}

export interface HomeSectionProps {
  data: HomeData;
  callbacks: HomeCallbacks;
  refs?: HomeRefs;
}
