#!/usr/bin/env node
/**
 * Terminal stills for stills-mode training videos.
 *
 *   node scripts/training/terminal-stills.mjs <slug> [--only <mark>]
 *
 * Every plan step with a `terminal` field — `{ cwd, lines: ["$ cmd", "output", …], highlight? }` —
 * becomes `stills/<mark>.png` (3200×1800, the same size as the Studio screenshots) showing a
 * terminal window, and its highlight box is written into `rec.json` `rects`, so cut.mjs and
 * revoice.mjs treat it like any other still. `highlight` is `[first, last]` (line indexes,
 * inclusive) to ring; by default the last command and its output. Lines starting with "$ " are
 * commands; "# " lines are dim comments. Secrets must already be masked in the plan.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const require = createRequire(join(process.env.HOME, ".claude/skills/vertesia-video-engine/package.json"));
const { chromium } = require("playwright");

const slug = process.argv[2];
if (!slug) {
    console.error("usage: terminal-stills.mjs <slug> [--only <mark>]");
    process.exit(1);
}
const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;
const dir = join(ROOT, "training_videos", slug);
const plan = JSON.parse(readFileSync(join(dir, "plan.json"), "utf8"));
const steps = plan.sections.flatMap((s) => s.steps).filter((st) => st.terminal && (!only || st.mark === only));
if (!steps.length) {
    console.log("no terminal steps");
    process.exit(0);
}

const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Default highlight: the last command line through the end. */
function defaultRange(lines) {
    let last = lines.length - 1;
    for (let i = lines.length - 1; i >= 0; i--) if (lines[i].startsWith("$ ")) return [i, last];
    return [0, last];
}

function page(term) {
    const rows = term.lines.map((l, i) => {
        const cls = l.startsWith("$ ") ? "cmd" : l.startsWith("# ") ? "dim" : "out";
        const body = l.startsWith("$ ") ? `<span class="ps">$</span> ${esc(l.slice(2))}` : esc(l) || "&nbsp;";
        return `<div class="row ${cls}" data-i="${i}">${body}</div>`;
    }).join("");
    return `<!doctype html><html><head><meta charset="utf-8"><style>
  html, body { margin: 0; width: 1600px; height: 900px; background: #e9eaef; }
  .win { position: absolute; left: 80px; top: 50px; width: 1440px; height: 800px; border-radius: 14px;
         background: #15171e; box-shadow: 0 24px 60px rgba(20, 20, 40, .28); overflow: hidden; }
  .bar { height: 46px; background: #23262f; display: flex; align-items: center; padding: 0 18px; gap: 9px; }
  .dot { width: 13px; height: 13px; border-radius: 50%; }
  .title { flex: 1; text-align: center; margin-right: 60px; color: #a3a8b8;
           font: 500 15px/1 "Inter", "SF Pro Text", system-ui, sans-serif; }
  .body { padding: 26px 34px; font: 22px/1.6 "JetBrains Mono", "SF Mono", Menlo, monospace; font-variant-ligatures: none; color: #d7dae3; }
  .row { white-space: pre-wrap; word-break: break-word; }
  .cmd { color: #f2f3f7; }
  .ps { color: #9b7bff; font-weight: 600; }
  .out { color: #b9bdc9; }
  .dim { color: #6f7586; }
</style></head><body><div class="win">
  <div class="bar"><span class="dot" style="background:#ff5f57"></span><span class="dot" style="background:#febc2e"></span><span class="dot" style="background:#28c840"></span>
  <span class="title">${esc(term.cwd ?? "~")}</span></div>
  <div class="body">${rows}</div></div></body></html>`;
}

const recPath = join(dir, "rec.json");
const rec = existsSync(recPath) ? JSON.parse(readFileSync(recPath, "utf8")) : { t0: null, marks: [], rects: {} };
rec.rects = rec.rects ?? {};
mkdirSync(join(dir, "stills"), { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
const pg = await ctx.newPage();
for (const st of steps) {
    const term = st.terminal;
    await pg.setContent(page(term));
    const [a, b] = term.highlight ?? defaultRange(term.lines);
    const box = await pg.evaluate(([a, b]) => {
        const rs = [...document.querySelectorAll(".row")].filter((r) => +r.dataset.i >= a && +r.dataset.i <= b).map((r) => r.getBoundingClientRect());
        if (!rs.length) return null;
        const x = Math.min(...rs.map((r) => r.left)), y = Math.min(...rs.map((r) => r.top));
        const right = Math.max(...rs.map((r) => r.right)), bottom = Math.max(...rs.map((r) => r.bottom));
        return { x: Math.round(x - 12), y: Math.round(y - 6), w: Math.round(right - x + 24), h: Math.round(bottom - y + 12) };
    }, [a, b]);
    await pg.screenshot({ path: join(dir, "stills", `${st.mark}.png`) });
    rec.rects[st.mark] = { box, vw: 1600, vh: 900, dpr: 2, at: Date.now(), terminal: true };
    console.log(`terminal ${st.mark}  lines ${a}–${b}${box ? `  box ${box.x},${box.y},${box.w},${box.h}` : ""}`);
}
await browser.close();
writeFileSync(recPath, JSON.stringify(rec, null, 2));
console.log(`wrote ${steps.length} terminal still(s); rects merged into rec.json`);
