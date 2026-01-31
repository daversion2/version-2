import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/Home/HomeScreen';
import { StartChallengeScreen } from '../screens/Home/StartChallengeScreen';
import { CreateChallengeScreen } from '../screens/Home/CreateChallengeScreen';
import { PastChallengesScreen } from '../screens/Home/PastChallengesScreen';
import { CompleteChallengeScreen } from '../screens/Home/CompleteChallengeScreen';
import { ManageHabitsScreen } from '../screens/Home/ManageHabitsScreen';
import { Colors, Fonts, FontSizes } from '../constants/theme';

const Stack = createNativeStackNavigator();

export const HomeStack: React.FC = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: Colors.white },
      headerTintColor: Colors.primary,
      headerTitleStyle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg },
      headerBackButtonDisplayMode: 'minimal',
    }}
  >
    <Stack.Screen
      name="HomeScreen"
      component={HomeScreen}
      options={{ headerShown: false }}
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
      name="CompleteChallenge"
      component={CompleteChallengeScreen}
      options={{ title: 'Complete Challenge' }}
    />
    <Stack.Screen
      name="ManageHabits"
      component={ManageHabitsScreen}
      options={{ title: 'Habits' }}
    />
  </Stack.Navigator>
);
