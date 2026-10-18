import { CategoryColors, Colors } from '../constants/theme';
import type { TrackingField } from '../data/practices';
import type { PracticeInstance, User } from '../types';

// =============================================================================
// MINI-APPS — the shell side of docs/mini-app-contract.md.
//
// A mini-app owns its own screens and data. What it shares with the rest of
// Neuro-Nudge goes through here, so the next one doesn't re-solve it:
//   - the manifest (which habits it attaches to),
//   - the one access gate,
//   - the finish handoff: a mini-app never awards XP or shows its own "done"
//     moment. It hands a habit id back; Today asks "How hard was it?" and runs
//     the same celebration a plain check-in gets.
// =============================================================================

export type MiniAppId = 'workouts' | 'meditate' | 'compose' | 'meals';

export interface MiniAppManifest {
  id: MiniAppId;
  title: string;
  /** Ionicons name. */
  icon: string;
  /** The one colour a mini-app may override. */
  accent: string;
  /** Library habit ids (PracticeInstance.practice_id) linked without asking. */
  habitIds: string[];
  /** 'lab' = admin accounts only; 'live' = everyone. */
  release: 'lab' | 'live';
}

export const MINI_APPS: Record<MiniAppId, MiniAppManifest> = {
  workouts: {
    id: 'workouts',
    title: 'Workouts',
    icon: 'barbell-outline',
    accent: CategoryColors.move,
    habitIds: ['workout', 'trad-exercise'],
    release: 'live',
  },
  meditate: {
    id: 'meditate',
    title: 'Meditate',
    icon: 'flower-outline',
    // The meditation habit's own teal.
    accent: Colors.primary,
    habitIds: ['meditation', 'morning-meditation', 'trad-meditate', 'breathwork', 'breathing-break', 'nsdr'],
    release: 'live',
  },
  compose: {
    id: 'compose',
    title: 'Compose',
    icon: 'sparkles-outline',
    accent: CategoryColors.sleep,
    // Not tied to a habit (yet): it's opened from the Lab.
    habitIds: [],
    release: 'lab',
  },
  meals: {
    id: 'meals',
    title: 'Meals',
    icon: 'nutrition-outline',
    accent: CategoryColors.fuel,
    // The Meals library habit. The food habits it replaced (vegetables,
    // protein, sugar, cooking) are removed — data/removedHabits.ts.
    habitIds: ['meals'],
    release: 'live',
  },
};

/**
 * The only place visibility is decided. A paywall, if one ever comes, goes
 * here too — mini-apps call this and never check is_admin themselves.
 */
export const canOpenMiniApp = (
  appId: MiniAppId,
  profile: Pick<User, 'is_admin'> | null | undefined
): boolean => MINI_APPS[appId].release === 'live' || profile?.is_admin === true;

/** Library habits link automatically; anything else (a custom "Leg day") by the user's choice. */
export const isHabitLinkedToMiniApp = (
  appId: MiniAppId,
  habit: Pick<PracticeInstance, 'id' | 'practice_id'>,
  linkedHabitIds: string[] = []
): boolean =>
  (!!habit.practice_id && MINI_APPS[appId].habitIds.includes(habit.practice_id)) ||
  linkedHabitIds.includes(habit.id);

// --- The finish handoff ------------------------------------------------------

export interface SessionHandoff {
  appId: MiniAppId;
  habitId: string;
  /** How long the session ran, so the check-in can prefill a duration field. */
  durationSec?: number;
  /**
   * Answers to the habit's choice fields, by key — Meditate's technique or
   * breathing pattern. Only an answer that's one of that field's options is
   * used, so a mini-app serving several habits can't prefill nonsense.
   */
  choices?: Record<string, string>;
}

// In memory on purpose: the handoff lives for one navigation — the mini-app
// closes and Today picks it up on focus. A crash in between loses only the
// prompt; the session itself is already saved, and the habit's chips still work.
let pendingFinish: SessionHandoff | null = null;

export const finishSession = (handoff: SessionHandoff): void => {
  pendingFinish = handoff;
};

/** Read and clear. Today calls this on focus. */
export const takePendingFinish = (): SessionHandoff | null => {
  const handoff = pendingFinish;
  pendingFinish = null;
  return handoff;
};

/**
 * Turns a session into the check-in's starting answers: its duration, into the
 * habit's own duration field ("How long?" on Workout), snapped to that field's
 * step and bounds so the slider opens on a real stop; and any choices the
 * habit's choice fields accept.
 */
export const checkinMetricsFor = (
  tracking: TrackingField[] | undefined,
  handoff: Pick<SessionHandoff, 'durationSec' | 'choices'>
): Record<string, number | string> | undefined => {
  const out: Record<string, number | string> = {};
  const field = tracking?.find((f) => f.type === 'duration');
  if (field && handoff.durationSec) {
    const minutes = handoff.durationSec / 60;
    const step = field.step ?? 1;
    const snapped = Math.round(minutes / step) * step;
    const min = field.min ?? 0;
    const max = field.max ?? Number.POSITIVE_INFINITY;
    out[field.key] = Math.min(max, Math.max(min, snapped));
  }
  for (const [key, value] of Object.entries(handoff.choices ?? {})) {
    const choice = tracking?.find((f) => f.key === key && f.type === 'choice');
    if (choice?.options?.some((o) => o.value === value)) out[key] = value;
  }
  return Object.keys(out).length ? out : undefined;
};
