import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProgressStackParamList } from '../types/navigation';
import { ProgressScreen } from '../screens/Progress/ProgressScreen';
import { GoalsProgressScreen } from '../screens/Progress/GoalsProgressScreen';
import { DayDetailScreen } from '../screens/Progress/DayDetailScreen';
import { ReflectionDetailScreen } from '../screens/Progress/ReflectionDetailScreen';
import { ReflectionEntryScreen } from '../screens/Progress/ReflectionEntryScreen';
import { ChallengeDetailScreen } from '../screens/Challenges/ChallengeDetailScreen';
import { GoalDashboardScreen } from '../screens/Home/GoalDashboardScreen';
import { EditGoalScreen } from '../screens/Home/EditGoalScreen';
import { GoalCreationFlow } from '../screens/Home/GoalCreationFlow/GoalCreationFlow';
import { SubmitChallengeScreen } from '../screens/Community/SubmitChallengeScreen';
import { CompleteChallengeScreen } from '../screens/Home/CompleteChallengeScreen';
import { ExtendedChallengeProgressScreen } from '../screens/Home/ExtendedChallengeProgressScreen';
import { HabitDetailScreen } from '../screens/Home/HabitDetailScreen';
import { ProgramDashboardScreen } from '../screens/Home/ProgramDashboardScreen';
import { CreateChallengeScreen } from '../screens/Home/CreateChallengeScreen';
import { ManageHabitsScreen } from '../screens/Home/ManageHabitsScreen';
import { Colors, Fonts, FontSizes } from '../constants/theme';

const Stack = createNativeStackNavigator<ProgressStackParamList>();

export const ProgressStack: React.FC = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: '#FBFBFB' },
      headerTintColor: Colors.primary,
      headerTitleStyle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg },
      headerBackButtonDisplayMode: 'minimal',
      headerShadowVisible: false,
    }}
  >
    <Stack.Screen
      name="ProgressScreen"
      component={ProgressScreen}
      options={{ title: 'Progress' }}
    />
    <Stack.Screen
      name="GoalsProgress"
      component={GoalsProgressScreen}
      options={{ title: 'Your Goals' }}
    />
    <Stack.Screen
      name="DayDetail"
      component={DayDetailScreen}
      options={{ title: 'Day Detail' }}
    />
    <Stack.Screen
      name="ReflectionDetail"
      component={ReflectionDetailScreen}
      options={{ title: 'Reflections' }}
    />
    <Stack.Screen
      name="ReflectionEntry"
      component={ReflectionEntryScreen}
      options={{ title: 'Reflection' }}
    />
    <Stack.Screen
      name="ChallengeDetail"
      component={ChallengeDetailScreen}
      options={{ title: 'Challenge' }}
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
      name="GoalCreationFlow"
      component={GoalCreationFlow}
      options={{ title: 'New Goal', headerShown: false }}
    />
    <Stack.Screen
      name="SubmitChallenge"
      component={SubmitChallengeScreen}
      options={{ title: 'Submit' }}
    />
    <Stack.Screen
      name="CompleteChallenge"
      component={CompleteChallengeScreen}
      options={{ title: 'Complete Challenge' }}
    />
    <Stack.Screen
      name="ExtendedChallengeProgress"
      component={ExtendedChallengeProgressScreen}
      options={{ title: 'Progress' }}
    />
    <Stack.Screen
      name="HabitDetail"
      component={HabitDetailScreen}
      options={{ title: 'Habit Detail' }}
    />
    <Stack.Screen
      name="ProgramDashboard"
      component={ProgramDashboardScreen}
      options={{ title: 'Program' }}
    />
    <Stack.Screen
      name="CreateChallenge"
      component={CreateChallengeScreen}
      options={{ title: 'New Challenge' }}
    />
    <Stack.Screen
      name="ManageHabits"
      component={ManageHabitsScreen}
      options={{ title: 'Manage Habits' }}
    />
  </Stack.Navigator>
);
