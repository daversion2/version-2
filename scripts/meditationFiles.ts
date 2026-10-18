/**
 * Shared paths and file helpers for scripts/renderMeditation.ts and
 * scripts/approveMeditation.ts. See content/meditations/README.md.
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { MeditationApproval } from '../src/utils/meditation/script';
import { findVoice as findIn, type RenderSettings, type VoiceEntry } from '../src/utils/meditation/render';

export const ROOT = join(__dirname, '..');
export const CONTENT_DIR = join(ROOT, 'content', 'meditations');
export const SCRIPTS_DIR = join(CONTENT_DIR, 'scripts');
/** Finished recordings for review — git-ignored. */
export const OUT_DIR = join(CONTENT_DIR, 'out');
/** One clip per spoken line, keyed by what was sent to the voice — git-ignored. */
export const CLIP_CACHE_DIR = join(CONTENT_DIR, '.cache', 'clips');
export const WORK_DIR = join(CONTENT_DIR, '.cache', 'work');
export const APPROVALS_FILE = join(CONTENT_DIR, 'approvals.json');
export const VOICE_FILE = join(CONTENT_DIR, 'voice.json');
export const PRONUNCIATIONS_FILE = join(CONTENT_DIR, 'pronunciations.json');
export const VOICES_FILE = join(CONTENT_DIR, 'voices.json');
export const BELL_FILE = join(ROOT, 'assets', 'sounds', 'chime.wav');
/** Background loops, one `<name>.mp3` each, with where each came from in sources.json. */
export const AMBIENCE_DIR = join(CONTENT_DIR, 'ambience');
export const AMBIENCE_SOURCES_FILE = join(AMBIENCE_DIR, 'sources.json');

/** content/meditations/voice.json. */
export type VoiceConfig = RenderSettings;
export type { VoiceEntry };

/** Written next to each MP3 by the render step. */
export interface RenderRecord {
  id: string;
  title: string;
  script_sha256: string;
  voice_id: string;
  model_id: string;
  voice_settings: VoiceConfig['voice_settings'];
  seed: number;
  ambience: string | null;
  duration_sec: number;
  rendered_at: string;
}

export const sha256 = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');

export const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;

export const writeJson = (path: string, value: unknown) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);

export const scriptPath = (id: string) => join(SCRIPTS_DIR, `${id}.md`);
export const audioPath = (id: string) => join(OUT_DIR, `${id}.mp3`);
export const recordPath = (id: string) => join(OUT_DIR, `${id}.json`);
/** Try-a-background renders. No record is written, so these can never be approved. */
export const previewPath = (id: string, ambience: string) => join(OUT_DIR, 'previews', `${id}.${ambience}.mp3`);
export const ambiencePath = (name: string) => join(AMBIENCE_DIR, `${name}.mp3`);

export const findVoice = (key: string | undefined): VoiceEntry => findIn(readJson<VoiceEntry[]>(VOICES_FILE), key);

export const listScriptIds = () =>
  readdirSync(SCRIPTS_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.slice(0, -3))
    .sort();

export const readApprovals = (): Record<string, MeditationApproval> =>
  existsSync(APPROVALS_FILE) ? readJson(APPROVALS_FILE) : {};

export const fileSha = (path: string) => (existsSync(path) ? sha256(readFileSync(path)) : null);

export const readRecord = (id: string): RenderRecord | null =>
  existsSync(recordPath(id)) ? readJson<RenderRecord>(recordPath(id)) : null;

export const formatDuration = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;
