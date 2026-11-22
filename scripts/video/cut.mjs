#!/usr/bin/env node
/**
 * Brief-driven videos: check a plan before recording, and turn plan + recorded marks
 * into the edit plan after (see .claude/skills/training-video, "From a brief").
 *
 *   node scripts/training/cut.mjs <slug> --check     validate plan.json, estimate lengths
 *   node scripts/training/cut.mjs <slug> [--force]   plan.json + rec.json → revoice.json,
 *                                                    breakdown.md, lesson/shots.json
 *
 * Stills mode (plan.json "mode": "stills"): no recording or prep — rec.json carries the
 * box located for each step and stills/<mark>.png its screenshot; revoice.json gets still
 * clips that revoice.mjs renders through scripts/training/assets/training-still.html.
 *
 * Inputs, in training_videos/<slug>/:
 *   plan.json   sections with narration and steps (format in lib.mjs validatePlan)
 *   rec.json    the recorder's export: __rec.export() saved at the end of the take
 *   prep.json   from prep.mjs (the cut start, so mark times land in trimmed.mp4)
 *
 * revoice.json and lesson/shots.json are hand-tuned after this, so an existing one is
 * never overwritten: the new version goes beside it as *.auto.json unless --force.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { formatTimestamp, planToRevoice, planToStills, validatePlan } from "./lib.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith("--"));
const dir = join(ROOT, "training_videos", slug ?? "");
if (!slug || !existsSync(join(dir, "plan.json"))) {
    console.error("usage: node scripts/training/cut.mjs <slug> [--check] [--force]   (needs training_videos/<slug>/plan.json)");
    process.exit(1);
}
const readJSON = (p) => JSON.parse(readFileSync(join(dir, p), "utf8"));
const writeJSON = (p, o) => {
    mkdirSync(dirname(join(dir, p)), { recursive: true });
    writeFileSync(join(dir, p), JSON.stringify(o, null, 2) + "\n");
};
/** ElevenLabs narration runs at roughly 2.6 words a second. */
const voiceSeconds = (text) => text.trim().split(/\s+/).length / 2.6;

const plan = readJSON("plan.json");
const problems = validatePlan(plan);
if (problems.length) {
    console.error(`plan.json has ${problems.length} problem(s):\n  ${problems.join("\n  ")}`);
    process.exit(1);
}

if (args.includes("--check")) {
    let total = 0;
    for (const sec of plan.sections) {
        const v = voiceSeconds(sec.narration);
        total += v;
        console.log(`  ${sec.id}  ~${v.toFixed(0).padStart(3)}s voice  ${String(sec.steps.length).padStart(2)} steps  ${sec.label}`);
    }
    console.log(`plan OK: ${plan.sections.length} sections, ~${formatTimestamp(total + 12.4)} with intro and outro`);
    process.exit(0);
}

const stillsMode = plan.mode === "stills";
if (!existsSync(join(dir, "rec.json")) || (!stillsMode && !existsSync(join(dir, "prep.json")))) {
    console.error(stillsMode ? "needs rec.json (the recorder's export)" : "needs rec.json (the recorder's export) and prep.json (run prep.mjs on the recording first)");
    process.exit(1);
}
let revoice, shots, missing;
if (stillsMode) {
    ({ revoice, shots, missing } = planToStills(plan, readJSON("rec.json")));
    const absent = revoice.sections
        .flatMap((s) => s.clips)
        .map((c) => (c.diagram ? `diagrams/${c.diagram}.html` : c.still))
        .filter((p) => !existsSync(join(dir, p)));
    if (absent.length) {
        console.error(`!! screenshots missing: ${absent.join(", ")}`);
        process.exit(1);
    }
    if (missing.length) console.warn(`!! no still recorded for: ${missing.join(", ")} — those steps are skipped`);
} else {
    const prep = readJSON("prep.json");
    ({ revoice, shots, missing } = planToRevoice(plan, readJSON("rec.json"), { offset: prep.start, duration: prep.end - prep.start }));
    if (missing.length) console.warn(`!! no mark recorded for: ${missing.join(", ")} — those steps have no footage`);
}

const put = (p, o) => {
    const target = existsSync(join(dir, p)) && !args.includes("--force") ? p.replace(/\.json$/, ".auto.json") : p;
    writeJSON(target, o);
    return target;
};
const wrote = [put("revoice.json", revoice), put("lesson/shots.json", shots)];

// breakdown.md: what the lesson step reads instead of a transcript.
const marks = new Map(revoice.sections.map((s) => [s.id, s]));
const rows = plan.sections.map((sec) => {
    const clips = marks.get(sec.id)?.clips ?? [];
    const span = stillsMode ? `${clips.length} stills` : clips.length ? `${formatTimestamp(clips[0].in)}–${formatTimestamp(clips.at(-1).out)}` : "—";
    const steps = sec.steps.map((s) => s.do ?? s.mark).join("; ");
    return `| ${sec.id} | ${sec.label} | ${span} | ${sec.narration.replace(/\|/g, "\\|")} | ${steps.replace(/\|/g, "\\|")} |`;
});
writeFileSync(
    join(dir, "breakdown.md"),
    [
        `# ${plan.title}`,
        "",
        plan.brief ? `Brief: ${plan.brief}\n` : "",
        `| id | section | ${stillsMode ? "stills" : "trimmed.mp4"} | narration | on screen |`,
        "|---|---|---|---|---|",
        ...rows,
        "",
    ].join("\n"),
);
wrote.push("breakdown.md");

for (const sec of stillsMode ? [] : revoice.sections) {
    const footage = sec.clips.reduce((a, c) => a + (c.out - c.in) / (c.speed ?? 1), 0);
    const voice = voiceSeconds(sec.narration);
    const note = footage > voice + 4 ? "  ← footage runs long: add speed or trim `after`" : footage < voice - 6 ? "  ← footage runs short: picture will freeze; add a hold" : "";
    console.log(`  ${sec.id}  footage ${footage.toFixed(1).padStart(5)}s  voice ~${voice.toFixed(1).padStart(5)}s  ${sec.clips.length} clips${note}`);
}
console.log(`wrote ${wrote.map((w) => `training_videos/${slug}/${w}`).join(", ")}`);
