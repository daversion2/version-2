import { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps, NativeStackNavigationProp } from '@react-navigation/native-stack';
import type {
  Challenge,
  HabitActionPlan,
  ActionType,
  TimeCategory,
  DailyReflection,
} from './index';
import type {
  MicroExerciseSessionState,
  MicroExerciseDefinition,
} from './microExercise';
import type { MicroExerciseTrigger } from './worksheets';

// ============================================================================
// ROOT STACK
// ============================================================================

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Onboarding: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
};

// ============================================================================
// AUTH STACK
// ============================================================================

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

// ============================================================================
// MAIN TABS
// ============================================================================

export type MainTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList>;
  Goals: NavigatorScreenParams<GoalsStackParamList>;
  Progress: NavigatorScreenParams<ProgressStackParamList>;
  Tools: NavigatorScreenParams<WorksheetsStackParamList>;
  Settings: NavigatorScreenParams<SettingsStackParamList>;
  Admin: NavigatorScreenParams<AdminStackParamList>;
};

// ============================================================================
// HOME STACK
// ============================================================================

export type HomeStackParamList = {
  HomeScreen: undefined;
  StartChallenge: { forDate?: string } | undefined;
  CreateChallenge: { forDate?: string } | undefined;
  PastChallenges: { forDate?: string } | undefined;
  ChallengeLibrary: { forDate?: string } | undefined;
  ActionChallenges: {
    actionType: ActionType;
    initialTimeCategory?: TimeCategory;
    initialLifeDomain?: string;
  };
  CompleteChallenge: { challenge: Challenge };
  EditChallenge: { challenge: Challenge };
  ExtendedChallengeProgress: { challenge: Challenge };
  ChallengeDetail: { challengeId: string };
  ManageHabits: undefined;
  HabitDetail: { habitId: string };
  HabitActionPlan: {
    habitId: string;
    prefilled?: HabitActionPlan;
    afterSaveRoute?: string;
  };
  HabitLibrary: undefined;
  HabitLibraryDetail: { habitId: string };
  SubmitChallenge: { challengeId: string };
  WriteReview: {
    libraryChallengeId: string;
    challengeName: string;
    completionId: string;
  };
  BuddyPickPartner: { challengeData: Partial<Challenge> };
  BuddyInvites: undefined;
  ProgramDiscovery: undefined;
  ProgramDetail: { programId: string };
  ProgramDashboard: { enrollmentId: string };
  ProgramCompletion: {
    enrollmentId: string;
    totalPoints: number;
    bonusPoints: number;
  };
  ProgramFailed: { enrollmentId: string };
  NightlyReflection: undefined;
  CustomizeHome: undefined;
  GoalCreationFlow: { draftId?: string } | undefined;
  GoalDashboard: { goalId: string };
  EditGoal: { goalId: string };
  MantraScreen: undefined;
  WhyScreen: undefined;
  WhyDiscoveryFlow: undefined;
  DeferredOnboarding: undefined;
  WeeklyPlanner: undefined;
  MicroExerciseFeeling: { trigger_context: MicroExerciseTrigger };
  MicroExerciseQuestion: {
    session: MicroExerciseSessionState;
    question_index: 0 | 1 | 2;
    exercise: MicroExerciseDefinition;
  };
  MicroExerciseCommitment: {
    session: MicroExerciseSessionState;
    exercise: MicroExerciseDefinition;
  };
  MicroExerciseComplete: {
    session: MicroExerciseSessionState;
    exercise: MicroExerciseDefinition;
    pointsAwarded: number;
  };
  MicroExerciseFollowUp: { entry_id: string; user_id: string };
};

// ============================================================================
// GOALS STACK
// ============================================================================

export type GoalsStackParamList = {
  GoalsScreen: { highlightGoalId?: string } | undefined;
  OverallProgress: undefined;
  GoalDashboard: { goalId: string };
  EditGoal: { goalId: string };
  GoalCreationFlow: { draftId?: string } | undefined;
  ChallengeDetail: { challengeId: string };
  DayDetail: { date: string };
  ReflectionDetail: undefined;
  ReflectionEntry: { reflection: DailyReflection };
  SubmitChallenge: { challengeId: string };
  CompleteChallenge: { challenge: Challenge };
  ExtendedChallengeProgress: { challenge: Challenge };
  HabitDetail: { habitId: string };
  ProgramDashboard: { enrollmentId: string };
  CreateChallenge: { forDate?: string } | undefined;
  ManageHabits: undefined;
};

// ============================================================================
// PROGRESS STACK
// ============================================================================

export type ProgressStackParamList = {
  ProgressScreen: undefined;
  DayDetail: { date: string };
  ReflectionDetail: undefined;
  ReflectionEntry: { reflection: DailyReflection };
  ChallengeDetail: { challengeId: string };
  GoalDashboard: { goalId: string };
};

// ============================================================================
// WORKSHEETS / TOOLS STACK
// ============================================================================

export type WorksheetsStackParamList = {
  WorksheetLibraryScreen: undefined;
  WorksheetForm: {
    templateId: string;
    entryId?: string;
    resumeDraft?: boolean;
  };
  WorksheetHistory: undefined;
  WorksheetDetail: { entryId: string };
};

// ============================================================================
// SETTINGS STACK
// ============================================================================

export type SettingsStackParamList = {
  SettingsScreen: undefined;
  ManageRewardMessages: undefined;
  HowItWorks: undefined;
  Team: undefined;
  CreateTeam: undefined;
  JoinTeam: undefined;
  TeamDetail: { teamId: string };
  MySubmissions: undefined;
  PrivacySettings: undefined;
  EditProfile: undefined;
  WhyScreen: undefined;
};

// ============================================================================
// ADMIN STACK
// ============================================================================

export type AdminStackParamList = {
  AdminDashboard: undefined;
  AdminChallenges: undefined;
  AdminChallengeEdit: { mode: 'create' | 'edit'; challengeId?: string };
  AdminSubmissions: undefined;
  AdminFunFacts: undefined;
  AdminFunFactEdit: { mode: 'create' | 'edit'; funFactId?: string };
  AdminTidbits: undefined;
  AdminTidbitEdit: { mode: 'create' | 'edit'; tidbitId?: string };
};

// ============================================================================
// HELPER TYPES — use these as screen Props types
// ============================================================================

// Home Stack
export type HomeScreenProps<T extends keyof HomeStackParamList> =
  NativeStackScreenProps<HomeStackParamList, T>;

// Goals Stack
export type GoalsScreenProps<T extends keyof GoalsStackParamList> =
  NativeStackScreenProps<GoalsStackParamList, T>;

// Progress Stack
export type ProgressScreenProps<T extends keyof ProgressStackParamList> =
  NativeStackScreenProps<ProgressStackParamList, T>;

// Worksheets Stack
export type WorksheetsScreenProps<T extends keyof WorksheetsStackParamList> =
  NativeStackScreenProps<WorksheetsStackParamList, T>;

// Settings Stack
export type SettingsScreenProps<T extends keyof SettingsStackParamList> =
  NativeStackScreenProps<SettingsStackParamList, T>;

// Admin Stack
export type AdminScreenProps<T extends keyof AdminStackParamList> =
  NativeStackScreenProps<AdminStackParamList, T>;

// Auth Stack
export type AuthScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;

// Navigation prop helpers (for useNavigation hook)
export type HomeNavigation = NativeStackNavigationProp<HomeStackParamList>;
export type GoalsNavigation = NativeStackNavigationProp<GoalsStackParamList>;
export type ProgressNavigation = NativeStackNavigationProp<ProgressStackParamList>;
export type WorksheetsNavigation = NativeStackNavigationProp<WorksheetsStackParamList>;
export type SettingsNavigation = NativeStackNavigationProp<SettingsStackParamList>;
export type AdminNavigation = NativeStackNavigationProp<AdminStackParamList>;
