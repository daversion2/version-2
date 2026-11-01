import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing } from '../../../../constants/theme';
import { RootStackParamList } from '../../../../types/navigation';
import { HotColdStackParamList } from '../../../../types/hotcold';
import { useAuth } from '../../../../context/AuthContext';
import { canOpenMiniApp } from '../../../../services/miniApps';
import { HotColdProvider } from './HotColdContext';
import { HotColdHomeScreen } from './HotColdHomeScreen';
import { HotColdTimerScreen } from './HotColdTimerScreen';
import { HotColdHistoryScreen } from './HotColdHistoryScreen';
import { HotColdSettingsScreen } from './HotColdSettingsScreen';
import { HOTCOLD_ACCENT } from './components/hotcoldStyle';

const Stack = createNativeStackNavigator<HotColdStackParamList>();

/**
 * Hot & Cold (Lab): log cold plunges and sauna sessions — time and
 * temperature — and time a plunge with a bell. Full screen over the whole app.
 * Loaded with getComponent + require in RootNavigator, so none of this runs at
 * app start. Spec: docs/micro-apps/hotcold.md.
 */
export const HotColdApp: React.FC<NativeStackScreenProps<RootStackParamList, 'HotColdApp'>> = ({ navigation }) => {
  const { user, userProfile } = useAuth();

  // The one gate (services/miniApps.ts) — Lab-only today.
  if (!user || !canOpenMiniApp('hotcold', userProfile)) {
    return (
      <View style={styles.blocked}>
        <Text style={styles.blockedText}>Hot & Cold isn’t available on this account yet.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.blockedLink}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <HotColdProvider userId={user.uid} rootNavigation={navigation}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: Colors.lightGray },
          headerTintColor: HOTCOLD_ACCENT,
          headerTitleStyle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg, color: Colors.dark },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen name="HotColdHome" component={HotColdHomeScreen} options={{ title: 'Hot & Cold' }} />
        <Stack.Screen name="HotColdTimer" component={HotColdTimerScreen} options={{ title: 'Timer' }} />
        <Stack.Screen name="HotColdHistory" component={HotColdHistoryScreen} options={{ title: 'History' }} />
        <Stack.Screen name="HotColdSettings" component={HotColdSettingsScreen} options={{ title: 'Settings' }} />
      </Stack.Navigator>
    </HotColdProvider>
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
  blockedLink: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.md, color: HOTCOLD_ACCENT },
});
