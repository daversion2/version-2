// =============================================================================
// SKIP REASONS — the taxonomy behind "a habit tracker that understands why you
// skip". Six reasons, split into resistance the user generated and
// circumstances that got in the way.
//
// The internal/external split is the whole point, and it lives HERE as a
// property of each reason rather than being inferred in a chart. Someone who
// skips on dread needs a different intervention than someone who genuinely ran
// out of day; lumping them together hides the only distinction that matters.
//
// The grouping is shown to the user, not just stored — naming it is part of
// what the app teaches.
// =============================================================================

export type SkipReasonKind = 'internal' | 'external';

export interface SkipReason {
  id: string;
  /** Chip label — first person, past tense, no blame. */
  label: string;
  kind: SkipReasonKind;
  /** Ionicons name for the chip. */
  icon: string;
}

export interface SkipReasonGroup {
  kind: SkipReasonKind;
  /** Section heading above the chips. */
  label: string;
  /** One line explaining what this group means. */
  description: string;
}

export const SKIP_REASON_GROUPS: SkipReasonGroup[] = [
  {
    kind: 'internal',
    label: 'It was me',
    description: 'Resistance you felt and didn’t get past.',
  },
  {
    kind: 'external',
    label: 'It was the day',
    description: 'Circumstances that got in the way.',
  },
];

export const SKIP_REASONS: SkipReason[] = [
  // ---- Internal: the resistance itself ----
  { id: 'dreaded', kind: 'internal', label: 'Dreaded it', icon: 'thunderstorm-outline' },
  { id: 'too_tired', kind: 'internal', label: 'Too tired', icon: 'moon-outline' },
  { id: 'didnt_feel_like_it', kind: 'internal', label: 'Didn’t feel like it', icon: 'remove-circle-outline' },
  // ---- External: the day ----
  { id: 'no_time', kind: 'external', label: 'Ran out of time', icon: 'time-outline' },
  { id: 'forgot', kind: 'external', label: 'Forgot', icon: 'help-circle-outline' },
  { id: 'couldnt', kind: 'external', label: 'Couldn’t', icon: 'ban-outline' },
];

const BY_ID: Record<string, SkipReason> = SKIP_REASONS.reduce(
  (acc, r) => {
    acc[r.id] = r;
    return acc;
  },
  {} as Record<string, SkipReason>
);

export const getSkipReason = (id?: string | null): SkipReason | undefined =>
  id ? BY_ID[id] : undefined;

export const getSkipReasonsByKind = (kind: SkipReasonKind): SkipReason[] =>
  SKIP_REASONS.filter((r) => r.kind === kind);

/**
 * Resolve a reason's kind from its id. Returns undefined for an unknown id
 * rather than guessing, so a retired or malformed reason is excluded from the
 * internal/external split instead of silently landing in one side of it.
 */
export const getSkipReasonKind = (id?: string | null): SkipReasonKind | undefined =>
  getSkipReason(id)?.kind;
