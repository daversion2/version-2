// Willpower Bank Configuration
// These values can be adjusted to tune the gamification system

export const WILLPOWER_LEVELS = [
  { level: 1, pointsRequired: 0, title: 'First Steps' },
  { level: 2, pointsRequired: 20, title: 'First Steps Taken' },
  { level: 3, pointsRequired: 50, title: 'Proof of Commitment' },
  { level: 4, pointsRequired: 150, title: 'Building Momentum' },
  { level: 5, pointsRequired: 300, title: 'Pattern Breaker' },
  { level: 6, pointsRequired: 500, title: 'Consistent Action' },
  { level: 7, pointsRequired: 750, title: 'Undeniable Evidence' },
  { level: 8, pointsRequired: 1000, title: 'Identity Shift' },
  { level: 9, pointsRequired: 1500, title: 'Deep Change' },
  { level: 10, pointsRequired: 2500, title: 'Living Proof' },
  { level: 11, pointsRequired: 4000, title: 'The Person You Said You Would Be' },
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
  BUDDY_BONUS_MULTIPLIER: 1.25,
  MICRO_GOAL_BASE: 1,
  MICRO_GOAL_CLEAN_SWEEP: 2,
};
