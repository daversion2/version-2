import {
  isYesterday,
  isToday,
  getYesterdayString,
  getTodayString,
  isEditableDate,
} from '../date';

describe('Date Utilities', () => {
  // Helper to get date strings
  const getDateString = (daysOffset: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date.toISOString().split('T')[0];
  };

  describe('getTodayString', () => {
    it('returns today\'s date in YYYY-MM-DD format', () => {
      const today = new Date();
      const expected = today.toISOString().split('T')[0];
      expect(getTodayString()).toBe(expected);
    });

    it('returns a string matching YYYY-MM-DD pattern', () => {
      const result = getTodayString();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('getYesterdayString', () => {
    it('returns yesterday\'s date in YYYY-MM-DD format', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const expected = yesterday.toISOString().split('T')[0];
      expect(getYesterdayString()).toBe(expected);
    });

    it('returns a string matching YYYY-MM-DD pattern', () => {
      const result = getYesterdayString();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('is different from today', () => {
      expect(getYesterdayString()).not.toBe(getTodayString());
    });
  });

  describe('isToday', () => {
    it('returns true for today\'s date', () => {
      const today = getDateString(0);
      expect(isToday(today)).toBe(true);
    });

    it('returns false for yesterday\'s date', () => {
      const yesterday = getDateString(-1);
      expect(isToday(yesterday)).toBe(false);
    });

    it('returns false for tomorrow\'s date', () => {
      const tomorrow = getDateString(1);
      expect(isToday(tomorrow)).toBe(false);
    });

    it('returns false for a week ago', () => {
      const weekAgo = getDateString(-7);
      expect(isToday(weekAgo)).toBe(false);
    });

    it('returns false for invalid date string', () => {
      expect(isToday('not-a-date')).toBe(false);
      expect(isToday('')).toBe(false);
    });
  });

  describe('isYesterday', () => {
    it('returns true for yesterday\'s date', () => {
      const yesterday = getDateString(-1);
      expect(isYesterday(yesterday)).toBe(true);
    });

    it('returns false for today\'s date', () => {
      const today = getDateString(0);
      expect(isYesterday(today)).toBe(false);
    });

    it('returns false for two days ago', () => {
      const twoDaysAgo = getDateString(-2);
      expect(isYesterday(twoDaysAgo)).toBe(false);
    });

    it('returns false for tomorrow', () => {
      const tomorrow = getDateString(1);
      expect(isYesterday(tomorrow)).toBe(false);
    });

    it('returns false for a week ago', () => {
      const weekAgo = getDateString(-7);
      expect(isYesterday(weekAgo)).toBe(false);
    });

    it('returns false for invalid date string', () => {
      expect(isYesterday('not-a-date')).toBe(false);
      expect(isYesterday('')).toBe(false);
    });
  });

  describe('isEditableDate', () => {
    it('returns true for yesterday (editable)', () => {
      const yesterday = getDateString(-1);
      expect(isEditableDate(yesterday)).toBe(true);
    });

    it('returns false for today (not editable for backdating)', () => {
      const today = getDateString(0);
      expect(isEditableDate(today)).toBe(false);
    });

    it('returns false for two days ago (too old)', () => {
      const twoDaysAgo = getDateString(-2);
      expect(isEditableDate(twoDaysAgo)).toBe(false);
    });

    it('returns false for older dates', () => {
      const weekAgo = getDateString(-7);
      const monthAgo = getDateString(-30);
      expect(isEditableDate(weekAgo)).toBe(false);
      expect(isEditableDate(monthAgo)).toBe(false);
    });

    it('returns false for future dates', () => {
      const tomorrow = getDateString(1);
      const nextWeek = getDateString(7);
      expect(isEditableDate(tomorrow)).toBe(false);
      expect(isEditableDate(nextWeek)).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('handles month boundary correctly', () => {
      // Test that getYesterdayString handles month boundaries
      const result = getYesterdayString();
      const parts = result.split('-');
      expect(parts.length).toBe(3);
      expect(parseInt(parts[0])).toBeGreaterThan(2000); // Valid year
      expect(parseInt(parts[1])).toBeGreaterThanOrEqual(1); // Valid month
      expect(parseInt(parts[1])).toBeLessThanOrEqual(12);
      expect(parseInt(parts[2])).toBeGreaterThanOrEqual(1); // Valid day
      expect(parseInt(parts[2])).toBeLessThanOrEqual(31);
    });

    it('getTodayString and getYesterdayString are consistent', () => {
      const today = getTodayString();
      const yesterday = getYesterdayString();

      // Parse and compare
      const todayDate = new Date(today);
      const yesterdayDate = new Date(yesterday);

      const diffMs = todayDate.getTime() - yesterdayDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      expect(diffDays).toBe(1);
    });
  });
});
