import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing } from '../../../../constants/theme';
import { RootStackParamList } from '../../../../types/navigation';
import { AvoidanceStackParamList } from '../../../../types/avoidance';
import { useAuth } from '../../../../context/AuthContext';
import { canOpenMiniApp } from '../../../../services/miniApps';
import { AvoidanceProvider } from './AvoidanceContext';
import { AvoidanceHomeScreen } from './AvoidanceHomeScreen';
import { AvoidanceClearedScreen } from './AvoidanceClearedScreen';
import { AvoidanceSettingsScreen } from './AvoidanceSettingsScreen';
import { AVOIDANCE_ACCENT } from './components/avoidanceStyle';

const Stack = createNativeStackNavigator<AvoidanceStackParamList>();

/**
 * Avoidance Training (Lab): write down what you keep putting off, face one a
 * day, and see that the dread was worse than the thing. Full screen over the
 * whole app; loaded with getComponent + require in RootNavigator, so none of
 * this runs at app start. Spec: docs/micro-apps/avoidance.md.
 */
export const AvoidanceApp: React.FC<NativeStackScreenProps<RootStackParamList, 'AvoidanceApp'>> = ({ navigation }) => {
  const { user, userProfile } = useAuth();

  // The one gate (services/miniApps.ts) — Lab-only today.
  if (!user || !canOpenMiniApp('avoidance', userProfile)) {
    return (
      <View style={styles.blocked}>
        <Text style={styles.blockedText}>Avoidance Training isn’t available on this account yet.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.blockedLink}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <AvoidanceProvider userId={user.uid} rootNavigation={navigation}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: Colors.lightGray },
          headerTintColor: AVOIDANCE_ACCENT,
          headerTitleStyle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg, color: Colors.dark },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen name="AvoidanceHome" component={AvoidanceHomeScreen} options={{ title: 'Avoidance' }} />
        <Stack.Screen name="AvoidanceCleared" component={AvoidanceClearedScreen} options={{ title: 'Cleared' }} />
        <Stack.Screen name="AvoidanceSettings" component={AvoidanceSettingsScreen} options={{ title: 'Settings' }} />
      </Stack.Navigator>
    </AvoidanceProvider>
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
  blockedLink: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.md, color: AVOIDANCE_ACCENT },
});
