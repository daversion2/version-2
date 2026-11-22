#!/usr/bin/env node
/**
 * Publish a finished video: upload final.mp4 to Firebase Storage under tutorials/ and add
 * its entry to src/data/tutorials.ts.
 *
 *   node scripts/video/publish.mjs <slug> [--kind tutorial|explainer] [--screen <screenIntros key>]
 *       prints what it would do
 *   ... --yes     does it (this writes to the production bucket: there is no staging)
 *
 * Uses the `firebase login` session, the same way as the other admin scripts in scripts/.
 * Republishing the same slug replaces the file and its entry.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { upsertTutorial } from "./lib.mjs";
import { ROOT, args, flag, opt, probe, videoDir } from "./engine/common.mjs";

const PROJECT_ID = "version-2-4afa1";
const BUCKET = "version-2-4afa1.firebasestorage.app";
// firebase-tools' public OAuth client (embedded in the CLI source).
const CLI_CLIENT_ID = "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com";
const CLI_CLIENT_SECRET = "j9iVZfS8kkCEFUPaAeJV0sAi";

const VALUE_FLAGS = new Set(["--kind", "--screen"]);
const slug = args.find((a, i) => !a.startsWith("--") && !VALUE_FLAGS.has(args[i - 1]));
const dir = videoDir(slug);
const file = join(dir, "final.mp4");
if (!slug || !existsSync(file) || !existsSync(join(dir, "plan.json"))) {
    console.error("usage: node scripts/video/publish.mjs <slug> [--kind tutorial|explainer] [--screen key] [--yes]   (needs final.mp4)");
    process.exit(1);
}
const kind = opt("kind", "tutorial");
if (!["tutorial", "explainer"].includes(kind)) {
    console.error(`--kind must be tutorial or explainer, not "${kind}"`);
    process.exit(1);
}
const plan = JSON.parse(readFileSync(join(dir, "plan.json"), "utf8"));
const storagePath = `tutorials/${slug}.mp4`;
const entry = { id: slug, title: plan.title, kind, storagePath, durationSec: Math.round(probe(file)), ...(opt("screen") ? { screen: opt("screen") } : {}) };
const listFile = join(ROOT, "src", "data", "tutorials.ts");
const updated = upsertTutorial(readFileSync(listFile, "utf8"), entry);

if (!flag("yes")) {
    console.log(`Would upload ${file}\n  to gs://${BUCKET}/${storagePath}\nand write to src/data/tutorials.ts:\n  ${JSON.stringify(entry)}\nRerun with --yes once the user has approved it.`);
    process.exit(0);
}

const config = JSON.parse(readFileSync(join(homedir(), ".config/configstore/firebase-tools.json"), "utf8"));
const refreshToken = config.tokens?.refresh_token;
if (!refreshToken) {
    console.error("No Firebase session. Run `firebase login` first.");
    process.exit(1);
}
const credDir = mkdtempSync(join(tmpdir(), "nn-publish-"));
try {
    const adc = join(credDir, "adc.json");
    writeFileSync(adc, JSON.stringify({ type: "authorized_user", client_id: CLI_CLIENT_ID, client_secret: CLI_CLIENT_SECRET, refresh_token: refreshToken }), { mode: 0o600 });
    process.env.GOOGLE_APPLICATION_CREDENTIALS = adc;
    const require = createRequire(join(ROOT, "functions", "package.json"));
    const admin = require("firebase-admin");
    admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: PROJECT_ID, storageBucket: BUCKET });
    await admin.storage().bucket().upload(file, {
        destination: storagePath,
        metadata: { contentType: "video/mp4", cacheControl: "public, max-age=86400" },
    });
} finally {
    rmSync(credDir, { recursive: true, force: true });
}
writeFileSync(listFile, updated);
console.log(`uploaded gs://${BUCKET}/${storagePath} and updated src/data/tutorials.ts`);
