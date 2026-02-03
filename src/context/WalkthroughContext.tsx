import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { NavigationContainerRef } from '@react-navigation/native';
import { useAuth } from './AuthContext';
import { markWalkthroughComplete } from '../services/users';
import { createHabit } from '../services/habits';
import { Challenge } from '../types';

export interface WalkthroughStep {
  screen: string;
  text: string;
  target?: string; // ref key for spotlight; omit for full-screen overlay
}

export const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  { screen: 'HomeScreen', target: 'challengeBtn', text: 'This is where you start a new challenge' },
  { screen: 'StartChallenge', text: 'You can create a new challenge or select a previous one' },
  { screen: 'CreateChallenge', text: 'Provide the details of your challenge' },
  { screen: 'CompleteChallenge', text: "Once you've completed your challenge, mark it as success or failure, rate the actual difficulty, and answer the reflection questions" },
  { screen: 'HomeScreen', target: 'habitsAdd', text: 'Add repeating habits to build discipline' },
  { screen: 'ManageHabits', text: 'Create habits like this one to track your recurring goals' },
  { screen: 'HomeScreen', target: 'habitArea', text: 'Your habits appear here — tap to log a completion' },
  { screen: 'Challenges', text: 'View all your past challenges and performance stats here' },
  { screen: 'Progress', text: 'Track your streaks, points, and activity over time' },
  { screen: 'Settings', text: 'Customize your categories to fit your needs' },
];

export const MOCK_CHALLENGE: Challenge = {
  id: 'walkthrough-mock',
  user_id: '',
  name: 'Placeholder challenge name',
  category_id: 'Physical',
  date: new Date().toISOString().split('T')[0],
  difficulty_expected: 3,
  status: 'active',
  created_at: new Date().toISOString(),
  description: 'Placeholder description',
  success_criteria: 'Placeholder success criteria',
  why: 'Placeholder reason',
};

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
