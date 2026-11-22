#!/usr/bin/env node
/**
 * Take a plan's stills from the iOS simulator with Maestro and write rec.json.
 *
 *   node scripts/video/capture.mjs <slug> --approved [--only mark1,mark2]
 *   node scripts/video/capture.mjs <slug> --from-dir <dir>     offline, touches no simulator
 *
 * THE SIMULATOR IS SIGNED IN TO THE FOUNDER'S REAL ACCOUNT. CLAUDE.md requires asking before
 * any Maestro run, so a live run refuses to start without --approved. Pass it only after
 * the user has said yes to this run.
 *
 * For each step, in plan order:
 *   1. run `setup` (Maestro commands that put the screen in the step's state)
 *   2. `maestro hierarchy` → the box of `target`
 *   3. screenshot → stills/<mark>.png, and record the box in rec.json
 *   4. run `then` (Maestro commands leading to the next step; "tap" taps the target)
 * --only retakes those steps and skips their `then`, so the app stays where it is.
 *
 * rec.json: { device: { w, h, scale }, rects: { <mark>: { box: { x, y, w, h } | null } } },
 * boxes in device points. It is saved after every step, so a failed run keeps its progress.
 * --from-dir reads <dir>/<mark>.png and <dir>/<mark>.json (a saved hierarchy) instead.
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { deviceSize, findControl, flattenHierarchy, parseHierarchy, validatePlan } from "./lib.mjs";
import { args, flag, opt, readJSON, videoDir, writeJSON } from "./engine/common.mjs";

const APP_ID = "com.neuronudge.neuronudge";
const MAESTRO = join(homedir(), ".maestro", "bin", "maestro");
const VALUE_FLAGS = new Set(["--only", "--from-dir"]);
const slug = args.find((a, i) => !a.startsWith("--") && !VALUE_FLAGS.has(args[i - 1]));
const dir = videoDir(slug);
if (!slug || !existsSync(join(dir, "plan.json"))) {
    console.error("usage: node scripts/video/capture.mjs <slug> --approved [--only a,b] | --from-dir <dir>");
    process.exit(1);
}
const fromDir = opt("from-dir", null) && resolve(opt("from-dir"));
if (!fromDir && !flag("approved")) {
    console.error("Refusing to drive the simulator: it is signed in to the real account.\nAsk the user first (CLAUDE.md), then rerun with --approved.");
    process.exit(2);
}
const plan = JSON.parse(readFileSync(join(dir, "plan.json"), "utf8"));
const problems = validatePlan(plan);
if (problems.length) {
    console.error(`plan.json has ${problems.length} problem(s):\n  ${problems.join("\n  ")}`);
    process.exit(1);
}
const only = opt("only", null)?.split(",");
const steps = plan.sections.flatMap((s) => s.steps).filter((s) => !s.diagram && (!only || only.includes(s.mark)));
if (only) {
    const unknown = only.filter((m) => !steps.some((s) => s.mark === m));
    if (unknown.length) {
        console.error(`no such step: ${unknown.join(", ")}`);
        process.exit(1);
    }
}

const stillsDir = join(dir, "stills");
const workDir = join(dir, ".capture");
mkdirSync(stillsDir, { recursive: true });
const recPath = join(dir, "rec.json");
const rec = readJSON(recPath, { rects: {} });

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const simctl = (...a) => execFileSync("xcrun", ["simctl", ...a], { stdio: ["ignore", "pipe", "pipe"] }).toString();

/** Run Maestro commands. JSON is valid YAML, so the plan's commands go in as written. */
function runFlow(commands, name) {
    mkdirSync(workDir, { recursive: true });
    const file = join(workDir, `${name}.yaml`);
    writeFileSync(file, `appId: ${APP_ID}\n---\n${commands.map((c) => `- ${JSON.stringify(c)}`).join("\n")}\n`);
    execFileSync(MAESTRO, ["test", file], { stdio: ["ignore", "pipe", "inherit"] });
}
function tapCommand(target) {
    const sel = {};
    if (target.text) sel.text = target.text;
    if (target.id) sel.id = target.id;
    if (target.index !== undefined) sel.index = target.index;
    return { tapOn: sel };
}
const pngSize = (file) => {
    const b = readFileSync(file);
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
};

if (!fromDir) {
    if (!/\(Booted\)/.test(simctl("list", "devices", "booted"))) {
        console.error("No booted simulator.");
        process.exit(1);
    }
    // A clean status bar: no real time, carrier or battery in the video.
    simctl("status_bar", "booted", "override", "--time", "9:41", "--dataNetwork", "wifi", "--wifiBars", "3", "--cellularBars", "4", "--batteryState", "charged", "--batteryLevel", "100");
}

let failed = false;
try {
    for (const step of steps) {
        if (!fromDir && step.setup?.length) runFlow(step.setup, `${step.mark}-setup`);
        if (!fromDir) sleep(step.settle ?? 900); // let animations finish before the shot

        const still = join(stillsDir, `${step.mark}.png`);
        let raw;
        if (fromDir) {
            copyFileSync(join(fromDir, `${step.mark}.png`), still);
            raw = readFileSync(join(fromDir, `${step.mark}.json`), "utf8");
        } else {
            raw = execFileSync(MAESTRO, ["hierarchy"], { stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 }).toString();
            simctl("io", "booted", "screenshot", "--type=png", still);
        }
        const nodes = flattenHierarchy(parseHierarchy(raw));
        const device = deviceSize(nodes, pngSize(still));
        if (rec.device && (rec.device.w !== device.w || rec.device.h !== device.h)) {
            throw new Error(`${step.mark}: screen is ${device.w}×${device.h} but earlier stills are ${rec.device.w}×${rec.device.h}. Retake everything on one device.`);
        }
        rec.device = device;

        let box = null;
        if (step.target) {
            const hit = findControl(nodes, step.target, device);
            if (!hit.box) {
                console.error(`!! ${step.mark}: target ${JSON.stringify(step.target)} not on screen.\n   visible labels: ${JSON.stringify(hit.candidates ?? [])}`);
                failed = true;
                break;
            }
            box = hit.box;
        }
        rec.rects[step.mark] = { box };
        writeJSON(recPath, rec);
        console.log(`${step.mark}  ${box ? `box ${box.x},${box.y} ${box.w}×${box.h}` : "no highlight"}`);

        if (!fromDir && !only && step.then) {
            runFlow(step.then === "tap" ? [tapCommand(step.target)] : step.then, `${step.mark}-then`);
        }
    }
} finally {
    if (!fromDir) {
        try { simctl("status_bar", "booted", "clear"); } catch { /* the simulator may have gone away */ }
    }
    rmSync(workDir, { recursive: true, force: true });
}
if (failed) process.exit(1);
console.log(`wrote ${recPath}. Read every still before cutting: check the screen, the ring, and that no personal data shows.`);
