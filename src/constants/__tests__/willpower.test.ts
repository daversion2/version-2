import { STREAK_TIERS, POINTS } from '../willpower';

describe('Willpower Constants', () => {
  describe('STREAK_TIERS', () => {
    it('starts at day 1 and runs to infinity', () => {
      expect(STREAK_TIERS[0].minDays).toBe(1);
      expect(STREAK_TIERS[STREAK_TIERS.length - 1].maxDays).toBe(Infinity);
    });

    it('is contiguous, with no gaps between tiers', () => {
      for (let i = 1; i < STREAK_TIERS.length; i++) {
        expect(STREAK_TIERS[i].minDays).toBe(STREAK_TIERS[i - 1].maxDays + 1);
      }
    });

    it('names every tier', () => {
      for (const tier of STREAK_TIERS) {
        expect(tier.name.trim().length).toBeGreaterThan(0);
      }
    });

    it('carries no multiplier — streaks never scale XP', () => {
      for (const tier of STREAK_TIERS) {
        expect(tier).not.toHaveProperty('multiplier');
      }
    });
  });

  describe('POINTS', () => {
    it('awards 1 point for a failed challenge', () => {
      expect(POINTS.FAILED_CHALLENGE).toBe(1);
    });

    it('has no multiplier entries', () => {
      expect(Object.keys(POINTS).some((k) => /MULTIPLIER/i.test(k))).toBe(false);
    });
  });
});
