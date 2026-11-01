/**
 * Put approved exercise demo photos in the app — and only approved ones.
 *
 * Run with: npx tsx scripts/publishExerciseArt.ts
 *
 * For every exercise with an approved pair (a start, plus an end if it has
 * one), writes a resized JPEG to assets/exercises/<id>_<frame>.jpg and
 * lists it in src/data/exerciseDemoImages.ts, which the app bundles. Anything
 * no longer approved is removed. Local files only: commit, then ship OTA.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { approvedPair } from '../src/utils/exerciseArt/status';
import { allDemoIds, ASSETS_DIR, exerciseState, IMAGE_MAP_FILE, OUT_DIR, readApprovals, rel } from './exerciseArtFiles';

/** Long side in pixels: sharp at half a phone's width on a 3× screen. */
const SIZE = 768;
const QUALITY = 80;

function main() {
  const approvals = readApprovals();
  mkdirSync(ASSETS_DIR, { recursive: true });
  const keep = new Set<string>();
  const entries: string[] = [];
  let written = 0;

  for (const id of allDemoIds()) {
    const pair = approvedPair(exerciseState(id, approvals));
    if (!pair) continue;
    const lines: string[] = [];
    for (const [frame, c] of [['start', pair.start], ['end', pair.end]] as const) {
      if (!c) continue;
      const src = join(OUT_DIR, c.file);
      const name = `${id}_${frame}.jpg`;
      const dest = join(ASSETS_DIR, name);
      const tmp = `${dest}.tmp`;
      execFileSync('sips', ['-Z', String(SIZE), '-s', 'format', 'jpeg', '-s', 'formatOptions', String(QUALITY), src, '--out', tmp], {
        stdio: 'ignore',
      });
      // Leave an unchanged file alone so git doesn't see a rewrite.
      if (existsSync(dest) && readFileSync(dest).equals(readFileSync(tmp))) rmSync(tmp);
      else {
        writeFileSync(dest, readFileSync(tmp));
        rmSync(tmp);
        written++;
      }
      keep.add(name);
      lines.push(`    ${frame}: require('../../assets/exercises/${name}'),`);
    }
    entries.push(`  '${id}': {\n${lines.join('\n')}\n  },`);
  }

  const removed = readdirSync(ASSETS_DIR).filter((f) => f.endsWith('.jpg') && !keep.has(f));
  removed.forEach((f) => rmSync(join(ASSETS_DIR, f)));

  writeFileSync(
    IMAGE_MAP_FILE,
    `// Written by scripts/publishExerciseArt.ts from approved photos only — don't edit by hand.
import type { DemoImages } from './exerciseDemos';

export const EXERCISE_DEMO_IMAGES: Record<string, DemoImages> = {${entries.length ? `\n${entries.join('\n')}\n` : ''}};
`
  );

  console.log(`\n  ${entries.length} exercise(s) with approved photos · ${written} file(s) written · ${removed.length} removed`);
  console.log(`  ${rel(IMAGE_MAP_FILE)} updated. Commit assets/exercises/ and that file, then ship OTA.`);
}

main();
