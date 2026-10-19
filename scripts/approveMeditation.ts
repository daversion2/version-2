/**
 * The founder's sign-off on a guided meditation recording.
 *
 * Run with: npx tsx scripts/approveMeditation.ts               (status of all)
 *           npx tsx scripts/approveMeditation.ts first-sit-5   (approve one)
 *           npx tsx scripts/approveMeditation.ts --revoke first-sit-5
 *
 * Approving records the exact audio file's fingerprint in
 * content/meditations/approvals.json. Publishing (not built yet) must ship
 * only recordings whose status is 'approved' — re-rendering, or editing the
 * script, drops a recording back to needing a listen.
 *
 * Approval is for a person who has listened to the whole recording. It asks
 * at the keyboard and refuses to run without one, so an automated tool —
 * Claude included — cannot approve on anyone's behalf.
 */

import { createInterface } from 'node:readline/promises';
import { approvalStatus, type ApprovalStatus } from '../src/utils/meditation/script';
import {
  APPROVALS_FILE,
  ROOT,
  audioPath,
  fileSha,
  formatDuration,
  listAllIds,
  readApprovals,
  readRecord,
  sourceSha,
  writeJson,
} from './meditationFiles';

const LABEL: Record<ApprovalStatus, string> = {
  'not-rendered': 'not rendered yet',
  'stale-render': 'changed since it was made — make it again, then listen',
  'not-approved': 'rendered, waiting for you to listen',
  'audio-changed': 'changed since you approved it — listen again',
  approved: '✓ approved',
};

function statusOf(id: string) {
  const scriptSha = sourceSha(id);
  const record = readRecord(id);
  return approvalStatus({
    scriptSha,
    audioSha: fileSha(audioPath(id)),
    renderedFromScriptSha: record?.script_sha256 ?? null,
    approval: readApprovals()[id],
  });
}

function showAll() {
  const ids = listAllIds();
  const width = Math.max(...ids.map((id) => id.length));
  for (const id of ids) console.log(`  ${id.padEnd(width)}  ${LABEL[statusOf(id)]}`);
}

async function approve(id: string) {
  const status = statusOf(id);
  if (status === 'approved') return console.log(`${id} is already approved.`);
  if (status === 'not-rendered' || status === 'stale-render') throw new Error(`${id}: ${LABEL[status]}.`);
  if (!process.stdin.isTTY) throw new Error('Approval has to be typed by a person at the keyboard.');

  const record = readRecord(id)!;
  const audio = audioPath(id);
  console.log(`\n  ${record.title} (${formatDuration(record.duration_sec)})`);
  console.log(`  ${audio.replace(`${ROOT}/`, '')}\n`);
  console.log('  Approving says you listened to all of it, start to finish, and it can be offered to users.');

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(`  Type the id (${id}) to approve, anything else to cancel: `)).trim();
  rl.close();
  if (answer !== id) return console.log('  Cancelled — nothing approved.');

  const approvals = readApprovals();
  approvals[id] = {
    audio_sha256: fileSha(audio)!,
    script_sha256: record.script_sha256,
    duration_sec: record.duration_sec,
    approved_at: new Date().toISOString(),
  };
  writeJson(APPROVALS_FILE, Object.fromEntries(Object.entries(approvals).sort(([a], [b]) => a.localeCompare(b))));
  console.log(`  ✓ ${id} approved. Commit content/meditations/approvals.json to keep the record.`);
}

function revoke(id: string) {
  const approvals = readApprovals();
  if (!approvals[id]) return console.log(`${id} wasn't approved.`);
  delete approvals[id];
  writeJson(APPROVALS_FILE, approvals);
  console.log(`${id} approval removed.`);
}

async function main() {
  const [first, second] = process.argv.slice(2);
  if (!first) return showAll();
  if (first === '--revoke') {
    if (!second) throw new Error('Usage: --revoke <id>');
    return revoke(second);
  }
  await approve(first);
}

main().catch((err) => {
  console.error(`\n✗ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
