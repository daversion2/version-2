// XP Bank Configuration
// These values can be adjusted to tune the gamification system

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
};
