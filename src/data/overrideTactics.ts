// =============================================================================
// OVERRIDE TACTICS — the shared vocabulary of "what got me through it".
//
// One global list, used by every practice's post-completion reflection. Keeping
// it shared (rather than per-practice) is deliberate: when the same tactic shows
// up across cold exposure, meditation, and fasting, that's the proof that an
// override move *transfers* — which is the whole thesis. Aggregating
// CompletionLog.tactics across all logs powers the Override Playbook.
//
// ASKED ONLY ON HARD REPS. The question runs when resistance was ≥
// TACTIC_GATE_RESISTANCE (see constants/resistance.ts). A tactic tagged on an
// "Easy today" rep carries no information — nothing had to be overcome — and
// taxing the easy majority to learn about the hard minority is what turned the
// pre-2026-07 version of this question into a toll people skipped.
//
// ONE QUESTION: "What helped you get started?" Starting is the decisive moment
// for nearly everything in the library — roughly ten habits carry a guided
// timer/away flow and the rest are plain check-ins you simply have to begin —
// and it is the moment you can actually plan for. In-the-moment endurance moves
// ("watched the urge pass") were the arena-era vocabulary; they are retired
// below rather than offered against habits like reading or flossing.
//
// ONE LIST, NOT ONE PER HABIT SHAPE. An earlier cut split the vocabulary by
// flow — starting moves for `tap`, endurance moves for `timer`/`away`. That
// defeated the point of a shared list: two users on different habits could only
// ever overlap on the handful of context-free tactics, so no cross-habit
// pattern could surface. A single vocabulary is what makes "made it smaller
// shows up everywhere" observable at all.
//
// IDs are stable storage keys — never reuse or repurpose one. To retire a tactic,
// mark it `retired` — it stops being offered but still resolves a label, so
// logs written when it WAS offered keep rendering.
// =============================================================================

/** The question these answer. Lives here with the vocabulary, as mindTags does. */
export const TACTIC_PROMPT = 'What helped you get started?';
export const TACTIC_HELPER = 'Tap anything you used.';

export interface OverrideTactic {
  /** Stable storage id, persisted in CompletionLog.tactics. */
  id: string;
  /** First-person label, phrased as the move they made. */
  label: string;
  /** Ionicons name. */
  icon: string;
  /** One line under the label, making the move concrete. */
  description: string;
  /**
   * Second-person past tense, for the playbook sentence ("you ___ 3 of them").
   * Stored rather than derived: lowercasing `label` would produce "you slowed
   * my breathing", and the possessive has to flip to "your".
   */
  recall: string;
  /**
   * No longer offered, but kept so historical logs resolve a label instead of
   * rendering a raw id. See the header note on retiring.
   */
  retired?: boolean;
}

export const OVERRIDE_TACTICS: OverrideTactic[] = [
  // ---- What got you to begin ----
  {
    id: 'made_smaller',
    label: 'Made it smaller',
    icon: 'resize-outline',
    description: 'Cut it to a size I couldn’t argue with.',
    recall: 'made it smaller',
  },
  {
    id: 'before_thinking',
    label: 'Started before I could think',
    icon: 'flash-outline',
    description: 'Moved first, gave myself no window to negotiate.',
    recall: 'started before you could think',
  },
  {
    id: 'first_step',
    label: 'Just did the first step',
    icon: 'footsteps-outline',
    description: 'Shoes on, book open, app closed — nothing more.',
    recall: 'just did the first step',
  },
  {
    id: 'changed_location',
    label: 'Changed my location',
    icon: 'walk-outline',
    description: 'Left the room, the couch, or the house.',
    recall: 'changed your location',
  },
  {
    id: 'cleared_obstacle',
    label: 'Cleared the obstacle',
    icon: 'construct-outline',
    description: 'Phone in another room, gear already laid out.',
    recall: 'cleared the obstacle',
  },
  {
    id: 'stacked_it',
    label: 'Attached it to something else',
    icon: 'link-outline',
    description: 'Rode a routine that was already in motion.',
    recall: 'attached it to something else',
  },
  {
    id: 'gave_an_out',
    label: 'Gave myself an out',
    icon: 'exit-outline',
    description: 'Five minutes, and I could quit after if I wanted.',
    recall: 'gave yourself an out',
  },
  {
    id: 'told_someone',
    label: 'Put it on someone else',
    icon: 'people-outline',
    description: 'Told someone I’d do it, or did it with them.',
    recall: 'put it on someone else',
  },

  // ---- What you held onto ----
  {
    id: 'countdown',
    label: 'Counted it down',
    icon: 'timer-outline',
    description: 'Put a number on it and moved when it hit zero.',
    recall: 'counted it down',
  },
  {
    id: 'self_talk',
    label: 'Talked myself through it',
    icon: 'chatbubble-ellipses-outline',
    description: 'Coached myself forward, out loud or in my head.',
    recall: 'talked yourself through it',
  },
  {
    id: 'focused_why',
    label: 'Focused on my why',
    icon: 'compass-outline',
    description: 'Held the reason I signed up for this.',
    recall: 'focused on your why',
  },
  {
    id: 'identity',
    label: 'Remembered who I’m becoming',
    icon: 'person-outline',
    description: 'Not the reason — the person this makes me.',
    recall: 'remembered who you’re becoming',
  },
  {
    id: 'reframed',
    label: 'Reframed the discomfort',
    icon: 'sync-outline',
    description: 'Called it the point of the thing, not a problem with it.',
    recall: 'reframed the discomfort',
  },

  // ---- Retired: the arena-era endurance moves, which answered "what kept you
  //      IN it" rather than "what got you started". Never offered now; kept so
  //      logs written while they were still offered resolve a label. ----
  {
    id: 'breathing',
    label: 'Slowed my breathing',
    icon: 'water-outline',
    description: 'Longer exhale, and the panic came down with it.',
    recall: 'slowed your breathing',
    retired: true,
  },
  {
    id: 'relaxed_in',
    label: 'Relaxed into it',
    icon: 'leaf-outline',
    description: 'Stopped bracing and let the sensation happen.',
    recall: 'relaxed into it',
    retired: true,
  },
  {
    id: 'one_more',
    label: 'Just one more moment',
    icon: 'add-circle-outline',
    description: 'Never the whole thing — only the next stretch of it.',
    recall: 'took it one more moment at a time',
    retired: true,
  },
  {
    id: 'watched_urge',
    label: 'Watched the urge pass',
    icon: 'eye-outline',
    description: 'Let it rise and fall without acting on it.',
    recall: 'watched the urge pass',
    retired: true,
  },
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

export const getTacticLabel = (id: string): string => TACTIC_BY_ID[id]?.label ?? id;

/** Resolve a list of tactic ids to their display labels (skips unknown ids). */
export const getTacticLabels = (ids?: string[]): string[] =>
  (ids ?? []).map((id) => TACTIC_BY_ID[id]?.label).filter((l): l is string => !!l);

/**
 * The tactics actually offered on the reflection step — everything not retired.
 * One list for every habit; see the header note on why it isn't split by flow.
 */
export const OFFERED_TACTICS: OverrideTactic[] = OVERRIDE_TACTICS.filter((t) => !t.retired);

/**
 * The human-readable note stored on the log, mirroring buildMindReflectionNote.
 * History screens already render CompletionLog.notes, so writing one here is
 * what keeps a saved reflection visible rather than living only as tag ids.
 * Returns '' when nothing was selected.
 */
export const buildTacticNote = (ids: string[]): string => {
  const labels = getTacticLabels(ids);
  return labels.length ? `${TACTIC_PROMPT}\n${labels.join(', ')}` : '';
};
