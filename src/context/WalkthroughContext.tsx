import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { NavigationContainerRef } from '@react-navigation/native';
import { useAuth } from './AuthContext';
import { markWalkthroughComplete } from '../services/users';
import { createHabit } from '../services/habits';
import { WALKTHROUGH_STEPS, MOCK_CHALLENGE, WalkthroughStep } from '../constants/walkthrough';

// Re-export for backwards compatibility
export { WALKTHROUGH_STEPS, MOCK_CHALLENGE, WalkthroughStep };

interface WalkthroughContextType {
  isWalkthroughActive: boolean;
  currentStep: number;
  currentStepConfig: WalkthroughStep | null;
  nextStep: () => void;
  skipWalkthrough: () => void;
  restartWalkthrough: () => void;
}

const WalkthroughContext = createContext<WalkthroughContextType>({
  isWalkthroughActive: false,
  currentStep: 0,
  currentStepConfig: null,
  nextStep: () => {},
  skipWalkthrough: () => {},
  restartWalkthrough: () => {},
});

export const useWalkthrough = () => useContext(WalkthroughContext);

export const WalkthroughProvider: React.FC<{
  shouldStart: boolean;
  navigationRef: React.RefObject<NavigationContainerRef<any> | null>;
  children: React.ReactNode;
}> = ({ shouldStart, navigationRef, children }) => {
  const { user, refreshProfile } = useAuth();
  const [isActive, setIsActive] = useState(shouldStart);
  const [currentStep, setCurrentStep] = useState(0);
  const finishing = useRef(false);

  const navigateToStep = useCallback((stepIdx: number) => {
    const step = WALKTHROUGH_STEPS[stepIdx];
    const nav = navigationRef.current;
    if (!nav) return;

    switch (step.screen) {
      case 'HomeScreen':
        (nav as any).navigate('Home', { screen: 'HomeScreen' });
        break;
      case 'StartChallenge':
        (nav as any).navigate('Home', { screen: 'StartChallenge' });
        break;
      case 'CreateChallenge':
        (nav as any).navigate('Home', { screen: 'CreateChallenge' });
        break;
      case 'CompleteChallenge':
        (nav as any).navigate('Home', {
          screen: 'CompleteChallenge',
          params: { challenge: MOCK_CHALLENGE },
        });
        break;
      case 'ManageHabits':
        (nav as any).navigate('Home', { screen: 'ManageHabits' });
        break;
      case 'Challenges':
        (nav as any).navigate('Challenges');
        break;
      case 'Progress':
        (nav as any).navigate('Progress');
        break;
      case 'Settings':
        (nav as any).navigate('Settings');
        break;
    }
  }, [navigationRef]);

  const finish = useCallback(async () => {
    if (finishing.current) return;
    finishing.current = true;
    setIsActive(false);
    // Navigate to Home tab
    const nav = navigationRef.current;
    if (nav) {
      (nav as any).navigate('Home', { screen: 'HomeScreen' });
    }
    if (user) {
      try {
        await markWalkthroughComplete(user.uid);
        await refreshProfile();
      } catch (e) {
        console.error('Failed to mark walkthrough complete:', e);
      }
    }
  }, [user, refreshProfile, navigationRef]);

  const nextStep = useCallback(async () => {
    const nextIdx = currentStep + 1;

    // Special: create habit when leaving ManageHabits step
    if (currentStep === 5 && user) {
      try {
        await createHabit(user.uid, {
          name: 'Workout',
          category_id: 'Physical',
          target_count_per_week: 5,
        });
      } catch (e) {
        console.warn('Walkthrough habit creation failed:', e);
      }
    }

    if (nextIdx >= WALKTHROUGH_STEPS.length) {
      finish();
      return;
    }

    setCurrentStep(nextIdx);
    navigateToStep(nextIdx);
  }, [currentStep, finish, navigateToStep, user]);

  const skipWalkthrough = useCallback(() => {
    finish();
  }, [finish]);

  const restartWalkthrough = useCallback(() => {
    finishing.current = false;
    setCurrentStep(0);
    setIsActive(true);
    const nav = navigationRef.current;
    if (nav) {
      (nav as any).navigate('Home', { screen: 'HomeScreen' });
    }
  }, [navigationRef]);

  const currentStepConfig = isActive ? WALKTHROUGH_STEPS[currentStep] : null;

  return (
    <WalkthroughContext.Provider
      value={{
        isWalkthroughActive: isActive,
        currentStep,
        currentStepConfig,
        nextStep,
        skipWalkthrough,
        restartWalkthrough,
      }}
    >
      {children}
    </WalkthroughContext.Provider>
  );
};
