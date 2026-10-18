/**
 * Compose (Lab): turns a short request into a finished guided session.
 *
 * The app creates users/{uid}/lab_compose/{id} with status "queued". This
 * function claims it, has Claude write the script (or decline an unsafe
 * request), voices and mixes it with the shared engine, uploads the MP3 to
 * Storage at users/{uid}/compose/{id}.mp3, and writes back a tokened download
 * URL. The app watches the doc as the status moves along:
 *   queued → writing → recording → mixing → ready | declined | failed
 *
 * The script-writing, voicing and mixing code is src/utils/meditation/,
 * copied into ./meditation-core by `npm run sync-core` (runs before deploy).
 * Voices, backgrounds and the chime are copied into ../meditation-assets the
 * same way.
 *
 * Privacy: Storage rules deny all client access. The recording is reachable
 * only through the URL on the owner's own doc, which only the owner can read.
 */

import * as admin from "firebase-admin";
import { onDocumentCreated, onDocumentDeleted } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import Anthropic from "@anthropic-ai/sdk";
import { randomUUID } from "crypto";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  COMPOSE_MONTHLY_MINUTES,
  COMPOSE_TTS_MODEL,
  allowanceResetLabel,
  cleanSpokenLine,
  refundMinutes,
  reserveMinutes,
  usageMonth,
  type ComposeUsage,
  toScriptSource,
  validateComposeRequest,
  type ComposeRequest,
  type ComposeSession,
} from "./meditation-core/compose";
import { COMPOSE_CLIENT_OPTIONS, writeComposedScript } from "./meditation-core/claude";
import {
  renderScript,
  type RenderDeps,
  type RenderSettings,
  type VoiceEntry,
} from "./meditation-core/render";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffmpegPath: string | null = require("ffmpeg-static");

const anthropicKey = defineSecret("ANTHROPIC_API_KEY");
const elevenLabsKey = defineSecret("ELEVENLABS_API_KEY");

const ASSETS = join(__dirname, "..", "meditation-assets");
const COMPOSE_DOC = "users/{uid}/lab_compose/{sessionId}";

const readAsset = <T>(name: string): T =>
  JSON.parse(readFileSync(join(ASSETS, name), "utf8")) as T;

const listAmbience = (): string[] =>
  readdirSync(join(ASSETS, "ambience"))
    .filter((f) => f.endsWith(".mp3"))
    .map((f) => f.slice(0, -4));

function renderDeps(workDir: string): RenderDeps {
  if (!ffmpegPath) throw new Error("ffmpeg-static has no binary for this platform");
  return {
    ffmpegPath,
    elevenLabsApiKey: elevenLabsKey.value(),
    // Same mixing settings as the curated recordings, cheaper voice model.
    settings: { ...readAsset<RenderSettings>("voice.json"), model_id: COMPOSE_TTS_MODEL },
    voices: readAsset<VoiceEntry[]>("voices.json"),
    pronunciations: readAsset<Record<string, string>>("pronunciations.json"),
    bellPath: join(ASSETS, "chime.wav"),
    ambiencePath: (name) => {
      const path = join(ASSETS, "ambience", `${name}.mp3`);
      return /^[a-z0-9-]+$/.test(name) && existsSync(path) ? path : null;
    },
    workDir,
    concurrency: 4,
  };
}

/**
 * The monthly allowance lives in a top-level collection that only this
 * function writes (firestore.rules lets the owner read it) — the user's own
 * subcollections are client-writable, so a counter there could be reset.
 */
const usageRef = (db: admin.firestore.Firestore, uid: string) => db.doc(`composeUsage/${uid}`);

/** Hold this session's minutes. Resolves to how many are left if they don't fit. */
async function holdMinutes(
  db: admin.firestore.Firestore,
  uid: string,
  minutes: number
): Promise<{ ok: true } | { ok: false; left: number }> {
  const ref = usageRef(db, uid);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const result = reserveMinutes(snap.data() as Partial<ComposeUsage> | undefined, minutes, new Date());
    if (!result.ok) return result;
    tx.set(ref, result.next);
    return { ok: true as const };
  });
}

/** Give held minutes back after a decline or a failure: only finished sessions count. */
async function releaseMinutes(db: admin.firestore.Firestore, uid: string, minutes: number, heldMonth: string) {
  const ref = usageRef(db, uid);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const next = refundMinutes(snap.data() as Partial<ComposeUsage> | undefined, minutes, heldMonth, new Date());
    if (next) tx.set(ref, next);
  });
}

export const composeSession = onDocumentCreated(
  {
    document: COMPOSE_DOC,
    secrets: [anthropicKey, elevenLabsKey],
    memory: "2GiB",
    timeoutSeconds: 540,
    // ffmpeg is CPU-bound: one session per instance keeps each one quick.
    concurrency: 1,
    maxInstances: 10,
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const { uid, sessionId } = event.params;
    const db = admin.firestore();
    const ref = snap.ref;
    const now = () => new Date().toISOString();
    const update = (changes: Partial<ComposeSession> & Record<string, unknown>) =>
      ref.update({ ...changes, updated_at: now() });

    // Events can be delivered more than once. Only the first delivery that
    // finds the doc still queued does the work.
    const claimed = await db.runTransaction(async (tx) => {
      const current = await tx.get(ref);
      if (!current.exists || current.get("status") !== "queued") return false;
      tx.update(ref, { status: "writing", updated_at: now() });
      return true;
    });
    if (!claimed) return;

    const work = mkdtempSync(join(tmpdir(), "compose-"));
    // Minutes held against the allowance, until the session is ready.
    let held: { minutes: number; month: string } | null = null;
    try {
      // Lab-only for now: the same gate the app uses (services/miniApps.ts).
      const profile = await db.doc(`users/${uid}`).get();
      if (profile.get("is_admin") !== true) {
        await update({ status: "failed", error: "Compose isn't available on this account yet." });
        return;
      }

      const data = snap.data();
      const req: ComposeRequest = {
        request: String(data.request ?? "").trim(),
        kind: data.kind,
        minutes: Number(data.minutes),
        voice: String(data.voice ?? ""),
        ambience: data.ambience ?? null,
      };
      const voices = readAsset<VoiceEntry[]>("voices.json");
      const problem = validateComposeRequest(req, {
        voices: voices.map((v) => v.key),
        ambience: listAmbience(),
      });
      if (problem) {
        await update({ status: "failed", error: problem });
        return;
      }
      const hold = await holdMinutes(db, uid, req.minutes);
      if (!hold.ok) {
        await update({
          status: "failed",
          error:
            hold.left > 0
              ? `You have ${hold.left} of this month's ${COMPOSE_MONTHLY_MINUTES} minutes left. Try a shorter session.`
              : `You've used this month's ${COMPOSE_MONTHLY_MINUTES} minutes. More on ${allowanceResetLabel(new Date())}.`,
        });
        return;
      }
      held = { minutes: req.minutes, month: usageMonth(new Date()) };

      const written = await writeComposedScript(
        new Anthropic({ apiKey: anthropicKey.value(), ...COMPOSE_CLIENT_OPTIONS }),
        req
      );
      console.log(
        `compose ${uid}/${sessionId}: ${written.kind} by ${written.model}, ` +
          `${written.usage.input_tokens} in / ${written.usage.output_tokens} out tokens`
      );
      if (written.kind === "declined") {
        await releaseMinutes(db, uid, held.minutes, held.month);
        held = null;
        await update({ status: "declined", decline_message: written.message });
        return;
      }

      const { script } = written;
      const out = join(work, "session.mp3");
      const result = await renderScript(
        {
          source: toScriptSource(sessionId, script, req),
          outPath: out,
          targetSec: req.minutes * 60,
          onStage: async (stage) => {
            await update({ status: stage, title: script.title });
          },
        },
        renderDeps(work)
      );

      const path = `users/${uid}/compose/${sessionId}.mp3`;
      const token = randomUUID();
      const bucket = admin.storage().bucket();
      await bucket.upload(out, {
        destination: path,
        metadata: {
          contentType: "audio/mpeg",
          cacheControl: "private, max-age=31536000",
          metadata: { firebaseStorageDownloadTokens: token },
        },
      });
      const url =
        `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/` +
        `${encodeURIComponent(path)}?alt=media&token=${token}`;

      // If the doc was deleted while this ran (the user deleted it, or their
      // account), cleanupComposeSession already ran without a path to remove —
      // so remove the file here rather than leave it orphaned.
      await update({
        status: "ready",
        title: script.title,
        script_lines: script.segments.map((s) => cleanSpokenLine(s.say)).filter(Boolean),
        audio_url: url,
        audio_path: path,
        duration_sec: Math.round(result.durationSec),
        characters_voiced: result.charsNew,
        model: written.model,
      }).catch(async (error) => {
        await bucket.file(path).delete({ ignoreNotFound: true });
        throw error;
      });
      console.log(`compose ${uid}/${sessionId}: ready, ${Math.round(result.durationSec)}s`);
    } catch (error) {
      console.error(`compose ${uid}/${sessionId} failed:`, error);
      if (held) {
        await releaseMinutes(db, uid, held.minutes, held.month).catch((e) =>
          console.error(`compose ${uid}/${sessionId}: couldn't give back ${held?.minutes} minutes:`, e)
        );
      }
      // The doc may have been deleted mid-way; nothing more to report then.
      await update({ status: "failed", error: "Something went wrong making this session. Try again." }).catch(
        () => undefined
      );
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  }
);

/** Deleting a session (or the account) removes its recording too. */
export const cleanupComposeSession = onDocumentDeleted(COMPOSE_DOC, async (event) => {
  const path = event.data?.get("audio_path");
  if (typeof path !== "string" || !path.startsWith(`users/${event.params.uid}/`)) return;
  await admin.storage().bucket().file(path).delete({ ignoreNotFound: true });
});
