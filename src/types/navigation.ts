import { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps, NativeStackNavigationProp } from '@react-navigation/native-stack';
import type {
  Challenge,
  HabitActionPlan,
  HabitReminder,
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
  Challenges: NavigatorScreenParams<ChallengesStackParamList>;
  Progress: NavigatorScreenParams<ProgressStackParamList>;
  Tools: NavigatorScreenParams<WorksheetsStackParamList>;
  Settings: NavigatorScreenParams<SettingsStackParamList>;
  Admin: NavigatorScreenParams<AdminStackParamList>;
};

// The Challenges tab reuses the challenge-flow screens (they also stay in the
// Home stack for goal/planner entry points). Param shapes are picked from
// HomeStackParamList so the shared screen components stay type-compatible.
export type ChallengesStackParamList = Pick<
  HomeStackParamList,
  | 'CreateChallenge'
  | 'PastChallenges'
  | 'ChallengeLibrary'
  | 'ActionChallenges'
  | 'CompleteChallenge'
  | 'EditChallenge'
  | 'ExtendedChallengeProgress'
  | 'ChallengeDetail'
  | 'GoalCreationFlow'
> & {
  ChallengesHome: undefined;
};

// ============================================================================
// PRACTICE SESSION
// ============================================================================

/**
 * Params for the forward practice-session flow. Shared so the flow can be hosted
 * from any stack that launches it (Home) — `goBack` returns to where it started.
 */
export type PracticeSessionParams = {
  practiceId: string; // catalog id — drives the Ready brief, flow, tracking
  habitId: string; // adopted instance id to log the completion against
  habitName: string;
};

// ============================================================================
// HOME STACK
// ============================================================================

export type HomeStackParamList = {
  HomeScreen: undefined;
  // Forward practice-session flow, also hosted here so taps from the Home list
  // run the new flow and return to Home (not the Practices tab) when done.
  PracticeSession: PracticeSessionParams;
  // One-time post-first-practice Debrief (recovery science, pleasure trap,
  // research) — triggered from the session flow or the home fallback card
  Debrief: undefined;
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
  ManageHabits: { openAddForm?: boolean } | undefined;
  // Curated practices open by catalog `practiceId`; user-authored (custom)
  // practices open by their instance `habitId`. (Was in the retired Practices tab.)
  // `readOnly` hides adopt/status CTAs — used when opened mid-session as "Learn more".
  PracticeDetail: { practiceId: string; readOnly?: boolean } | { habitId: string; readOnly?: boolean };
  HabitDetail: { habitId: string };
  HabitActionPlan: {
    habitId: string;
    prefilled?: HabitActionPlan;
    afterSaveRoute?: string;
    supportsPairing?: boolean;
    reminder?: HabitReminder;
  };
  HabitLibrary: undefined;
  TraditionalHabits: undefined;
  HabitLibraryDetail: { habitId: string };
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
  JourneyCheckin: undefined;
  CustomizeHome: undefined;
  GoalCreationFlow: { draftId?: string } | undefined;
  GoalDashboard: { goalId: string };
  EditGoal: { goalId: string };
  MantraScreen: undefined;
  WhyScreen: undefined;
  WhyDiscoveryFlow: undefined;
  DeferredOnboarding: undefined;
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
  CompleteChallenge: { challenge: Challenge };
  ExtendedChallengeProgress: { challenge: Challenge };
  HabitDetail: { habitId: string };
  ProgramDashboard: { enrollmentId: string };
  CreateChallenge: { forDate?: string } | undefined;
  ManageHabits: { openAddForm?: boolean } | undefined;
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
  AdminFunFacts: undefined;
  AdminFunFactEdit: { mode: 'create' | 'edit'; funFactId?: string };
  AdminTidbits: undefined;
  AdminTidbitEdit: { mode: 'create' | 'edit'; tidbitId?: string };
  AdminRules: undefined;
  AdminRuleEdit: { mode: 'create' | 'edit'; ruleId?: string };
  AdminOnboarding: undefined;
  AdminTools: undefined;
  AdminToolEdit: { mode: 'create' | 'edit'; toolId?: string };
  AdminCategories: undefined;
  AdminMicroExercises: undefined;
  AdminMicroExerciseEdit: { mode: 'create' | 'edit'; feelingKey?: string };
  AdminPractices: undefined;
  AdminPracticeEdit: { mode: 'create' | 'edit'; practiceId?: string };
};

// ============================================================================
// HELPER TYPES — use these as screen Props types
// ============================================================================

// Home Stack
export type HomeScreenProps<T extends keyof HomeStackParamList> =
  NativeStackScreenProps<HomeStackParamList, T>;

// Challenges Stack
export type ChallengesScreenProps<T extends keyof ChallengesStackParamList> =
  NativeStackScreenProps<ChallengesStackParamList, T>;

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
export type ProgressNavigation = NativeStackNavigationProp<ProgressStackParamList>;
export type WorksheetsNavigation = NativeStackNavigationProp<WorksheetsStackParamList>;
export type SettingsNavigation = NativeStackNavigationProp<SettingsStackParamList>;
export type AdminNavigation = NativeStackNavigationProp<AdminStackParamList>;
