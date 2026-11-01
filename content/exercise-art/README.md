# Exercise demo photos

Two still photos per exercise, a **start** and an **end** position, shown side
by side on the exercise's screen in Workouts. Holds and carries (plank, side
plank, wall sit, farmer's carry) get one. Labels and form cues are drawn by the
app (`ExerciseDemoCard`), never put in the photo.

**Every photo is generated ahead of time and reaches users only after the
founder has looked at it and approved it. Nothing is generated live.**

## What's where

| | |
|---|---|
| `src/data/exerciseDemos.ts` | The spec: camera angle, setup, start/end pose, cues and pose photo per built-in exercise id. The app shows the pose text when there are no photos. |
| `src/utils/exerciseArt/prompt.ts` | The prompt template. Athlete, clothes, gym, light and framing are fixed here. |
| `src/utils/exerciseArt/status.ts` | Pairs, status and batch planning (tested). |
| `reference/athlete.png` | The master athlete photo every exercise photo is made from (committed). |
| `approvals.json` | Your decisions, by file fingerprint (committed). |
| `runs.jsonl` | One line per generation run: count, model, cost. |
| `out/` | Candidate pairs and their prompts (git-ignored). |
| `assets/exercises/` + `src/data/exerciseDemoImages.ts` | What the app bundles, written by the publish step. |

## The loop

Key: `GEMINI_API_KEY` in `.env.local`. Exercise photos use Nano Banana Pro
(`gemini-3-pro-image`, $0.134 an image): it was the only model that got form
right. About $7.60 per batch of 10.

1. **Make a batch.** `npx tsx scripts/generateExerciseArt.ts --next` makes
   3 pairs for each of the next 10 exercises: redo requests first, then ones
   with nothing yet. A pair is a start photo and an end photo made by editing
   that start (only the start is sent, so only the pose changes).
2. **Review it.** `npx tsx scripts/reviewExerciseArt.ts` opens a page with
   every exercise that's ready. For each: pick a pair, **Redo all** with a note
   (the note goes into the next attempt), or **Skip** (text only). Save once.
   The first time, it asks you to pick the master athlete photo.
3. **Repeat** from 1 until nothing is left.
4. **Publish.** `npx tsx scripts/publishExerciseArt.ts` copies approved pairs
   into the app. Commit `approvals.json`, `assets/exercises/` and
   `src/data/exerciseDemoImages.ts`, then ship OTA.

Every run prints the image count and estimated cost first. `--dry-run` stops
there, and a run estimated above `--max-cost` (default $10) refuses to start.
Runs can be repeated safely: approved and skipped exercises are left alone,
and a pair whose end failed gets just the end next time.

Google allows 250 Nano Banana Pro requests a day on this account's tier
(about four batches). A run that hits the limit stops and says so; run the
same command the next day and it carries on.
`approveExerciseArt.ts` lists where every exercise stands and handles
one-off fixes from the command line.

## What to check before approving

Hands: five fingers, gripping the bar or dumbbell. Feet: where the spec says.
Spine: flat on hinges, rows and deadlifts. Head: neutral, not looking up.
Depth: the full range, no half reps. Equipment: real-looking and the right
kind. The same athlete and gym as the master. The start and end line up.

Approval records both files' fingerprints. Change either file, or pick a
different master athlete, and the approval stops counting.

**Claude never approves.** The review page and the approve script refuse to
start without a person at the keyboard.

## Pose photos

Start photos for most exercises also send a pose photo from
[free-exercise-db](https://github.com/yuhonas/free-exercise-db): `0.jpg` is
the start, `1.jpg` the end. **Not actually public domain:** the repo is
labelled Unlicense, but the photos were scraped, likely from Bodybuilding.com
(see the first **Now** item in `docs/backlog.md`). They're used only as pose
references and never shipped. Decide before launch whether to keep doing that. The prompt tells the
model to copy only the body position from it. End photos don't: sent with an
edit, the model copied the pose photo whole, red gym and all. Downloaded once
to `.cache/poses/`.
Don't swap in everkinetic (CC BY-SA carries over) or ExerciseDB (copyrighted).
