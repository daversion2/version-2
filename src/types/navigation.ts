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
    question_index: number;
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
// GOALS STACK (deprecated — aliased to ProgressStackParamList for compat)
// ============================================================================

export type GoalsStackParamList = ProgressStackParamList;

// ============================================================================
// PROGRESS STACK
// ============================================================================

export type ProgressStackParamList = {
  ProgressScreen: undefined;
  GoalsProgress: undefined;
  DayDetail: { date: string };
  ReflectionDetail: undefined;
  ReflectionEntry: { reflection: DailyReflection };
  ChallengeDetail: { challengeId: string };
  GoalDashboard: { goalId: string };
  EditGoal: { goalId: string };
  GoalCreationFlow: { draftId?: string } | undefined;
  SubmitChallenge: { challengeId: string };
  CompleteChallenge: { challenge: Challenge };
  ExtendedChallengeProgress: { challenge: Challenge };
  HabitDetail: { habitId: string };
  ProgramDashboard: { enrollmentId: string };
  CreateChallenge: { forDate?: string } | undefined;
  ManageHabits: undefined;
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
  // Your Story (Proof Points)
  YourStoryLanding: undefined;
  AddProofPoint: undefined;
  ProofPointLibrary: undefined;
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
  AdminRules: undefined;
  AdminRuleEdit: { mode: 'create' | 'edit'; ruleId?: string };
  AdminOnboarding: undefined;
};

// ============================================================================
// HELPER TYPES — use these as screen Props types
// ============================================================================

// Home Stack
export type HomeScreenProps<T extends keyof HomeStackParamList> =
  NativeStackScreenProps<HomeStackParamList, T>;

// Goals Stack (deprecated — aliased to Progress)
export type GoalsScreenProps<T extends keyof ProgressStackParamList> =
  NativeStackScreenProps<ProgressStackParamList, T>;

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
export type GoalsNavigation = NativeStackNavigationProp<ProgressStackParamList>;
export type ProgressNavigation = NativeStackNavigationProp<ProgressStackParamList>;
export type WorksheetsNavigation = NativeStackNavigationProp<WorksheetsStackParamList>;
export type SettingsNavigation = NativeStackNavigationProp<SettingsStackParamList>;
export type AdminNavigation = NativeStackNavigationProp<AdminStackParamList>;
