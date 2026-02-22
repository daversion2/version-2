import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/Home/HomeScreen';
import { StartChallengeScreen } from '../screens/Home/StartChallengeScreen';
import { CreateChallengeScreen } from '../screens/Home/CreateChallengeScreen';
import { PastChallengesScreen } from '../screens/Home/PastChallengesScreen';
import { ChallengeLibraryScreen } from '../screens/Home/ChallengeLibraryScreen';
import { CompleteChallengeScreen } from '../screens/Home/CompleteChallengeScreen';
import { ManageHabitsScreen } from '../screens/Home/ManageHabitsScreen';
import { HabitDetailScreen } from '../screens/Home/HabitDetailScreen';
import { SubmitChallengeScreen } from '../screens/Community/SubmitChallengeScreen';
import { WriteReviewScreen } from '../screens/Community/WriteReviewScreen';
import { ExtendedChallengeProgressScreen } from '../screens/Home/ExtendedChallengeProgressScreen';
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
      options={{
        title: 'Home',
        headerLeft: () => (
          <Image source={logo} style={styles.headerLogo} resizeMode="contain" />
        ),
      }}
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
  </Stack.Navigator>
);

const styles = StyleSheet.create({
  headerLogo: {
    width: 32,
    height: 32,
  },
});
