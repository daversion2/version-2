# Guided meditation recordings

Pre-recorded guided sessions for the Meditate mini-app. **Every recording is
written, voiced and rendered ahead of time, and reaches users only after the
founder has listened to all of it and approved it. Nothing is ever generated
live for a user.**

## The loop

1. **Write** a script in `scripts/<id>.md` (Claude drafts, you edit).
2. **Render** it: `npx tsx scripts/renderMeditation.ts <id>` (or `--all`).
   The MP3 lands in `out/<id>.mp3` with a length report.
3. **Listen** to the whole thing. Fix by editing the script and re-rendering —
   only the lines you changed get voiced again.
4. **Approve** it: `npx tsx scripts/approveMeditation.ts <id>`. Run it with no
   id to see where every recording stands. Commit `approvals.json`.

Approval records the audio file's fingerprint. Re-rendering or editing the
script afterwards drops it back to "listen again". Publishing (not built yet)
must only ship recordings whose status is approved.

**Claude never runs the approve step.** It asks for the id at the keyboard
and refuses to run without a person there.

## Script format

```
---
id: first-sit-5
title: First sit
length_min: 5
---

# Lines starting with # are notes. They're never spoken.

Spoken text. Lines next to each other are voiced as one piece;
a blank line starts the next piece.

[pause 20s]

[bell]
```

- `id` must match the file name. `length_min` is optional; the render report
  compares the real length against it.
- `voice: regina` picks the narrator from `voices.json`; without it, the first
  voice there (Daisy) reads it.
- `[pause 20s]` is exact silence (also `[pause 1m30s]`). `[bell]` is the app's
  chime (`assets/sounds/chime.wav`). Each goes on its own line.
- Two pieces of speech with nothing between them get a 1.5s gap
  (`default_gap_sec` in `voice.json`).

## Background sounds

A script can have a quiet background loop mixed underneath: add
`ambience: <name>` to its front matter (and optionally `ambience_db: -3` to
nudge that script's background down or up). The background is part of the
rendered file, so what you approve is exactly what users hear.

Try a background without touching the script:

```
npx tsx scripts/renderMeditation.ts first-sit-5 --ambience brown-noise
```

That writes `out/previews/first-sit-5.brown-noise.mp3`. Previews are never
approvable.

Add a background with `scripts/makeAmbience.ts`, from an ElevenLabs prompt
(needs the `sound_generation` permission on the API key), a recording you
have commercial rights to, or generated noise. It logs where each came from in
`ambience/sources.json`. That's the licensing record, so keep it accurate.

## Phase 2 prototype: compose from a request

`scripts/composeMeditation.ts` is a local stand-in for the planned in-app
composer: describe a session, and Claude writes it, the engine voices it, and
the pauses are fitted so it lands on exactly the length asked for.

```
npx tsx scripts/composeMeditation.ts "calm before my first 400m race" \
  --kind imagery --minutes 6 --voice regina --ambience rain
```

- `--kind` is `meditation` or `imagery` (guided imagery, the mental
  rehearsal athletes use). `--minutes` is 2–10.
- Unsafe or off-topic requests are declined with a short message, and nothing
  is recorded.
- The script lands in `composed/` (git-ignored) with a `.json` log of the
  request, the model, token use and timings. The MP3 lands in `out/composed/`.
  To re-render an edited script: `--script composed/<file>.md`.
- Fitting keeps the first 2 seconds of every pause as written, and stretches
  or shrinks only the longer silences.

These are unreviewed, by design, and are for tuning script quality. Nothing
here reaches users, and none of it goes through the approval step.

## Files

| File | What it is | In git? |
|---|---|---|
| `scripts/*.md` | The scripts | yes |
| `voice.json` | Model, seed, gaps, loudness. `voice_settings: null` = the voice's own ElevenLabs settings | yes |
| `voices.json` | The narrators: key, name, ElevenLabs voice ID. The first is the default | yes |
| `pronunciations.json` | Words the voice says wrong → how to spell them so it says them right, e.g. `{"NSDR": "N S D R"}` | yes |
| `approvals.json` | What's been approved, with each file's fingerprint | yes |
| `ambience/*.mp3` | Background loops | yes |
| `ambience/sources.json` | Where each background came from, and its licence | yes |
| `out/` | Rendered MP3s + a render record each; `out/composed/` for the prototype | no |
| `composed/` | Prototype scripts and logs | no |
| `.cache/clips/` | One voiced clip per spoken piece, reused across renders | no |

The API keys live in `.env.local` (`ELEVENLABS_API_KEY`, and
`ANTHROPIC_API_KEY` for composing). Rendering needs `ffmpeg`
(`brew install ffmpeg`).

**Changing `voice.json`, a voice in `voices.json`, or a pronunciation re-voices
every line it touches** — and every recording made from them needs approving again.
