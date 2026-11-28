// XP is the running total of friction the user has pushed through. It is never
// multiplied — not by streaks, not by bonuses — so the number stays honest.

// Streak milestones, named for the celebration only. They don't change XP.
export const STREAK_TIERS = [
  { minDays: 1, maxDays: 2, name: 'Starting' },
  { minDays: 3, maxDays: 6, name: 'Rolling' },
  { minDays: 7, maxDays: 13, name: 'Steady' },
  { minDays: 14, maxDays: 29, name: 'Stubborn' },
  { minDays: 30, maxDays: Infinity, name: 'Capable' },
];

// Points awarded for different actions
export const POINTS = {
  FAILED_CHALLENGE: 1,
};
