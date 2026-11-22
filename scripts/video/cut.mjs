#!/usr/bin/env node
/**
 * Check a plan before capture, and turn plan + stills into the edit plan after.
 *
 *   node scripts/video/cut.mjs <slug> --check     validate plan.json, estimate lengths
 *   node scripts/video/cut.mjs <slug> [--force]   plan.json + rec.json → revoice.json, breakdown.md
 *
 * Inputs, in content/videos/<slug>/:
 *   plan.json   sections with narration and steps (format in lib.mjs validatePlan)
 *   rec.json    written by capture.mjs
 *   stills/     one <mark>.png per step
 *
 * revoice.json can be hand-tuned after this, so an existing one is never overwritten: the
 * new version goes beside it as revoice.auto.json unless --force.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { formatTimestamp, planToStills, validatePlan } from "./lib.mjs";
import { args, flag, videoDir, writeJSON } from "./engine/common.mjs";

const slug = args.find((a) => !a.startsWith("--"));
const dir = videoDir(slug);
if (!slug || !existsSync(join(dir, "plan.json"))) {
    console.error("usage: node scripts/video/cut.mjs <slug> [--check] [--force]   (needs content/videos/<slug>/plan.json)");
    process.exit(1);
}
const readJSON = (p) => JSON.parse(readFileSync(join(dir, p), "utf8"));
/** ElevenLabs narration runs at roughly 2.6 words a second. */
const voiceSeconds = (text) => text.trim().split(/\s+/).length / 2.6;
const INTRO_OUTRO = 5; // seconds

const plan = readJSON("plan.json");
const problems = validatePlan(plan);
if (problems.length) {
    console.error(`plan.json has ${problems.length} problem(s):\n  ${problems.join("\n  ")}`);
    process.exit(1);
}

if (flag("check")) {
    let total = 0;
    for (const sec of plan.sections) {
        const v = voiceSeconds(sec.narration);
        total += v;
        console.log(`  ${sec.id}  ~${v.toFixed(0).padStart(3)}s voice  ${String(sec.steps.length).padStart(2)} steps  ${sec.label}`);
    }
    console.log(`plan OK: ${plan.sections.length} sections, ~${formatTimestamp(total + INTRO_OUTRO)} with intro and outro`);
    process.exit(0);
}

if (!existsSync(join(dir, "rec.json"))) {
    console.error("needs rec.json (run capture.mjs)");
    process.exit(1);
}
const { revoice, missing } = planToStills(plan, readJSON("rec.json"));
if (!revoice.device) {
    console.error("rec.json has no device size (run capture.mjs)");
    process.exit(1);
}
const absent = revoice.sections
    .flatMap((s) => s.clips)
    .map((c) => (c.diagram ? `diagrams/${c.diagram}.html` : c.still))
    .filter((p) => !existsSync(join(dir, p)));
if (absent.length) {
    console.error(`!! files missing: ${absent.join(", ")}`);
    process.exit(1);
}
if (missing.length) console.warn(`!! no still recorded for: ${missing.join(", ")}. Those steps are skipped`);

const target = existsSync(join(dir, "revoice.json")) && !flag("force") ? "revoice.auto.json" : "revoice.json";
writeJSON(join(dir, target), revoice);

const clipsOf = new Map(revoice.sections.map((s) => [s.id, s.clips]));
const cell = (s) => String(s).replace(/\|/g, "\\|");
const rows = plan.sections.map((sec) => `| ${sec.id} | ${cell(sec.label)} | ${clipsOf.get(sec.id)?.length ?? 0} | ${cell(sec.narration)} | ${cell(sec.steps.map((s) => s.do ?? s.mark).join("; "))} |`);
writeFileSync(
    join(dir, "breakdown.md"),
    [`# ${plan.title}`, "", plan.brief ? `Brief: ${plan.brief}\n` : "", "| id | section | stills | narration | on screen |", "|---|---|---|---|---|", ...rows, ""].join("\n"),
);
console.log(`wrote ${target}, breakdown.md`);
