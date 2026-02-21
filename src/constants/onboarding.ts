// Onboarding step type
export interface OnboardingStep {
  title: string;
  body: string;
  type?: 'info' | 'username';
}

// Onboarding steps shown to new users
export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: 'Challenge Yourself Daily',
    body: 'Every day, pick one challenge that pushes you outside your comfort zone. Small or big, it will slowly rewire your brain to be more resilient.',
  },
  {
    title: 'Build Habits That Stick',
    body: 'Pair your challenges with daily habits. Consistency compounds. Track your progress and build lasting discipline.',
  },
  {
    title: 'Introducing the Willpower Bank',
    body: 'Every challenge and habit earns you Willpower Points based on difficulty. We use these points to track progress and gamify uncomfortable tasks. Unlock multipliers with consistency.',
  },
  {
    title: 'Embrace Discomfort',
    body: "Your Suck Factor shows how hard you push yourself based on how you rate each activity. More discomfort = More growth.",
  },
  {
    title: 'Safety First',
    body: 'While the whole purpose of this app is to get outside your comfort zone, NEVER do anything that will be truly harmful to yourself or others. Always use common sense and prioritize safety.',
  },
  {
    title: 'Create Your Username',
    body: 'Choose a username that will be displayed to other users in the community. This helps create accountability and connection.',
    type: 'username',
  },
];
