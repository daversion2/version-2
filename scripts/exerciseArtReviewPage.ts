/**
 * The review page for reviewExerciseArt.ts: every exercise with pairs ready,
 * or the master athlete pick if there isn't one yet. Built as one HTML string;
 * the server serves photos at /img/<file> and /ref/<file> and takes the
 * choices at POST /save with the page's token.
 */

import { existsSync } from 'node:fs';
import { finishedPairs, type ExerciseStatus } from '../src/utils/exerciseArt/status';
import {
  allDemoIds,
  demoById,
  exerciseById,
  exerciseState,
  listCandidates,
  readApprovals,
  REFERENCE_FILE,
  REFERENCE_OUT_DIR,
  STATUS_LABEL,
  statusOf,
} from './exerciseArtFiles';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function referenceSection(): string {
  const refs = listCandidates(REFERENCE_OUT_DIR, 'athlete');
  if (!refs.length) {
    return `<section><h2>Master athlete</h2><p>No candidates yet. Make some: <code>npx tsx scripts/generateExerciseArt.ts --reference</code></p></section>`;
  }
  return `<section class="ex" data-ref><h2>Master athlete</h2>
<p class="muted">Every exercise photo is made from this one. Pick it first; the exercises come after.</p>
<div class="pairs">${refs
    .map(
      (c) => `<label class="pair single"><input type="radio" name="reference" value="${c.index}">
<img src="/ref/${esc(c.file)}" loading="lazy"><span class="pick">Use c${c.index}</span></label>`
    )
    .join('')}</div></section>`;
}

function exerciseSection(id: string, approvals = readApprovals()): string {
  const demo = demoById(id);
  const state = exerciseState(id, approvals);
  const pairs = finishedPairs(state);
  const prior = state.decision?.status === 'needs_regen' ? state.decision.note : null;
  const cue = demo.cues?.length ? `<ul class="cues">${demo.cues.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : '';
  const pose = demo.end
    ? `<p><b>Start:</b> ${esc(demo.start)}</p><p><b>End:</b> ${esc(demo.end)}</p>`
    : `<p><b>Hold:</b> ${esc(demo.start)}</p>`;
  const pairHtml = pairs
    .map(
      (p) => `<label class="pair${demo.end ? '' : ' single'}"><input type="radio" name="${id}" value="pair:${p.index}">
<div class="imgs"><figure><img src="/img/${esc(p.start.file)}" loading="lazy"><figcaption>Start</figcaption></figure>${
        p.end ? `<figure><img src="/img/${esc(p.end.file)}" loading="lazy"><figcaption>End</figcaption></figure>` : ''
      }</div><span class="pick">Use pair ${p.index}</span></label>`
    )
    .join('');
  return `<section class="ex" data-id="${id}">
<h2>${esc(exerciseById(id).name)} <small>${id} · ${demo.camera.replace('_', ' ')} view</small></h2>
<div class="spec">${pose}${cue}${prior ? `<p class="prior">Last redo note: “${esc(prior)}”</p>` : ''}</div>
<div class="pairs">${pairHtml}</div>
<div class="other">
<label><input type="radio" name="${id}" value="later" checked> Decide later</label>
<label><input type="radio" name="${id}" value="redo"> Redo all</label>
<label><input type="radio" name="${id}" value="skip"> Skip — text only</label>
<input type="text" class="note" name="${id}-note" placeholder="What’s wrong? (goes into the next attempt)">
</div></section>`;
}

export function reviewPage(token: string): string {
  const approvals = readApprovals();
  const hasReference = existsSync(REFERENCE_FILE);
  const ids = allDemoIds();
  const counts = ids.reduce<Partial<Record<ExerciseStatus, number>>>((acc, id) => {
    const s = statusOf(id, approvals);
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});
  const ready = ids.filter((id) => statusOf(id, approvals) === 'generated');
  const summary = (Object.keys(counts) as ExerciseStatus[]).map((s) => `${counts[s]} ${STATUS_LABEL[s]}`).join(' · ');
  const body = !hasReference
    ? referenceSection()
    : ready.length
      ? ready.map((id) => exerciseSection(id, approvals)).join('\n')
      : `<section><p>Nothing to review. Make the next batch: <code>npx tsx scripts/generateExerciseArt.ts --next</code></p></section>`;

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Exercise photo review</title>
<style>
:root{--accent:#F2600C;--teal:#217180;--line:#E0E0E0;--muted:#656565}
*{box-sizing:border-box}
body{font:15px/1.45 -apple-system,system-ui,sans-serif;margin:0;background:#F2F2F2;color:#2B2B2B}
header{padding:20px 24px 8px}
h1{margin:0 0 4px;font-size:22px} .muted{color:var(--muted)}
main{padding:0 24px 120px;max-width:1500px}
section{background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px 18px;margin:0 0 16px}
section.done-approve{border-color:var(--teal);box-shadow:0 0 0 2px var(--teal) inset}
section.done-redo{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent) inset}
section.done-skip{opacity:.6}
h2{margin:0 0 6px;font-size:18px} h2 small{font-weight:400;color:var(--muted);font-size:13px;margin-left:6px}
.spec p{margin:2px 0;max-width:1000px} .cues{margin:6px 0 0;padding-left:20px;color:#4A4A4A}
.prior{color:var(--accent)}
.pairs{display:flex;gap:14px;flex-wrap:wrap;margin:12px 0}
.pair{display:flex;flex-direction:column;gap:6px;border:3px solid var(--line);border-radius:12px;padding:8px;cursor:pointer;background:#FAFBFC}
.pair:has(input:checked){border-color:var(--teal);background:#E8F3F4}
.pair input{display:none}
.imgs{display:flex;gap:6px}
figure{margin:0;position:relative}
figure img,.pair.single>img{display:block;width:240px;height:240px;object-fit:cover;border-radius:8px;background:#eee}
figcaption{position:absolute;left:6px;top:6px;background:rgba(0,0,0,.55);color:#fff;font-size:11px;font-weight:700;border-radius:99px;padding:2px 8px}
.pick{font-weight:700;text-align:center}
.other{display:flex;gap:18px;align-items:center;flex-wrap:wrap}
.note{flex:1;min-width:260px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;font:inherit}
footer{position:fixed;left:0;right:0;bottom:0;background:#fff;border-top:1px solid var(--line);padding:12px 24px;display:flex;gap:16px;align-items:center}
button{background:var(--teal);color:#fff;border:0;border-radius:99px;padding:12px 28px;font:700 15px -apple-system,system-ui,sans-serif;cursor:pointer}
button:disabled{opacity:.4;cursor:default}
code{background:#F2F2F2;padding:2px 6px;border-radius:4px}
.zoom{position:fixed;inset:0;background:rgba(0,0,0,.85);display:none;align-items:center;justify-content:center;z-index:9}
.zoom img{max-width:92vw;max-height:92vh;border-radius:8px}
</style></head><body>
<header><h1>Exercise photo review</h1><div class="muted">${esc(summary)}</div>
<p class="muted">Check hands and grip, feet, spine and head angle, equipment, and that start and end line up. Double-click a photo to see it full size.</p></header>
<main>${body}</main>
<footer><button id="save" disabled>Save decisions</button><span id="status" class="muted">Nothing chosen yet.</span></footer>
<div class="zoom" id="zoom"><img></div>
<script>
const TOKEN=${JSON.stringify(token)};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
function collect(){
  const out={decisions:{}};const errs=[];
  const ref=$('input[name=reference]:checked'); if(ref) out.reference=Number(ref.value);
  for(const sec of $$('section[data-id]')){
    const id=sec.dataset.id; const v=(sec.querySelector('input[name="'+id+'"]:checked')||{}).value;
    const note=sec.querySelector('.note').value.trim();
    sec.classList.remove('done-approve','done-redo','done-skip');
    if(!v||v==='later') continue;
    if(v.startsWith('pair:')){out.decisions[id]={action:'approve',pair:Number(v.slice(5))};sec.classList.add('done-approve');}
    else if(v==='redo'){ if(!note) errs.push(id); out.decisions[id]={action:'redo',note};sec.classList.add('done-redo');}
    else if(v==='skip'){out.decisions[id]={action:'skip',note};sec.classList.add('done-skip');}
  }
  return {out,errs};
}
function refresh(){
  const {out,errs}=collect(); const n=Object.keys(out.decisions).length+(out.reference?1:0);
  const by=a=>Object.values(out.decisions).filter(d=>d.action===a).length;
  $('#save').disabled=!n||errs.length>0;
  $('#status').textContent=errs.length?('Redo needs a note: '+errs.join(', ')):n?(by('approve')+' approved · '+by('redo')+' redo · '+by('skip')+' skipped'+(out.reference?' · master athlete picked':'')):'Nothing chosen yet.';
}
document.addEventListener('change',refresh);document.addEventListener('input',refresh);
for(const n of $$('.note')) n.addEventListener('focus',()=>{const id=n.name.slice(0,-5);const r=$('input[name="'+id+'"][value=redo]');if(!$('input[name="'+id+'"]:checked')||$('input[name="'+id+'"][value=later]').checked)r.checked=true;refresh();});
for(const img of $$('img')) img.addEventListener('dblclick',e=>{e.preventDefault();const z=$('#zoom');z.querySelector('img').src=img.src;z.style.display='flex';});
$('#zoom').onclick=()=>{$('#zoom').style.display='none'};
$('#save').onclick=async()=>{
  const {out}=collect(); $('#save').disabled=true; $('#status').textContent='Saving…';
  const r=await fetch('/save',{method:'POST',headers:{'Content-Type':'application/json','x-review-token':TOKEN},body:JSON.stringify(out)});
  const j=await r.json(); if(!r.ok){$('#status').textContent='✗ '+j.error;$('#save').disabled=false;return;}
  alert(j.summary.join('\\n')); location.reload();
};
</script></body></html>`;
}

