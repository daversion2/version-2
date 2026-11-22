#!/usr/bin/env node
/**
 * Build the LMS lesson for a training video from its draft.
 *
 *   node scripts/training/lesson.mjs <slug>
 *
 * Reads, from training_videos/<slug>/:
 *   lesson/lesson.md          the draft: markdown with `screenshots/NN-name.png` images,
 *                             `> **Tip:**`-style callouts, and `↪ [[03]]` lines pointing
 *                             at section 03 of the finished video
 *   lesson/lesson.meta.json   title, estimated_duration, is_hands_on, learning_objectives,
 *                             assessment, and optional video_caption
 *   publish.json              what is already in the Content Store: course_id, order,
 *                             images { "01-name.png": "<object id>" }, video { id }
 *   video/work/sync-report.json + final.vtt   (once the re-voiced video exists)
 *
 * Writes lesson/lesson.properties.json (exactly what gets stored) and lesson/lesson.body.md
 * (the document body = its `content`). It uses the app's own block code
 * (src/ui/lms/blocks.ts, transcript.ts), so the result is byte-for-byte what the lesson
 * editor would save — no second implementation to drift.
 *
 * With a published video it puts a video block first (transcript from final.vtt) and
 * turns `↪ [[03]]` into `↪ 1:24 in the video`; without one it drops those lines.
 */
import { spawnSync } from "node:child_process";

// The app modules are TypeScript; re-run under Node's type stripping if needed.
if (!process.execArgv.includes("--experimental-strip-types")) {
    const r = spawnSync(process.execPath, ["--experimental-strip-types", "--no-warnings", ...process.argv.slice(1)], { stdio: "inherit" });
    process.exit(r.status ?? 1);
}

const { existsSync, readFileSync, writeFileSync } = await import("node:fs");
const { dirname, join, resolve } = await import("node:path");
const { fileURLToPath } = await import("node:url");
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const { parseBlocks, syncLessonContent } = await import(join(ROOT, "src/ui/lms/blocks.ts"));
const { transcriptFromCaptions } = await import(join(ROOT, "src/ui/lms/transcript.ts"));
const { liftCallouts, resolveTimestamps, sectionStarts } = await import("./lib.mjs");

const slug = process.argv[2];
const dir = join(ROOT, "training_videos", slug ?? "");
if (!slug || !existsSync(join(dir, "lesson", "lesson.md"))) {
    console.error("usage: node scripts/training/lesson.mjs <slug>   (needs training_videos/<slug>/lesson/lesson.md)");
    process.exit(1);
}
const read = (p, fallback) => (existsSync(join(dir, p)) ? readFileSync(join(dir, p), "utf8") : fallback);
const meta = JSON.parse(read("lesson/lesson.meta.json", "{}"));
const publish = JSON.parse(read("publish.json", "{}"));
if (!publish.course_id || publish.order === undefined) {
    console.error("publish.json needs course_id and order");
    process.exit(1);
}

// ---- timestamps -------------------------------------------------------------
const report = JSON.parse(read("video/work/sync-report.json", "null"));
const hasVideo = !!publish.video?.id;
const starts = hasVideo && report ? sectionStarts(report) : null;
let md = resolveTimestamps(read("lesson/lesson.md"), starts);

// ---- images -----------------------------------------------------------------
const missing = [];
md = md.replace(/\]\(screenshots\/([^)]+)\)/g, (whole, file) => {
    const id = publish.images?.[file];
    if (!id) missing.push(file);
    return id ? `](store:${id})` : whole;
});
if (missing.length) {
    console.error(`no object id in publish.json images for: ${missing.join(", ")}`);
    process.exit(1);
}

// ---- blocks -----------------------------------------------------------------
// Captions render as plain text, so markdown in them (`code`, *emphasis*) would show raw.
let blocks = liftCallouts(parseBlocks(md)).map((b) => (b.kind === "image" ? { ...b, caption: b.caption.replace(/[`*]/g, "") } : b));
if (hasVideo) {
    const vtt = read("final.vtt", "");
    if (!vtt) console.warn("!! publish.json has a video but final.vtt is missing; the video block gets no transcript");
    blocks = [
        {
            id: "",
            kind: "video",
            src: `store:${publish.video.id}`,
            caption: meta.video_caption ?? "",
            transcript: vtt ? transcriptFromCaptions(vtt) : "",
        },
        ...blocks,
    ];
}
const unresolved = blocks.filter((b) => b.kind === "text" && /↪ \[\[/.test(b.text));
if (unresolved.length) console.warn("!! unresolved ↪ markers remain");

const properties = syncLessonContent({
    course_id: publish.course_id,
    title: meta.title,
    order: publish.order,
    is_published: false,
    blocks,
    learning_objectives: meta.learning_objectives,
    estimated_duration: meta.estimated_duration,
    is_hands_on: meta.is_hands_on ?? false,
    assessment: meta.assessment && {
        ...meta.assessment,
        // The LMS reads a question's prompt from `text` (McqQuestion); `question` renders blank.
        questions: (meta.assessment.questions ?? []).map(({ question, ...q }) => ({ ...q, text: q.text ?? question })),
    },
});
writeFileSync(join(dir, "lesson", "lesson.properties.json"), JSON.stringify(properties, null, 2) + "\n");
writeFileSync(join(dir, "lesson", "lesson.body.md"), properties.content);

const kinds = properties.blocks.reduce((a, b) => ({ ...a, [b.kind]: (a[b.kind] ?? 0) + 1 }), {});
console.log(
    `lesson.properties.json: "${properties.title}" · ${Object.entries(kinds).map(([k, n]) => `${n} ${k}`).join(", ")} · ` +
        `${properties.assessment?.questions?.length ?? 0} questions · ${properties.content.length} chars · ` +
        `timestamps ${starts ? "resolved" : "dropped (no video yet)"}`,
);
