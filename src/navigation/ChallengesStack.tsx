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
import { ChallengeDetailScreen } from '../screens/Challenges/ChallengeDetailScreen';

// Programs live under the Challenges tab — guided multi-day sequences are kin
// to extended challenges, keeping Home focused on practices.
import { ProgramDiscoveryScreen } from '../screens/Home/ProgramDiscoveryScreen';
import { ProgramDetailScreen } from '../screens/Home/ProgramDetailScreen';
import { ProgramDashboardScreen } from '../screens/Home/ProgramDashboardScreen';
import { ProgramCompletionScreen } from '../screens/Home/ProgramCompletionScreen';
import { ProgramFailedScreen } from '../screens/Home/ProgramFailedScreen';

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
      name="ProgramDiscovery"
      component={ProgramDiscoveryScreen as any}
      options={{ title: 'Programs' }}
    />
    <Stack.Screen
      name="ProgramDetail"
      component={ProgramDetailScreen as any}
      options={{ title: '' }}
    />
    <Stack.Screen
      name="ProgramDashboard"
      component={ProgramDashboardScreen as any}
      options={{ title: 'My Program' }}
    />
    <Stack.Screen
      name="ProgramCompletion"
      component={ProgramCompletionScreen as any}
      options={{ title: '', headerShown: false }}
    />
    <Stack.Screen
      name="ProgramFailed"
      component={ProgramFailedScreen as any}
      options={{ title: '', headerShown: false }}
    />
  </Stack.Navigator>
);
