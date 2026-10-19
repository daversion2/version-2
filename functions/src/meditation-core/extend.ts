// =============================================================================
// Lengthening an uploaded recording: where to cut it, and how much of its own
// background ambience goes into each lengthened pause. Shared core (see
// script.ts); the ffmpeg work is scripts/extendRecording.ts.
// =============================================================================

/** A recipe in content/meditations/recordings/<id>.json. */
export interface RecordingRecipe {
  id: string;
  title: string;
  mode: 'sit' | 'breathe' | 'nsdr';
  technique?: string;
  length_min: number;
  voice: string;
  /** Relative to content/meditations/. */
  source: string;
  notes?: string;
  /** [start, end] seconds of each pause in the source to lengthen. */
  extend_pauses: [number, number][];
}

export interface ExtensionPlan {
  /** Source times to cut at — the middle of each lengthened pause. */
  cuts: number[];
  /** Length of ambience to insert at each cut, crossfade overlaps included. */
  fills: number[];
}

/**
 * Shares the added time between the pauses by their original length, so the
 * recording's own rhythm sets where the long silences fall. Every join is a
 * crossfade of `crossfadeSec`, which overlaps and so costs that much length;
 * the fills make up for it so the result is exactly `targetSec`.
 */
export function planExtension(
  sourceSec: number,
  pauses: [number, number][],
  targetSec: number,
  crossfadeSec: number,
): ExtensionPlan {
  if (!pauses.length) throw new Error('Name at least one pause to lengthen.');
  const sorted = [...pauses].sort((a, b) => a[0] - b[0]);
  sorted.forEach(([s, e], i) => {
    if (!(s >= 0 && e > s && e <= sourceSec)) throw new Error(`Pause ${s}–${e}s isn't inside the recording.`);
    if (i > 0 && s < sorted[i - 1][1]) throw new Error(`Pauses ${sorted[i - 1][0]}s and ${s}s overlap.`);
    if (e - s < 2 * crossfadeSec + 0.5) throw new Error(`Pause ${s}–${e}s is too short to lengthen cleanly.`);
  });
  const joins = 2 * sorted.length;
  const fillTotal = targetSec - sourceSec + joins * crossfadeSec;
  if (fillTotal <= joins * crossfadeSec) {
    throw new Error(`The recording is already ${Math.round(sourceSec)}s; it can't be stretched to ${targetSec}s.`);
  }
  const weights = sorted.map(([s, e]) => e - s);
  const sum = weights.reduce((a, b) => a + b, 0);
  return {
    cuts: sorted.map(([s, e]) => (s + e) / 2),
    fills: weights.map((w) => (fillTotal * w) / sum),
  };
}
