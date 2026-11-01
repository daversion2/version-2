/**
 * Review a whole batch of exercise demo photos in the browser.
 *
 * Run with: npx tsx scripts/reviewExerciseArt.ts
 *
 * Opens a page (served from this machine only) with every exercise that has
 * pairs ready: its spec, its cues and each candidate pair side by side. For
 * each, pick a pair, ask for a redo with a note (it goes into the next
 * prompt), or skip it (the app shows its text instead). Undecided ones stay
 * for next time. Save once for the batch. Until a master athlete photo is
 * picked, the page asks for that first.
 *
 * Saving writes content/exercise-art/approvals.json (commit it). Then:
 * generateExerciseArt.ts --next for the next batch and the redos, and
 * publishExerciseArt.ts to put approved photos in the app.
 *
 * Approval is for a person who has looked at the photos, so this refuses to
 * start without one at the keyboard — an automated tool, Claude included,
 * cannot approve on anyone's behalf. Ctrl-C to stop.
 */

import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { join } from 'node:path';
import {
  approvePair,
  demoById,
  fileSha,
  IMAGE_FILE,
  mimeFor,
  OUT_DIR,
  REFERENCE_FILE,
  REFERENCE_OUT_DIR,
  requestRedo,
  requirePerson,
  setReference,
  skipExercise,
} from './exerciseArtFiles';
import { reviewPage } from './exerciseArtReviewPage';

const TOKEN = randomBytes(16).toString('hex');

type Decision =
  | { action: 'approve'; pair: number }
  | { action: 'redo'; note: string }
  | { action: 'skip'; note?: string };

interface SaveBody {
  reference?: number;
  decisions: Record<string, Decision>;
}

function apply(body: SaveBody): string[] {
  const done: string[] = [];
  if (body.reference !== undefined) {
    setReference(body.reference);
    done.push(`Master athlete: c${body.reference}. Commit content/exercise-art/reference/athlete.png.`);
  }
  for (const [id, d] of Object.entries(body.decisions ?? {})) {
    demoById(id);
    if (d.action === 'approve') {
      approvePair(id, d.pair);
      done.push(`✓ ${id}: pair ${d.pair} approved`);
    } else if (d.action === 'redo') {
      requestRedo(id, d.note);
      done.push(`↻ ${id}: redo — “${d.note}”`);
    } else if (d.action === 'skip') {
      skipExercise(id, d.note);
      done.push(`– ${id}: skipped, text only`);
    }
  }
  return done;
}

const send = (res: ServerResponse, status: number, type: string, data: string | Buffer) => {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(data);
};

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

function main() {
  requirePerson();
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      if (req.method === 'GET' && url.pathname === '/') return send(res, 200, 'text/html; charset=utf-8', reviewPage(TOKEN));
      const img = url.pathname.match(/^\/(img|ref)\/(.+)$/);
      if (req.method === 'GET' && img) {
        const name = decodeURIComponent(img[2]);
        if (!IMAGE_FILE.test(name)) return send(res, 400, 'text/plain', 'bad name');
        const path = join(img[1] === 'img' ? OUT_DIR : REFERENCE_OUT_DIR, name);
        if (!existsSync(path)) return send(res, 404, 'text/plain', 'not found');
        return send(res, 200, mimeFor(name), readFileSync(path));
      }
      if (req.method === 'POST' && url.pathname === '/save') {
        if (req.headers['x-review-token'] !== TOKEN) return send(res, 403, 'application/json', JSON.stringify({ error: 'Bad token — reload the page.' }));
        const summary = apply(JSON.parse(await readBody(req)) as SaveBody);
        summary.forEach((line) => console.log(`  ${line}`));
        return send(res, 200, 'application/json', JSON.stringify({ summary }));
      }
      send(res, 404, 'text/plain', 'not found');
    } catch (err) {
      send(res, 500, 'application/json', JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
    }
  });
  server.listen(0, '127.0.0.1', () => {
    const { port } = server.address() as { port: number };
    const url = `http://127.0.0.1:${port}/`;
    console.log(`\n  Review page: ${url}`);
    console.log(`  Master athlete: ${fileSha(REFERENCE_FILE) ? 'picked' : 'not picked yet — the page asks first'}`);
    console.log('  Ctrl-C when you’re done.\n');
    try {
      execFileSync('open', [url]);
    } catch {
      // Not on a Mac: open the URL by hand.
    }
  });
}

try {
  main();
} catch (err) {
  console.error(`\n✗ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}
