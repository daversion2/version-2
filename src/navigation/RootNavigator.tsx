import React, { useRef, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../context/AuthContext';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';
import { WhyDiscoveryOnboarding } from '../screens/Auth/WhyDiscoveryOnboarding';
import { Colors } from '../constants/theme';
import { WalkthroughProvider } from '../context/WalkthroughContext';

const Stack = createNativeStackNavigator();

const navigateToFollowUp = (
  navigationRef: React.RefObject<NavigationContainerRef<any>>,
  data: Record<string, string>
) => {
  if (data.screen === 'MicroExerciseFollowUp' && data.entry_id && data.user_id) {
    navigationRef.current?.navigate('Main' as never, {
      screen: 'Home',
      params: {
        screen: 'MicroExerciseFollowUp',
        params: { entry_id: data.entry_id, user_id: data.user_id },
      },
    } as never);
  }
};

export const RootNavigator: React.FC = () => {
  const { user, userProfile, loading } = useAuth();
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  // Handle notification deep links for micro-exercise follow-ups
  useEffect(() => {
    // Handle cold-start: app opened via notification tap
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const data = response.notification.request.content.data as Record<string, string>;
      if (data) navigateToFollowUp(navigationRef, data);
    });

    // Handle foreground/background: app already open when notification tapped
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, string>;
      if (data) navigateToFollowUp(navigationRef, data);
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
  const needsWalkthrough = !!user && userProfile?.has_completed_onboarding === true && userProfile?.has_completed_walkthrough === false;

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : needsOnboarding ? (
          <Stack.Screen name="Onboarding" component={WhyDiscoveryOnboarding} />
        ) : (
          <Stack.Screen name="Main">
            {() => (
              <WalkthroughProvider shouldStart={needsWalkthrough} navigationRef={navigationRef}>
                <MainTabs />
              </WalkthroughProvider>
            )}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
