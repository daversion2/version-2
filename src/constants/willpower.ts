// Willpower Bank Configuration
// These values can be adjusted to tune the gamification system

export const WILLPOWER_LEVELS = [
  { level: 1, pointsRequired: 0, title: 'Beginner Mind' },
  { level: 2, pointsRequired: 20, title: 'Badass in Training' },
  { level: 3, pointsRequired: 50, title: 'Committment and Consistent' },
  { level: 4, pointsRequired: 150, title: 'Challenger' },
  { level: 5, pointsRequired: 300, title: 'Willpower Warrior' },
  { level: 6, pointsRequired: 500, title: 'Grit Machine' },
  { level: 7, pointsRequired: 750, title: 'Resilient AF' },
  { level: 8, pointsRequired: 1000, title: 'Unstoppable' },
  { level: 9, pointsRequired: 1500, title: 'Master' },
  { level: 10, pointsRequired: 2500, title: 'Grandmaster' },
  { level: 11, pointsRequired: 4000, title: 'Willpower Legend' },
];

export const STREAK_MULTIPLIERS = [
  { minDays: 1, maxDays: 2, multiplier: 1.0 },
  { minDays: 3, maxDays: 6, multiplier: 1.2 },
  { minDays: 7, maxDays: 13, multiplier: 1.5 },
  { minDays: 14, maxDays: 29, multiplier: 1.75 },
  { minDays: 30, maxDays: Infinity, multiplier: 2.0 },
];

// Points awarded for different actions
export const POINTS = {
  FAILED_CHALLENGE: 1,
  REFLECTION_BONUS: 1,
};
