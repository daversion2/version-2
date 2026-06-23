// =============================================================================
// OVERRIDE TACTICS — the shared vocabulary of "what got me through it".
//
// One global list, used by every practice's post-completion reflection. Keeping
// it shared (rather than per-practice) is deliberate: when the same tactic shows
// up across cold exposure, meditation, and fasting, that's the proof that an
// override move *transfers* — which is the whole thesis. Aggregating
// CompletionLog.tactics across all logs powers the future Override Playbook.
//
// IDs are stable storage keys — never reuse or repurpose one. To retire a tactic,
// stop offering it but keep the entry so historical logs still resolve a label.
// =============================================================================

export interface OverrideTactic {
  /** Stable storage id, persisted in CompletionLog.tactics. */
  id: string;
  /** First-person label, phrased as the move they made. */
  label: string;
  /** Ionicons name. */
  icon: string;
}

export const OVERRIDE_TACTICS: OverrideTactic[] = [
  { id: 'breathing', label: 'Slowed my breathing', icon: 'water-outline' },
  { id: 'countdown', label: 'Counted it down', icon: 'timer-outline' },
  { id: 'self_talk', label: 'Talked myself through it', icon: 'chatbubble-ellipses-outline' },
  { id: 'focused_why', label: 'Focused on my why', icon: 'compass-outline' },
  { id: 'relaxed_in', label: 'Relaxed into it', icon: 'leaf-outline' },
  { id: 'one_more', label: 'Just one more moment', icon: 'add-circle-outline' },
  { id: 'watched_urge', label: 'Watched the urge pass', icon: 'eye-outline' },
  { id: 'reframed', label: 'Reframed the discomfort', icon: 'sync-outline' },
];

const TACTIC_BY_ID: Record<string, OverrideTactic> = OVERRIDE_TACTICS.reduce(
  (acc, t) => {
    acc[t.id] = t;
    return acc;
  },
  {} as Record<string, OverrideTactic>,
);

export const getTactic = (id?: string | null): OverrideTactic | undefined =>
  id ? TACTIC_BY_ID[id] : undefined;

/** Resolve a list of tactic ids to their display labels (skips unknown ids). */
export const getTacticLabels = (ids?: string[]): string[] =>
  (ids ?? []).map((id) => TACTIC_BY_ID[id]?.label).filter((l): l is string => !!l);
