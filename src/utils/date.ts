/**
 * Format a Date as YYYY-MM-DD in the device's local timezone
 */
export const toLocalDateString = (d: Date): string => {
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
 * Get tomorrow's date as YYYY-MM-DD string
 */
export const getTomorrowString = (): string => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return toLocalDateString(tomorrow);
};

/**
 * Check if a date string is editable (yesterday only for past dates)
 */
export const isEditableDate = (dateStr: string): boolean => {
  return isYesterday(dateStr);
};

/**
 * Get Monday of the week containing the given date (Mon-start weeks)
 */
export const getWeekStart = (d: Date): Date => {
  const result = new Date(d);
  const day = result.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
};

/**
 * Get Sunday of the week containing the given date
 */
export const getWeekEnd = (d: Date): Date => {
  const monday = getWeekStart(d);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return sunday;
};

/**
 * Get array of 7 YYYY-MM-DD strings (Mon→Sun) for the week containing the given date
 */
export const getWeekDates = (d: Date): string[] => {
  const monday = getWeekStart(d);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    return toLocalDateString(day);
  });
};

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Get short day name from a YYYY-MM-DD string: "Mon", "Tue", etc.
 */
export const formatShortDay = (dateStr: string): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return DAY_NAMES[date.getDay()];
};

/**
 * Format a YYYY-MM-DD string for display: "Mon, May 5"
 */
export const formatDayHeader = (dateStr: string): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${DAY_NAMES[date.getDay()]}, ${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;
};

/**
 * Format week range for display: "May 5 – 11, 2026" or "Apr 28 – May 4, 2026"
 */
export const formatWeekRange = (startStr: string, endStr: string): string => {
  const [sy, sm, sd] = startStr.split('-').map(Number);
  const [ey, em, ed] = endStr.split('-').map(Number);
  const startMonth = MONTH_NAMES[sm - 1];
  const endMonth = MONTH_NAMES[em - 1];
  if (sm === em) {
    return `${startMonth} ${sd} – ${ed}, ${ey}`;
  }
  return `${startMonth} ${sd} – ${endMonth} ${ed}, ${ey}`;
};
