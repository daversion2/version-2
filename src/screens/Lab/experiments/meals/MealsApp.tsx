import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing } from '../../../../constants/theme';
import { RootStackParamList } from '../../../../types/navigation';
import { MealsStackParamList } from '../../../../types/meals';
import { useAuth } from '../../../../context/AuthContext';
import { canOpenMiniApp } from '../../../../services/miniApps';
import { MealsProvider } from './MealsContext';
import { MealsDayScreen } from './MealsDayScreen';
import { MealsWeekScreen } from './MealsWeekScreen';
import { MealsCloseScreen } from './MealsCloseScreen';
import { MealsSettingsScreen } from './MealsSettingsScreen';
import { MealsGuideScreen } from './MealsGuideScreen';
import { MEALS_ACCENT } from './components/mealsStyle';

const Stack = createNativeStackNavigator<MealsStackParamList>();

/**
 * The Meals mini-app: rate each meal by the food groups on the plate, against
 * your own daily goal. Full screen over the whole app, the app's own light look
 * with the Fuel accent. Opened from a linked habit on Today (route param
 * habitId) or from Admin → Lab. Loaded with getComponent + require in
 * RootNavigator, so none of this runs at app start.
 */
export const MealsApp: React.FC<NativeStackScreenProps<RootStackParamList, 'MealsApp'>> = ({ navigation, route }) => {
  const { user, userProfile } = useAuth();

  // The one gate (services/miniApps.ts) — Lab-only today.
  if (!user || !canOpenMiniApp('meals', userProfile)) {
    return (
      <View style={styles.blocked}>
        <Text style={styles.blockedText}>Meals isn’t available on this account yet.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.blockedLink}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <MealsProvider userId={user.uid} launchHabitId={route.params?.habitId} rootNavigation={navigation}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: Colors.lightGray },
          headerTintColor: MEALS_ACCENT,
          headerTitleStyle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg, color: Colors.dark },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen name="MealsDay" component={MealsDayScreen} options={{ title: 'Meals' }} />
        <Stack.Screen name="MealsWeek" component={MealsWeekScreen} options={{ title: 'This week' }} />
        <Stack.Screen name="MealsClose" component={MealsCloseScreen} options={{ title: 'Close out the day' }} />
        <Stack.Screen name="MealsSettings" component={MealsSettingsScreen} options={{ title: 'Settings' }} />
        <Stack.Screen name="MealsGuide" component={MealsGuideScreen} options={{ title: 'What counts' }} />
      </Stack.Navigator>
    </MealsProvider>
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
  blockedLink: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.md, color: MEALS_ACCENT },
});
