import React from 'react';
import { Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GoalsScreen } from '../screens/Goals/GoalsScreen';
import { OverallProgressScreen } from '../screens/Goals/OverallProgressScreen';
import { GoalDashboardScreen } from '../screens/Home/GoalDashboardScreen';
import { EditGoalScreen } from '../screens/Home/EditGoalScreen';
import { GoalOnboardingFlow } from '../screens/Home/GoalOnboardingFlow';
import { ChallengeDetailScreen } from '../screens/Challenges/ChallengeDetailScreen';
import { DayDetailScreen } from '../screens/Progress/DayDetailScreen';
import { ReflectionDetailScreen } from '../screens/Progress/ReflectionDetailScreen';
import { ReflectionEntryScreen } from '../screens/Progress/ReflectionEntryScreen';
import { SubmitChallengeScreen } from '../screens/Community/SubmitChallengeScreen';
import { CompleteChallengeScreen } from '../screens/Home/CompleteChallengeScreen';
import { ExtendedChallengeProgressScreen } from '../screens/Home/ExtendedChallengeProgressScreen';
import { HabitDetailScreen } from '../screens/Home/HabitDetailScreen';
import { ProgramDashboardScreen } from '../screens/Home/ProgramDashboardScreen';
import { CreateChallengeScreen } from '../screens/Home/CreateChallengeScreen';
import { ManageHabitsScreen } from '../screens/Home/ManageHabitsScreen';
import { Colors, Fonts, FontSizes } from '../constants/theme';

const logo = require('../../assets/Neuro-Nudge_Logo_Blue.png');

const Stack = createNativeStackNavigator();

export const GoalsStack: React.FC = () => (
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
      name="GoalsScreen"
      component={GoalsScreen}
      options={({ navigation }) => ({
        title: 'Goals',
        headerLeft: () => (
          <Image source={logo} style={styles.headerLogo} resizeMode="contain" />
        ),
        headerRight: () => (
          <TouchableOpacity
            onPress={() => navigation.navigate('OverallProgress')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="stats-chart-outline" size={22} color={Colors.primary} />
          </TouchableOpacity>
        ),
      })}
    />
    <Stack.Screen
      name="OverallProgress"
      component={OverallProgressScreen}
      options={{ title: 'Overall Progress' }}
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
      name="GoalOnboardingFlow"
      component={GoalOnboardingFlow}
      options={{ title: 'New Goal' }}
    />
    <Stack.Screen
      name="ChallengeDetail"
      component={ChallengeDetailScreen}
      options={{ title: 'Challenge' }}
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
      options={{ title: 'Reflection Entry' }}
    />
    <Stack.Screen
      name="SubmitChallenge"
      component={SubmitChallengeScreen}
      options={{ title: 'Submit to Library' }}
    />
    <Stack.Screen
      name="CompleteChallenge"
      component={CompleteChallengeScreen}
      options={{ title: 'Complete Challenge' }}
    />
    <Stack.Screen
      name="ExtendedChallengeProgress"
      component={ExtendedChallengeProgressScreen}
      options={{ title: 'Challenge Progress' }}
    />
    <Stack.Screen
      name="HabitDetail"
      component={HabitDetailScreen}
      options={{ title: 'Habit Details' }}
    />
    <Stack.Screen
      name="ProgramDashboard"
      component={ProgramDashboardScreen}
      options={{ title: 'My Program' }}
    />
    <Stack.Screen
      name="CreateChallenge"
      component={CreateChallengeScreen}
      options={{ title: 'New Challenge' }}
    />
    <Stack.Screen
      name="ManageHabits"
      component={ManageHabitsScreen}
      options={{ title: 'Habits' }}
    />
  </Stack.Navigator>
);

const styles = StyleSheet.create({
  headerLogo: {
    width: 32,
    height: 32,
  },
});
