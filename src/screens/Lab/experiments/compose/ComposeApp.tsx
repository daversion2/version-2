import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing } from '../../../../constants/theme';
import { RootStackParamList } from '../../../../types/navigation';
import { ComposeStackParamList } from '../../../../types/compose';
import { useAuth } from '../../../../context/AuthContext';
import { canOpenMiniApp } from '../../../../services/miniApps';
import { COMPOSE_ACCENT } from './components/composeStyle';

const Stack = createNativeStackNavigator<ComposeStackParamList>();

/** expo-audio is native: a build compiled without it can't play anything. */
function hasAudio(): boolean {
  try {
    require('expo-audio');
    return true;
  } catch {
    return false;
  }
}

/**
 * Compose (Lab): describe a meditation or guided-imagery session, and the
 * composeSession Cloud Function writes, voices and mixes it. Finished sessions
 * can be saved to a private "My recordings". Full screen over the whole app,
 * loaded with getComponent in RootNavigator, so none of this runs at app start.
 * The screens load lazily too, so nothing here touches expo-audio until the
 * check below has passed.
 */
export const ComposeApp: React.FC<NativeStackScreenProps<RootStackParamList, 'ComposeApp'>> = ({ navigation }) => {
  const { user, userProfile } = useAuth();

  const blocked = !user || !canOpenMiniApp('compose', userProfile)
    ? 'Compose isn’t available on this account yet.'
    : !hasAudio()
      ? 'Compose needs the latest version of the app. Update it from the App Store, then come back.'
      : null;

  if (blocked) {
    return (
      <View style={styles.blocked}>
        <Text style={styles.blockedText}>{blocked}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.blockedLink}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.lightGray },
        headerTintColor: COMPOSE_ACCENT,
        headerTitleStyle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg, color: Colors.dark },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen
        name="ComposeHome"
        getComponent={() => require('./ComposeHomeScreen').ComposeHomeScreen}
        options={{ title: 'Compose' }}
      />
      <Stack.Screen
        name="ComposeNew"
        getComponent={() => require('./ComposeNewScreen').ComposeNewScreen}
        options={{ title: 'New session' }}
      />
      <Stack.Screen
        name="ComposeSession"
        getComponent={() => require('./ComposeSessionScreen').ComposeSessionScreen}
        options={{ title: '' }}
      />
    </Stack.Navigator>
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
  blockedLink: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.md, color: COMPOSE_ACCENT },
});
