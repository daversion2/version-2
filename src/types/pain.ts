// Back Pain (Lab): a daily pain check-in, and plans run like Workouts' phases —
// test, follow up to three things for a few weeks, retest, change one thing.
// Spec: docs/micro-apps/pain.md.

export type PainItemId = 'walk' | 'core' | 'yoga' | 'mindful' | 'extension' | 'mobility' | 'heat' | 'breaks';

/** How long the pain has gone on: under 6 weeks, 6–12 weeks, over 12. */
export type PainOnset = 'recent' | 'months' | 'long';

export type PlanWeeks = 2 | 3 | 4;

/** users/{uid}/lab_pain_days/{YYYY-MM-DD} */
export interface PainDay {
  /** YYYY-MM-DD, local. Also the doc id, so an edit overwrites. */
  date: string;
  /** Average pain that day, 0–10. */
  pain: number;
  /** Plan items ticked. Which plan is worked out from the dates (painMath.planOn). */
  done: PainItemId[];
  /** ISO: when it was saved. */
  logged_at: string;
  /** "How hard was it to get started today?" — constants/resistance.ts. Only when something was done. */
  resistance?: 1 | 2 | 3;
  resistance_scale?: 3;
}

/** One activity the pain gets in the way of, rated 0–10 (Patient-Specific Functional Scale). */
export interface PainActivity {
  label: string;
  score: number;
}

export type PlanStatus = 'active' | 'complete' | 'ended';

/** users/{uid}/lab_pain_plans/{id} */
export interface PainPlan {
  id: string;
  /** 1 for the first plan in a chain, then 2, 3… */
  number: number;
  previous_plan_id?: string;
  onset: PainOnset;
  items: PainItemId[];
  weeks: PlanWeeks;
  /** Local dates, YYYY-MM-DD. */
  start_date: string;
  retest_date: string;
  baseline: { pain_week: number; activities: PainActivity[] };
  /** `scores` in the same order as baseline.activities. */
  retest?: { pain_week: number; scores: number[] };
  retest_at?: string;
  /** Local date it was retested or ended. Its items stop showing after this. */
  closed_on?: string;
  /** What changed from the plan before, in the user's words. */
  change?: string;
  status: PlanStatus;
  /** When the red-flag check was passed. The answers themselves aren't kept. */
  screened_at: string;
  created_at: string;
  updated_at: string;
}

/** users/{uid}/lab_pain_prefs/main */
export interface PainPrefs {
  /** Plan days a week (every item ticked), Monday to Sunday. */
  weekly_goal: number;
}

export type PainStackParamList = {
  PainHome: undefined;
  /** A new plan, or the next one in a chain. */
  PainPlan: { fromPlanId?: string } | undefined;
  /** The retest if it hasn't been done, otherwise the results. */
  PainResults: { planId: string };
  PainHistory: undefined;
};
