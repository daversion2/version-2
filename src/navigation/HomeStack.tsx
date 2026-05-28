import React from 'react';
import { Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/Home/HomeScreen';
import { StartChallengeScreen } from '../screens/Home/StartChallengeScreen';
import { CreateChallengeScreen } from '../screens/Home/CreateChallengeScreen';
import { PastChallengesScreen } from '../screens/Home/PastChallengesScreen';
import { ChallengeLibraryScreen } from '../screens/Home/ChallengeLibraryScreen';
import { ActionChallengesScreen } from '../screens/Home/BarrierChallengesScreen';
import { CompleteChallengeScreen } from '../screens/Home/CompleteChallengeScreen';
import { ManageHabitsScreen } from '../screens/Home/ManageHabitsScreen';
import { HabitDetailScreen } from '../screens/Home/HabitDetailScreen';
import { HabitActionPlanScreen } from '../screens/Home/HabitActionPlanScreen';
import { HabitLibraryScreen } from '../screens/Home/HabitLibraryScreen';
import { HabitLibraryDetailScreen } from '../screens/Home/HabitLibraryDetailScreen';
import { SubmitChallengeScreen } from '../screens/Community/SubmitChallengeScreen';
import { WriteReviewScreen } from '../screens/Community/WriteReviewScreen';
import { ExtendedChallengeProgressScreen } from '../screens/Home/ExtendedChallengeProgressScreen';
import { EditChallengeScreen } from '../screens/Home/EditChallengeScreen';
import { BuddyPickPartnerScreen } from '../screens/Home/BuddyPickPartnerScreen';
import { BuddyInvitesScreen } from '../screens/Home/BuddyInvitesScreen';
import { ProgramDiscoveryScreen } from '../screens/Home/ProgramDiscoveryScreen';
import { ProgramDetailScreen } from '../screens/Home/ProgramDetailScreen';
import { ProgramDashboardScreen } from '../screens/Home/ProgramDashboardScreen';
import { ProgramCompletionScreen } from '../screens/Home/ProgramCompletionScreen';
import { ProgramFailedScreen } from '../screens/Home/ProgramFailedScreen';
import { NightlyReflectionScreen } from '../screens/Home/NightlyReflectionScreen';
import { CustomizeHomeScreen } from '../screens/Home/CustomizeHomeScreen';
import { CreateGoalScreen } from '../screens/Home/CreateGoalScreen';
import { GoalOnboardingFlow } from '../screens/Home/GoalOnboardingFlow';
import { GoalDashboardScreen } from '../screens/Home/GoalDashboardScreen';
import { EditGoalScreen } from '../screens/Home/EditGoalScreen';
import { MantraScreen } from '../screens/Home/MantraScreen';
import { WhyScreen } from '../screens/Home/WhyScreen';
import { WhyDiscoveryFlow } from '../screens/Home/WhyDiscoveryFlow';
import { DeferredOnboardingScreen } from '../screens/Auth/DeferredOnboardingScreen';
import { WeeklyPlannerScreen } from '../screens/Home/WeeklyPlannerScreen';
import { MicroExerciseFeelingScreen } from '../screens/MicroExercise/MicroExerciseFeelingScreen';
import { MicroExerciseQuestionScreen } from '../screens/MicroExercise/MicroExerciseQuestionScreen';
import { MicroExerciseCommitmentScreen } from '../screens/MicroExercise/MicroExerciseCommitmentScreen';
import { MicroExerciseCompleteScreen } from '../screens/MicroExercise/MicroExerciseCompleteScreen';
import { MicroExerciseFollowUpScreen } from '../screens/MicroExercise/MicroExerciseFollowUpScreen';
import { Colors, Fonts, FontSizes } from '../constants/theme';

const logo = require('../../assets/Neuro-Nudge_Logo_Blue.png');

const Stack = createNativeStackNavigator();

export const HomeStack: React.FC = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: '#FBFBFB' },
      headerTintColor: Colors.primary,
      headerTitleStyle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg },
      headerBackButtonDisplayMode: 'minimal',
      headerShadowVisible: false,
      headerTransparent: false,
      headerBlurEffect: undefined,
    }}
  >
    <Stack.Screen
      name="HomeScreen"
      component={HomeScreen}
      options={({ navigation }) => ({
        title: 'Home',
        headerLeft: () => (
          <Image source={logo} style={styles.headerLogo} resizeMode="contain" />
        ),
        headerRight: () => (
          <TouchableOpacity
            onPress={() => navigation.navigate('CustomizeHome')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="options-outline" size={22} color={Colors.primary} />
          </TouchableOpacity>
        ),
      })}
    />
    <Stack.Screen
      name="StartChallenge"
      component={StartChallengeScreen}
      options={{ title: '' }}
    />
    <Stack.Screen
      name="CreateChallenge"
      component={CreateChallengeScreen}
      options={{ title: 'New Challenge' }}
    />
    <Stack.Screen
      name="PastChallenges"
      component={PastChallengesScreen}
      options={{ title: 'Past Challenges' }}
    />
    <Stack.Screen
      name="ChallengeLibrary"
      component={ChallengeLibraryScreen}
      options={{ title: 'Challenge Library' }}
    />
    <Stack.Screen
      name="ActionChallenges"
      component={ActionChallengesScreen}
      options={{ title: 'Challenges' }}
    />
    <Stack.Screen
      name="CompleteChallenge"
      component={CompleteChallengeScreen}
      options={{ title: 'Complete Challenge' }}
    />
    <Stack.Screen
      name="ManageHabits"
      component={ManageHabitsScreen}
      options={{ title: 'Habits' }}
    />
    <Stack.Screen
      name="HabitDetail"
      component={HabitDetailScreen}
      options={{ title: 'Habit Details' }}
    />
    <Stack.Screen
      name="HabitActionPlan"
      component={HabitActionPlanScreen}
      options={{ title: 'Action Plan' }}
    />
    <Stack.Screen
      name="HabitLibrary"
      component={HabitLibraryScreen}
      options={{ title: 'Habit Library' }}
    />
    <Stack.Screen
      name="HabitLibraryDetail"
      component={HabitLibraryDetailScreen}
      options={{ title: '' }}
    />
    <Stack.Screen
      name="SubmitChallenge"
      component={SubmitChallengeScreen}
      options={{ title: 'Submit Challenge' }}
    />
    <Stack.Screen
      name="WriteReview"
      component={WriteReviewScreen}
      options={{ title: 'Write Review' }}
    />
    <Stack.Screen
      name="ExtendedChallengeProgress"
      component={ExtendedChallengeProgressScreen}
      options={{ title: 'Challenge Progress' }}
    />
    <Stack.Screen
      name="EditChallenge"
      component={EditChallengeScreen}
      options={{ title: 'Edit Challenge' }}
    />
    <Stack.Screen
      name="BuddyPickPartner"
      component={BuddyPickPartnerScreen}
      options={{ title: 'Pick a Teammate' }}
    />
    <Stack.Screen
      name="BuddyInvites"
      component={BuddyInvitesScreen}
      options={{ title: 'Buddy Invites' }}
    />
    <Stack.Screen
      name="ProgramDiscovery"
      component={ProgramDiscoveryScreen}
      options={{ title: 'Programs' }}
    />
    <Stack.Screen
      name="ProgramDetail"
      component={ProgramDetailScreen}
      options={{ title: '' }}
    />
    <Stack.Screen
      name="ProgramDashboard"
      component={ProgramDashboardScreen}
      options={{ title: 'My Program' }}
    />
    <Stack.Screen
      name="ProgramCompletion"
      component={ProgramCompletionScreen}
      options={{ title: '', headerShown: false }}
    />
    <Stack.Screen
      name="ProgramFailed"
      component={ProgramFailedScreen}
      options={{ title: '', headerShown: false }}
    />
    <Stack.Screen
      name="NightlyReflection"
      component={NightlyReflectionScreen}
      options={{ title: 'Nightly Reflection' }}
    />
    <Stack.Screen
      name="CustomizeHome"
      component={CustomizeHomeScreen}
      options={{ title: 'Customize Home' }}
    />
    <Stack.Screen
      name="CreateGoal"
      component={GoalOnboardingFlow}
      options={{ title: 'New Goal' }}
    />
    <Stack.Screen
      name="GoalOnboardingFlow"
      component={GoalOnboardingFlow}
      options={{ title: 'New Goal' }}
    />
    <Stack.Screen
      name="GoalDashboard"
      component={GoalDashboardScreen}
      options={{ title: '' }}
    />
    <Stack.Screen
      name="EditGoal"
      component={EditGoalScreen}
      options={{ title: 'Edit Goal' }}
    />
    <Stack.Screen
      name="MantraScreen"
      component={MantraScreen}
      options={{ title: 'My Mantras' }}
    />
    <Stack.Screen
      name="WhyScreen"
      component={WhyScreen}
      options={{ title: 'My Why' }}
    />
    <Stack.Screen
      name="WhyDiscoveryFlow"
      component={WhyDiscoveryFlow}
      options={{ title: '', headerShown: false }}
    />
    <Stack.Screen
      name="DeferredOnboarding"
      component={DeferredOnboardingScreen}
      options={{ title: '', headerShown: false, presentation: 'fullScreenModal' }}
    />
    <Stack.Screen
      name="WeeklyPlanner"
      component={WeeklyPlannerScreen}
      options={{ title: 'Weekly Planner' }}
    />
    <Stack.Screen
      name="MicroExerciseFeeling"
      component={MicroExerciseFeelingScreen}
      options={{ headerShown: false, presentation: 'modal' }}
    />
    <Stack.Screen
      name="MicroExerciseQuestion"
      component={MicroExerciseQuestionScreen}
      options={{ headerShown: false, presentation: 'modal' }}
    />
    <Stack.Screen
      name="MicroExerciseCommitment"
      component={MicroExerciseCommitmentScreen}
      options={{ headerShown: false, presentation: 'modal' }}
    />
    <Stack.Screen
      name="MicroExerciseComplete"
      component={MicroExerciseCompleteScreen}
      options={{ headerShown: false, presentation: 'modal' }}
    />
    <Stack.Screen
      name="MicroExerciseFollowUp"
      component={MicroExerciseFollowUpScreen}
      options={{ title: 'How did it go?' }}
    />
  </Stack.Navigator>
);

const styles = StyleSheet.create({
  headerLogo: {
    width: 32,
    height: 32,
  },
});
