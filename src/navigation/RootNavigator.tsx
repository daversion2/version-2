import React, { useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';
import { OnboardingScreen } from '../screens/Auth/OnboardingScreen';
import { Colors } from '../constants/theme';
import { WalkthroughProvider } from '../context/WalkthroughContext';

const Stack = createNativeStackNavigator();

export const RootNavigator: React.FC = () => {
  const { user, userProfile, loading } = useAuth();
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

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
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
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
