// =============================================================================
// HABIT SCHEDULE — when is this habit actually due?
//
// Two kinds of schedule, one primitive:
//
//   COUNT      target_count_per_week: 4        "four times, days are yours"
//   DAYS       scheduled_days: [1, 3, 5]       "Monday, Wednesday, Friday"
//
// `scheduled_days` is what makes a habit day-scheduled — its presence, not a
// mode flag, so there is no state where the two disagree. Writers keep
// target_count_per_week in sync with the day count (see setHabitSchedule), which
// means every existing reader — pace, the weekly pips, the trend chart's
// max — keeps working without knowing days exist. Readers that care about WHICH
// days opt in through here.
//
// Weekdays use the JS convention: 0 = Sunday … 6 = Saturday, matching
// Date.getDay(). The app's WEEK still starts on Monday (see habitPace.mondayOf);
// only the day index is Sunday-based.
//
// Pure functions, no Firestore. Pace, streaks, adherence and reminders all
// derive from these, so they need to be provable rather than eyeballed.
// =============================================================================

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * The subset of a habit this module needs — a full PracticeInstance satisfies
 * it. Declared structurally rather than imported from ../types so the type
 * module can depend on this one (HabitStats carries an Adherence) without a
 * cycle.
 */
export interface Schedulable {
  target_count_per_week?: number;
  scheduled_days?: number[];
}

/**
 * A habit's schedule as the user chose it. The shape the picker edits and
 * setHabitSchedule writes.
 */
export type HabitSchedule =
  | { kind: 'days'; days: Weekday[] }
  | { kind: 'count'; target: number };

/** Sunday-first, to match the index. */
export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Monday-first display order — how the picker and every summary read. */
export const WEEK_DISPLAY_ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

const toDateStr = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const parse = (dateStr: string): Date => new Date(dateStr + 'T00:00:00');

export const addDays = (dateStr: string, days: number): string => {
  const d = parse(dateStr);
  d.setDate(d.getDate() + days);
  return toDateStr(d);
};

/** Whole days from `from` to `to`. Negative when `to` is earlier. */
export const daysBetween = (from: string, to: string): number =>
  Math.round((parse(to).getTime() - parse(from).getTime()) / 86400000);

export const weekdayOf = (dateStr: string): Weekday => parse(dateStr).getDay() as Weekday;

/**
 * The habit's chosen days, or undefined when it is a count habit.
 *
 * Defensive because this reads straight off Firestore documents: an empty array
 * is treated as "no days chosen" rather than "due never", which would otherwise
 * make a habit permanently un-due and invisible to pace.
 */
export const scheduledDays = (habit: Schedulable): Weekday[] | undefined => {
  const raw = habit.scheduled_days;
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const clean = [...new Set(raw.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort(
    (a, b) => a - b
  );
  return clean.length ? (clean as Weekday[]) : undefined;
};

/** True when this habit is pinned to specific weekdays rather than a weekly count. */
export const isDayScheduled = (habit: Schedulable): boolean => !!scheduledDays(habit);

/**
 * Is the habit due on this date?
 *
 * A count habit is due EVERY day in the sense that matters here — any day is a
 * legitimate chance to do it. Callers that need "must be done today or the
 * streak breaks" want isDueOn on a day-scheduled habit, or the rest-day
 * allowance below.
 */
export const isDueOn = (habit: Schedulable, dateStr: string): boolean => {
  const days = scheduledDays(habit);
  return days ? days.includes(weekdayOf(dateStr)) : true;
};

/**
 * How many days a week this habit asks for. Day-scheduled habits derive it from
 * the days themselves, so the two can never disagree.
 */
export const weeklyTarget = (habit: Schedulable): number =>
  scheduledDays(habit)?.length ?? habit.target_count_per_week ?? 0;

/** Every date in [start, end] the habit is due on, ascending. */
export const dueDatesBetween = (habit: Schedulable, start: string, end: string): string[] => {
  const out: string[] = [];
  if (daysBetween(start, end) < 0) return out;
  for (let d = start; daysBetween(d, end) >= 0; d = addDays(d, 1)) {
    if (isDueOn(habit, d)) out.push(d);
  }
  return out;
};

/**
 * Rest days a COUNT habit may take between reps before its streak breaks.
 *
 * The streak has to agree with the goal. A 3×/week habit that broke its streak
 * every off day told the user two contradictory things at once — "on pace" and
 * "streak: 0" — for a week they had actually kept. The allowance is the most
 * rest the goal could possibly justify (7 − target), so hitting the target can
 * never break the streak, and a 7×/week habit still gets the strict
 * every-single-day rule it should.
 *
 * A habit with no goal has nothing to be lenient against, so it stays strict.
 */
export const allowedRestDays = (habit: Schedulable): number => {
  if (isDayScheduled(habit)) return 0; // day-scheduled habits break on a missed DUE day
  const target = habit.target_count_per_week ?? 0;
  if (target <= 0) return 0;
  return Math.max(0, 7 - target);
};

/**
 * A stored weekday as the number expo-notifications wants for a WEEKLY trigger.
 *
 * Two conventions meet here. This app stores JS weekdays — Date.getDay(), where
 * Sunday is 0. expo-notifications documents WeeklyTriggerInput as "a number
 * from 1 through 7, with 1 indicating Sunday", and passes the value straight
 * through to the native trigger untouched (parseWeeklyTrigger in
 * expo-notifications/build/scheduleNotificationAsync.js applies no conversion).
 * So the answer is +1.
 *
 * It lives here, named and tested, rather than as a bare increment at the call
 * site: off by one shifts EVERY reminder by exactly one day, and nothing short
 * of waiting for a notification to fire would reveal it. A future reader
 * deleting this as redundant arithmetic is the failure mode being guarded.
 */
export const toExpoWeekday = (day: Weekday): number => day + 1;

/** "Mon, Wed & Fri" — the days spelled out, Monday first. */
export const formatDays = (days: Weekday[]): string => {
  const ordered = WEEK_DISPLAY_ORDER.filter((d) => days.includes(d));
  const names = ordered.map((d) => WEEKDAY_LABELS[d]);
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
};

// -----------------------------------------------------------------------------
// EDITING A SCHEDULE
//
// Everything the picker does to a schedule lives here rather than in the
// component, because there are now four places a schedule can be chosen —
// onboarding beat 3, the custom-habit form, the library detail screen and the
// edit sheet — and a rule that only holds in three of them is a bug that only
// reproduces on one screen.
// -----------------------------------------------------------------------------

/**
 * Weekdays for a habit that asks for `target` days a week, Monday-first.
 *
 * Five reads as the working week and six as "every day but Sunday" — both are
 * what people mean by those numbers, so they are named rather than derived.
 * Anything smaller is spread across the week instead of front-loaded, because
 * Mon/Tue/Wed is a worse three-times-a-week habit than Mon/Wed/Sat.
 */
export const defaultDaysForTarget = (target: number): Weekday[] => {
  const n = Math.max(1, Math.min(7, Math.round(target)));
  if (n >= 7) return [...WEEK_DISPLAY_ORDER];
  if (n === 6) return WEEK_DISPLAY_ORDER.slice(0, 6);
  if (n === 5) return [1, 2, 3, 4, 5];
  const picked = new Set<Weekday>();
  for (let i = 0; i < n; i++) picked.add(WEEK_DISPLAY_ORDER[Math.round((i * 7) / n)]);
  return WEEK_DISPLAY_ORDER.filter((d) => picked.has(d));
};

/** Add or remove a day, refusing to empty the set — no days is not a schedule. */
export const toggleDay = (days: Weekday[], day: Weekday): Weekday[] => {
  if (days.includes(day)) {
    const next = days.filter((d) => d !== day);
    return next.length ? next : days;
  }
  return WEEK_DISPLAY_ORDER.filter((d) => d === day || days.includes(d));
};

/** A schedule you could actually keep — at least one day, or a target above zero. */
export const isScheduleValid = (schedule: HabitSchedule): boolean =>
  schedule.kind === 'days' ? schedule.days.length > 0 : schedule.target > 0;

/** The schedule a habit starts on when nothing more specific is known. */
export const DEFAULT_WEEKLY_TARGET = 3;

/**
 * The schedule a newly created habit opens on.
 *
 * DAY-SCHEDULED, seeded from whatever weekly target the catalog (or the form)
 * suggests. A named-day habit knows exactly which days it owed, so pace and
 * adherence become facts rather than estimates — and the reminder fires only on
 * days the user actually claimed. This is the same default onboarding has
 * always used; it lives here so every creation screen agrees with it.
 *
 * The cost is notification slots: a day-scheduled habit schedules one weekly
 * notification PER DAY against iOS's silent 64-notification ceiling (see
 * CLAUDE.md). This function is where that trade is made for the whole app.
 */
export const defaultScheduleForTarget = (target?: number): HabitSchedule => ({
  kind: 'days',
  days: defaultDaysForTarget(target ?? DEFAULT_WEEKLY_TARGET),
});

/**
 * Switch a schedule between its two kinds, carrying the SIZE of the commitment
 * across: 4× a week becomes four spread days, and Mon/Wed/Fri becomes 3×. The
 * user picked "how much" once and shouldn't have to pick it again to change how
 * it's expressed.
 */
export const switchScheduleKind = (
  schedule: HabitSchedule,
  kind: HabitSchedule['kind']
): HabitSchedule => {
  if (schedule.kind === kind) return schedule;
  if (kind === 'days') {
    return { kind: 'days', days: defaultDaysForTarget(schedule.kind === 'count' ? schedule.target : DEFAULT_WEEKLY_TARGET) };
  }
  return {
    kind: 'count',
    target: schedule.kind === 'days' ? schedule.days.length : DEFAULT_WEEKLY_TARGET,
  };
};

/**
 * A schedule as the two Firestore fields, ready to spread into `createHabit`.
 *
 * The creation-time twin of setHabitSchedule, and it exists for the same
 * reason: `target_count_per_week` and `scheduled_days` have to agree, and a
 * screen that writes them by hand is a screen that can write a habit due three
 * days a week with a target of five. Creation can't use setHabitSchedule —
 * there is no document to update yet — so it uses this.
 *
 * `scheduled_days` is left UNDEFINED rather than empty for a count schedule;
 * createHabit strips undefined values, so the field is simply never written.
 */
export const scheduleFields = (
  schedule: HabitSchedule
): { target_count_per_week: number; scheduled_days?: number[] } => {
  if (schedule.kind === 'days') {
    const days = [...new Set(schedule.days)].sort((a, b) => a - b);
    return { target_count_per_week: days.length, scheduled_days: days };
  }
  return { target_count_per_week: schedule.target, scheduled_days: undefined };
};

/** One line describing the schedule, for a row or a header. */
export const describeSchedule = (habit: Schedulable): string => {
  const days = scheduledDays(habit);
  if (days) {
    if (days.length === 7) return 'Every day';
    if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d as Weekday)))
      return 'Weekdays';
    if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';
    return formatDays(days);
  }
  const target = habit.target_count_per_week ?? 0;
  if (target <= 0) return 'No weekly goal set';
  if (target === 7) return 'Every day';
  return `${target}× a week`;
};
