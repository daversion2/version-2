import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AdminStackParamList } from '../types/navigation';
import { AdminDashboardScreen } from '../screens/Admin/AdminDashboardScreen';
import { AdminChallengesScreen } from '../screens/Admin/AdminChallengesScreen';
import { AdminChallengeEditScreen } from '../screens/Admin/AdminChallengeEditScreen';
import { AdminSubmissionsScreen } from '../screens/Admin/AdminSubmissionsScreen';
import { AdminFunFactsScreen } from '../screens/Admin/AdminFunFactsScreen';
import { AdminFunFactEditScreen } from '../screens/Admin/AdminFunFactEditScreen';
import { AdminTidbitsScreen } from '../screens/Admin/AdminTidbitsScreen';
import { AdminTidbitEditScreen } from '../screens/Admin/AdminTidbitEditScreen';
import { AdminRulesScreen } from '../screens/Admin/AdminRulesScreen';
import { AdminRuleEditScreen } from '../screens/Admin/AdminRuleEditScreen';
import { AdminOnboardingScreen } from '../screens/Admin/AdminOnboardingScreen';
import { AdminToolsScreen } from '../screens/Admin/AdminToolsScreen';
import { AdminToolEditScreen } from '../screens/Admin/AdminToolEditScreen';
import { AdminCategoriesScreen } from '../screens/Admin/AdminCategoriesScreen';
import { AdminMicroExercisesScreen } from '../screens/Admin/AdminMicroExercisesScreen';
import { AdminMicroExerciseEditScreen } from '../screens/Admin/AdminMicroExerciseEditScreen';
import { Colors, Fonts, FontSizes } from '../constants/theme';

const Stack = createNativeStackNavigator<AdminStackParamList>();

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
    <Stack.Screen
      name="AdminTidbits"
      component={AdminTidbitsScreen}
      options={{ title: 'Neuroscience Tidbits' }}
    />
    <Stack.Screen
      name="AdminTidbitEdit"
      component={AdminTidbitEditScreen}
      options={{ title: 'Edit Tidbit' }}
    />
    <Stack.Screen
      name="AdminRules"
      component={AdminRulesScreen}
      options={{ title: 'Notification & Popup Rules' }}
    />
    <Stack.Screen
      name="AdminRuleEdit"
      component={AdminRuleEditScreen}
      options={{ title: 'Edit Rule' }}
    />
    <Stack.Screen
      name="AdminOnboarding"
      component={AdminOnboardingScreen}
      options={{ title: 'Onboarding Content' }}
    />
    <Stack.Screen
      name="AdminTools"
      component={AdminToolsScreen}
      options={{ title: 'Tools' }}
    />
    <Stack.Screen
      name="AdminToolEdit"
      component={AdminToolEditScreen}
      options={{ title: 'Edit Tool' }}
    />
    <Stack.Screen
      name="AdminCategories"
      component={AdminCategoriesScreen}
      options={{ title: 'Tool Categories' }}
    />
    <Stack.Screen
      name="AdminMicroExercises"
      component={AdminMicroExercisesScreen}
      options={{ title: 'Micro-Exercises' }}
    />
    <Stack.Screen
      name="AdminMicroExerciseEdit"
      component={AdminMicroExerciseEditScreen}
      options={{ title: 'Edit Micro-Exercise' }}
    />
  </Stack.Navigator>
);
