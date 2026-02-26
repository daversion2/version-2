/**
 * Format a Date as YYYY-MM-DD in the device's local timezone
 */
const toLocalDateString = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Check if a date string (YYYY-MM-DD) represents yesterday
 */
export const isYesterday = (dateStr: string): boolean => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return dateStr === toLocalDateString(yesterday);
};

/**
 * Check if a date string (YYYY-MM-DD) represents today
 */
export const isToday = (dateStr: string): boolean => {
  return dateStr === toLocalDateString(new Date());
};

/**
 * Get yesterday's date as YYYY-MM-DD string
 */
export const getYesterdayString = (): string => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return toLocalDateString(yesterday);
};

/**
 * Get today's date as YYYY-MM-DD string
 */
export const getTodayString = (): string => {
  return toLocalDateString(new Date());
};

/**
 * Check if a date string is editable (yesterday only for past dates)
 */
export const isEditableDate = (dateStr: string): boolean => {
  return isYesterday(dateStr);
};
