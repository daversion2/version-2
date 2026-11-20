import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing } from '../../../../constants/theme';
import { RootStackParamList } from '../../../../types/navigation';
import { PainStackParamList } from '../../../../types/pain';
import { useAuth } from '../../../../context/AuthContext';
import { canOpenMiniApp } from '../../../../services/miniApps';
import { PainProvider } from './PainContext';
import { PainHomeScreen } from './PainHomeScreen';
import { PainPlanScreen } from './PainPlanScreen';
import { PainResultsScreen } from './PainResultsScreen';
import { PainHistoryScreen } from './PainHistoryScreen';
import { PAIN_ACCENT } from './components/painStyle';

const Stack = createNativeStackNavigator<PainStackParamList>();

/**
 * Back Pain (Lab): a daily pain check-in, and plans run like Workouts'
 * phases — test, a few weeks of up to three things, retest. Full screen over
 * the whole app. Loaded with getComponent + require in RootNavigator, so none
 * of this runs at app start. Spec: docs/micro-apps/pain.md.
 */
export const PainApp: React.FC<NativeStackScreenProps<RootStackParamList, 'PainApp'>> = ({ navigation }) => {
  const { user, userProfile } = useAuth();

  // The one gate (services/miniApps.ts) — Lab-only today.
  if (!user || !canOpenMiniApp('pain', userProfile)) {
    return (
      <View style={styles.blocked}>
        <Text style={styles.blockedText}>Back Pain isn’t available on this account yet.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.blockedLink}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <PainProvider userId={user.uid} rootNavigation={navigation}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: Colors.lightGray },
          headerTintColor: PAIN_ACCENT,
          headerTitleStyle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg, color: Colors.dark },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen name="PainHome" component={PainHomeScreen} options={{ title: 'Back Pain' }} />
        <Stack.Screen
          name="PainPlan"
          component={PainPlanScreen}
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen name="PainResults" component={PainResultsScreen} options={{ title: 'Plan' }} />
        <Stack.Screen name="PainHistory" component={PainHistoryScreen} options={{ title: 'History' }} />
      </Stack.Navigator>
    </PainProvider>
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
  blockedLink: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.md, color: PAIN_ACCENT },
});
