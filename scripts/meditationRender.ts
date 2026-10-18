/**
 * The render engine wired up for this laptop: local ffmpeg, the files in
 * content/meditations/, and a clip cache so re-renders only voice what
 * changed. The engine itself is src/utils/meditation/render.ts, shared with
 * the Cloud Function.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  renderScript as runRender,
  type RenderDeps,
  type RenderInput,
  type RenderResult,
  type RenderSettings,
  type VoiceEntry,
} from '../src/utils/meditation/render';
import {
  BELL_FILE,
  CLIP_CACHE_DIR,
  PRONUNCIATIONS_FILE,
  ROOT,
  VOICES_FILE,
  VOICE_FILE,
  WORK_DIR,
  ambiencePath,
  readJson,
} from './meditationFiles';

export function loadEnv() {
  const envFile = join(ROOT, '.env.local');
  if (existsSync(envFile)) process.loadEnvFile(envFile);
}

export function localRenderDeps(log = true): RenderDeps {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('Set ELEVENLABS_API_KEY in .env.local');
  return {
    ffmpegPath: 'ffmpeg',
    elevenLabsApiKey: apiKey,
    settings: readJson<RenderSettings>(VOICE_FILE),
    voices: readJson<VoiceEntry[]>(VOICES_FILE),
    pronunciations: readJson<Record<string, string>>(PRONUNCIATIONS_FILE),
    bellPath: BELL_FILE,
    ambiencePath: (name) => (existsSync(ambiencePath(name)) ? ambiencePath(name) : null),
    workDir: WORK_DIR,
    clipCacheDir: CLIP_CACHE_DIR,
    log: log ? (line) => console.log(`  ${line}`) : undefined,
  };
}

/** `modelId` overrides voice.json's ElevenLabs model (Compose uses its own). */
export const renderScript = (input: RenderInput & { log?: boolean; modelId?: string }): Promise<RenderResult> => {
  const deps = localRenderDeps(input.log ?? true);
  if (input.modelId) deps.settings = { ...deps.settings, model_id: input.modelId };
  return runRender(input, deps);
};
