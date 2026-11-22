---
name: neuro-video
description: Make a short portrait (9:16) Neuro-Nudge tutorial or explainer video from a brief. Claude plans it, captures stills from the iOS simulator with Maestro, narrates it with ElevenLabs, adds the Neuro-Nudge intro, outro and burned-in captions, and publishes to Firebase Storage plus src/data/tutorials.ts. Use when the user asks for a tutorial, explainer, how-to or in-app video ("make a video on logging a meal", "/neuro-video Workouts — starting a session"), or asks to continue or revise one.
---

# Neuro-Nudge videos, from a brief

The user gives a topic and what to show. You plan it, capture it, cut and narrate it.
Scripts do the mechanical work; you do the judgement (what to show, the words, checking
the picture).

Everything for one video lives in `content/videos/<slug>/`. `plan.json` and `diagrams/`
are committed; media is git-ignored. Each step reads and writes files there, so a run can
stop and resume. Check where it is first: `ls content/videos/<slug>/`.

```
content/videos/<slug>/
  plan.json                       1. plan
  stills/<mark>.png  rec.json     2. capture
  revoice.json  breakdown.md      3. cut
  video/  final.mp4  final.vtt    4. voice and assemble
```

**Three approvals, nothing else waits on the user:**
1. **The plan.** The same message asks to take the simulator (CLAUDE.md).
2. **V1.** Approves the script and the voice together.
3. **Publishing.** It writes to the production bucket.

First time on a machine: `npm install --prefix scripts/video/engine`. Also needs ffmpeg,
`whisper-cli`, Maestro, and `ELEVENLABS_API_KEY` in `.env.local`. The Whisper model is
read from `NN_WHISPER_MODEL`, or where the Vertesia editor keeps it. **Never copy anything
out of `~/.vertesia-video-editor/`.**

## 1. Plan (approval 1)

Read the screen's code and `src/data/screenIntros.ts` so every claim is true of the app.
Match the copy voice (no "rep" language). Tutorials run 30–90 s; about 2.6 spoken words a
second. Write `plan.json`, with the folder named `slugify(title)`:

```json
{ "title": "Log your first plate",
  "mode": "stills",
  "brief": "Meals: logging a plate, for new users",
  "sections": [
    { "id": "01", "label": "Open Meals",
      "narration": "From Today, open Meals. Then tap Log a plate to start.",
      "steps": [
        { "mark": "01-open", "do": "tap Meals",
          "setup": ["launchApp"],
          "target": { "text": ".*Meals.*" }, "then": "tap" },
        { "mark": "01-plus", "do": "tap Log a plate", "sync": "Then tap Log",
          "target": { "text": ".*Log a plate" }, "zoom": 1.3 }
      ] } ] }
```

Per step:
- `mark`: unique, and the still's file name.
- `sync`: the opening words of the sentence that describes this step, exactly as written.
  Every step after a section's first should have one.
- `setup`: Maestro commands run **before** the shot, as JSON. `then`: run **after** it, to
  reach the next step. `"then": "tap"` taps the target.
- `target`: `{ text?, id?, index?, pad? }` or `{ union: [t1, t2] }`. Omit for no highlight.
  `text` and `id` are full-string regexes, like Maestro's. Read `ui-test` first: iOS labels
  often gain a leading comma (`".*Reps"`), and **tab-bar taps need coordinates**.
- `kind`: `click` (default with a target; ring plus tap), `look` (ring only), `none`.
- `zoom`: 1.2–1.4 for small controls. `settle`: ms to wait before the shot (default 900).
- `tags`: `[{ text, at, side, gap }]`, 2–6 words. `arrows`: `[{ from, to, bend }]`. `at` is an
  edge of the box or `[x, y]` in device points. The frame is narrow, so prefer `side: "top"`
  or `"bottom"`.
- `{ "mark", "diagram": "<name>", "from", "to", "sync" }` plays a window of a full-screen
  scene, `diagrams/<name>.html` (for explainers). It is a 1080×1920 GSAP scene that loads
  `tokens.css`, `lib.js` and `node_modules/gsap/dist/gsap.min.js`, and sets `window.tl` and
  `window.DURATION`.

```bash
node scripts/video/cut.mjs <slug> --check
```

When it passes, **ask in one message:** the narration and steps as a table, what the run
will tap or change in the app, and **may I take the simulator?** Say it is signed in to
the real account and that the plan assumes Demo Data is on. Plan steps that don't save
anything; if one must, say so.

## 2. Capture (only after a yes to this run)

The yes covers this capture, not later ones. Don't use `--approved` without it.

```bash
node scripts/video/capture.mjs <slug> --approved
node scripts/video/capture.mjs <slug> --approved --only 01-plus   # retake one step
```

For each step it runs `setup`, reads the box from `maestro hierarchy`, takes a lossless
`simctl` screenshot with a clean status bar (9:41), writes `rec.json`, then runs `then`. If a
target isn't found it stops, prints the visible labels and keeps its progress. `--only`
skips `then`, so put the app in the right state first.

**Read every still.** Check it's the right screen, no toast or spinner, the box is on the
control, and **nothing personal shows** (name, email, real entries). A video is public to
every user. Retake anything that fails.

## 3. Cut, voice, assemble (approval 2)

```bash
node scripts/video/cut.mjs <slug>                 # add --force after editing plan.json
node scripts/video/revoice.mjs <slug> --draft     # cheap voice, to check timing
node scripts/video/revoice.mjs <slug> --version V2   # real voice
```

ElevenLabs bills per character, so get timing right on `--draft` first. Only changed lines
are re-voiced, but switching between draft and real re-voices them. The voice and models
are in `scripts/video/video.config.json`; voices come from `content/meditations/voices.json`.

Fix any `NOT FOUND` sync phrase. Make a contact sheet of `final.mp4` and check each thing
described is on screen while it's described, and captions don't clip:

```bash
ffmpeg -y -v error -i final.mp4 -vf "fps=1/2,scale=270:-1,tile=8x2" -frames:v 1 sheet.png
```

Then show the user the narration table, the length and the path. For changes, edit
`plan.json`, rerun `cut.mjs --force`, and revoice with the next version.

## 4. Publish (approval 3)

```bash
node scripts/video/publish.mjs <slug> --kind tutorial --screen <screenIntros key>   # dry run
node scripts/video/publish.mjs <slug> --kind tutorial --screen <key> --yes
```

Uploads to `tutorials/<slug>.mp4` and adds or replaces the entry in `src/data/tutorials.ts`.
Commit that file. Clients can't read `tutorials/` until the `storage.rules` change on the
backlog is deployed, and no screen plays these yet.

## Changing the pipeline

- Pure decisions are in `scripts/video/lib.mjs`, tested with `node --test scripts/video/lib.test.mjs`.
- Templates are in `scripts/video/assets/`. Colours and font come from
  `src/constants/theme.ts`; never hardcode them there.
- `scripts/video/engine/` is a portrait copy of the Vertesia engine, and is ours to edit.
- ffmpeg here has no `subtitles` or `drawtext`, so `burn.mjs` renders captions as PNGs.
