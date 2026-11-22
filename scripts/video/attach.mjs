#!/usr/bin/env node
/**
 * Put a training video at the top of an EXISTING lesson (the brief-driven path when the
 * brief is a lesson that already exists — its text and quiz stay as they are).
 *
 *   node scripts/training/attach.mjs <slug>
 *
 * Reads, from training_videos/<slug>/:
 *   lesson/current.properties.json   the lesson's properties as fetched just now (Vertesia MCP
 *                                    fetch_document, mode "properties") — the write replaces
 *                                    properties wholesale, so it must start from the live ones
 *   publish.json                     { "lesson_id": "<existing lesson>", "video": { "id": "<object id>" } }
 *   final.vtt                        captions of the re-voiced video (the block's transcript)
 *   plan.json                        `video_caption`, else `title`, for the block caption
 *
 * Writes lesson/lesson.properties.json: the same properties with a video block first (an
 * existing first video block is replaced, so re-running after a new cut is safe) and
 * `content` re-synced by the app's own block code. Store it with a property-only
 * update_document (create_revision: false, no `content` argument) — never a body write.
 */
import { spawnSync } from "node:child_process";

if (!process.execArgv.includes("--experimental-strip-types")) {
    const r = spawnSync(process.execPath, ["--experimental-strip-types", "--no-warnings", ...process.argv.slice(1)], { stdio: "inherit" });
    process.exit(r.status ?? 1);
}

const { existsSync, readFileSync, writeFileSync } = await import("node:fs");
const { dirname, join, resolve } = await import("node:path");
const { fileURLToPath } = await import("node:url");
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const { syncLessonContent } = await import(join(ROOT, "src/ui/lms/blocks.ts"));
const { transcriptFromCaptions } = await import(join(ROOT, "src/ui/lms/transcript.ts"));

const slug = process.argv[2];
const dir = join(ROOT, "training_videos", slug ?? "");
const read = (p) => (existsSync(join(dir, p)) ? readFileSync(join(dir, p), "utf8") : null);
const current = JSON.parse(read("lesson/current.properties.json") ?? "null");
const publish = JSON.parse(read("publish.json") ?? "{}");
const plan = JSON.parse(read("plan.json") ?? "{}");
const vtt = read("final.vtt");
if (!slug || !current || !publish.video?.id || !publish.lesson_id || !vtt) {
    console.error(
        "usage: node scripts/training/attach.mjs <slug>\n" +
            "needs lesson/current.properties.json, publish.json { lesson_id, video: { id } } and final.vtt",
    );
    process.exit(1);
}
if (!Array.isArray(current.blocks)) {
    console.error("current.properties.json has no blocks — is it the lesson's full properties?");
    process.exit(1);
}

const video = {
    id: "",
    kind: "video",
    src: `store:${publish.video.id}`,
    caption: plan.video_caption ?? plan.title ?? "",
    transcript: transcriptFromCaptions(vtt),
};
const rest = current.blocks[0]?.kind === "video" ? current.blocks.slice(1) : current.blocks;
const properties = syncLessonContent({ ...current, blocks: [video, ...rest] });

// Everything but blocks/content must come through untouched.
const changed = Object.keys({ ...current, ...properties }).filter(
    (k) => !["blocks", "content"].includes(k) && JSON.stringify(current[k]) !== JSON.stringify(properties[k]),
);
if (changed.length) {
    console.error(`!! refusing: these properties would change: ${changed.join(", ")}`);
    process.exit(1);
}
writeFileSync(join(dir, "lesson", "lesson.properties.json"), JSON.stringify(properties, null, 2) + "\n");
console.log(
    `lesson.properties.json: "${properties.title}" · video block ${current.blocks[0]?.kind === "video" ? "replaced" : "added"} first · ` +
        `${properties.blocks.length} blocks (was ${current.blocks.length}) · ${properties.assessment?.questions?.length ?? 0} questions kept`,
);
