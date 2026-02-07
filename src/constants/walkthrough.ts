import { Challenge } from '../types';

export interface WalkthroughStep {
  screen: string;
  text: string;
  target?: string; // ref key for spotlight; omit for full-screen overlay
}

export const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  { screen: 'HomeScreen', target: 'challengeBtn', text: 'Tap here to start your daily challenge. One challenge per day — make it count.' },
  { screen: 'StartChallenge', text: 'Create a fresh challenge or revisit one from your history. Past challenges help you build on what works.' },
  { screen: 'CreateChallenge', text: 'Describe your challenge, set the expected difficulty, and define what success looks like. Clear criteria lead to better results.' },
  { screen: 'CompleteChallenge', text: 'Mark it as success or failure — both earn Willpower Points. Rate the actual difficulty and add reflections for bonus points.' },
  { screen: 'HomeScreen', target: 'habitsAdd', text: 'Habits are your daily anchors. Tap here to add activities you want to repeat throughout the week.' },
  { screen: 'ManageHabits', text: 'Name your habit, pick a category, and set how many times per week. Start realistic, then build up.' },
  { screen: 'HomeScreen', target: 'habitArea', text: 'Your habits live here. Tap to log a completion and earn Willpower Points. Easy or challenging — you decide.' },
  { screen: 'Challenges', text: 'Your challenge history lives here. Review past wins, learn from setbacks, and track your patterns over time.' },
  { screen: 'Progress', text: "Welcome to your Willpower Bank. Watch your level grow, maintain your streak for multipliers, and track your Suck Factor — how hard you're really pushing." },
  { screen: 'Settings', text: 'Customize your categories to match your goals. Make them yours.' },
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
