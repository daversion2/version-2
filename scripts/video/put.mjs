#!/usr/bin/env node
/**
 * Upload files to signed URLs (from the Vertesia MCP's create_content_upload_url).
 *
 *   node scripts/training/put.mjs uploads.json
 *
 * uploads.json: [{ "file": "training_videos/x/lesson/screenshots/01-a.png", "url": "https://…", "type": "image/png" }]
 * Paths are relative to the repo root. Signed URLs expire after 15 minutes, so run this
 * straight after asking for them. Exits non-zero if any upload fails.
 */
import { readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const list = JSON.parse(readFileSync(resolve(process.argv[2] ?? "uploads.json"), "utf8"));
let failed = 0;
for (const { file, url, type } of list) {
    const path = resolve(ROOT, file);
    const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": type ?? "application/octet-stream" },
        body: readFileSync(path),
    });
    if (!res.ok) failed++;
    console.log(`${res.ok ? "ok  " : "FAIL"} ${res.status} ${(statSync(path).size / 1024).toFixed(0).padStart(7)} KB  ${file}`);
}
process.exit(failed ? 1 : 0);
