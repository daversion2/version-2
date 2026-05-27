import { STREAK_MULTIPLIERS, POINTS } from '../willpower';

describe('Willpower Constants', () => {
  describe('STREAK_MULTIPLIERS', () => {
    it('has 5 streak tiers', () => {
      expect(STREAK_MULTIPLIERS).toHaveLength(5);
    });

    it('each tier has required properties', () => {
      STREAK_MULTIPLIERS.forEach((tier) => {
        expect(tier.minDays).toBeDefined();
        expect(typeof tier.minDays).toBe('number');
        expect(tier.maxDays).toBeDefined();
        expect(typeof tier.maxDays).toBe('number');
        expect(tier.multiplier).toBeDefined();
        expect(typeof tier.multiplier).toBe('number');
      });
    });

    it('first tier starts at day 1', () => {
      expect(STREAK_MULTIPLIERS[0].minDays).toBe(1);
    });

    it('tiers are contiguous (no gaps)', () => {
      for (let i = 1; i < STREAK_MULTIPLIERS.length; i++) {
        expect(STREAK_MULTIPLIERS[i].minDays).toBe(
          STREAK_MULTIPLIERS[i - 1].maxDays + 1
        );
      }
    });

    it('last tier extends to infinity', () => {
      const lastTier = STREAK_MULTIPLIERS[STREAK_MULTIPLIERS.length - 1];
      expect(lastTier.maxDays).toBe(Infinity);
    });

    it('multipliers increase with each tier', () => {
      for (let i = 1; i < STREAK_MULTIPLIERS.length; i++) {
        expect(STREAK_MULTIPLIERS[i].multiplier).toBeGreaterThan(
          STREAK_MULTIPLIERS[i - 1].multiplier
        );
      }
    });

    it('multipliers range from 1.0 to 2.0', () => {
      expect(STREAK_MULTIPLIERS[0].multiplier).toBe(1.0);
      expect(STREAK_MULTIPLIERS[STREAK_MULTIPLIERS.length - 1].multiplier).toBe(2.0);
    });

    it('has correct tier boundaries', () => {
      expect(STREAK_MULTIPLIERS[0]).toEqual({ minDays: 1, maxDays: 2, multiplier: 1.0 });
      expect(STREAK_MULTIPLIERS[1]).toEqual({ minDays: 3, maxDays: 6, multiplier: 1.2 });
      expect(STREAK_MULTIPLIERS[2]).toEqual({ minDays: 7, maxDays: 13, multiplier: 1.5 });
      expect(STREAK_MULTIPLIERS[3]).toEqual({ minDays: 14, maxDays: 29, multiplier: 1.75 });
      expect(STREAK_MULTIPLIERS[4]).toEqual({ minDays: 30, maxDays: Infinity, multiplier: 2.0 });
    });
  });

  describe('POINTS', () => {
    it('has FAILED_CHALLENGE points defined', () => {
      expect(POINTS.FAILED_CHALLENGE).toBeDefined();
      expect(typeof POINTS.FAILED_CHALLENGE).toBe('number');
      expect(POINTS.FAILED_CHALLENGE).toBe(1);
    });

    it('has REFLECTION_BONUS points defined', () => {
      expect(POINTS.REFLECTION_BONUS).toBeDefined();
      expect(typeof POINTS.REFLECTION_BONUS).toBe('number');
      expect(POINTS.REFLECTION_BONUS).toBe(1);
    });

    it('all point values are positive', () => {
      Object.values(POINTS).forEach((value) => {
        expect(value).toBeGreaterThan(0);
      });
    });
  });
});
