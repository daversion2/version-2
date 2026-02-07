import { WILLPOWER_LEVELS, STREAK_MULTIPLIERS, POINTS } from '../willpower';

describe('Willpower Constants', () => {
  describe('WILLPOWER_LEVELS', () => {
    it('has exactly 10 levels', () => {
      expect(WILLPOWER_LEVELS).toHaveLength(10);
    });

    it('levels are numbered 1 through 10', () => {
      WILLPOWER_LEVELS.forEach((level, index) => {
        expect(level.level).toBe(index + 1);
      });
    });

    it('each level has required properties', () => {
      WILLPOWER_LEVELS.forEach((level) => {
        expect(level.level).toBeDefined();
        expect(typeof level.level).toBe('number');
        expect(level.pointsRequired).toBeDefined();
        expect(typeof level.pointsRequired).toBe('number');
        expect(level.title).toBeDefined();
        expect(typeof level.title).toBe('string');
      });
    });

    it('level 1 starts at 0 points', () => {
      expect(WILLPOWER_LEVELS[0].pointsRequired).toBe(0);
    });

    it('points required increases with each level', () => {
      for (let i = 1; i < WILLPOWER_LEVELS.length; i++) {
        expect(WILLPOWER_LEVELS[i].pointsRequired).toBeGreaterThan(
          WILLPOWER_LEVELS[i - 1].pointsRequired
        );
      }
    });

    it('has correct level titles', () => {
      expect(WILLPOWER_LEVELS[0].title).toBe('Beginner Mind');
      expect(WILLPOWER_LEVELS[9].title).toBe('Willpower Legend');
    });

    it('level 10 requires 4000 points', () => {
      expect(WILLPOWER_LEVELS[9].pointsRequired).toBe(4000);
    });
  });

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
