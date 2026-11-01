// =============================================================================
// Where each exercise's demo photos stand, and what a generation run should
// make. Pure — the files live in content/exercise-art/ and are read by
// scripts/exerciseArtFiles.ts. See content/exercise-art/README.md.
//
// Photos come in PAIRS: start candidate n, and end candidate n made by editing
// it (or the other way round for a `reverse` exercise). The founder picks a
// whole pair, so one review covers both photos.
//
// Every candidate records its "basis": the fingerprint of the photo it was
// made from — the master athlete photo for the lead, the lead for the other.
// Swap the master athlete and everything made from the old one stops
// counting, without anything being deleted.
// =============================================================================

export type ExerciseStatus =
  /** No finished pair yet. */
  | 'pending'
  /** At least one finished pair, waiting for the founder. */
  | 'generated'
  /** The founder picked a pair, and neither photo has changed since. */
  | 'approved'
  /** Ruled out: this exercise gets its text description instead of photos. */
  | 'rejected'
  /** Every pair was wrong; the next run makes fresh ones with the note. */
  | 'needs_regen'
  /** No master athlete photo picked yet. */
  | 'waiting';

export interface FileRef {
  file: string;
  sha256: string;
}

export type ArtDecision =
  | { status: 'approved'; start: FileRef; end?: FileRef; at: string }
  | { status: 'rejected'; note?: string; at: string }
  | { status: 'needs_regen'; note: string; at: string };

/** content/exercise-art/approvals.json */
export type ArtApprovals = Record<string, ArtDecision>;

export interface Candidate extends FileRef {
  /** 1-based, from the file name: push-up_start.c2.png → 2. Never reused. */
  index: number;
  /** Fingerprint of the photo this was made from (see top of file). */
  basis: string;
}

export interface Pair {
  index: number;
  /** Made first, from the master athlete photo: the start, or the end for a `reverse` exercise. */
  lead: Candidate;
  /** Made by editing the lead. Null until it's made — or always, for a one-photo exercise. */
  follow: Candidate | null;
  start: Candidate | null;
  end: Candidate | null;
}

/** A pair ready to review: it has its start, and its end if the exercise has one. */
export interface FinishedPair extends Pair {
  start: Candidate;
}

export interface ExerciseState {
  /** False for holds and carries, which get one photo. */
  hasEnd: boolean;
  /** The end is made first and edited into the start (ExerciseDemo.reverse). */
  reverse?: boolean;
  starts: Candidate[];
  ends: Candidate[];
  /** Fingerprint of the master athlete photo; null if none is picked. */
  reference: string | null;
  decision?: ArtDecision;
}

/** Leads made from the current master photo, each with the photo made from it. */
export const livePairs = (s: ExerciseState): Pair[] => {
  if (s.reference === null) return [];
  const [leads, follows] = s.reverse ? [s.ends, s.starts] : [s.starts, s.ends];
  return leads
    .filter((c) => c.basis === s.reference)
    .map((lead) => {
      const follow = (s.hasEnd && follows.find((f) => f.index === lead.index && f.basis === lead.sha256)) || null;
      return { index: lead.index, lead, follow, start: s.reverse ? follow : lead, end: s.reverse ? lead : follow };
    });
};

/** Pairs ready to review: both photos made (or the one, for a hold). */
export const finishedPairs = (s: ExerciseState): FinishedPair[] =>
  livePairs(s).filter((p): p is FinishedPair => !!p.start && (!s.hasEnd || !!p.follow));

const same = (c: Candidate | null, ref: FileRef | undefined) => !!c && !!ref && c.file === ref.file && c.sha256 === ref.sha256;

/** The approved pair, if the approval still holds. */
export const approvedPair = (s: ExerciseState): FinishedPair | null => {
  const d = s.decision;
  if (d?.status !== 'approved') return null;
  return finishedPairs(s).find((p) => same(p.start, d.start) && (!s.hasEnd || same(p.end, d.end))) ?? null;
};

export const exerciseStatus = (s: ExerciseState): ExerciseStatus => {
  if (s.decision?.status === 'rejected') return 'rejected';
  if (s.reference === null) return 'waiting';
  if (approvedPair(s)) return 'approved';
  if (finishedPairs(s).length > 0) return 'generated';
  return s.decision?.status === 'needs_regen' ? 'needs_regen' : 'pending';
};

export interface PairPlan {
  /** Leads that exist but whose follow-up failed last time: make just that. */
  followFor: number[];
  /** New pair numbers: make the lead, then the photo edited from it. */
  newPairs: number[];
}

/**
 * What the next run makes for one exercise: enough to bring it up to `count`
 * pairs. Numbers carry on past every existing file, so nothing is overwritten.
 */
export const planPairs = (s: ExerciseState, count: number): PairPlan => {
  const status = exerciseStatus(s);
  if (status === 'approved' || status === 'rejected' || status === 'waiting') return { followFor: [], newPairs: [] };
  const live = livePairs(s);
  const followFor = s.hasEnd ? live.filter((p) => !p.follow).map((p) => p.index) : [];
  const missing = Math.max(0, count - live.length);
  const next = [...s.starts, ...s.ends].reduce((max, c) => Math.max(max, c.index), 0) + 1;
  return { followFor, newPairs: Array.from({ length: missing }, (_, i) => next + i) };
};

/** Images a plan makes: one per follow-up only, one or two per new pair. */
export const imagesIn = (plan: PairPlan, hasEnd: boolean) => plan.followFor.length + plan.newPairs.length * (hasEnd ? 2 : 1);

/**
 * The next batch to generate: redo requests first (the founder is waiting on
 * them), then exercises with nothing yet, in `order`.
 */
export const nextBatch = (order: string[], statusOf: (id: string) => ExerciseStatus, size: number): string[] => {
  const redo = order.filter((id) => statusOf(id) === 'needs_regen');
  const fresh = order.filter((id) => statusOf(id) === 'pending');
  return [...redo, ...fresh].slice(0, size);
};

// -----------------------------------------------------------------------------
// Cost
// -----------------------------------------------------------------------------

/**
 * Nano Banana Pro for both photos: it was the only model that got push-up form
 * right — neutral head, full depth (2026-11-01). The cheaper models either
 * drifted on form or, editing a start into an end, returned the start unchanged.
 */
export const DEFAULT_MODEL = 'gemini-3-pro-image';
/** The master athlete photo is one text-only image; the cheap model is fine. */
export const REFERENCE_MODEL = 'gemini-2.5-flash-image';

/**
 * Dollars per generated image at the default 1K size, standard (not batch).
 * From ai.google.dev/gemini-api/docs/pricing, 2026-11-01. Input tokens add
 * well under a cent per image and aren't counted.
 */
export const PRICE_PER_IMAGE: Record<string, number> = {
  'gemini-2.5-flash-image': 0.039,
  'gemini-3.1-flash-lite-image': 0.0336,
  'gemini-3.1-flash-image': 0.067,
  'gemini-3-pro-image': 0.134,
};

export const estimateCost = (images: number, model: string): number => {
  const price = PRICE_PER_IMAGE[model];
  if (price === undefined) throw new Error(`No price known for ${model} — add it to PRICE_PER_IMAGE`);
  return Math.round(images * price * 100) / 100;
};
