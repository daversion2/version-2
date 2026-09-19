import { HabitDefinition, getCommitmentField } from '../data/practices';
import { defaultTimeForAnchor } from '../data/anchors';
import { RESISTANCE_SCALE } from '../constants/resistance';
import {
  HabitSchedule,
  Schedulable,
  defaultScheduleForTarget,
  describeSchedule,
  scheduleFields,
} from './habitSchedule';

// =============================================================================
// ONBOARDING SETUP — the logic behind the seven-beat first-run flow.
//
// Pure functions only, no Firestore. The screen renders these and writes the
// result; everything that can be got wrong (what a habit's defaults are, when a
// beat is answered) lives here where jest can see it. The screen itself is
// untestable — jest's testMatch excludes .tsx — so any logic that ends up in
// OnboardingScreen.tsx is logic nothing is guarding.
//
//   1 premise        the friction is the training
//   2 neurons        what repeating the override wires
//   3 thesis         leaving the comfort zone IS the habit
//   4 loopHabit      it sits on Today; you tap it after
//   5 loopRating     one question, three answers, and the line comes down
//   6 loopReflect    optional, encouraged, and why
//   7 pick           one habit → practice_id · has_completed_onboarding
//
// THE RULE THIS FLOW DELIBERATELY BREAKS. The five-beat version it replaces
// made every beat store a value, on the reasoning that a screen storing nothing
// is a slide. That produced two forms (amount/days/anchor/reminder, then a
// resistance guess and three baseline sliders) asked of someone who had not yet
// done the habit once — the single heaviest thing about the old first run.
//
// Six of these seven store nothing. What they buy instead is that the user
// meets the resistance question and the optional reflection HERE, explained,
// rather than as a surprise toll after their first rep. Everything the promise
// beat used to ask for now comes from the habit definition's own defaults
// (deriveHabitSetupDraft), which is where it was always suggested from, and
// stays editable on the habit afterwards.
//
// The two forms are kept, unrouted and still compiling, in
// components/onboarding/_archived/.
// =============================================================================

export type OnboardingBeatKey =
  | 'premise'
  | 'neurons'
  | 'thesis'
  | 'loopHabit'
  | 'loopRating'
  | 'loopReflect'
  | 'pick';

export interface OnboardingBeat {
  key: OnboardingBeatKey;
  /** Label on the forward button. */
  cta: string;
  /** Shown above a disabled CTA to say what is still missing. */
  hint?: string;
}

export const ONBOARDING_BEATS: OnboardingBeat[] = [
  { key: 'premise', cta: 'Go on →' },
  { key: 'neurons', cta: 'Go on →' },
  { key: 'thesis', cta: 'Show me how it works →' },
  { key: 'loopHabit', cta: 'Next →' },
  { key: 'loopRating', cta: 'Next →' },
  { key: 'loopReflect', cta: 'Pick my first habit →' },
  { key: 'pick', cta: 'Start training', hint: 'Choose one habit' },
];

/**
 * Which beats offer "just take me to the app".
 *
 * Nothing is written before the pick, so an escape hatch is safe anywhere —
 * but it is deliberately absent from the three walkthrough beats. Those are the
 * shortest screens in the flow and the ones that make the daily loop legible;
 * a second, quieter button under the CTA there mostly invites people to leave
 * before the part that explains how the app works.
 */
export const beatAllowsSkip = (key: OnboardingBeatKey): boolean =>
  key === 'premise' || key === 'neurons' || key === 'thesis' || key === 'pick';

/**
 * The habit setup written on completion. Seeded whole from the chosen habit's
 * definition — the flow no longer has a beat that edits it — and kept as one
 * object rather than six useStates that can disagree with each other.
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
 * Schedule editing moved to services/habitSchedule when the picker became
 * shared — onboarding is no longer the only screen that chooses days. Re-exported
 * so this module still reads as the whole of the onboarding vocabulary.
 */
export { defaultDaysForTarget, isScheduleValid, toggleDay } from './habitSchedule';

/**
 * Seed a setup draft from the habit's own definition, so beat 3 opens
 * pre-filled and the honest path through it is tap-to-accept. Nothing here is
 * a guess the user has to correct — every value is one the catalog already
 * suggests.
 *
 * DAY-SCHEDULED BY DEFAULT, via defaultScheduleForTarget — the same default the
 * library and custom-habit screens use, so the first habit is set up exactly
 * the way every later one is. See that function for why days win, and what
 * they cost.
 */
export const deriveHabitSetupDraft = (def: HabitDefinition): HabitSetupDraft => {
  const commitment = getCommitmentField(def);
  const anchor = def.action_plan?.anchor ?? '';
  return {
    definitionId: def.id,
    amount: typeof commitment?.default === 'number' ? commitment.default : undefined,
    schedule: defaultScheduleForTarget(def.suggested_target_per_week),
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

export interface OnboardingProgress {
  definitionId: string | null;
}

/**
 * Can the user move on from this beat?
 *
 * Exactly one beat gates, on the one thing the flow asks for. Every other beat
 * is read and tapped past, which is the whole point of the rewrite — a forward
 * button that is disabled on six of seven screens is a flow that feels like a
 * form even when it is mostly prose.
 */
export const isBeatComplete = (
  key: OnboardingBeatKey,
  progress: OnboardingProgress
): boolean => (key === 'pick' ? !!progress.definitionId : true);

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
   * A forward-looking resistance guess, 1–3. Stored beside the habit as its
   * "before", never folded into the resistance trend — a prediction is not a rep.
   *
   * The seven-beat flow never passes one: the guess used to be a required beat,
   * and the first real rating now arrives one rep later anyway. The parameter
   * stays because the field is still readable on habits created before the
   * rewrite, and because nothing else would make it cheaper to reintroduce.
   */
  expectedResistance?: number | null
): HabitCreationPayload => {
  const commitment = getCommitmentField(def);
  const anchor = draft.anchor.trim();
  return {
    name: def.name,
    practice_id: def.id,
    category_id: def.category_id,
    // scheduleFields keeps the count in agreement with the days, exactly as
    // setHabitSchedule would — pace, the weekly pips and the trend chart all
    // read the count. Every creation screen goes through it.
    ...scheduleFields(draft.schedule),
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
