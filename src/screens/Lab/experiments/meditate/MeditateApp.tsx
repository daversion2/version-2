import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing } from '../../../../constants/theme';
import { RootStackParamList } from '../../../../types/navigation';
import { MeditateStackParamList } from '../../../../types/meditate';
import { useAuth } from '../../../../context/AuthContext';
import { canOpenMiniApp } from '../../../../services/miniApps';
import { MeditateProvider } from './MeditateContext';
import { MeditateHomeScreen } from './MeditateHomeScreen';
import { MeditateSessionScreen } from './MeditateSessionScreen';
import { MeditateDoneScreen } from './MeditateDoneScreen';
import { MeditateHistoryScreen } from './MeditateHistoryScreen';
import { MeditateSettingsScreen } from './MeditateSettingsScreen';
import { MEDITATE_ACCENT } from './components/meditateStyle';

const Stack = createNativeStackNavigator<MeditateStackParamList>();

/**
 * The Meditate mini-app: one calm app for the six sitting, breathing and NSDR
 * habits. Full screen over the whole app, the app's own light look with one
 * accent. Opened from a habit's Start on Today (route param habitId) or from
 * Admin → Lab. Loaded with getComponent + require in RootNavigator, so none of
 * this runs at app start.
 */
export const MeditateApp: React.FC<NativeStackScreenProps<RootStackParamList, 'MeditateApp'>> = ({
  navigation,
  route,
}) => {
  const { user, userProfile } = useAuth();

  // The one gate (services/miniApps.ts) — Lab-only today.
  if (!user || !canOpenMiniApp('meditate', userProfile)) {
    return (
      <View style={styles.blocked}>
        <Text style={styles.blockedText}>Meditate isn’t available on this account yet.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.blockedLink}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <MeditateProvider userId={user.uid} launchHabitId={route.params?.habitId} rootNavigation={navigation}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: Colors.lightGray },
          headerTintColor: MEDITATE_ACCENT,
          headerTitleStyle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg, color: Colors.dark },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen name="MeditateHome" component={MeditateHomeScreen} options={{ title: 'Meditate' }} />
        {/* No header, no swipe-back: a stray gesture mid-sit would leave the session. */}
        <Stack.Screen
          name="MeditateSession"
          component={MeditateSessionScreen}
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="MeditateDone"
          component={MeditateDoneScreen}
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen name="MeditateHistory" component={MeditateHistoryScreen} options={{ title: 'History' }} />
        <Stack.Screen name="MeditateSettings" component={MeditateSettingsScreen} options={{ title: 'Settings' }} />
      </Stack.Navigator>
    </MeditateProvider>
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
  blockedLink: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.md, color: MEDITATE_ACCENT },
});
