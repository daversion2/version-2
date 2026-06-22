# Phase 3 — The Proof-of-Growth Layer (plan)

> **Status:** Plan for review. Implements Phase 3 of
> [arenas-vs-goals-decision.md](./arenas-vs-goals-decision.md). This is the differentiator of the
> "Training Your Override" direction — the **mirror** that shows the user they're improving.
> Grounded in a codebase map (file:line references are real).
>
> **Last updated:** 2026-06-21

---

## Goal & principles

Build the four proof systems the brief calls for: **Override Score**, **Discipline Map**,
**Arena Baselines / Discomfort Shift**, and the **per-completion resistance capture** that makes
Override Score credible.

Three principles (carried from the decision doc):
- **Additive & non-destructive.** Everything runs *alongside* the existing XP / streak /
  Follow-Through. Nothing is removed. Fully reversible.
- **Works on existing data.** The arena resolvers ([getChallengeArenaId](../src/utils/arenaForChallenge.ts),
  [getHabitArenaId](../src/utils/arenaForHabit.ts)) already let us attribute *legacy* completions
  to arenas, so the Discipline Map and Override Score light up immediately — no data migration.
- **Phase 3 gates Phase 4.** After this ships, we watch telemetry (is arena tagging dense? does
  Override Score track something XP doesn't?) before the reversible "By Arena" default flip.

---

## The one decision that shapes Phase 3

**Override Score has no novel data behind it today.** [CompletionLog](../src/types/index.ts#L277-L294)
holds only `points`, `difficulty`, `date`, `type`, `reference_id` (no `arena_id`, and the
energy/mood fields are defined but unused). So a naive Override Score = "reps × difficulty,
bucketed by arena" = **re-sliced XP**. To make it mean "you overrode a real stop signal," we need
a resistance signal at completion (piece **3.2**). That's a genuine product call — see
[Open decisions](#open-decisions).

Everything else is mechanical. This is the crux.

---

## The four pieces

### 3.1 — Override Score + Discipline Map  *(cheap, visible, zero-risk — reads existing data)*

**What:** A weekly **Override Score** (overrides across arenas this week) shown on the Progress
tab, and a **Discipline Map** (the 7 arenas filling in over time — strength + avoidance).

**Data model:** none new required for v1 (compute on the fly). *Recommended* additive field:
denormalize `arena_id?: ArenaId` onto `CompletionLog` at write time (see
[Data model](#data-model-changes)) so aggregation is O(logs) not O(logs × item-lookups); legacy
logs still resolve via the resolvers at read time.

**Services (new, mirror the dormant [getGoalBreakdown](../src/services/progress.ts#L153-L215)):**
- `getArenaBreakdown(userId, startDate?) → ArenaStat[]` — `{ arenaId, name, color, reps, lastDate }`.
  Loads logs + challenges + habits once, builds a `reference_id → arena_id` map via the resolvers,
  buckets by arena. This is `getGoalBreakdown` re-keyed to arenas (the audit confirmed
  `getGoalBreakdown`/`GoalBarChart` are **dormant** — free to repurpose the pattern).
- `getOverrideScore(userId, weekBounds?) → { total, byArena, weekStart }` — same map, filtered to
  the current week via the existing [getCurrentWeekBounds](../src/services/habits.ts#L25-L40).
  v1 weighting = rep count (or count × difficulty); upgrades to use 3.2's signal.

**UI (additive on [ProgressScreen](../src/screens/Progress/ProgressScreen.tsx)):**
- An **Override Score** stat — either a 5th tile in [HeroStatsRow](../src/components/progress/HeroStatsRow.tsx)
  or a small dedicated card above the trend chart.
- A **DisciplineMap** component — a 7-arena grid (or radar) colored by `getArenaColor`, intensity
  by reps, with empty arenas visibly "untrained." Slots near `PeriodBreakdownCard`. Tapping an
  arena opens the Arena Detail screen (3.3).

**Complexity:** Medium. **Visible:** immediately, on real data. **Risk:** none (pure reads).

---

### 3.2 — Per-completion resistance capture  *(small build, but a product decision)*

**What:** Capture "how hard was the override / how strong was the stop signal?" at completion, so
Override Score reflects *resistance overcome*, not just activity volume.

**What already exists:** challenges capture `difficulty_actual` (1–5) via
[DifficultySelector](../src/screens/Home/CompleteChallengeScreen.tsx#L529); habits capture
easy/challenging in [HabitCompletionModal](../src/components/habits/HabitCompletionModal.tsx). These
are *difficulty* proxies, not explicitly *stop-signal strength*.

**Recommended approach (low friction, credible signal):** **reframe + one explicit field.**
- Add `override_intensity?: number` (1–5) to `CompletionLog`.
- **Reframe** the existing difficulty prompts as the override signal ("How hard was it to make
  yourself do this?") rather than adding a second tap — so no new friction at completion.
- Writers ([logHabitCompletion](../src/services/habits.ts#L93-L121),
  [completeChallenge](../src/services/challenges.ts#L215-L263)) store `override_intensity`
  (defaulting to the captured difficulty).
- `getOverrideScore` weights reps by `override_intensity`.

**Alternatives:** (a) do nothing — accept Override Score ≈ XP (cheapest, weakest); (b) add a
dedicated extra tap distinct from difficulty (strongest signal, most friction). The reframe is the
middle and my recommendation.

**Complexity:** Low. **Risk:** low (additive field + copy). **Decision required:** yes.

---

### 3.3 — Arena Baselines + Discomfort Shift  *(biggest build — the headline proof)*

**What:** Periodic per-arena **baseline tests**; the **delta between tests over time** is the
*Discomfort Shift* — watching what was hard become easy. This is the brief's core proof of growth.

**Baseline shape per arena** (from [arenas.ts](../src/constants/arenas.ts) `baselineUnit`):
- `duration` (mental_stillness, physical_discomfort, deliberate_boredom, cognitive_resistance) →
  a **count-up stopwatch**: "stay as long as you can," tap to stop, record seconds.
- `rating` (breathwork) → **before → after** stress rating; record the delta.
- `completion` (social_discomfort, impulse_control) → completion + an intensity rating.

**Building blocks needed (all new):**
- A reusable **Timer/Stopwatch component.** None exists today — the onboarding 60-sec timer is
  coupled to onboarding ([OnboardingScreen](../src/screens/Auth/OnboardingScreen.tsx#L370-L414)) and
  `CountdownTimer` is deadline-based. *Synergy:* this component is also the seed for the
  Meditation & Breathwork **session experiences** the original audit flagged as missing — build it
  reusable.
- A **baseline store.** New `users/{uid}/arenaBaselines/{id}` collection, mirroring
  [measurements.ts](../src/services/measurements.ts) (single-field query → **no Firestore composite
  index needed**). Entry: `{ arena_id, unit, value, value_before?, value_after?, date, created_at, note? }`.
- A **baseline service:** `logArenaBaseline`, `getArenaBaselines(arenaId)`,
  `getDiscomfortShift(arenaId) → { first, latest, delta, trend[] }`.
- A **Baseline Test screen**, driven by `baselineUnit` (stopwatch / before-after rating /
  completion+rating).
- An **Arena Detail screen** (new) to host: the arena's reps + Override Score, the latest baseline
  + Discomfort Shift delta, a "Retest" CTA, and its tagged items. Reached from the Discipline Map.
  *This is the first real "arena surface" — a deliberate stepping stone toward Phase 4/5.*
- **Retest cadence:** v1 = manual "Retest" button; later = a gentle reminder via the existing rules
  engine.

**Complexity:** Medium-High (new screens + store + the timer). **Risk:** low-moderate (all new,
additive). **Onboarding tie-in:** the first Mental Stillness baseline is a natural onboarding step
(the audit's "establish baseline #1") — can be wired once the screen exists.

---

### 3.4 — Run in parallel + watch  *(observational gate)*

Ship Override Score **alongside** the existing Follow-Through/XP, not instead of it. Watch:
- Is `arena_id` getting densely set on new items (picker adoption)?
- Does Override Score / Discomfort Shift track anything XP doesn't?

These answers gate **Phase 4** (make "By Arena" the default Home lens). No new build — just
instrument the new surfaces (lightweight logging) and review after a few weeks.

---

## Data model changes

| Change | Where | Why | Risk |
|---|---|---|---|
| `arena_id?: ArenaId` on `CompletionLog` | [types/index.ts](../src/types/index.ts#L277-L294) + 4 writers | Cheap aggregation, future-proof; legacy logs still resolve via resolvers | Low (optional, additive) |
| `override_intensity?: number` on `CompletionLog` (+ challenge/habit docs) | types + writers | Gives Override Score a real signal (3.2) | Low |
| New `users/{uid}/arenaBaselines/{id}` collection | new `services/arenaBaselines.ts` | Baseline history + Discomfort Shift; mirrors measurements.ts, **no index** | Low |
| *(optional, later)* `users/{uid}/overrideScores` weekly snapshots | new | Only if we want long-term Override Score trends / rules-engine triggers; v1 computes on the fly | — |

Backend (`functions/`) needs **no changes** — all of this is client-side + OTA, consistent with
Phases 0–2.

---

## Sequencing (each sub-step independently shippable)

| Step | Ships | Visible? | Risk | Gate |
|---|---|---|---|---|
| **3.1** ✅ | **DONE (2026-06-21).** `getArenaProgress` (Override Score + all-arena breakdown, single load, resolves legacy completions); `OverrideScoreCard` + `DisciplineMap` on the Progress tab. | **Yes, immediately, on existing data** | None (reads) | — |
| **3.2** ✅ | **DONE (2026-06-21) — reframe-only, per decision.** Difficulty prompts reframed to "How hard was the override?" (challenge) / "How hard was it to push through?" (habit). Reuses the existing `difficulty` value — no new field. | Subtle (copy change) | Low | — |
| **3.3** ✅ | **DONE (2026-06-21).** Reusable `Stopwatch`; `arenaBaselines` store + `getDiscomfortShift` (no index); `BaselineTestScreen` (duration/rating/completion modes); `ArenaDetailScreen` (per-arena reps + Discomfort Shift + retest CTA); Discipline Map tiles now tap through to Arena Detail. **Deferred:** tagged-items list on Arena Detail, retest reminders via the rules engine. | Yes (new arena surfaces) | Low-Moderate | — |
| **3.4** ✅ | **DONE (2026-06-21).** Admin → "Arena Adoption" screen (per-account): Override Score vs lifetime XP, reps by arena, tagging density (stored vs resolved), baseline coverage. **Now:** observe over real usage — that observation IS the Phase-4 gate. (Cross-user aggregate would need a Cloud Function — deferred.) | n/a | None | **gates Phase 4** |

**Recommended order:** 3.1 first (fast, visible, zero-risk win that proves the data flows), then
decide 3.2, then 3.3 (the big one), with 3.4 instrumentation folded in as we go.

---

## Open decisions

1. **Resistance signal (3.2)** — reframe existing difficulty as the override signal *(recommended)*,
   add a separate tap, or skip it (Override Score stays ≈ XP)? This is the one that determines
   whether the headline metric is credible.
2. **Override Score weighting** — simple rep **count**, or **count × intensity**? (Count is clearer
   to users; intensity-weighted is truer to "resistance overcome.")
3. **Discipline Map visual** — grid of 7 tiles, or a radar/spider chart? (Grid is simpler and reads
   well on mobile; radar is flashier but cramped at 7 axes.)
4. **Baseline scope for v1** — all 7 arenas, or start with the 4 `duration` arenas (where the
   stopwatch is the whole UX) and add `rating`/`completion` arenas after?
5. **Arena Detail screen now or defer** — 3.3 needs a host screen for baselines. Building it now
   front-loads a Phase-4/5 surface (good), but it's the largest new piece.

---

## Risks & notes

- **Credibility risk** (the big one): without 3.2, Override Score is XP relabeled. Decide 3.2 before
  marketing Override Score as the proof metric.
- **Aggregation cost:** resolving arenas at read time needs the challenges+habits docs (like
  `getGoalBreakdown` already does). Denormalizing `arena_id` onto new logs keeps it cheap; legacy
  logs use the resolver. Acceptable either way at current data sizes.
- **`type` union gap:** worksheet logs are written with `type='worksheet'` but the `CompletionLog`
  type union is `'challenge' | 'nudge' | 'program'` ([noted in the map]) — worksheets currently fall
  outside arena attribution. Decide whether worksheet completions count as overrides (they're
  "tools," so probably **no**); document the choice.
- **Synergy:** the reusable timer (3.3) is the foundation for the **Meditation & Breathwork session
  experiences** from the original [strategic audit](./strategic-direction-audit.md) — Phase 3
  unblocks those.

---

## Appendix — key files

| Concern | Path |
|---|---|
| CompletionLog type | [src/types/index.ts:277-294](../src/types/index.ts#L277-L294) |
| Log writers | [habits.ts:93](../src/services/habits.ts#L93) · [challenges.ts:215](../src/services/challenges.ts#L215) · [programs.ts](../src/services/programs.ts) · [worksheets.ts:40](../src/services/worksheets.ts#L40) |
| Aggregation (dormant breakdown) | [src/services/progress.ts:153-215](../src/services/progress.ts#L153-L215) |
| Week bounds helper | [src/services/habits.ts:25-40](../src/services/habits.ts#L25-L40) |
| XP / streak | [src/services/willpower.ts:145-181](../src/services/willpower.ts#L145-L181) |
| Progress screen + components | [ProgressScreen.tsx](../src/screens/Progress/ProgressScreen.tsx) · [src/components/progress/](../src/components/progress/) (incl. dormant `GoalBarChart`) |
| Arena constants + resolvers | [arenas.ts](../src/constants/arenas.ts) · [arenaForChallenge.ts](../src/utils/arenaForChallenge.ts) · [arenaForHabit.ts](../src/utils/arenaForHabit.ts) |
| Completion capture | [CompleteChallengeScreen.tsx:529](../src/screens/Home/CompleteChallengeScreen.tsx#L529) · [HabitCompletionModal.tsx](../src/components/habits/HabitCompletionModal.tsx) |
| Measurement engine (baseline precedent) | [src/services/measurements.ts](../src/services/measurements.ts) |
| Reusable-timer seed | [OnboardingScreen.tsx:370-414](../src/screens/Auth/OnboardingScreen.tsx#L370-L414) |
