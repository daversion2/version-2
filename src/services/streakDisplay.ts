import { toLocalDateString } from '../utils/date';

/**
 * The day streak to show in Today's header.
 *
 * The user doc keeps the streak as of the last check-in, so it goes stale: a
 * 12-day streak with nothing logged yesterday or today is really 0. Same rule
 * as willpower.getWillpowerStats, worked out from the profile already in hand
 * rather than another read.
 */
export const displayStreak = (
  currentStreak: number | undefined,
  lastActivityDate: string | undefined,
  today: string
): number => {
  if (!currentStreak || !lastActivityDate) return 0;
  const [y, m, d] = today.split('-').map(Number);
  const yesterday = toLocalDateString(new Date(y, m - 1, d - 1));
  return lastActivityDate === today || lastActivityDate === yesterday ? currentStreak : 0;
};
