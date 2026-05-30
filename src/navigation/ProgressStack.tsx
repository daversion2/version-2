import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProgressStackParamList } from '../types/navigation';
import { ProgressScreen } from '../screens/Progress/ProgressScreen';
import { DayDetailScreen } from '../screens/Progress/DayDetailScreen';
import { ReflectionDetailScreen } from '../screens/Progress/ReflectionDetailScreen';
import { ReflectionEntryScreen } from '../screens/Progress/ReflectionEntryScreen';
import { ChallengeDetailScreen } from '../screens/Challenges/ChallengeDetailScreen';
import { GoalDashboardScreen } from '../screens/Home/GoalDashboardScreen';
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
  </Stack.Navigator>
);
