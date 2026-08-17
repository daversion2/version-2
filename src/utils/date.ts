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
 * How far back a user may log or delete a rep. A practice done on Saturday and
 * remembered on Monday has to be loggable, so "yesterday only" was too tight;
 * an unbounded window would make the whole history feel rewritable, which is
 * the opposite of what a training log is for. One week is the compromise.
 */
export const EDITABLE_WINDOW_DAYS = 7;

/**
 * Get the date N days ago as YYYY-MM-DD.
 */
export const getDateNDaysAgo = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toLocalDateString(d);
};

/**
 * Whether a date is inside the editable window — today, or any of the previous
 * EDITABLE_WINDOW_DAYS days. Future dates are never editable. Governs both
 * backfilling a rep and deleting one, so the two rules never disagree.
 */
export const isEditableDate = (dateStr: string): boolean => {
  const today = getTodayString();
  if (dateStr > today) return false;
  return dateStr >= getDateNDaysAgo(EDITABLE_WINDOW_DAYS);
};

/**
 * The editable days, newest first: today, yesterday, then back through the
 * window. Drives the capture flow's date selector.
 */
export const getEditableDates = (): string[] =>
  Array.from({ length: EDITABLE_WINDOW_DAYS + 1 }, (_, i) => getDateNDaysAgo(i));

/**
 * Human label for a recent date: "Today", "Yesterday", then the weekday
 * ("Sat"). Anything older than a week falls back to the full date — a bare
 * weekday is ambiguous once it could mean any of several months.
 */
export const formatRelativeDay = (dateStr: string): string => {
  if (isToday(dateStr)) return 'Today';
  if (isYesterday(dateStr)) return 'Yesterday';
  if (dateStr < getDateNDaysAgo(EDITABLE_WINDOW_DAYS) || dateStr > getTodayString()) {
    return formatDayHeader(dateStr);
  }
  return formatShortDay(dateStr);
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
