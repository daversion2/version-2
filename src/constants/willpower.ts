// XP is the running total of friction the user has pushed through. It is never
// multiplied — not by streaks, not by bonuses — so the number stays honest.

// Streak milestones, named for the celebration only. They don't change XP.
export const STREAK_TIERS = [
  { minDays: 1, maxDays: 2, name: 'Starting' },
  { minDays: 3, maxDays: 6, name: 'Building Momentum' },
  { minDays: 7, maxDays: 13, name: 'On Fire' },
  { minDays: 14, maxDays: 29, name: 'Unstoppable' },
  { minDays: 30, maxDays: Infinity, name: 'Legendary' },
];

// Points awarded for different actions
export const POINTS = {
  FAILED_CHALLENGE: 1,
};
