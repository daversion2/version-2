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
import { Copy } from '../../../../components/common/Copy';
import { useCopy } from '../../../../context/CopyContext';

const Stack = createNativeStackNavigator<AvoidanceStackParamList>();

/**
 * Avoidance Training (Lab): write down what you keep putting off, face one a
 * day, and see that the dread was worse than the thing. Full screen over the
 * whole app; loaded with getComponent + require in RootNavigator, so none of
 * this runs at app start. Spec: docs/micro-apps/avoidance.md.
 */
export const AvoidanceApp: React.FC<NativeStackScreenProps<RootStackParamList, 'AvoidanceApp'>> = ({ navigation }) => {
  const { user, userProfile } = useAuth();
  const t = useCopy();

  // The one gate (services/miniApps.ts) — Lab-only today.
  if (!user || !canOpenMiniApp('avoidance', userProfile)) {
    return (
      <View style={styles.blocked}>
        <Copy id="avoidance.app.blocked" style={styles.blockedText}>Avoidance Training isn’t available on this account yet.</Copy>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Copy id="avoidance.app.close" style={styles.blockedLink}>Close</Copy>
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
        <Stack.Screen name="AvoidanceHome" component={AvoidanceHomeScreen} options={{ title: t('avoidance.app.titleHome', 'Avoidance') }} />
        <Stack.Screen name="AvoidanceCleared" component={AvoidanceClearedScreen} options={{ title: t('avoidance.app.titleCleared', 'Cleared') }} />
        <Stack.Screen name="AvoidanceSettings" component={AvoidanceSettingsScreen} options={{ title: t('avoidance.app.titleSettings', 'Settings') }} />
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
