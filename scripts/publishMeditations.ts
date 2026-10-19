/**
 * Put approved guided recordings in the app — and only approved ones.
 *
 * Run with: npx tsx scripts/publishMeditations.ts            (preview: what would change)
 *           npx tsx scripts/publishMeditations.ts --publish  (do it)
 *
 * For every recording whose status is "approved" (approveMeditation.ts: the
 * founder listened, and the file hasn't changed since), uploads out/<id>.mp3
 * to Storage at guided/<id>.mp3 and writes its catalog entry to Firestore
 * guidedRecordings/<id>, which Meditate reads. Anything in the catalog that is
 * no longer approved — re-made, revoked, or deleted — is taken down. A
 * recording already published with the same audio is left alone.
 *
 * Writes to PRODUCTION (there is no staging project). Uses the Firebase CLI's
 * own login (`firebase login`), with the Storage and Firestore REST APIs.
 */

import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { approvalStatus, parseMeditationScript } from '../src/utils/meditation/script';
import type { RecordingRecipe } from '../src/utils/meditation/extend';
import {
  audioPath,
  fileSha,
  listAllIds,
  readApprovals,
  readJson,
  readRecord,
  recipePath,
  scriptPath,
  sourceSha,
  VOICES_FILE,
  type VoiceEntry,
} from './meditationFiles';

const PROJECT = 'version-2-4afa1';
const BUCKET = 'version-2-4afa1.firebasestorage.app';
const COLLECTION = 'guidedRecordings';
const FIRESTORE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

/** One catalog entry: what Meditate shows and plays. Mirrors GuidedRecording in src/types/meditate.ts. */
interface CatalogEntry {
  id: string;
  title: string;
  mode: string;
  technique: string | null;
  length_min: number;
  duration_sec: number;
  voice: string;
  audio_url: string;
  audio_path: string;
  audio_sha256: string;
  published_at: string;
}

/** The Firebase CLI's access token, refreshed by asking the CLI to do something small. */
function accessToken(): string {
  execFileSync('firebase', ['projects:list', '--json'], { stdio: 'ignore' });
  const config = JSON.parse(readFileSync(join(homedir(), '.config/configstore/firebase-tools.json'), 'utf8'));
  const token = config?.tokens?.access_token;
  if (!token) throw new Error('Not logged in to Firebase — run `firebase login`.');
  return token;
}

/** What Meditate needs to know about a recording, from its script or recipe. */
function describe(id: string): Omit<CatalogEntry, 'audio_url' | 'audio_path' | 'audio_sha256' | 'published_at'> {
  const record = readRecord(id)!;
  if (existsSync(scriptPath(id))) {
    const { meta } = parseMeditationScript(readFileSync(scriptPath(id), 'utf8'));
    const voices = readJson<VoiceEntry[]>(VOICES_FILE);
    return {
      id,
      title: meta.title,
      mode: meta.mode ?? 'sit',
      technique: meta.technique ?? null,
      length_min: Number(meta.length_min) || Math.round(record.duration_sec / 60),
      duration_sec: record.duration_sec,
      voice: voices.find((v) => v.voice_id === record.voice_id)?.name ?? 'Narrator',
    };
  }
  const recipe = readJson<RecordingRecipe>(recipePath(id));
  return {
    id,
    title: recipe.title,
    mode: recipe.mode,
    technique: recipe.technique ?? null,
    length_min: recipe.length_min,
    duration_sec: record.duration_sec,
    voice: recipe.voice,
  };
}

const toFields = (entry: CatalogEntry) =>
  Object.fromEntries(
    Object.entries(entry).map(([k, v]) => [
      k,
      v === null ? { nullValue: null } : typeof v === 'number' ? { doubleValue: v } : { stringValue: String(v) },
    ]),
  );

async function api(token: string, url: string, init: RequestInit = {}) {
  const res = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } });
  if (!res.ok && res.status !== 404) throw new Error(`${init.method ?? 'GET'} ${url} → ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res;
}

async function upload(token: string, path: string, file: string): Promise<string> {
  const downloadToken = randomUUID();
  const boundary = `nn-${randomUUID()}`;
  const metadata = {
    name: path,
    contentType: 'audio/mpeg',
    cacheControl: 'public, max-age=31536000',
    metadata: { firebaseStorageDownloadTokens: downloadToken },
  };
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Type: audio/mpeg\r\n\r\n`),
    readFileSync(file),
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  await api(token, `https://storage.googleapis.com/upload/storage/v1/b/${BUCKET}/o?uploadType=multipart`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media&token=${downloadToken}`;
}

async function main() {
  const publish = process.argv.includes('--publish');
  const approvals = readApprovals();

  // Approved = the exact audio the founder approved, made from today's source.
  const approved = listAllIds().filter(
    (id) =>
      approvalStatus({
        scriptSha: sourceSha(id),
        audioSha: fileSha(audioPath(id)),
        renderedFromScriptSha: readRecord(id)?.script_sha256 ?? null,
        approval: approvals[id],
      }) === 'approved',
  );

  const token = accessToken();
  const listing = await (await api(token, `${FIRESTORE}/${COLLECTION}?pageSize=300`)).json();
  const live = new Map<string, string>(
    (listing.documents ?? []).map((d: { name: string; fields: Record<string, { stringValue?: string }> }) => [
      d.name.split('/').pop()!,
      d.fields.audio_sha256?.stringValue ?? '',
    ]),
  );

  const toUpload = approved.filter((id) => live.get(id) !== fileSha(audioPath(id)));
  const unchanged = approved.filter((id) => !toUpload.includes(id));
  const toRemove = [...live.keys()].filter((id) => !approved.includes(id));

  console.log(`Approved: ${approved.join(', ') || '(none)'}`);
  console.log(`  publish: ${toUpload.join(', ') || '—'}`);
  console.log(`  already live, unchanged: ${unchanged.join(', ') || '—'}`);
  console.log(`  take down (no longer approved): ${toRemove.join(', ') || '—'}`);
  if (!publish) {
    console.log('\nPreview only. Run again with --publish to make these changes in production.');
    return;
  }

  for (const id of toUpload) {
    const path = `guided/${id}.mp3`;
    const url = await upload(token, path, audioPath(id));
    const entry: CatalogEntry = {
      ...describe(id),
      audio_url: url,
      audio_path: path,
      audio_sha256: fileSha(audioPath(id))!,
      published_at: new Date().toISOString(),
    };
    await api(token, `${FIRESTORE}/${COLLECTION}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: toFields(entry) }),
    });
    console.log(`✓ published ${id}`);
  }
  for (const id of toRemove) {
    await api(token, `${FIRESTORE}/${COLLECTION}/${id}`, { method: 'DELETE' });
    await api(token, `https://storage.googleapis.com/storage/v1/b/${BUCKET}/o/${encodeURIComponent(`guided/${id}.mp3`)}`, {
      method: 'DELETE',
    });
    console.log(`✓ took down ${id}`);
  }
  console.log('\nDone. Meditate picks up the catalog the next time it opens.');
}

main().catch((err) => {
  console.error(`\n✗ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
