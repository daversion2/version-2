// The close-out reminder's clock times, kept free of expo-notifications so
// onboarding's pure logic can use them. Scheduling is in closeOutReminder.ts.

/** The choices onboarding and Settings offer, HH:mm. */
export const CLOSEOUT_TIMES = ['19:00', '20:00', '21:00', '22:00'];
export const DEFAULT_CLOSEOUT_TIME = '21:00';

/** "21:00" → { hour: 21, minute: 0 }. Null for anything that isn't a clock time. */
export const parseTime = (hhmm: string | null | undefined): { hour: number; minute: number } | null => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm ?? '');
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  return hour < 24 && minute < 60 ? { hour, minute } : null;
};

/** "21:00" → "9 PM", "19:30" → "7:30 PM". */
export const formatReminderTime = (hhmm: string): string => {
  const t = parseTime(hhmm);
  if (!t) return hhmm;
  const h12 = t.hour % 12 === 0 ? 12 : t.hour % 12;
  const suffix = t.hour < 12 ? 'AM' : 'PM';
  return t.minute ? `${h12}:${String(t.minute).padStart(2, '0')} ${suffix}` : `${h12} ${suffix}`;
};
