/**
 * Exercise demo photos from the command line: where everything stands, and
 * one-off decisions. For a whole batch, use the review page instead:
 * npx tsx scripts/reviewExerciseArt.ts
 *
 * Run with: npx tsx scripts/approveExerciseArt.ts                         (where everything stands)
 *           npx tsx scripts/approveExerciseArt.ts push-up 2               (approve pair 2)
 *           npx tsx scripts/approveExerciseArt.ts push-up --redo "head looking up"
 *           npx tsx scripts/approveExerciseArt.ts push-up --skip          (text only, no photos)
 *           npx tsx scripts/approveExerciseArt.ts --revoke push-up        (forget the decision)
 *           npx tsx scripts/approveExerciseArt.ts --reference 1           (pick master athlete c1)
 *
 * Everything but the status list changes approvals.json and is for a person
 * who has looked at the photos: it refuses to run without one at the
 * keyboard, so an automated tool — Claude included — can't decide for them.
 */

import { existsSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import {
  allDemoIds,
  approvePair,
  clearDecision,
  demoById,
  readApprovals,
  REFERENCE_FILE,
  rel,
  requestRedo,
  requirePerson,
  setReference,
  skipExercise,
  STATUS_LABEL,
  statusOf,
} from './exerciseArtFiles';
import type { ExerciseStatus } from '../src/utils/exerciseArt/status';

function showAll() {
  const approvals = readApprovals();
  console.log(`\n  Master athlete: ${existsSync(REFERENCE_FILE) ? '✓ picked' : 'not picked yet'}\n`);
  const ids = allDemoIds();
  const width = Math.max(...ids.map((id) => id.length));
  const counts: Partial<Record<ExerciseStatus, number>> = {};
  for (const id of ids) {
    const s = statusOf(id, approvals);
    counts[s] = (counts[s] ?? 0) + 1;
    console.log(`  ${id.padEnd(width)}  ${STATUS_LABEL[s]}`);
  }
  console.log(`\n  ${Object.entries(counts).map(([s, n]) => `${n} ${s}`).join(', ')}`);
}

async function confirm(what: string, typed: string): Promise<boolean> {
  requirePerson();
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(`  ${what}\n  Type ${typed} to confirm, anything else to cancel: `)).trim();
  rl.close();
  if (answer !== typed) console.log('  Cancelled.');
  return answer === typed;
}

async function main() {
  const [first, second, third] = process.argv.slice(2);
  if (!first) return showAll();
  if (first === '--reference') {
    const n = Number(second);
    if (existsSync(REFERENCE_FILE)) console.log('  ⚠ Replacing the master athlete: every photo made from the old one stops counting.');
    if (!(await confirm(`Master athlete c${n}`, `c${n}`))) return;
    setReference(n);
    return console.log(`  ✓ Master athlete set. Commit ${rel(REFERENCE_FILE)}.`);
  }
  if (first === '--revoke') {
    requirePerson();
    demoById(second);
    clearDecision(second);
    return console.log(`  ${second}: decision removed.`);
  }
  const id = first;
  demoById(id);
  if (second === '--redo') {
    requirePerson();
    requestRedo(id, third ?? '');
    return console.log(`  ${id}: pairs set aside; the next --next run makes fresh ones.`);
  }
  if (second === '--skip') {
    requirePerson();
    skipExercise(id, third);
    return console.log(`  ${id}: skipped — the app shows its text description.`);
  }
  const n = Number(second);
  if (!Number.isInteger(n) || n < 1) throw new Error('Give the pair number: push-up 2');
  if (!(await confirm(`Approve ${id} pair ${n}: you checked hands, feet, spine, head and equipment.`, id))) return;
  approvePair(id, n);
  console.log(`  ✓ ${id} pair ${n} approved. Commit content/exercise-art/approvals.json.`);
}

main().catch((err) => {
  console.error(`\n✗ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
