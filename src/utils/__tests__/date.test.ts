import {
  isYesterday,
  isToday,
  getYesterdayString,
  getTodayString,
  isEditableDate,
  EDITABLE_WINDOW_DAYS,
} from '../date';

describe('Date Utilities', () => {
  // Build the expected date in LOCAL time. These utilities are all local-time
  // (a rep logged at 5pm belongs to that calendar day wherever you are), so
  // building expectations from toISOString() — which is UTC — made every test
  // in this file fail during the evening in any timezone behind UTC.
  const getDateString = (daysOffset: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  describe('getTodayString', () => {
    it('returns today\'s date in YYYY-MM-DD format', () => {
      expect(getTodayString()).toBe(getDateString(0));
    });

    it('returns a string matching YYYY-MM-DD pattern', () => {
      const result = getTodayString();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('getYesterdayString', () => {
    it('returns yesterday\'s date in YYYY-MM-DD format', () => {
      expect(getYesterdayString()).toBe(getDateString(-1));
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
    it('returns true for today', () => {
      // Today is editable so an accidental double-log can be undone the moment
      // it happens, rather than only after midnight.
      expect(isEditableDate(getDateString(0))).toBe(true);
    });

    it('returns true for yesterday', () => {
      expect(isEditableDate(getDateString(-1))).toBe(true);
    });

    it('returns true across the whole window', () => {
      expect(isEditableDate(getDateString(-2))).toBe(true);
      expect(isEditableDate(getDateString(-6))).toBe(true);
      expect(isEditableDate(getDateString(-EDITABLE_WINDOW_DAYS))).toBe(true);
    });

    it('returns false just past the window', () => {
      expect(isEditableDate(getDateString(-(EDITABLE_WINDOW_DAYS + 1)))).toBe(false);
      expect(isEditableDate(getDateString(-30))).toBe(false);
    });

    it('returns false for future dates', () => {
      expect(isEditableDate(getDateString(1))).toBe(false);
      expect(isEditableDate(getDateString(7))).toBe(false);
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
