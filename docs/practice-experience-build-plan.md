# Practice Experience — Build Plan

> **Status:** Implementation plan for review. Translates
> [practice-experience-design.md](./practice-experience-design.md) (the *what it feels like*
> decisions) into concrete code changes against the current architecture.
> Produced from a design conversation (2026-06-27).
>
> **Scope:** the 6 locked practices — Meditation, Breathwork, Cold, Heat, Boredom, The Harder
> Choice. Parked: Reflection, Movement, Fasting.
>
> **Last updated:** 2026-06-27

---

## TL;DR

Most of **Capture** and all of **persistence** already exist. The build adds the **Ready**
briefing beat, a forward **`PracticeSession`** flow (full-screen, Ready → Go → Capture),
differentiates the **middle beat** per practice, and keeps the existing modal as the retroactive
"already did it" shortcut.

**Confirmed architecture decisions:**
- Forward flow lives in a **new full-screen `PracticeSession`** navigator screen (not the modal).
- Keep **both** entry points: **Start** (forward flow, primary CTA) + **Log it** (retroactive).

---

## What already exists (reuse, don't rebuild)

| Design piece | Where it lives today |
|---|---|
| **Capture** — difficulty, per-practice tracking, override gate, tactics, notes | [HabitCompletionModal.tsx](../src/components/habits/HabitCompletionModal.tsx) `phase: 'form'`. Override gate already reads `practice.resistanceMoment`. |
| **Timed middle beat** — countdown + chime + keep-awake | [PracticeTimer.tsx](../src/components/habits/PracticeTimer.tsx). Chime is native-only (expo-audio); OTA binary falls back to haptic. |
| **Per-practice content** — howTo / science / tips / variations / tracking | [practices.ts](../src/data/practices.ts) + [PracticeDetailScreen.tsx](../src/screens/Practices/PracticeDetailScreen.tsx). |
| **Persistence** — metrics, hitHardMoment, tactics → willpower XP + streak + team activity | `completePractice` → `logHabitCompletion` in [services/practices.ts](../src/services/practices.ts). `CompletionLog` already carries a generic `metrics` map + mood/quadrant fields. |
| **Entry points** | `HomeScreen`, `PracticesScreen`, `PracticeDetailScreen` all render `HabitCompletionModal` + call `completePractice`. |

**Implication:** we add the *front* of the flow and differentiate the *middle*. Capture and the
write path stay as-is (extended, not replaced).

---

## Data model additions

### `Practice` interface ([practices.ts](../src/data/practices.ts))
```ts
flow: 'timer' | 'away' | 'moment';                 // which middle beat
timerDisplay?: 'countdown' | 'pacer' | 'hidden';   // when flow === 'timer'
ready?: {
  expect?: string;        // difficulty-arc block (omit for breathwork — no spike)
  focus: string;          // the one anchor / technique
  overrideUrge?: string;  // the urge to name, forward-facing (reframe of resistanceMoment)
  handoffCta?: string;    // "Put your phone down" / "Begin" / "Phone face-down"
};
```

Per-practice mapping:

| Practice | `flow` | `timerDisplay` |
|---|---|---|
| Meditation | `timer` | `countdown` |
| Breathwork | `timer` | `pacer` |
| Boredom | `timer` | `hidden` |
| Cold | `away` | — |
| Heat | `away` | — |
| The Harder Choice | `moment` | — |

### `CompletionLog` / `PracticeCompletionInput` ([types/index.ts](../src/types/index.ts))
- Breathwork **feeling-change**: store `state_after: 'calmer' | 'same' | 'wired'` as a `metrics`
  entry (no schema change — `metrics` is already a generic map), or reuse existing
  `moodBefore`/`moodAfter`.
- Boredom **"what came up?"** and Harder-Choice **"what did you want instead?"**: ride on the
  existing `notes` field, but surfaced differently in the Capture UI (see per-practice notes).
- No new required columns — the generic `metrics` map + `notes` cover the new captures.

---

## Phased build

### Phase 1 — Foundation (do first; only phase touching shared structure)
1. Add the `flow` / `timerDisplay` / `ready` fields to the `Practice` type and populate the 6.
2. **Extract `<PracticeCaptureForm>`** from `HabitCompletionModal` — lift the `phase: 'form'` block
   verbatim into a standalone component. The modal keeps rendering it (retroactive path); the new
   session renders the same component (forward path). Single source of truth for Capture.
3. Build **`<PracticeReady>`** — the briefing, driven by the `ready` fields. Blocks: *what to
   expect* / *focus on* / *the override* / handoff CTA. Include the **"I know this one — skip
   brief"** shortcut.
4. Add the **`PracticeSession`** navigator screen: `Ready → <middle by flow> → PracticeCaptureForm`,
   with a "skip to log" path. Point `PracticeDetailScreen`'s primary CTA at it as **Start**; keep
   **Log it** as the retroactive shortcut (opens the modal straight to Capture).

### Phase 2 — Timed variants (small; OTA-able except the chime)
- Parameterize `PracticeTimer` with `display`:
  - `countdown` — exists (meditation).
  - `hidden` — boredom: dark screen, no numerals, **chime only**. Set length on Ready, nothing to
    watch during.
- **Meditation**: drop the `technique` tracking field (per "keep it simple"); pure stillness.
- **Boredom**: elevate **"what came up?"** to the hero of its Capture — a dedicated prompt *above*
  the override gate; the gate (made it / pull strength) becomes secondary.

### Phase 3 — Away-from-phone (Cold, Heat)
- **`<PracticeHandoff>`** screen: "Put your phone down → … → I'm done" → Capture. (Heat = same
  component, mirrored copy; reversed arc lives in `ready.expect`.)
- Render duration as **quick chips** for `away` practices (the field renderer currently uses a
  slider) — log-after, not a live timer. Temp stays optional.

### Phase 4 — Breathwork pacer + feeling capture (biggest net-new build; isolated)
- New **`<BreathPacer>`** animated component — circle expands/contracts to pace inhale / hold /
  exhale per pattern (box / 4-7-8 / sigh). Pure JS / Reanimated → ships OTA.
- Capture reframed to **feeling-change**: "did you hold the pace?" + calmer / same / wired
  before-after.

### Phase 5 — The Harder Choice (rename + pre-commit; persistence wrinkle)
- Broaden copy; **keep the `eat_healthy_unenjoyable` id** so adopted instances (`practice_id`
  links) don't break — change `name` / `description` / content only, not the id.
- **Pre-commit → confirm** needs a small **pending-commitment** persisted on the instance (commit
  now, confirm after the meal). This is the only phase with new stateful behavior — closest in
  spirit to the parked Fasting model; could ship alongside Fasting in a later milestone.

---

## Risk & sequencing

- **Phases 1–3:** low risk, reuse existing pieces. Phase 1 is the only one touching shared
  structure (the form extraction) — do it first and carefully.
- **Phase 4:** largest build, but isolated to one new component.
- **Phase 5:** only phase introducing new stateful persistence — safe to defer.
- **Chime caveat:** `PracticeTimer`'s chime uses a native module (expo-audio), shipped in the
  current native binary; OTA-only changes fall back to haptic. The `<BreathPacer>` animation is
  pure JS, so Phase 4's visuals ship OTA — only the end-of-session chime needs the native build
  (already present).

---

## Parked (unchanged by this plan)

| Practice | Why parked |
|---|---|
| **Reflection** | Separate from practices; already the most built-out flow ([NightlyReflectionScreen.tsx](../src/screens/NightlyReflectionScreen.tsx)). |
| **Movement** | Scope undecided (too broad — lift vs. run vs. ruck). Resolve scope before designing. |
| **Fasting** | Own background-state model (12–36 hr, hunger waves). Biggest net-new build; pairs with Harder Choice's pre-commit persistence. |
