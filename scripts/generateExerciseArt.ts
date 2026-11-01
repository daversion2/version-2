/**
 * Make candidate demo photo PAIRS for exercises with Gemini's image models.
 *
 * Run with: npx tsx scripts/generateExerciseArt.ts --next              (the next 10 that need photos)
 *           npx tsx scripts/generateExerciseArt.ts push-up db-row      (named exercises)
 *           npx tsx scripts/generateExerciseArt.ts --reference         (master athlete, 4 candidates)
 *
 * Options:  --dry-run         print what would be made and the cost, make nothing
 *           --size N          how many exercises --next takes (default 10)
 *           --pairs N         pairs per exercise (default 3; master: candidates, default 4)
 *           --model M         default gemini-3-pro-image (see PRICE_PER_IMAGE)
 *           --max-cost D      refuse a run estimated above $D (default 10)
 *
 * Each pair is a start photo (made from the master athlete photo, plus a
 * public-domain pose photo where the spec names one) and an end photo made by
 * editing that start — the start alone is sent, so only the pose changes.
 * A `reverse` exercise (pull-up, chin-up) makes the end first and edits it
 * back into the start. Holds and carries get the start only. Then review them all at once:
 * npx tsx scripts/reviewExerciseArt.ts
 *
 * --next takes redo requests first (with the founder's note added to the
 * prompt), then exercises with nothing yet. Safe to re-run: approved and
 * skipped exercises are left alone, and a pair whose second photo failed gets
 * just that photo. Each run appends its count and cost to runs.jsonl. Nothing here
 * reaches users — see publishExerciseArt.ts.
 */

import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { followPrompt, leadPrompt, referencePrompt } from '../src/utils/exerciseArt/prompt';
import {
  DEFAULT_MODEL,
  estimateCost,
  livePairs,
  nextBatch,
  planPairs,
  PRICE_PER_IMAGE,
  REFERENCE_MODEL,
} from '../src/utils/exerciseArt/status';
import {
  allDemoIds,
  candidateBase,
  demoById,
  exerciseById,
  exerciseState,
  extFor,
  fileSha,
  listCandidates,
  loadEnv,
  mimeFor,
  OUT_DIR,
  posePhoto,
  readApprovals,
  REFERENCE_FILE,
  REFERENCE_OUT_DIR,
  RUN_LOG,
  sha256,
  sidecarOf,
  statusOf,
  writeJson,
  type CandidateRecord,
} from './exerciseArtFiles';

const API = 'https://generativelanguage.googleapis.com/v1beta/models';
const CONCURRENCY = 3;

interface InputImage {
  mime: string;
  data: Buffer;
}

/** One pair (or just its end), made in order: the end needs the start. */
interface PairJob {
  label: string;
  images: number;
  run: (model: string, made: (n: number) => void) => Promise<void>;
}

function parseArgs(argv: string[]) {
  const opts = {
    ids: [] as string[],
    reference: false,
    next: false,
    dryRun: false,
    size: 10,
    pairs: undefined as number | undefined,
    model: DEFAULT_MODEL,
    maxCost: 10,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--reference') opts.reference = true;
    else if (a === '--next') opts.next = true;
    else if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--size') opts.size = Number(argv[++i]);
    else if (a === '--pairs') opts.pairs = Number(argv[++i]);
    else if (a === '--model') opts.model = argv[++i];
    else if (a === '--max-cost') opts.maxCost = Number(argv[++i]);
    else if (a.startsWith('--')) throw new Error(`Unknown option ${a}`);
    else opts.ids.push(a);
  }
  return opts;
}

const usage = { prompt: 0, output: 0 };

async function callModel(model: string, prompt: string, images: InputImage[]): Promise<InputImage> {
  const res = await fetch(`${API}/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY! },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            ...images.map((i) => ({ inline_data: { mime_type: i.mime, data: i.data.toString('base64') } })),
            { text: prompt },
          ],
        },
      ],
      generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '1:1' } },
    }),
  });
  const body = (await res.json()) as {
    error?: { message: string };
    candidates?: {
      finishReason?: string;
      content?: { parts?: { inlineData?: { mimeType: string; data: string }; text?: string; thought?: boolean }[] };
    }[];
    promptFeedback?: { blockReason?: string };
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  };
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}: ${body.error?.message ?? 'no message'}`), { status: res.status });
  usage.prompt += body.usageMetadata?.promptTokenCount ?? 0;
  usage.output += body.usageMetadata?.candidatesTokenCount ?? 0;
  const parts = body.candidates?.[0]?.content?.parts ?? [];
  // The Pro model may send draft images flagged as thoughts first; take the final one.
  const img = parts.filter((p) => p.inlineData && !p.thought).pop()?.inlineData;
  if (!img) {
    const why = body.promptFeedback?.blockReason ?? body.candidates?.[0]?.finishReason ?? parts.find((p) => p.text)?.text;
    throw new Error(`No image returned (${why ?? 'no reason given'})`);
  }
  return { mime: img.mimeType, data: Buffer.from(img.data, 'base64') };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Make one image, retrying the failures that can pass; save it with its record. */
async function makeImage(
  base: string,
  model: string,
  prompt: string,
  images: InputImage[],
  basis: string,
  poseRef: string | null
): Promise<InputImage> {
  let lastErr: unknown;
  for (const wait of [0, 3000, 10000, 30000]) {
    if (wait) await sleep(wait);
    try {
      const image = await callModel(model, prompt, images);
      const path = `${base}.${extFor(image.mime)}`;
      writeFileSync(path, image.data);
      const record: CandidateRecord = { basis, model, prompt, pose_ref: poseRef, created_at: new Date().toISOString() };
      writeJson(sidecarOf(path), record);
      return image;
    } catch (err) {
      lastErr = err;
      const status = (err as { status?: number }).status;
      // The daily allowance (250 Pro requests on Tier 1, hit 2026-11-01) won't
      // come back for hours: stop the whole run rather than retry every job.
      if (status === 429 && /per_day|PerDay/i.test(String(err))) throw Object.assign(err as Error, { dailyQuota: true });
      // A bad request won't get better by asking again.
      if (status && status < 500 && status !== 429) break;
    }
  }
  throw lastErr;
}

function referenceJobs(count: number): PairJob[] {
  const existing = listCandidates(REFERENCE_OUT_DIR, 'athlete');
  const next = existing.reduce((m, c) => Math.max(m, c.index), 0) + 1;
  return Array.from({ length: count }, (_, i) => ({
    label: `athlete c${next + i}`,
    images: 1,
    run: async (model, made) => {
      await makeImage(join(REFERENCE_OUT_DIR, `athlete.c${next + i}`), model, referencePrompt(), [], 'text', null);
      made(1);
    },
  }));
}

function exerciseJobs(ids: string[], pairs: number): PairJob[] {
  const approvals = readApprovals();
  const reference = { mime: 'image/png', data: readFileSync(REFERENCE_FILE) };
  const referenceSha = fileSha(REFERENCE_FILE)!;
  const jobs: PairJob[] = [];
  for (const id of ids) {
    const exercise = exerciseById(id);
    const demo = demoById(id);
    const state = exerciseState(id, approvals);
    const plan = planPairs(state, pairs);
    const note = state.decision?.status === 'needs_regen' ? state.decision.note : undefined;
    // The lead is made fresh; the other photo is an edit of it, sent alone (see followPrompt).
    const leadFrame = demo.reverse ? 'end' : 'start';
    const followFrame = demo.reverse ? 'start' : 'end';
    const makeFollow = (index: number, lead: InputImage, model: string) =>
      makeImage(
        candidateBase(id, followFrame, index),
        model,
        followPrompt(exercise, demo, { frame: followFrame, note }),
        [lead],
        sha256(lead.data),
        null
      );

    for (const index of plan.followFor) {
      const file = livePairs(state).find((p) => p.index === index)!.lead.file;
      jobs.push({
        label: `${id} pair ${index} (${followFrame} only)`,
        images: 1,
        run: async (model, made) => {
          await makeFollow(index, { mime: mimeFor(file), data: readFileSync(join(OUT_DIR, file)) }, model);
          made(1);
        },
      });
    }
    for (const index of plan.newPairs) {
      jobs.push({
        label: `${id} pair ${index}${demo.reverse ? ' (end first)' : ''}`,
        images: demo.end ? 2 : 1,
        run: async (model, made) => {
          const pose = demo.poseRef ? [{ mime: 'image/jpeg', data: await posePhoto(demo.poseRef, leadFrame) }] : [];
          // Order matters: the prompt refers to "Image 1", "Image 2".
          const lead = await makeImage(
            candidateBase(id, leadFrame, index),
            model,
            leadPrompt(exercise, demo, { frame: leadFrame, hasPoseRef: pose.length > 0, note }),
            [reference, ...pose],
            referenceSha,
            demo.poseRef ?? null
          );
          made(1);
          if (demo.end) {
            await makeFollow(index, lead, model);
            made(1);
          }
        },
      });
    }
  }
  return jobs;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const modes = [opts.reference, opts.next, opts.ids.length > 0].filter(Boolean).length;
  if (modes !== 1) throw new Error('Say what to make: --next, exercise ids, or --reference.');
  const model = opts.reference ? REFERENCE_MODEL : opts.model;
  estimateCost(0, model); // unknown model → stop before anything else

  let jobs: PairJob[];
  let ids: string[] = [];
  if (opts.reference) {
    jobs = referenceJobs(opts.pairs ?? 4);
  } else {
    if (!fileSha(REFERENCE_FILE)) {
      throw new Error('No master athlete photo yet. Pick one in the review page: npx tsx scripts/reviewExerciseArt.ts');
    }
    const approvals = readApprovals();
    ids = opts.next ? nextBatch(allDemoIds(), (id) => statusOf(id, approvals), opts.size) : opts.ids;
    ids.forEach(demoById); // unknown id → stop
    jobs = exerciseJobs(ids, opts.pairs ?? 3);
  }

  const images = jobs.reduce((n, j) => n + j.images, 0);
  const estimate = estimateCost(images, model);
  console.log(`\n  Model ${model}`);
  for (const j of jobs) console.log(`    ${j.label}`);
  console.log(`\n  ${images} image${images === 1 ? '' : 's'} · estimated $${estimate.toFixed(2)}`);
  if (!jobs.length) return console.log(opts.next ? '  Nothing waiting — every exercise is made, approved or skipped.' : '  Nothing to make.');
  if (opts.dryRun) return console.log('  Dry run — nothing made.');
  if (estimate > opts.maxCost) {
    throw new Error(`Estimated $${estimate.toFixed(2)} is over --max-cost $${opts.maxCost}. Raise it to go ahead.`);
  }
  loadEnv();

  mkdirSync(REFERENCE_OUT_DIR, { recursive: true });
  let made = 0;
  let outOfQuota = false;
  const failed: string[] = [];
  const queue = [...jobs];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let job = queue.shift(); job; job = queue.shift()) {
        try {
          await job.run(model, (n) => (made += n));
          console.log(`  ✓ ${job.label}`);
        } catch (err) {
          failed.push(job.label);
          if ((err as { dailyQuota?: boolean }).dailyQuota) {
            if (!outOfQuota) console.log(`  ✗ Daily limit for ${model} reached — stopping. Run the same command again tomorrow; it picks up here.`);
            outOfQuota = true;
            queue.length = 0;
            continue;
          }
          console.log(`  ✗ ${job.label}: ${err instanceof Error ? err.message : err}`);
        }
      }
    })
  );

  const cost = Math.round(made * PRICE_PER_IMAGE[model] * 100) / 100;
  appendFileSync(
    RUN_LOG,
    `${JSON.stringify({
      at: new Date().toISOString(),
      model,
      target: opts.reference ? 'reference' : ids,
      requested: images,
      made,
      failed: failed.length,
      cost_usd: cost,
      prompt_tokens: usage.prompt,
      output_tokens: usage.output,
    })}\n`
  );
  console.log(`\n  Made ${made} of ${images} images · about $${cost.toFixed(2)}${failed.length ? ` · ${failed.length} failed — run again to retry` : ''}`);
  console.log('  Review them: npx tsx scripts/reviewExerciseArt.ts');
}

main().catch((err) => {
  console.error(`\n✗ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
