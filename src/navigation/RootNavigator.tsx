import React, { useRef, useEffect, useCallback } from 'react';
import { ActivityIndicator, Linking, Platform, View } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { RETIRED_CTA_SCREENS } from '../types/rules';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../context/AuthContext';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';
// The previous flow (OverrideOnboardingScreen) is archived, unrouted and still
// compiling, in screens/Auth/_archived/ — see the README there before restoring
// it, since curated seeding was narrowed alongside this change.
import { OnboardingScreen } from '../screens/Auth/OnboardingScreen';
import { needsOnboarding } from '../services/onboardingSetup';
import { Colors } from '../constants/theme';
import { isLabExperimentOn } from '../services/lab';
import { saveClassicPref } from '../services/redesignPref';

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
      // A rule stored in Firestore can outlive the screen it points at, so
      // retired targets are dropped rather than navigated to. Same list the
      // in-app modal CTA reads — see types/rules.ts.
      if (RETIRED_CTA_SCREENS.includes(data.cta_screen)) return;
      if (data.cta_screen === 'Progress') {
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

// A session bell names the mini-app it belongs to (services/sessionBell.ts).
// Only when that route exists — signed in and past onboarding; the app's own
// gate decides the rest. Already open, navigate leaves it where it is.
const navigateToMiniApp = (
  navigationRef: React.RefObject<NavigationContainerRef<RootStackParamList> | null>,
  data: Record<string, string>
): boolean => {
  if (data.open !== 'MeditateApp') return false;
  const nav = navigationRef.current;
  if (nav?.isReady() && nav.getRootState()?.routeNames?.includes('MeditateApp')) nav.navigate('MeditateApp');
  return true;
};

const handleNotificationData = (
  navigationRef: React.RefObject<NavigationContainerRef<RootStackParamList> | null>,
  data: Record<string, string>
) => {
  if (navigateToFollowUp(navigationRef, data)) return;
  if (navigateToMiniApp(navigationRef, data)) return;
  navigateToRuleCta(navigationRef, data);
};

export const RootNavigator: React.FC = () => {
  const { user, userProfile, loading, profileLoaded } = useAuth();
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  // Hold the spinner from every sign-in until the profile has been read, so a
  // new account can't reach Main before its profile says it needs onboarding.
  const booting = loading || (!!user && !profileLoaded);
  const showOnboarding = !!user && needsOnboarding(userProfile);

  // A tapped notification can only be followed once the app's screens exist:
  // signed in, profile read, past onboarding, navigator ready. A cold launch
  // delivers the tap while the boot spinner is up, so it waits here until then.
  const canFollow = !booting && !!user && !showOnboarding;
  const canFollowRef = useRef(canFollow);
  canFollowRef.current = canFollow;
  const pendingRef = useRef<Record<string, string> | null>(null);
  const lastTapRef = useRef<string | null>(null);

  const followPending = useCallback(() => {
    const data = pendingRef.current;
    if (!data || !canFollowRef.current || !navigationRef.current?.isReady()) return;
    pendingRef.current = null;
    handleNotificationData(navigationRef, data);
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const receive = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      // The launch tap can arrive through both paths below; follow it once.
      // The date is part of the key: the daily reminder reuses its identifier.
      const key = `${response.notification.request.identifier}:${response.notification.date}`;
      if (key === lastTapRef.current) return;
      lastTapRef.current = key;
      // Otherwise the next ordinary launch would replay this tap.
      Notifications.clearLastNotificationResponseAsync().catch(() => {});
      const data = response.notification.request.content.data as Record<string, string>;
      if (!data) return;
      pendingRef.current = data;
      followPending();
    };

    // Cold start: app opened via notification tap
    Notifications.getLastNotificationResponseAsync().then(receive).catch(() => {});
    // Foreground/background: app already open when notification tapped
    const sub = Notifications.addNotificationResponseReceivedListener(receive);

    return () => sub.remove();
  }, [followPending]);

  // Finishing onboarding (or signing in) makes a held tap followable. The
  // timeout lets the navigator take on its new screens first.
  useEffect(() => {
    if (!canFollow) return;
    const id = setTimeout(followPending, 0);
    return () => clearTimeout(id);
  }, [canFollow, followPending]);

  // Copy the admin's "Classic look" switch to this device for the next launch
  // (it can't apply mid-session; see services/redesignPref.ts). Signed out = off.
  const classicOn = isLabExperimentOn(userProfile, 'classicLook');
  useEffect(() => {
    if (loading || (user && !userProfile)) return;
    saveClassicPref(classicOn);
  }, [loading, user, userProfile, classicOn]);

  if (booting) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.white }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} onReady={followPending}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : showOnboarding ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            {/* Mini-apps sit above the tabs. Loaded on first open via require,
                never at app start — the gate inside decides who may see it. */}
            <Stack.Screen
              name="WorkoutsApp"
              getComponent={() => require('../screens/Lab/experiments/workouts/WorkoutsApp').WorkoutsApp}
              options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
            />
            <Stack.Screen
              name="MeditateApp"
              getComponent={() => require('../screens/Lab/experiments/meditate/MeditateApp').MeditateApp}
              options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
            />
            <Stack.Screen
              name="ComposeApp"
              getComponent={() => require('../screens/Lab/experiments/compose/ComposeApp').ComposeApp}
              options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
            />
            <Stack.Screen
              name="MealsApp"
              getComponent={() => require('../screens/Lab/experiments/meals/MealsApp').MealsApp}
              options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
            />
            <Stack.Screen
              name="HotColdApp"
              getComponent={() => require('../screens/Lab/experiments/hotcold/HotColdApp').HotColdApp}
              options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
            />
            <Stack.Screen
              name="AvoidanceApp"
              getComponent={() => require('../screens/Lab/experiments/avoidance/AvoidanceApp').AvoidanceApp}
              options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
