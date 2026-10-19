import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing } from '../../../../constants/theme';
import { RootStackParamList } from '../../../../types/navigation';
import { WorkoutsStackParamList } from '../../../../types/workouts';
import { useAuth } from '../../../../context/AuthContext';
import { canOpenMiniApp } from '../../../../services/miniApps';
import { WorkoutsProvider } from './WorkoutsContext';
import { WorkoutsHomeScreen } from './WorkoutsHomeScreen';
import { WorkoutPreviewScreen } from './WorkoutPreviewScreen';
import { WorkoutBuilderScreen } from './WorkoutBuilderScreen';
import { WorkoutSessionScreen } from './WorkoutSessionScreen';
import { WorkoutSummaryScreen } from './WorkoutSummaryScreen';
import { WorkoutHistoryScreen } from './WorkoutHistoryScreen';
import { WorkoutSettingsScreen } from './WorkoutSettingsScreen';
import { WorkoutExercisesScreen } from './WorkoutExercisesScreen';
import { WorkoutStatsDetailScreen } from './WorkoutStatsDetailScreen';
import { WORKOUTS_ACCENT } from './components/workoutsStyle';

const Stack = createNativeStackNavigator<WorkoutsStackParamList>();

/**
 * The Workouts mini-app: full screen over the whole app, its own navigation,
 * the app's fonts and building blocks with one accent. Opened from a habit's
 * Start on Today (route param habitId) or from Admin → Lab. Loaded with
 * getComponent + require in RootNavigator, so none of this runs at app start.
 */
export const WorkoutsApp: React.FC<NativeStackScreenProps<RootStackParamList, 'WorkoutsApp'>> = ({
  navigation,
  route,
}) => {
  const { user, userProfile } = useAuth();

  // The one gate (services/miniApps.ts) — Lab-only today.
  if (!user || !canOpenMiniApp('workouts', userProfile)) {
    return (
      <View style={styles.blocked}>
        <Text style={styles.blockedText}>Workouts isn’t available on this account yet.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.blockedLink}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <WorkoutsProvider userId={user.uid} launchHabitId={route.params?.habitId} rootNavigation={navigation}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: Colors.lightGray },
          headerTintColor: WORKOUTS_ACCENT,
          headerTitleStyle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg, color: Colors.dark },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen name="WorkoutsHome" component={WorkoutsHomeScreen} options={{ title: 'Workouts' }} />
        <Stack.Screen name="WorkoutPreview" component={WorkoutPreviewScreen} options={{ title: '' }} />
        {/* No long-press back menu: it can jump past the unsaved-changes prompt. */}
        <Stack.Screen
          name="WorkoutBuilder"
          component={WorkoutBuilderScreen}
          options={{ title: 'New workout', headerBackButtonMenuEnabled: false }}
        />
        {/* No header, no swipe-back: a stray gesture mid-set would leave the workout. */}
        <Stack.Screen
          name="WorkoutSession"
          component={WorkoutSessionScreen}
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="WorkoutSummary"
          component={WorkoutSummaryScreen}
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen name="WorkoutHistory" component={WorkoutHistoryScreen} options={{ title: 'History' }} />
        <Stack.Screen name="WorkoutSettings" component={WorkoutSettingsScreen} options={{ title: 'Settings' }} />
        <Stack.Screen name="WorkoutExercises" component={WorkoutExercisesScreen} options={{ title: 'My exercises' }} />
        <Stack.Screen name="WorkoutStatsDetail" component={WorkoutStatsDetailScreen} options={{ title: '' }} />
      </Stack.Navigator>
    </WorkoutsProvider>
  );
};

const styles = StyleSheet.create({
  blocked: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: Colors.lightGray,
  },
  blockedText: { fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: Colors.gray, textAlign: 'center' },
  blockedLink: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.md, color: WORKOUTS_ACCENT },
});
