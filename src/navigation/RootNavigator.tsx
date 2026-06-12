import React, { useRef, useEffect } from 'react';
import { ActivityIndicator, Linking, Platform, View } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../context/AuthContext';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';
import { OnboardingScreen } from '../screens/Auth/OnboardingScreen';
import { Colors } from '../constants/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navigateToFollowUp = (
  navigationRef: React.RefObject<NavigationContainerRef<RootStackParamList> | null>,
  data: Record<string, string>
): boolean => {
  if (data.screen === 'MicroExerciseFollowUp' && data.entry_id && data.user_id) {
    navigationRef.current?.navigate('Main', {
      screen: 'Home',
      params: {
        screen: 'MicroExerciseFollowUp',
        params: { entry_id: data.entry_id, user_id: data.user_id },
      },
    });
    return true;
  }
  return false;
};

// Rules-engine CTA targets: pushes carry cta_screen (curated screen/tab name)
// or cta_url (external link) in their data payload.
const navigateToRuleCta = (
  navigationRef: React.RefObject<NavigationContainerRef<RootStackParamList> | null>,
  data: Record<string, string>
) => {
  try {
    if (data.cta_url) {
      Linking.openURL(data.cta_url).catch((err) =>
        console.warn('Failed to open CTA URL:', err)
      );
      return;
    }
    if (data.cta_screen) {
      if (data.cta_screen === 'Progress' || data.cta_screen === 'Tools') {
        navigationRef.current?.navigate('Main', { screen: data.cta_screen } as any);
      } else {
        navigationRef.current?.navigate('Main', {
          screen: 'Home',
          params: { screen: data.cta_screen },
        } as any);
      }
    }
  } catch (err) {
    console.warn('Failed to navigate to CTA target:', err);
  }
};

const handleNotificationData = (
  navigationRef: React.RefObject<NavigationContainerRef<RootStackParamList> | null>,
  data: Record<string, string>
) => {
  if (navigateToFollowUp(navigationRef, data)) return;
  navigateToRuleCta(navigationRef, data);
};

export const RootNavigator: React.FC = () => {
  const { user, userProfile, loading } = useAuth();
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  // Handle notification deep links for micro-exercise follow-ups
  useEffect(() => {
    if (Platform.OS === 'web') return;

    // Handle cold-start: app opened via notification tap
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const data = response.notification.request.content.data as Record<string, string>;
      if (data) handleNotificationData(navigationRef, data);
    });

    // Handle foreground/background: app already open when notification tapped
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, string>;
      if (data) handleNotificationData(navigationRef, data);
    });

    return () => sub.remove();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.white }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const needsOnboarding = user && userProfile?.has_completed_onboarding === false;

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : needsOnboarding ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
