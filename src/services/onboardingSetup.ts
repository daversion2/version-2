import { HabitDefinition, getCommitmentField } from '../data/practices';
import { defaultTimeForAnchor } from '../data/anchors';
import { RESISTANCE_SCALE } from '../constants/resistance';
import {
  HabitSchedule,
  Schedulable,
  Weekday,
  WEEK_DISPLAY_ORDER,
  describeSchedule,
  scheduledDays,
} from './habitSchedule';

// =============================================================================
// ONBOARDING SETUP — the logic behind the five-beat first-run flow.
//
// Pure functions only, no Firestore. The screen renders these and writes the
// result; everything that can be got wrong (what a habit's defaults are, when a
// beat is answered, how a promise reads) lives here where jest can see it.
// The screen itself is untestable — jest's testMatch excludes .tsx — so any
// logic that ends up in OnboardingScreen.tsx is logic nothing is guarding.
//
// THE RULE THE FLOW IS BUILT ON: every beat stores a value. The premise beat is
// the single deliberate exception, and it is the only one — a screen that
// stores nothing is a slide, and slides belong in the App Store listing.
//
// Beat 1  premise    nothing (the exception)
// Beat 2  pick       practice_id
// Beat 3  promise    metric_goals · scheduled_days · action_plan.anchor · reminder
// Beat 4  rehearse   expected_resistance · journey_checkins.baseline
// Beat 5  land       has_completed_onboarding
// =============================================================================

export type OnboardingBeatKey = 'premise' | 'pick' | 'promise' | 'rehearse' | 'land';

export interface OnboardingBeat {
  key: OnboardingBeatKey;
  /** Label on the forward button. */
  cta: string;
  /** Shown above a disabled CTA to say what is still missing. */
  hint?: string;
}

export const ONBOARDING_BEATS: OnboardingBeat[] = [
  { key: 'premise', cta: 'Set up my first habit →' },
  { key: 'pick', cta: 'Set it up →', hint: 'Choose one habit' },
  { key: 'promise', cta: "That's the promise →", hint: 'Pick at least one day' },
  { key: 'rehearse', cta: 'Done →', hint: 'Make your guess' },
  { key: 'land', cta: 'Start' },
];

/**
 * The habit setup a user builds during beat 3. Mirrors the fields that get
 * written on completion, so the screen holds one object rather than six
 * useStates that can disagree with each other.
 */
export interface HabitSetupDraft {
  /** Catalog id of the chosen habit — becomes PracticeInstance.practice_id. */
  definitionId: string;
  /**
   * The amount promised for this habit's `commitmentKey`, or undefined when the
   * habit has no natural amount (make your bed, floss) and adopting it is one tap.
   */
  amount?: number;
  schedule: HabitSchedule;
  /** Completes "After I ___". Free text; may be empty. */
  anchor: string;
  reminderEnabled: boolean;
  /** 'HH:mm' local. */
  reminderTime: string;
}

/** Fallback when an anchor has no natural clock time (or there is no anchor). */
export const FALLBACK_REMINDER_TIME = '08:00';

/**
 * 'HH:mm' as the user's locale writes a time ("7:30 AM"). Falls back to the
 * raw value rather than throwing, so a malformed stored time still renders.
 */
export const formatReminderTime = (hhmm: string): string => {
  const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
};

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

/**
 * Seed a setup draft from the habit's own definition, so beat 3 opens
 * pre-filled and the honest path through it is tap-to-accept. Nothing here is
 * a guess the user has to correct — every value is one the catalog already
 * suggests.
 *
 * DAY-SCHEDULED BY DEFAULT. A named-day habit knows exactly which days it owed,
 * so pace and adherence become facts rather than estimates, and "weekdays"
 * reads as a stronger promise than "5× a week". The cost is notification slots:
 * a day-scheduled habit schedules one weekly notification PER DAY, against iOS's
 * silent 64-notification ceiling (see CLAUDE.md). At one habit from onboarding
 * that is not close to a problem, but this is the function that decides it.
 */
export const deriveHabitSetupDraft = (def: HabitDefinition): HabitSetupDraft => {
  const commitment = getCommitmentField(def);
  const anchor = def.action_plan?.anchor ?? '';
  return {
    definitionId: def.id,
    amount: typeof commitment?.default === 'number' ? commitment.default : undefined,
    schedule: { kind: 'days', days: defaultDaysForTarget(def.suggested_target_per_week ?? 3) },
    anchor,
    reminderEnabled: true,
    reminderTime: defaultTimeForAnchor(anchor) ?? FALLBACK_REMINDER_TIME,
  };
};

/** Clamp an amount to its tracking field's bounds. Step is applied by the caller. */
export const clampAmount = (def: HabitDefinition, value: number): number => {
  const field = getCommitmentField(def);
  const min = field?.min ?? 1;
  const max = field?.max ?? Number.MAX_SAFE_INTEGER;
  return Math.max(min, Math.min(max, value));
};

/** Nudge an amount by one step of its field, clamped. */
export const stepAmount = (
  def: HabitDefinition,
  value: number,
  direction: 1 | -1
): number => clampAmount(def, value + direction * (getCommitmentField(def)?.step ?? 1));

/** The draft's schedule in the shape every schedule reader already understands. */
export const draftSchedulable = (draft: HabitSetupDraft): Schedulable =>
  draft.schedule.kind === 'days'
    ? { scheduled_days: draft.schedule.days, target_count_per_week: draft.schedule.days.length }
    : { target_count_per_week: draft.schedule.target };

/**
 * The committed amount with its unit — "20 min", "80 oz". Undefined when the
 * habit has no commitment, so callers omit the clause rather than print a
 * dangling unit. Deliberately mirrors formatCommitment's rules, but reads from
 * the draft rather than a saved instance.
 */
export const describeCommitment = (
  def: HabitDefinition,
  draft: HabitSetupDraft
): string | undefined => {
  const field = getCommitmentField(def);
  if (!field || typeof draft.amount !== 'number') return undefined;
  // A 'scale' commitment has no unit worth showing — "5 adherence" reads as
  // nonsense. Same carve-out formatCommitment makes.
  if (field.type === 'scale') return undefined;
  const shown = draft.amount >= 1000 ? draft.amount.toLocaleString() : String(draft.amount);
  return field.unit === '$' ? `$${shown}` : `${shown} ${field.unit ?? ''}`.trim();
};

/**
 * The promise, spoken back: "20 min, weekdays, after I sit down at my desk."
 *
 * This sentence is the reason beat 3 exists. "Drink more water" has no
 * threshold, so there is no such thing as doing it; the amount, the days and
 * the anchor are what turn a vague intention into something you can keep or
 * miss. Showing it assembled is the difference between the user having filled
 * in three fields and the user having made a commitment.
 */
export const describePromise = (def: HabitDefinition, draft: HabitSetupDraft): string => {
  const parts: string[] = [];
  const amount = describeCommitment(def, draft);
  if (amount) parts.push(amount);
  parts.push(describeSchedule(draftSchedulable(draft)).toLowerCase());
  const anchor = draft.anchor.trim();
  if (anchor) parts.push(`after I ${anchor}`);
  return `${parts.join(', ')}.`;
};

/** A schedule you could actually keep — at least one day, or a target above zero. */
export const isScheduleValid = (schedule: HabitSchedule): boolean =>
  schedule.kind === 'days' ? schedule.days.length > 0 : schedule.target > 0;

/** Add or remove a day, refusing to empty the set — no days is not a schedule. */
export const toggleDay = (days: Weekday[], day: Weekday): Weekday[] => {
  if (days.includes(day)) {
    const next = days.filter((d) => d !== day);
    return next.length ? next : days;
  }
  return WEEK_DISPLAY_ORDER.filter((d) => d === day || days.includes(d));
};

export interface OnboardingProgress {
  definitionId: string | null;
  draft: HabitSetupDraft | null;
  /** The rehearsal answer, 1–3. Null until they answer. */
  resistance: number | null;
}

/**
 * Can the user move on from this beat?
 *
 * Only two beats gate, and both gate on something the user has to supply:
 * a habit, and an answer to the resistance question. The baseline sliders do
 * NOT gate — they carry sensible middle defaults, and a required slider is a
 * question people answer by dragging it anywhere.
 */
export const isBeatComplete = (
  key: OnboardingBeatKey,
  progress: OnboardingProgress
): boolean => {
  switch (key) {
    case 'pick':
      return !!progress.definitionId;
    case 'promise':
      return !!progress.draft && isScheduleValid(progress.draft.schedule);
    case 'rehearse':
      return progress.resistance !== null;
    case 'premise':
    case 'land':
      return true;
  }
};

/**
 * What gets written for the chosen habit on completion. Returned as data rather
 * than written here so the shape is assertable without mocking Firestore — the
 * screen hands this straight to createHabit.
 */
export interface HabitCreationPayload {
  name: string;
  practice_id: string;
  category_id?: string;
  target_count_per_week: number;
  scheduled_days?: number[];
  metric_goals?: Record<string, number>;
  action_plan?: { anchor: string };
  group?: HabitDefinition['group'];
  created_by_user: boolean;
  expected_resistance?: number;
  expected_resistance_scale?: number;
}

export const buildHabitCreationPayload = (
  def: HabitDefinition,
  draft: HabitSetupDraft,
  /**
   * The beat-4 guess, 1–3. Stored beside the habit as its "before", never
   * folded into the resistance trend — a prediction is not a rep.
   */
  expectedResistance?: number | null
): HabitCreationPayload => {
  const commitment = getCommitmentField(def);
  const schedulable = draftSchedulable(draft);
  const days = scheduledDays(schedulable);
  const anchor = draft.anchor.trim();
  return {
    name: def.name,
    practice_id: def.id,
    category_id: def.category_id,
    // Kept in agreement with the days, exactly as setHabitSchedule would —
    // pace, the weekly pips and the trend chart all read the count.
    target_count_per_week: days?.length ?? schedulable.target_count_per_week ?? 0,
    scheduled_days: days,
    // Only written when the habit actually asks for an amount. An empty map on
    // every other habit would be noise in every document.
    metric_goals:
      commitment && typeof draft.amount === 'number'
        ? { [commitment.key]: draft.amount }
        : undefined,
    action_plan: anchor ? { anchor } : undefined,
    // The scale rides along for the same reason logs carry `resistance_scale`:
    // the old and new scales overlap, so a bare 2 means different things and a
    // value without its scale cannot be read back correctly.
    expected_resistance: typeof expectedResistance === 'number' ? expectedResistance : undefined,
    expected_resistance_scale:
      typeof expectedResistance === 'number' ? RESISTANCE_SCALE : undefined,
    group: def.group,
    // The catalog authored this habit, not the user. Drives isRetiredCurated
    // and the curated-instance matching in ensureCuratedPractices.
    created_by_user: false,
  };
};
