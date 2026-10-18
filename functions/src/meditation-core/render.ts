// =============================================================================
// The render engine: a script in, a finished MP3 out. Shared core (see
// script.ts) — run by the local tools in scripts/ and by the Cloud Function
// that composes sessions for the app. Never imported by the app.
//
// Each spoken piece is voiced on its own by ElevenLabs (and cached, when a
// cache folder is given), so editing one line re-records only that line.
// Pauses are exact silence added here, not left to the voice. A background,
// if any, is looped with crossfades and mixed underneath. Everything that
// differs between a laptop and a server comes in through RenderDeps.
// =============================================================================

import { spawnSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { createHash } from 'crypto';
import { applyPronunciations, fitPauses, parseMeditationScript, withGaps, type MeditationMeta } from './script';

/** content/meditations/voice.json — how everything is voiced and mixed. */
export interface RenderSettings {
  model_id: string;
  /** null = the voice's own stored settings in ElevenLabs. */
  voice_settings: Record<string, number | boolean> | null;
  seed: number;
  default_gap_sec: number;
  lead_in_sec: number;
  tail_sec: number;
  loudness_lufs: number;
  true_peak_db: number;
  /** How loud the background sits, before a script's own `ambience_db` nudge. */
  ambience_lufs: number;
  ambience_fade_in_sec: number;
  ambience_fade_out_sec: number;
}

/** A narrator, from content/meditations/voices.json. The first is the default. */
export interface VoiceEntry {
  key: string;
  name: string;
  blurb: string;
  voice_id: string;
}

export interface RenderDeps {
  ffmpegPath: string;
  elevenLabsApiKey: string;
  settings: RenderSettings;
  voices: VoiceEntry[];
  pronunciations: Record<string, string>;
  bellPath: string;
  /** Where a background's loop file lives, or null if there's no such background. */
  ambiencePath: (name: string) => string | null;
  /** Scratch space; a fresh folder inside it is used and removed per render. */
  workDir: string;
  /** Keep voiced clips here between renders. Leave out to voice everything fresh. */
  clipCacheDir?: string;
  /** How many lines to send to the voice at once. */
  concurrency?: number;
  log?: (line: string) => void;
}

export interface RenderInput {
  /** The script's text, in the content/meditations/README.md format. */
  source: string;
  outPath: string;
  /** A background name, overriding the script's `ambience:`; null = the script's own. */
  ambienceOverride?: string | null;
  /** Stretch or shrink the pauses so the recording is exactly this long. */
  targetSec?: number;
  /** Called as the work moves from voicing lines to mixing them. */
  onStage?: (stage: 'recording' | 'mixing') => void | Promise<void>;
}

export interface RenderResult {
  meta: MeditationMeta;
  voice: VoiceEntry;
  ambience: string | null;
  durationSec: number;
  /** Voice and chime time. */
  speechSec: number;
  /** Total silence as written, before any fitting. */
  writtenPauseSec: number;
  /** Total silence as rendered. */
  pauseSec: number;
  charsNew: number;
  charsCached: number;
}

const SAMPLE_RATE = 44100;
/** When fitting a recording to a length, the first this-many seconds of every pause are left alone. */
const BASE_PAUSE_SEC = 2;
const toWav = ['-ar', String(SAMPLE_RATE), '-ac', '1', '-c:a', 'pcm_s16le'];

// Trim the voice's own leading/trailing silence so the script's pauses are
// exact. A little more is kept at the end so a breath or decay isn't clipped.
const TRIM =
  'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.08,areverse,' +
  'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.25,areverse';

export function findVoice(voices: VoiceEntry[], key: string | undefined): VoiceEntry {
  if (!key) return voices[0];
  const found = voices.find((v) => v.key === key);
  if (!found) throw new Error(`No voice "${key}" — choose from: ${voices.map((v) => v.key).join(', ')}`);
  return found;
}

/** Length of a PCM WAV file, read from its own header — no ffprobe needed. */
export function wavDurationSec(path: string): number {
  const buf = readFileSync(path);
  let byteRate = 0;
  for (let at = 12; at + 8 <= buf.length; ) {
    const id = buf.toString('ascii', at, at + 4);
    const size = buf.readUInt32LE(at + 4);
    if (id === 'fmt ') byteRate = buf.readUInt32LE(at + 16);
    if (id === 'data') {
      if (!byteRate) break;
      return Math.min(size, buf.length - at - 8) / byteRate;
    }
    at += 8 + size + (size % 2);
  }
  throw new Error(`Not a WAV file ffmpeg wrote: ${path}`);
}

/** Run `fn` over `items`, at most `limit` at a time, keeping results in order. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

export async function renderScript(input: RenderInput, deps: RenderDeps): Promise<RenderResult> {
  const { source, outPath, ambienceOverride = null, targetSec, onStage } = input;
  const { settings } = deps;
  const log = deps.log ?? (() => undefined);

  const ffmpeg = (args: string[]): string => {
    const res = spawnSync(deps.ffmpegPath, ['-hide_banner', '-nostdin', '-y', ...args], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    if (res.error) throw new Error(`ffmpeg could not start (${res.error.message})`);
    if (res.status !== 0) throw new Error(`ffmpeg failed:\n${(res.stderr ?? '').slice(-2000)}`);
    return res.stderr ?? '';
  };

  /** Integrated loudness and the loudnorm measurements to correct it in a second pass. */
  const measureLoudness = (path: string, target: string) => {
    const out = ffmpeg(['-i', path, '-af', `loudnorm=${target}:print_format=json`, '-f', 'null', '-']);
    return JSON.parse(out.slice(out.lastIndexOf('{'), out.lastIndexOf('}') + 1)) as Record<string, string>;
  };

  const { meta, segments: raw } = parseMeditationScript(source);
  const voice = findVoice(deps.voices, meta.voice);
  const segments = withGaps(raw, settings.default_gap_sec);
  const ambience = ambienceOverride ?? meta.ambience ?? null;
  const ambienceFile = ambience ? deps.ambiencePath(ambience) : null;
  if (ambience && !ambienceFile) throw new Error(`No background called "${ambience}"`);

  const work = join(deps.workDir, `${meta.id}-${process.pid}-${Date.now()}`);
  mkdirSync(work, { recursive: true });
  mkdirSync(dirname(outPath), { recursive: true });
  if (deps.clipCacheDir) mkdirSync(deps.clipCacheDir, { recursive: true });

  /**
   * Loop a background clip out to `totalSec`, crossfading each repeat into the
   * next so there's no click or gap at the seam, at the requested loudness,
   * faded in and out.
   */
  const buildBed = (sourceFile: string, totalSec: number, lufs: number, out: string) => {
    const loop = join(work, 'bed-loop.wav');
    ffmpeg(['-i', sourceFile, '-ar', String(SAMPLE_RATE), '-ac', '2', '-c:a', 'pcm_s16le', loop]);
    const len = wavDurationSec(loop);
    const xf = Math.min(3, len / 4);
    const copies = Math.max(1, Math.ceil((totalSec - xf) / (len - xf)) + 1);
    const gainDb = lufs - Number(measureLoudness(loop, 'I=-24:TP=-2:LRA=11').input_i);

    const inputs = Array.from({ length: copies }, () => ['-i', loop]).flat();
    const chain: string[] = [];
    let last = '0:a';
    for (let i = 1; i < copies; i++) {
      chain.push(`[${last}][${i}:a]acrossfade=d=${xf.toFixed(3)}:c1=qsin:c2=qsin[x${i}]`);
      last = `x${i}`;
    }
    const fadeOutAt = Math.max(0, totalSec - settings.ambience_fade_out_sec);
    chain.push(
      `[${last}]atrim=0:${totalSec.toFixed(3)},volume=${gainDb.toFixed(2)}dB,` +
        `afade=t=in:d=${settings.ambience_fade_in_sec},` +
        `afade=t=out:st=${fadeOutAt.toFixed(3)}:d=${settings.ambience_fade_out_sec}[bed]`,
    );
    ffmpeg([...inputs, '-filter_complex', chain.join(';'), '-map', '[bed]', '-c:a', 'pcm_s16le', out]);
  };

  try {
    // 1. Voice every spoken piece (a few at a time) and measure it.
    await onStage?.('recording');
    let charsNew = 0;
    let charsCached = 0;
    const bellWav = join(work, 'bell.wav');
    if (segments.some((s) => s.kind === 'bell')) ffmpeg(['-i', deps.bellPath, ...toWav, bellWav]);

    type Piece = { path: string; sec: number } | { pauseSec: number };
    const pieces: Piece[] = await mapLimit(segments, deps.concurrency ?? 4, async (seg, n): Promise<Piece> => {
      if (seg.kind === 'pause') return { pauseSec: seg.seconds };
      if (seg.kind === 'bell') return { path: bellWav, sec: wavDurationSec(bellWav) };

      const spoken = applyPronunciations(seg.text, deps.pronunciations);
      const key = createHash('sha256')
        .update(
          JSON.stringify({
            spoken,
            voiceId: voice.voice_id,
            model: settings.model_id,
            settings: settings.voice_settings,
            seed: settings.seed,
          }),
        )
        .digest('hex');
      const cached = deps.clipCacheDir ? join(deps.clipCacheDir, `${key}.mp3`) : null;
      let clip: string;
      if (cached && existsSync(cached)) {
        clip = cached;
        charsCached += spoken.length;
      } else {
        log(`voicing: ${spoken.slice(0, 60)}${spoken.length > 60 ? '…' : ''}`);
        clip = cached ?? join(work, `${n}.mp3`);
        writeFileSync(clip, await fetchClip(spoken, voice.voice_id, deps.elevenLabsApiKey, settings));
        charsNew += spoken.length;
      }
      const path = join(work, `${String(n).padStart(3, '0')}.wav`);
      ffmpeg(['-i', clip, '-af', TRIM, ...toWav, path]);
      return { path, sec: wavDurationSec(path) };
    });
    const speechSec = pieces.reduce((sum, p) => sum + ('sec' in p ? p.sec : 0), 0);

    // 2. Settle the pauses — as written, or fitted to the length asked for.
    await onStage?.('mixing');
    const leadIn = settings.lead_in_sec + (ambience ? settings.ambience_fade_in_sec : 0);
    const tail = settings.tail_sec + (ambience ? settings.ambience_fade_out_sec : 0);
    const written = pieces.flatMap((p) => ('pauseSec' in p ? [p.pauseSec] : []));
    const pauses = targetSec ? fitPauses(written, targetSec - leadIn - tail - speechSec, BASE_PAUSE_SEC) : written;

    const silence = (sec: number, name: string) => {
      const path = join(work, name);
      ffmpeg(['-f', 'lavfi', '-i', `anullsrc=r=${SAMPLE_RATE}:cl=mono`, '-t', sec.toFixed(3), ...toWav, path]);
      return path;
    };
    let p = 0;
    const files = [
      silence(leadIn, 'lead.wav'),
      ...pieces.map((piece, i) => ('path' in piece ? piece.path : silence(pauses[p++], `pause-${i}.wav`))),
      silence(tail, 'tail.wav'),
    ];

    // 3. Join, then even out the volume in two passes (measure, then apply).
    const list = join(work, 'list.txt');
    writeFileSync(list, files.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join('\n'));
    const joined = join(work, 'joined.wav');
    ffmpeg(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', joined]);

    const target = `I=${settings.loudness_lufs}:TP=${settings.true_peak_db}:LRA=11`;
    const m = measureLoudness(joined, target);
    const apply =
      `loudnorm=${target}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}` +
      `:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
    const voiceTrack = join(work, 'voice.wav');
    ffmpeg(['-i', joined, '-af', apply, ...toWav, voiceTrack]);
    const durationSec = wavDurationSec(voiceTrack);

    // 4. Mix in the background, if any, and encode.
    const encode = ['-map_metadata', '-1', '-metadata', `title=${meta.title}`, '-c:a', 'libmp3lame', '-b:a', '160k', outPath];
    if (ambience && ambienceFile) {
      const bed = join(work, 'bed.wav');
      const lufs = settings.ambience_lufs + Number(meta.ambience_db ?? 0);
      buildBed(ambienceFile, durationSec, lufs, bed);
      ffmpeg([
        '-i', voiceTrack, '-i', bed,
        '-filter_complex', '[0:a]aformat=channel_layouts=stereo[v];[v][1:a]amix=inputs=2:duration=first:normalize=0[mix]',
        '-map', '[mix]', ...encode,
      ]);
    } else {
      ffmpeg(['-i', voiceTrack, '-ac', '2', ...encode]);
    }

    return {
      meta,
      voice,
      ambience,
      durationSec,
      speechSec,
      writtenPauseSec: written.reduce((a, b) => a + b, 0),
      pauseSec: pauses.reduce((a, b) => a + b, 0),
      charsNew,
      charsCached,
    };
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

async function fetchClip(text: string, voiceId: string, apiKey: string, settings: RenderSettings): Promise<Buffer> {
  const body: Record<string, unknown> = { text, model_id: settings.model_id, seed: settings.seed };
  if (settings.voice_settings) body.voice_settings = settings.voice_settings;

  const backoff = (attempt: number) => new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
        method: 'POST',
        headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
        body: JSON.stringify(body),
        // One line never takes this long; a hung connection shouldn't outlive the function.
        signal: AbortSignal.timeout(60_000),
      });
    } catch (error) {
      // Network failure or timeout: worth another try or two.
      if (attempt < 2) {
        await backoff(attempt);
        continue;
      }
      throw error;
    }
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    const detail = await res.text();
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      await backoff(attempt);
      continue;
    }
    throw new Error(`ElevenLabs ${res.status}: ${detail.slice(0, 500)}`);
  }
}
