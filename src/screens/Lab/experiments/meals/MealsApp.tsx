import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Spacing, TextStyles } from '../../../../constants/theme';
import { RootStackParamList } from '../../../../types/navigation';
import { MealsStackParamList } from '../../../../types/meals';
import { useAuth } from '../../../../context/AuthContext';
import { canOpenMiniApp } from '../../../../services/miniApps';
import { MealsProvider } from './MealsContext';
import { MealsDayScreen } from './MealsDayScreen';
import { MealsWeekScreen } from './MealsWeekScreen';
import { MealsCloseScreen } from './MealsCloseScreen';
import { MealsSettingsScreen } from './MealsSettingsScreen';
import { MealsScoresScreen } from './MealsScoresScreen';
import { MealsGuideScreen } from './MealsGuideScreen';
import { MEALS_ACCENT } from './components/mealsStyle';
import { Copy } from '../../../../components/common/Copy';
import { useCopy } from '../../../../context/CopyContext';

const Stack = createNativeStackNavigator<MealsStackParamList>();

/**
 * The Meals mini-app: log each meal by the food groups on the plate, each
 * scored for what you're eating for. Full screen over the whole app, the app's own light look
 * with Meals' blue. Opened from a linked habit on Today (route param
 * habitId) or from Admin → Lab. Loaded with getComponent + require in
 * RootNavigator, so none of this runs at app start.
 */
export const MealsApp: React.FC<NativeStackScreenProps<RootStackParamList, 'MealsApp'>> = ({ navigation, route }) => {
  const { user, userProfile } = useAuth();
  const t = useCopy();

  // The one gate (services/miniApps.ts) — Lab-only today.
  if (!user || !canOpenMiniApp('meals', userProfile)) {
    return (
      <View style={styles.blocked}>
        <Copy id="meals.app.blocked" style={styles.blockedText}>Meals isn’t available on this account yet.</Copy>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Copy id="meals.app.close" style={styles.blockedLink}>Close</Copy>
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
          headerTitleStyle: { fontFamily: TextStyles.headline.fontFamily, fontSize: TextStyles.headline.fontSize, fontWeight: TextStyles.headline.fontWeight, color: Colors.dark },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen name="MealsDay" component={MealsDayScreen} options={{ title: t('meals.app.titleDay', 'Meals') }} />
        <Stack.Screen name="MealsWeek" component={MealsWeekScreen} options={{ title: t('meals.app.titleWeek', 'This week') }} />
        <Stack.Screen name="MealsClose" component={MealsCloseScreen} options={{ title: t('meals.app.titleClose', 'Close out the day') }} />
        <Stack.Screen name="MealsSettings" component={MealsSettingsScreen} options={{ title: t('meals.app.titleSettings', 'Settings') }} />
        <Stack.Screen name="MealsScores" component={MealsScoresScreen} options={{ title: t('meals.app.titleScores', 'Scores') }} />
        <Stack.Screen name="MealsGuide" component={MealsGuideScreen} options={{ title: t('meals.app.titleGuide', 'What counts') }} />
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
  blockedText: { ...TextStyles.body, color: Colors.gray, textAlign: 'center' },
  blockedLink: { ...TextStyles.headline, color: MEALS_ACCENT },
});
