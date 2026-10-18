// =============================================================================
// Guided audio scripts: the script format, pause fitting, and the curated
// approval gate.
//
// Part of src/utils/meditation/, the shared core used three ways: by the
// local tools in scripts/ (curated recordings and the compose prototype), by
// the Cloud Function that composes sessions for the app (functions/ copies
// this folder in with `npm --prefix functions run sync-core`, which runs before
// every functions deploy), and,
// for types and validation only, by the app itself. Keep it free of anything
// React Native or Firebase. See content/meditations/README.md for the format.
// =============================================================================

export interface MeditationMeta {
  id: string;
  title: string;
  [key: string]: string;
}

export type MeditationSegment =
  | { kind: 'speech'; text: string }
  | { kind: 'pause'; seconds: number }
  | { kind: 'bell' };

export interface ParsedMeditation {
  meta: MeditationMeta;
  segments: MeditationSegment[];
}

const PAUSE_RE = /^\[pause\s+(?:(\d+)m)?\s*(?:(\d+(?:\.\d+)?)s?)?\]$/i;

/**
 * Parse a script file.
 *
 * - Optional front matter between `---` lines (`key: value`); `id` and
 *   `title` are required.
 * - `[pause 20s]`, `[pause 1m30s]` or `[pause 20]` — silence.
 * - `[bell]` — the app's chime.
 * - Lines starting with `#` are writer's notes and are never spoken.
 * - Anything else is spoken. Consecutive lines join into one segment; a blank
 *   line starts a new one. Spoken segments with no pause between them get the
 *   default gap (`withGaps`).
 */
export function parseMeditationScript(source: string): ParsedMeditation {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const meta: Record<string, string> = {};
  let i = 0;

  if (lines[0]?.trim() === '---') {
    i = 1;
    for (; i < lines.length && lines[i].trim() !== '---'; i++) {
      const m = lines[i].match(/^([\w-]+)\s*:\s*(.*)$/);
      if (m) meta[m[1]] = m[2].trim();
    }
    if (i >= lines.length) throw new Error('Front matter is missing its closing ---');
    i++;
  }
  if (!meta.id) throw new Error('Script needs an `id` in its front matter');
  if (!meta.title) throw new Error('Script needs a `title` in its front matter');

  const segments: MeditationSegment[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) segments.push({ kind: 'speech', text: paragraph.join(' ') });
    paragraph = [];
  };

  for (; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      flush();
      continue;
    }
    if (line.startsWith('#')) continue;
    if (line.startsWith('[')) {
      flush();
      if (/^\[bell\]$/i.test(line)) {
        segments.push({ kind: 'bell' });
        continue;
      }
      const m = line.match(PAUSE_RE);
      const seconds = m ? Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0) : NaN;
      if (!m || !(seconds > 0)) throw new Error(`Line ${i + 1}: can't read "${line}" — use [pause 20s] or [bell]`);
      segments.push({ kind: 'pause', seconds });
      continue;
    }
    paragraph.push(line);
  }
  flush();

  if (!segments.some((s) => s.kind === 'speech')) throw new Error('Script has nothing to say');
  return { meta: meta as MeditationMeta, segments };
}

/** Insert the default gap between spoken segments that have nothing between them. */
export function withGaps(segments: MeditationSegment[], gapSec: number): MeditationSegment[] {
  const out: MeditationSegment[] = [];
  segments.forEach((s, idx) => {
    if (s.kind === 'speech' && segments[idx - 1]?.kind === 'speech') out.push({ kind: 'pause', seconds: gapSec });
    out.push(s);
  });
  return out;
}

/**
 * Swap words the voice says wrong for spellings it says right, e.g.
 * `{ "NSDR": "N S D R" }`. Whole words only, case-sensitive. The spoken text
 * (not the script) is what the clip cache keys on.
 */
export function applyPronunciations(text: string, map: Record<string, string>): string {
  return Object.keys(map)
    .sort((a, b) => b.length - a.length)
    .reduce((acc, word) => {
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return acc.replace(new RegExp(`(?<![\\w])${escaped}(?![\\w])`, 'g'), map[word]);
    }, text);
}

/** Total silence written into the script, in seconds — for the length report. */
export function totalPauseSec(segments: MeditationSegment[]): number {
  return segments.reduce((sum, s) => sum + (s.kind === 'pause' ? s.seconds : 0), 0);
}

/**
 * Stretch or shrink pauses so together they fill `availableSec` — how a
 * recording lands on exactly the length asked for once the speech has been
 * voiced and measured.
 *
 * The first `baseSec` of every pause is left alone, so the short beat after
 * each line keeps its rhythm; only the time beyond it — the long silences for
 * practising or picturing — is scaled. If there's nothing long to scale, the
 * pauses stretch in proportion instead. If even the untouched beats don't
 * fit, they're all kept and the recording runs long.
 */
export function fitPauses(pauses: number[], availableSec: number, baseSec: number): number[] {
  const round = (n: number) => Math.round(n * 1000) / 1000;
  const kept = pauses.map((p) => Math.min(p, baseSec));
  const keptSec = kept.reduce((a, b) => a + b, 0);
  const extraSec = pauses.reduce((sum, p, i) => sum + p - kept[i], 0);

  if (!pauses.length || availableSec <= keptSec) return kept;
  if (extraSec === 0) return pauses.map((p) => round((p * availableSec) / keptSec));
  const scale = (availableSec - keptSec) / extraSec;
  return pauses.map((p, i) => round(kept[i] + (p - kept[i]) * scale));
}

// --- Approval gate -----------------------------------------------------------

export interface MeditationApproval {
  audio_sha256: string;
  script_sha256: string;
  duration_sec: number;
  approved_at: string;
}

export type ApprovalStatus =
  | 'not-rendered'
  | 'not-approved'
  /** The audio file differs from the one that was approved — listen again. */
  | 'audio-changed'
  /** The script was edited after this audio was rendered — re-render first. */
  | 'stale-render'
  | 'approved';

export interface ApprovalInputs {
  /** Hash of the script file as it is now. */
  scriptSha: string;
  /** Hash of the rendered audio, or null if it hasn't been rendered. */
  audioSha: string | null;
  /** The script hash recorded when the audio was rendered. */
  renderedFromScriptSha: string | null;
  approval: MeditationApproval | undefined;
}

/**
 * Where a recording stands. Only 'approved' may ever be published: the exact
 * audio the founder approved, rendered from the script as it stands today.
 */
export function approvalStatus({ scriptSha, audioSha, renderedFromScriptSha, approval }: ApprovalInputs): ApprovalStatus {
  if (!audioSha) return 'not-rendered';
  if (renderedFromScriptSha !== scriptSha) return 'stale-render';
  if (!approval) return 'not-approved';
  if (approval.audio_sha256 !== audioSha || approval.script_sha256 !== scriptSha) return 'audio-changed';
  return 'approved';
}
