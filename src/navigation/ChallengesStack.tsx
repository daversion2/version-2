import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ChallengesStackParamList } from '../types/navigation';
import { Colors, Fonts, FontSizes } from '../constants/theme';

// Landing hub for the Challenges tab.
import { ChallengesHomeScreen } from '../screens/Challenges/ChallengesHomeScreen';

// Challenge-flow screens — the same components the Home stack registers. They're
// re-registered here so the whole flow lives inside the Challenges tab (Home
// keeps its own copies for goal/planner entry points). The navigation graph is
// closed (popToTop/goBack stay in-stack; getParent targets the Settings tab), so
// duplicate registration is safe. Cast to any: components are typed to
// HomeStackParamList, structurally identical routes but a different param-list name.
import { CreateChallengeScreen } from '../screens/Home/CreateChallengeScreen';
import { PastChallengesScreen } from '../screens/Home/PastChallengesScreen';
import { ChallengeLibraryScreen } from '../screens/Home/ChallengeLibraryScreen';
import { ActionChallengesScreen } from '../screens/Home/BarrierChallengesScreen';
import { CompleteChallengeScreen } from '../screens/Home/CompleteChallengeScreen';
import { ExtendedChallengeProgressScreen } from '../screens/Home/ExtendedChallengeProgressScreen';
import { EditChallengeScreen } from '../screens/Home/EditChallengeScreen';
import { BuddyPickPartnerScreen } from '../screens/Home/BuddyPickPartnerScreen';
import { ChallengeDetailScreen } from '../screens/Challenges/ChallengeDetailScreen';
import { SubmitChallengeScreen } from '../screens/Community/SubmitChallengeScreen';
import { GoalCreationFlow } from '../screens/Home/GoalCreationFlow/GoalCreationFlow';

const Stack = createNativeStackNavigator<ChallengesStackParamList>();

export const ChallengesStack: React.FC = () => (
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
      name="ChallengesHome"
      component={ChallengesHomeScreen}
      options={{ title: 'Challenges' }}
    />
    <Stack.Screen
      name="CreateChallenge"
      component={CreateChallengeScreen as any}
      options={{ title: 'New Challenge' }}
    />
    <Stack.Screen
      name="PastChallenges"
      component={PastChallengesScreen as any}
      options={{ title: 'Past Challenges' }}
    />
    <Stack.Screen
      name="ChallengeLibrary"
      component={ChallengeLibraryScreen as any}
      options={{ title: 'Challenge Library' }}
    />
    <Stack.Screen
      name="ActionChallenges"
      component={ActionChallengesScreen as any}
      options={{ title: 'Challenges' }}
    />
    <Stack.Screen
      name="CompleteChallenge"
      component={CompleteChallengeScreen as any}
      options={{ title: 'Complete Challenge' }}
    />
    <Stack.Screen
      name="ExtendedChallengeProgress"
      component={ExtendedChallengeProgressScreen as any}
      options={{ title: 'Challenge Progress' }}
    />
    <Stack.Screen
      name="EditChallenge"
      component={EditChallengeScreen as any}
      options={{ title: 'Edit Challenge' }}
    />
    <Stack.Screen
      name="ChallengeDetail"
      component={ChallengeDetailScreen as any}
      options={{ title: 'Challenge' }}
    />
    <Stack.Screen
      name="SubmitChallenge"
      component={SubmitChallengeScreen as any}
      options={{ title: 'Submit Challenge' }}
    />
    <Stack.Screen
      name="BuddyPickPartner"
      component={BuddyPickPartnerScreen as any}
      options={{ title: 'Pick a Teammate' }}
    />
    <Stack.Screen
      name="GoalCreationFlow"
      component={GoalCreationFlow as any}
      options={{ title: 'New Goal', headerShown: false }}
    />
  </Stack.Navigator>
);
