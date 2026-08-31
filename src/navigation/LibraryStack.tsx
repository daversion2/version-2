import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LibraryStackParamList } from '../types/navigation';
import { HabitLibraryScreen } from '../screens/Home/HabitLibraryScreen';
import { HabitLibraryDetailScreen } from '../screens/Home/HabitLibraryDetailScreen';
import { PracticeDetailScreen } from '../screens/Practices/PracticeDetailScreen';
import { Colors, Fonts, FontSizes } from '../constants/theme';

const Stack = createNativeStackNavigator<LibraryStackParamList>();

/**
 * The Library tab — browsing every habit the app offers, and reading what each
 * one does to your brain.
 *
 * This is a top-level tab rather than a screen buried under Home because the
 * library IS the product now: 45 habits, each with its own science page. It was
 * previously reachable only via a button on ManageHabits, which nothing linked
 * to. See docs/habit-template-unification.md.
 */
export const LibraryStack: React.FC = () => (
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
      name="HabitLibrary"
      component={HabitLibraryScreen}
      options={{ title: 'Library' }}
    />
    <Stack.Screen
      name="HabitLibraryDetail"
      component={HabitLibraryDetailScreen}
      options={{ title: '' }}
    />
    <Stack.Screen
      name="PracticeDetail"
      component={PracticeDetailScreen}
      options={{ title: '' }}
    />
  </Stack.Navigator>
);
