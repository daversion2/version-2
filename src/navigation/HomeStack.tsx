import React from 'react';
import { Image, StyleSheet, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../types/navigation';
import { HomeScreen } from '../screens/Home/HomeScreen';
import { StartChallengeScreen } from '../screens/Home/StartChallengeScreen';
import { CreateChallengeScreen } from '../screens/Home/CreateChallengeScreen';
import { PastChallengesScreen } from '../screens/Home/PastChallengesScreen';
import { ChallengeLibraryScreen } from '../screens/Home/ChallengeLibraryScreen';
import { ActionChallengesScreen } from '../screens/Home/BarrierChallengesScreen';
import { CompleteChallengeScreen } from '../screens/Home/CompleteChallengeScreen';
import { ChallengeDetailScreen } from '../screens/Challenges/ChallengeDetailScreen';
import { PracticesScreen } from '../screens/Practices/PracticesScreen';
import { PracticeDetailScreen } from '../screens/Practices/PracticeDetailScreen';
import { PracticeSessionScreen } from '../screens/Practices/PracticeSessionScreen';
import { DebriefScreen } from '../screens/Home/DebriefScreen';
import { MyPracticeDetailScreen } from '../screens/Home/MyPracticeDetailScreen';
import { HabitActionPlanScreen } from '../screens/Home/HabitActionPlanScreen';
import { HabitLibraryScreen } from '../screens/Home/HabitLibraryScreen';
import { CreateHabitScreen } from '../screens/Home/CreateHabitScreen';
import { TraditionalHabitsScreen } from '../screens/Home/TraditionalHabitsScreen';
import { HabitLibraryDetailScreen } from '../screens/Home/HabitLibraryDetailScreen';
import { ExtendedChallengeProgressScreen } from '../screens/Home/ExtendedChallengeProgressScreen';
import { EditChallengeScreen } from '../screens/Home/EditChallengeScreen';
import { ProgramDiscoveryScreen } from '../screens/Home/ProgramDiscoveryScreen';
import { ProgramDetailScreen } from '../screens/Home/ProgramDetailScreen';
import { ProgramDashboardScreen } from '../screens/Home/ProgramDashboardScreen';
import { ProgramCompletionScreen } from '../screens/Home/ProgramCompletionScreen';
import { ProgramFailedScreen } from '../screens/Home/ProgramFailedScreen';
import { NightlyReflectionScreen } from '../screens/Home/NightlyReflectionScreen';
import { JourneyCheckinScreen } from '../screens/Home/JourneyCheckinScreen';
import { CustomizeHomeScreen } from '../screens/Home/CustomizeHomeScreen';
import { MantraScreen } from '../screens/Home/MantraScreen';
import { DeferredOnboardingScreen } from '../screens/Auth/DeferredOnboardingScreen';
import { MicroExerciseFeelingScreen } from '../screens/MicroExercise/MicroExerciseFeelingScreen';
import { MicroExerciseQuestionScreen } from '../screens/MicroExercise/MicroExerciseQuestionScreen';
import { MicroExerciseCommitmentScreen } from '../screens/MicroExercise/MicroExerciseCommitmentScreen';
import { MicroExerciseCompleteScreen } from '../screens/MicroExercise/MicroExerciseCompleteScreen';
import { MicroExerciseFollowUpScreen } from '../screens/MicroExercise/MicroExerciseFollowUpScreen';
import { CravingCrusherScreen } from '../screens/Home/CravingCrusherScreen';
import { Colors, Fonts, FontSizes } from '../constants/theme';

const logo = require('../../assets/Neuro-Nudge_Mark_Blue.png');

const Stack = createNativeStackNavigator<HomeStackParamList>();

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
        // Render the logo in the header's background layer, pinned to the
        // bottom-left corner. This keeps it out of the headerLeft bar-button
        // slot, which iOS 26 "Liquid Glass" wraps in a circular background.
        headerBackground: () => (
          <View style={styles.headerBg}>
            <Image source={logo} style={styles.headerLogo} resizeMode="contain" />
          </View>
        ),
        // Shortcut to the Library TAB, not the copy of the library that also
        // lives in this stack — otherwise there would be two independent
        // instances of the same screen with separate scroll and search state.
        headerRight: () => (
          <TouchableOpacity
            onPress={() => navigation.getParent()?.navigate('Library')}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Browse the habit library"
          >
            <Ionicons name="library-outline" size={22} color={Colors.primary} />
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
      name="ChallengeDetail"
      component={ChallengeDetailScreen}
      options={{ title: 'Challenge' }}
    />
    <Stack.Screen
      name="PracticeSession"
      component={PracticeSessionScreen}
      options={{ title: '' }}
    />
    <Stack.Screen
      name="Debrief"
      component={DebriefScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="ManageHabits"
      component={PracticesScreen}
      options={{ title: 'Practices' }}
    />
    <Stack.Screen
      name="PracticeDetail"
      component={PracticeDetailScreen}
      options={{ title: '' }}
    />
    <Stack.Screen
      name="HabitDetail"
      component={MyPracticeDetailScreen}
      options={{ title: 'Practice Details' }}
    />
    <Stack.Screen
      name="HabitActionPlan"
      component={HabitActionPlanScreen}
      options={{ title: 'Action Plan' }}
    />
    <Stack.Screen
      name="CreateHabit"
      component={CreateHabitScreen}
      options={{ title: 'New habit' }}
    />
    <Stack.Screen
      name="HabitLibrary"
      component={HabitLibraryScreen}
      options={{ title: 'Practice Library' }}
    />
    <Stack.Screen
      name="TraditionalHabits"
      component={TraditionalHabitsScreen}
      options={{ title: 'Traditional Practices' }}
    />
    <Stack.Screen
      name="HabitLibraryDetail"
      component={HabitLibraryDetailScreen}
      options={{ title: '' }}
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
      name="JourneyCheckin"
      component={JourneyCheckinScreen}
      options={{ title: 'Check-in' }}
    />
    <Stack.Screen
      name="CustomizeHome"
      component={CustomizeHomeScreen}
      options={{ title: 'Customize Home' }}
    />
    <Stack.Screen
      name="MantraScreen"
      component={MantraScreen}
      options={{ title: 'My Mantras' }}
    />
    <Stack.Screen
      name="DeferredOnboarding"
      component={DeferredOnboardingScreen}
      options={{ title: '', headerShown: false, presentation: 'fullScreenModal' }}
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
    <Stack.Screen
      name="CravingCrusher"
      component={CravingCrusherScreen}
      // No header and no swipe-back: an accidental gesture mid-timer would
      // silently abandon the ride. Exits go through the in-screen ✕.
      options={{ headerShown: false, gestureEnabled: false }}
    />
  </Stack.Navigator>
);

const styles = StyleSheet.create({
  headerBg: {
    flex: 1,
    backgroundColor: '#FBFBFB',
  },
  headerLogo: {
    position: 'absolute',
    left: 16,
    bottom: 7,
    width: 30,
    height: 30,
  },
});
