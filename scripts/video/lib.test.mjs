// Run with: node --test scripts/video/
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
    CAPTION_BAND, STAGE, captionChunks, captionCues, captionTimeline, deviceSize, findControl, flattenHierarchy,
    frameLayout, parseBounds, parseHierarchy, planToStills, themeTokens, upsertTutorial, validatePlan,
} from "./lib.mjs";

const device = { w: 402, h: 874, scale: 3 };
const node = (bounds, attrs = {}, children = []) => ({ attributes: { bounds, ...attrs }, children });
const tree = node("[0,0][402,874]", {}, [
    node("[20,100][382,160]", { accessibilityText: ", Reps" }),
    node("[0,90][402,170]", { accessibilityText: ", Reps" }),
    node("[20,200][120,244]", { accessibilityText: "Save", "resource-id": "save-btn" }),
    node("[20,1000][120,1044]", { accessibilityText: "Below the fold" }),
]);
const nodes = flattenHierarchy(tree);

test("parseBounds reads Maestro's format", () => {
    assert.deepEqual(parseBounds("[10,20][110,64]"), { x: 10, y: 20, w: 100, h: 44 });
    assert.equal(parseBounds(""), null);
});

test("parseHierarchy tolerates log lines before the JSON", () => {
    assert.deepEqual(parseHierarchy('Running on iPhone\n{ "attributes" : { } }\n'), { attributes: {} });
});

test("deviceSize derives points from the screenshot", () => {
    assert.deepEqual(deviceSize(nodes, { w: 1206, h: 2622 }), device);
});

test("findControl uses full-string regexes and picks the smallest match", () => {
    assert.equal(findControl(nodes, { text: "Reps" }, device).box, null);
    assert.deepEqual(findControl(nodes, { text: ".*Reps" }, device).box, { x: 16, y: 96, w: 370, h: 68 });
});

test("findControl matches ids, honours index, ignores off-screen nodes", () => {
    assert.deepEqual(findControl(nodes, { id: "save-btn", pad: 0 }, device).box, { x: 20, y: 200, w: 100, h: 44 });
    assert.equal(findControl(nodes, { text: ".*Reps", index: 1, pad: 0 }, device).box.w, 402);
    const miss = findControl(nodes, { text: "Below the fold" }, device);
    assert.equal(miss.box, null);
    assert.ok(miss.candidates.includes("Save"));
});

test("findControl unions a region", () => {
    const { box } = findControl(nodes, { union: [{ text: ".*Reps", index: 0, pad: 0 }, { text: "Save", pad: 0 }] }, device);
    assert.deepEqual(box, { x: 20, y: 100, w: 362, h: 144 });
});

test("frameLayout keeps the screen's shape and clears the caption band", () => {
    const f = frameLayout(device);
    assert.ok(Math.abs(f.w / f.h - device.w / device.h) < 0.005);
    assert.ok(f.y + f.h <= STAGE.h - CAPTION_BAND);
    assert.equal(f.x, Math.round((STAGE.w - f.w) / 2));
});

test("captionChunks never exceeds the limit or splits a word", () => {
    const s = "Tap the plus button at the bottom of the screen, then choose what you ate and save it to your day.";
    const chunks = captionChunks(s);
    assert.ok(chunks.every((c) => c.length <= 58));
    assert.equal(chunks.join(" "), s);
});

test("captionCues are contiguous within a section", () => {
    const text = "Open Meals. Tap the plus button at the bottom of the screen, then choose what you ate and save it to your day.";
    const words = [{ w: "Open", s: 0 }, { w: "Meals.", s: 0.3 }, { w: "Tap", s: 1 }, { w: "the", s: 1.2 }, { w: "plus", s: 1.3 }];
    const cues = captionCues([{ offset: 10, text, words, duration: 8 }]);
    assert.equal(cues[0].start, 10);
    assert.equal(cues[1].start, 11);
    assert.ok(Math.abs(cues.at(-1).end - 18) < 1e-9);
    cues.slice(1).forEach((c, i) => assert.ok(Math.abs(c.start - cues[i].end) < 1e-9));
});

test("captionTimeline fills gaps and adds up to the video's length", () => {
    const t = captionTimeline([{ start: 2.6, end: 4 }, { start: 4, end: 6 }], 9);
    assert.deepEqual(t.map((e) => e.cue), [null, 0, 1, null]);
    assert.ok(Math.abs(t.reduce((a, e) => a + e.duration, 0) - 9) < 1e-6);
});

test("validatePlan catches a bad sync and a tap with no target", () => {
    const plan = { title: "T", sections: [{ id: "01", label: "L", narration: "Open Meals. Tap plus.", steps: [{ mark: "a", then: "tap" }, { mark: "b", sync: "Not there" }] }] };
    const p = validatePlan(plan);
    assert.equal(p.length, 2);
});

test("planToStills carries the device and hands the camera over", () => {
    const plan = { title: "T", sections: [{ id: "01", label: "L", narration: "One. Two.", steps: [{ mark: "a", zoom: 1.3 }, { mark: "b", sync: "Two" }, { mark: "c" }] }] };
    const rec = { device, rects: { a: { box: { x: 1, y: 2, w: 3, h: 4 } }, b: { box: null } } };
    const { revoice, missing } = planToStills(plan, rec);
    assert.deepEqual(revoice.device, device);
    assert.deepEqual(missing, ["c"]);
    const [a, b] = revoice.sections[0].clips;
    assert.equal(a.kind, "click");
    assert.equal(b.kind, "none");
    assert.equal(b.prev, "stills/a.png");
    assert.deepEqual(b.from, { box: [1, 2, 3, 4], zoom: 1.3, kind: "click" });
});

test("themeTokens reads the real theme", () => {
    const css = themeTokens(readFileSync(new URL("../../src/constants/theme.ts", import.meta.url), "utf8"));
    assert.match(css, /--primary: #217180;/);
    assert.match(css, /--accent: #FF5B02;/);
    assert.match(css, /--ink: #000000;/);
    assert.match(css, /"Avenir"/);
});

test("upsertTutorial adds, replaces and keeps the file's shape", () => {
    const src = "export const TUTORIALS = [\n  // <publish:start>\n  // <publish:end>\n];\n";
    const one = upsertTutorial(src, { id: "b", title: "B" });
    const two = upsertTutorial(one, { id: "a", title: "A" });
    const three = upsertTutorial(two, { id: "b", title: "B2" });
    assert.equal(three, 'export const TUTORIALS = [\n  // <publish:start>\n  {"id":"a","title":"A"},\n  {"id":"b","title":"B2"},\n  // <publish:end>\n];\n');
});

test("upsertTutorial works on the real tutorials.ts", () => {
    const src = readFileSync(new URL("../../src/data/tutorials.ts", import.meta.url), "utf8");
    assert.match(upsertTutorial(src, { id: "x", title: "X" }), /\{"id":"x","title":"X"\},\n {2}\/\/ <publish:end>/);
});
