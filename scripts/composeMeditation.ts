/**
 * Compose a guided meditation or guided-imagery session from a short request,
 * locally — the same pipeline the app's Cloud Function runs, for tuning the
 * writing cheaply.
 *
 * Run with:
 *   npx tsx scripts/composeMeditation.ts "calm before my first 400m race" \
 *     --kind imagery --minutes 6 --voice regina --ambience rain
 *
 * Claude writes the script (or declines an unsafe request), the render
 * engine voices it, and the pauses are fitted so it lands on exactly the
 * length asked for. --script-only writes the script without recording it (no
 * voice credits spent); --script <file> records a saved (or edited) script.
 *
 * Output: content/meditations/composed/<stamp>-<slug>.md / .json (git-ignored)
 *         content/meditations/out/composed/<stamp>-<slug>.mp3
 *
 * The prompt, limits and Claude call live in src/utils/meditation/, shared
 * with the Cloud Function. Needs ANTHROPIC_API_KEY and ELEVENLABS_API_KEY in
 * .env.local.
 */

import Anthropic from '@anthropic-ai/sdk';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { parseArgs } from 'node:util';
import { COMPOSE_TTS_MODEL, slugify, toScriptSource, validateComposeRequest, type ComposeKind, type ComposeRequest } from '../src/utils/meditation/compose';
import { COMPOSE_CLIENT_OPTIONS, writeComposedScript } from '../src/utils/meditation/claude';
import { AMBIENCE_DIR, CONTENT_DIR, OUT_DIR, ROOT, VOICES_FILE, formatDuration, readJson, writeJson, type VoiceEntry } from './meditationFiles';
import { loadEnv, renderScript } from './meditationRender';

const COMPOSED_DIR = join(CONTENT_DIR, 'composed');
const COMPOSED_OUT_DIR = join(OUT_DIR, 'composed');

const stamp = () => new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '').replace(/^(\d{8})/, '$1-');

const availableAmbience = (): string[] =>
  existsSync(AMBIENCE_DIR)
    ? readdirSync(AMBIENCE_DIR)
        .filter((f) => f.endsWith('.mp3'))
        .map((f) => f.slice(0, -4))
    : [];

async function main() {
  loadEnv();
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      kind: { type: 'string', default: 'meditation' },
      minutes: { type: 'string', default: '5' },
      voice: { type: 'string' },
      ambience: { type: 'string' },
      script: { type: 'string' },
      'script-only': { type: 'boolean', default: false },
    },
  });

  // --script <path>: record a composed script you've saved or edited, no new writing.
  if (values.script) {
    const source = readFileSync(values.script, 'utf8');
    const minutes = Number(/^length_min:\s*([\d.]+)/m.exec(source)?.[1]);
    const out = join(COMPOSED_OUT_DIR, `${basename(values.script, '.md')}.mp3`);
    const r = await renderScript({
      source,
      outPath: out,
      targetSec: minutes ? minutes * 60 : undefined,
      modelId: COMPOSE_TTS_MODEL,
    });
    console.log(`\n✓ ${r.meta.title} → ${out.replace(`${ROOT}/`, '')} (${formatDuration(r.durationSec)})`);
    return;
  }

  const voices = readJson<VoiceEntry[]>(VOICES_FILE);
  const req: ComposeRequest = {
    request: positionals.join(' ').trim(),
    kind: values.kind as ComposeKind,
    minutes: Number(values.minutes),
    voice: values.voice ?? voices[0].key,
    ambience: values.ambience ?? null,
  };
  const problem = validateComposeRequest(req, { voices: voices.map((v) => v.key), ambience: availableAmbience() });
  if (problem) throw new Error(problem);
  const voice = voices.find((v) => v.key === req.voice)!;

  console.log(`Writing a ${req.minutes}-minute ${req.kind === 'imagery' ? 'guided imagery session' : 'meditation'}…`);
  const started = Date.now();
  const written = await writeComposedScript(new Anthropic(COMPOSE_CLIENT_OPTIONS), req);
  const writeSec = Math.round((Date.now() - started) / 1000);
  const { usage } = written;
  console.log(`  written in ${writeSec}s by ${written.model} (${usage.input_tokens} in / ${usage.output_tokens} out tokens)`);

  mkdirSync(COMPOSED_DIR, { recursive: true });
  const title = written.kind === 'script' ? written.script.title : '';
  const id = `${stamp()}-${slugify(title || req.request)}`;
  const log = { ...req, model: written.model, usage, write_sec: writeSec };

  if (written.kind === 'declined') {
    writeJson(join(COMPOSED_DIR, `${id}.json`), { ...log, declined: written.message });
    console.log(`\n✗ Declined: ${written.message}`);
    return;
  }

  const { script } = written;
  const source = toScriptSource(id, script, req);
  const scriptFile = join(COMPOSED_DIR, `${id}.md`);
  writeFileSync(scriptFile, source);
  const words = script.segments.reduce((n, s) => n + s.say.split(/\s+/).filter(Boolean).length, 0);
  console.log(`  "${script.title}": ${script.segments.length} pieces, ${words} words`);

  if (values['script-only']) {
    writeJson(join(COMPOSED_DIR, `${id}.json`), { ...log, title: script.title, words });
    console.log(`\n✓ Script only (not recorded): ${scriptFile.replace(`${ROOT}/`, '')}`);
    console.log(`  To record it: npx tsx scripts/composeMeditation.ts --script ${scriptFile.replace(`${ROOT}/`, '')}`);
    return;
  }

  console.log(`Recording with ${voice.name}${req.ambience ? ` over ${req.ambience}` : ''}…`);
  const out = join(COMPOSED_OUT_DIR, `${id}.mp3`);
  const r = await renderScript({ source, outPath: out, targetSec: req.minutes * 60, log: false, modelId: COMPOSE_TTS_MODEL });
  writeJson(join(COMPOSED_DIR, `${id}.json`), {
    ...log,
    title: script.title,
    words,
    duration_sec: r.durationSec,
    speech_sec: r.speechSec,
    written_pause_sec: r.writtenPauseSec,
    fitted_pause_sec: r.pauseSec,
    chars_voiced: r.charsNew + r.charsCached,
  });

  const stretch = r.writtenPauseSec ? r.pauseSec / r.writtenPauseSec : 1;
  console.log(`\n✓ ${script.title} → ${out.replace(`${ROOT}/`, '')}`);
  console.log(
    `  ${formatDuration(r.durationSec)} long — speech ${formatDuration(r.speechSec)}, ` +
      `silence ${formatDuration(r.pauseSec)} (pauses ×${stretch.toFixed(2)} to fit)`,
  );
  console.log(`  script: ${scriptFile.replace(`${ROOT}/`, '')}`);
}

main().catch((err) => {
  console.error(`\n✗ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
