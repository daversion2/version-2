import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AdminDashboardScreen } from '../screens/Admin/AdminDashboardScreen';
import { AdminChallengesScreen } from '../screens/Admin/AdminChallengesScreen';
import { AdminChallengeEditScreen } from '../screens/Admin/AdminChallengeEditScreen';
import { AdminSubmissionsScreen } from '../screens/Admin/AdminSubmissionsScreen';
import { AdminFunFactsScreen } from '../screens/Admin/AdminFunFactsScreen';
import { AdminFunFactEditScreen } from '../screens/Admin/AdminFunFactEditScreen';
import { Colors, Fonts, FontSizes } from '../constants/theme';

const Stack = createNativeStackNavigator();

export const AdminStack: React.FC = () => (
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
      name="AdminDashboard"
      component={AdminDashboardScreen}
      options={{ title: 'Admin' }}
    />
    <Stack.Screen
      name="AdminChallenges"
      component={AdminChallengesScreen}
      options={{ title: 'Challenge Library' }}
    />
    <Stack.Screen
      name="AdminChallengeEdit"
      component={AdminChallengeEditScreen}
      options={{ title: 'Edit Challenge' }}
    />
    <Stack.Screen
      name="AdminSubmissions"
      component={AdminSubmissionsScreen}
      options={{ title: 'Review Submissions' }}
    />
    <Stack.Screen
      name="AdminFunFacts"
      component={AdminFunFactsScreen}
      options={{ title: 'Fun Facts' }}
    />
    <Stack.Screen
      name="AdminFunFactEdit"
      component={AdminFunFactEditScreen}
      options={{ title: 'Edit Fun Fact' }}
    />
  </Stack.Navigator>
);
