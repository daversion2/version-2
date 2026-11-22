// Voice-synced portrait assembler. Each section has one narration cue placed vo_lead s in,
// and clips. A clip with `sync: "<phrase>"` starts when the phrase is spoken (Whisper word
// times); the previous clip is trimmed or frozen to meet it.
// usage: node assemble.mjs --project <dir> --out <file.mp4>
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { phraseStart } from "../lib.mjs";
import { wordTimes } from "./words.mjs";
import { FPS, H, W, ff, fmt, opt, probe, readJSON } from "./common.mjs";

const root = resolve(opt("project", "."));
const OUT = resolve(root, opt("out", "out/cut.mp4"));
const edl = readJSON(resolve(root, "script/edl.json"), null);
if (!edl) { console.error("script/edl.json not found in", root); process.exit(1); }
const segDir = resolve(root, "work/seg");
mkdirSync(segDir, { recursive: true });
mkdirSync(dirname(OUT), { recursive: true });
const VO_LEAD = edl.vo_lead ?? 0.4;
const ENC = ["-c:v", "libx264", "-crf", "16", "-preset", "fast", "-pix_fmt", "yuv420p", "-r", String(FPS)];

function buildClip(sec, i, c) {
  const out = resolve(segDir, `${sec.id}_${String(i).padStart(2, "0")}.mp4`);
  const a = [];
  if (c.from) a.push("-ss", String(c.from));
  if (c.to) a.push("-to", String(c.to));
  ff([...a, "-i", resolve(root, c.file), "-an", "-vf", `scale=${W}:${H}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,format=yuv420p`, ...ENC, out]);
  return { file: out, natural: probe(out) };
}
function fitClip(seg, target) {
  if (Math.abs(seg.natural - target) < 0.04) return seg.file;
  const out = seg.file.replace(/\.mp4$/, "_fit.mp4");
  if (target < seg.natural) ff(["-i", seg.file, "-t", target.toFixed(3), "-an", ...ENC, out]);
  else ff(["-i", seg.file, "-vf", `tpad=stop_mode=clone:stop_duration=${(target - seg.natural).toFixed(3)}`, "-an", ...ENC, out]);
  return out;
}
const report = [];
function buildSection(sec) {
  const voFile = sec.vo ? resolve(root, "vo", sec.vo + ".mp3") : null;
  const voDur = voFile && existsSync(voFile) ? probe(voFile) : 0;
  const words = voDur ? wordTimes(voFile) : [];
  const segs = sec.clips.map((c, i) => ({ ...buildClip(sec, i, c), c }));
  const starts = [];
  let t = 0;
  segs.forEach((s, i) => {
    let st = t;
    if (s.c.sync && words.length) {
      const ps = phraseStart(words, s.c.sync);
      if (ps === null) {
        console.warn(`  !! phrase not found in ${sec.vo}: "${s.c.sync}"`);
        report.push({ section: sec.id, clip: i, sync: s.c.sync, status: "NOT FOUND" });
      } else {
        st = Math.max(i > 0 ? starts[i - 1].at + 0.6 : 0, VO_LEAD + ps - (s.c.anticipate ?? 0.25));
        report.push({ section: sec.id, clip: i, sync: s.c.sync, at: +st.toFixed(2), spoken_at: +(VO_LEAD + ps).toFixed(2) });
      }
    }
    if (i > 0) starts[i - 1].len = st - starts[i - 1].at;
    starts.push({ at: st, len: s.natural });
    t = st + s.natural;
  });
  const need = VO_LEAD + voDur + (sec.tail ?? 0.6), last = starts[starts.length - 1];
  if (voDur && last.at + last.len < need) last.len = need - last.at;
  const parts = segs.map((s, i) => fitClip(s, Math.max(0.2, starts[i].len)));
  const list = resolve(segDir, `${sec.id}.txt`);
  writeFileSync(list, parts.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n"));
  const vout = resolve(segDir, `${sec.id}_video.mp4`);
  ff(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", vout]);
  const total = probe(vout);
  const aout = resolve(segDir, `${sec.id}_audio.wav`);
  if (voDur) {
    const ms = Math.round(VO_LEAD * 1000);
    ff(["-i", voFile, "-af", `adelay=${ms}|${ms},apad=whole_dur=${total.toFixed(3)},atrim=0:${total.toFixed(3)}`, "-ar", "48000", "-ac", "2", aout]);
  } else ff(["-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-t", total.toFixed(3), aout]);
  console.log(`section ${sec.id}: ${total.toFixed(1)}s (voice ${voDur.toFixed(1)}s), clips at ${starts.map((s) => s.at.toFixed(1)).join(", ")}`);
  return { id: sec.id, vout, aout, total };
}
const secs = edl.sections.map(buildSection);
const allV = resolve(segDir, "all_video.mp4"), allA = resolve(segDir, "all_vo.wav");
const quote = (p) => `file '${p.replace(/'/g, "'\\''")}'`;
writeFileSync(resolve(segDir, "all_v.txt"), secs.map((s) => quote(s.vout)).join("\n"));
writeFileSync(resolve(segDir, "all_a.txt"), secs.map((s) => quote(s.aout)).join("\n"));
ff(["-f", "concat", "-safe", "0", "-i", resolve(segDir, "all_v.txt"), "-c", "copy", allV]);
ff(["-f", "concat", "-safe", "0", "-i", resolve(segDir, "all_a.txt"), "-c", "copy", allA]);
const total = probe(allV), expected = secs.reduce((a, s) => a + s.total, 0);
if (Math.abs(total - expected) > 0.5) throw new Error(`integrity: concat is ${total.toFixed(1)}s but sections sum to ${expected.toFixed(1)}s`);
ff(["-i", allV, "-i", allA, "-filter_complex", "[1:a]loudnorm=I=-16:TP=-1.5:LRA=11[a]", "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest", "-movflags", "+faststart", OUT]);
writeFileSync(resolve(root, "work/sync-report.json"), JSON.stringify({ out: OUT, total, sections: secs.map((s) => ({ id: s.id, total: +s.total.toFixed(2) })), syncs: report }, null, 2));
console.log(`wrote ${OUT} (${fmt(total)}, ${W}x${H})${report.some((r) => r.status) ? "  !! some phrases NOT FOUND" : ""}`);
