/**
 * Check if a date string (YYYY-MM-DD) represents yesterday
 */
export const isYesterday = (dateStr: string): boolean => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return dateStr === yesterday.toISOString().split('T')[0];
};

/**
 * Check if a date string (YYYY-MM-DD) represents today
 */
export const isToday = (dateStr: string): boolean => {
  return dateStr === new Date().toISOString().split('T')[0];
};

/**
 * Get yesterday's date as YYYY-MM-DD string
 */
export const getYesterdayString = (): string => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
};

/**
 * Get today's date as YYYY-MM-DD string
 */
export const getTodayString = (): string => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Check if a date string is editable (yesterday only for past dates)
 */
export const isEditableDate = (dateStr: string): boolean => {
  return isYesterday(dateStr);
};
