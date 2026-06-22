# Decision: Arenas vs. Goals as the Primary Organizing Axis

> **Status:** Recommendation for review. Companion to
> [strategic-direction-audit.md](./strategic-direction-audit.md) (resolves its "Phase 0"
> decision). Findings here were produced by a multi-agent audit that read the actual code —
> coupling points, line numbers, and Firestore index facts below were verified against the
> repo, not assumed.
>
> **Last updated:** 2026-06-21

---

## The decision in one sentence

The app is organized around **Goals** (a goal is the container; habits/challenges/programs
hang off it). The new direction is organized around **Arenas** (the six override-training
domains). This doc decides whether Arenas should **replace**, **coexist with**, or **demote**
Goals — and recommends a path.

**Recommendation (short version):** Ship **Coexist now** as a deliberate, reversible **Phase 1
of an Arena-first end state**, not as the destination. Make arena tagging mandatory-at-creation
and the **"By Arena" view the default**, validate the new proof metrics in parallel with the
old ones, and only re-author the Home spine to be arena-first **after the data proves it works.**
**Do not do a big-bang Replace.**

---

## What the code actually says (the facts that drive the decision)

These four findings matter more than the abstract "arenas vs goals" framing, because they
constrain what's safely possible:

1. **The Goal coupling is wide but shallow.** `goal_ids?: string[]` is an *optional array tag*
   on four entities — [Challenge](../src/types/index.ts#L157), [Nudge/habit](../src/types/index.ts#L259),
   [ProgramEnrollment](../src/types/index.ts#L734), [WorksheetEntry](../src/types/worksheets.ts#L67) —
   plus a required single-value `goal_id` on [MeasurementLogEntry](../src/types/index.ts#L938).
   It's referenced from ~40 files but it's *tagging, not nested ownership*. Adding a parallel
   `arena_id` is cheap; re-organizing everything around it is not.

2. **The backend has essentially zero goal coupling.** `functions/src/index.ts` has **no goal
   references**; the only hit anywhere is an unused `active_goal_count: 0` placeholder in
   [functions/src/rulesEngine.ts:266](../functions/src/rulesEngine.ts#L266). **This means most
   of any migration ships as an OTA `eas update`** — a major risk-reducer.

3. **Goals split ~40% reusable / ~60% goal-unique.** Reusable: the named/colored/dated
   container, the `goal_ids` tag convention, the measurement log+progress engine
   ([measurements.ts](../src/services/measurements.ts)), and the breakdown/follow-through
   aggregation. Goal-unique (no arena analog): the deadline→expiry→resolution lifecycle, the
   `MAX_ACTIVE=3` cap, the draft/commit flow, the 5-step creation flow, and the **~17 CBT/why
   fields** (`deeper_why`, `obstacles[]`, `inner_voice_*`, `identity_statement`,
   `recovery_plan`, `triggers[]`, …) in [Goal](../src/types/index.ts#L888-L928).

4. **The Home spine is the real cost.** [GoalActionsSection.tsx](../src/screens/Home/sections/GoalActionsSection.tsx)
   does `goals.map()` and groups every item under its goal. Re-keying that to arenas is the
   single biggest UI change. Notably it *already* has a flat, goal-free fallback path
   ("Your Activities") — proof the rows don't actually need goals.

---

## The three options (code-verified scores)

Scored 1–10. For migration cost and user disruption, **higher = better** (cheaper / less
disruptive).

| Option | Fit to brief | Migration cost | User disruption | Future flex | **Overall** |
|---|:---:|:---:|:---:|:---:|:---:|
| **A — Replace** (retire Goals) | 9 | 4 | 3 | 3 | **5.5** |
| **B — Coexist** (arena = parallel tag) | 5 | 9 | 9 | 8 | **6.0** |
| **C — Demote** (arena-first, goals → "Campaigns") | 9 | 4 | 5 | 8 | **6.5** |

### A — Replace: retire Goals entirely
Arenas become the only axis; the Goal entity, lifecycle, and CBT layer are deleted (CBT data
cold-archived to invisible storage). **Best strategic purity, worst everything else.** It
deletes evidence-based functionality (obstacle/if-then planning, CBT reframing, finite-outcome
tracking) that has no arena equivalent, and it forces the entire unproven proof layer (Override
Score, baselines, Discipline Map) to ship *in the same release* as the Home rewrite — with no
fallback, since the old proof metric (Follow-Through) is deleted. **Highest-risk option. Rejected.**

### B — Coexist: arena as a second, parallel tag
Add optional `arena_id` alongside `goal_ids`; Goals stay primary; arenas feed a new proof
layer and an optional "By Arena" lens. **Cheapest, safest, fully reversible, ~all OTA.** But it
keeps Goals primary, so it contradicts the brief's *arena-first* framing and risks the arena
lens becoming **vestigial** (users never switch to it → arena data stays sparse → Override Score
under-fed → the headline feature quietly fails while looking shipped).

### C — Demote: arena-first, Goals become optional "Campaigns"
Arenas become the Home spine + Discipline Map; Goals survive *as-is* but re-framed as optional
arena-tagged "Campaigns" (a finite outcome with a deadline + CBT ritual) living inside an arena's
detail screen. **Best brief fit that doesn't throw away real value.** But as a big-bang it pays
the *full* Replace cost (Home spine, color system, breakdown) **plus** the permanent tax of two
axes with mismatched cardinality (single `arena_id` vs array `campaign_ids`), and it still relies
on a migration heuristic that — see below — cannot actually work.

---

## Recommendation: Coexist now, as Phase 1 of Demote (C end state on B's rails)

**End state: C (arena-first, Goals demoted to Campaigns — not deleted).**
**How to get there: B's additive, reversible, OTA-only mechanics**, with three amendments that
stop Coexist from degenerating into a vestigial lens:

1. **`arena_id` is single-valued and set on *every* item at creation** — via the picker for
   human-created items, **auto-derived** for planner/library items. Densely populated from day
   one, not opt-in.
2. **"By Arena" ships as the *default* Home lens** (with "By Goal" still available) — users get
   arena-first muscle memory immediately and the proof systems actually get fed.
3. **The CBT/why anchor migrates *up* to a user-level profile now** — not left bolted to
   `goals[0]`, de-risking the one fragile coupling all three designs share.

Every expensive/irreversible step (Home-spine re-author, color re-source, deprecating the
auto-created "General" goal) is **deferred until production data proves arena tagging is dense
and Override Score is convincing.** If it isn't, you stop at Coexist permanently with zero sunk
irreversible cost. That's the whole point: **buy the C end state on B's reversible rails.**

---

## Why not just do C directly (the blind spots that change the plan)

The adversarial pass surfaced five things all three designs glossed over. These are the real
reason to sequence rather than big-bang:

1. **The arena-inference heuristic is a fiction.** Every design's migration says "infer
   `arena_id` from `category_id`." The live data can't support it: challenge categories are a
   3-value life-domain taxonomy (**Mind 151 / Physical 131 / Social 14**) mixed with orthogonal
   tags; the habit library uses a *completely different* taxonomy (Body/Focus/Money/Connection…).
   **Nothing distinguishes Deliberate Boredom, Breathwork, or Cognitive Resistance** — only ~6
   challenges even mention "breath." So a heuristic maps into 2–3 of 6 arenas, and **3 arenas
   are empty for every existing user on day one.** Making `arena_id` required *and* the Home
   spine (A & C) ships a broken first impression. → Collect real `arena_id` via the picker
   *before* re-organizing Home around it.

2. **Override Score has no novel data behind it.** `completionLogs` carry only
   `{points, difficulty, date, before/after mood/energy}`, and axis attribution is *indirect*
   (`reference_id → item → tag`). So "Override Score" can today only be *"reps × difficulty,
   bucketed by arena"* — i.e. re-sliced XP. You **cannot measure "overriding the stop signal"
   from a completion checkbox.** → Add a one-tap **per-completion resistance/intensity capture**
   ("how hard was the override?") so the metric has real signal, and run it **alongside** the
   existing Follow-Through metric to validate it before betting on it.

3. **The on-load migration is blocking and batch-limited.** [runGoalsMigration](../src/services/dataMigration.ts#L21-L80)
   is `await`ed *before* first render at [HomeScreen.tsx:232](../src/screens/Home/HomeScreen.tsx#L232)
   and uses a single 500-op `writeBatch`. A heavier arena migration on that same cold-start path
   (which recent history shows already had "hanging Firestore reads/writes") is a launch-day
   latency/abandonment risk. → Make any backfill **non-blocking, chunked (≤400 ops), and prefer
   lazy per-item tagging** at read/edit time over a one-shot flag-guarded migration.

4. **Required `arena_id` is unsafe.** Machine-generated items (the planner's
   [convertPlannedChallengesToChallenges](../src/screens/Home/HomeScreen.tsx#L262)) create
   challenges with no human in the loop to pick an arena, and Firestore has no schema to enforce
   "required." → `arena_id` stays **optional at the data layer**; "required" is enforced only in
   interactive UI.

5. **CBT/why data gets orphaned in all three designs.** DeferredOnboarding writes the user's
   deepest data onto `goals[0]` via `saveGoalCBTData`. None of the three actually *migrates*
   existing CBT data to the new arena-first top level. → Do the user-level CBT migration **early
   and independently** (Phase 2 below).

Bonus correctness note: the deployed `measurementLogs` composite index `(goal_id, date)` is
**effectively dead** — [getMeasurementLogs](../src/services/measurements.ts#L58-L66) uses a
single-field query + in-memory sort. So the new baseline queries need **no new composite index**
(Coexist's proposed `(arena_id, date)` index is unnecessary). The real schema care is that
`MeasurementLogEntry.goal_id` is *required* today — adding `arena_id` must stay backward-compatible
with existing logs.

---

## Phased plan (each phase is independently shippable & reversible)

| Phase | What ships | Risk | Ship path |
|---|---|---|---|
| **0** ✅ | **DONE (2026-06-21).** `src/constants/arenas.ts` (now **7** arenas + `getArenaColor` + `CATEGORY_FALLBACK_ARENA`) + optional `arena_id`/`off_thesis` on the library types + **all 99 seed/library items tagged**. Compiles clean. **→ Spec + full content mapping in [phase-0-arena-taxonomy.md](./phase-0-arena-taxonomy.md).** | None (pure code) | OTA |
| **1** ✅ | **DONE (2026-06-21).** Optional `arena_id` on all 4 entities; `ArenaPicker` (single-select) built; required in challenge creation + custom-habit creation/edit; optional in worksheets; in EditChallenge (prefilled via resolver); auto-derive from library on challenge-use/habit-add, program enroll (template-tagged), and planner (`convertPlannedChallengesToChallenges`); arena chips across library cards, Home rows, completion/progress, and detail screens. **Remaining (minor):** `ToolConversationScreen` (GoalStep) has no arena picker; worksheet draft-resume doesn't prefill arena. | Low (additive, dormant if abandoned) | OTA |
| **2** ✅ | **DONE (2026-06-21).** `saveWhyProfileCBT` writes CBT/why to the user-level `whyProfile/main`; DeferredOnboarding redirected off `saveGoalCBTData(goals[0])`; reads (reward messages, GoalDashboard, CompleteChallenge narrative) prefer the profile and **fall back to the goal** so legacy data still shows. Goal fields kept (not deleted). No data migration needed (read-fallback). | Low, isolates the fragile coupling | OTA |
| **3** ✅ | **BUILT (2026-06-21).** 3.1 Override Score + Discipline Map; 3.2 resistance-prompt reframe; 3.3 Arena Baselines + Discomfort Shift (Stopwatch, baseline store, Baseline Test + Arena Detail); 3.4 Admin "Arena Adoption" telemetry. All non-destructive, alongside Follow-Through. **Remaining is non-code: observe the telemetry over real usage — that gates Phase 4.** **→ [phase-3-proof-layer.md](./phase-3-proof-layer.md).** | Low (non-destructive, parallel) | OTA |
| **4** | **The reversible flip:** make "By Arena" the **default** Home lens (keep "By Goal" toggle). **GATE:** only pass this point if telemetry shows arena coverage is high and Override Score is convincing. | Low (config/default change) | OTA |
| **5** | **C end state:** re-author `GoalActionsSection` to arena-first spine (rows reused), re-source `getItemColor` across daily/weekly plan + `WeekDayCard`, demote Goals → optional Campaigns in arena detail, detect-and-hide legacy "General" goals. Keep all goal lifecycle/CBT code as the Campaign subsystem. | Medium, but **de-risked** (arena data already dense; no on-load heuristic re-home needed) | OTA |

**Cross-cutting rules:** never delete the `goals` subcollection or `goal_ids` (keep dormant —
this is what preserves reversibility through Phase 4). Make backfill non-blocking, chunked, and
idempotent; given OTA staggers bundle versions across users for days, prefer **lazy tagging**
over a one-shot flag-guarded migration so items created by old bundles still get tagged.

---

## Open questions for you

1. **Is the finite-outcome / CBT layer a keeper?** If outcome-oriented users ("run a 10k by
   October") are a real audience, the answer is yes → demote (C), don't delete (A). If the thesis
   is *strictly* "one mechanism, nothing else," Replace becomes defensible — but you knowingly
   drop obstacle planning, CBT reframing, and deadline tracking.
2. **Are the six arenas settled?** Hard-coding them as a TS enum bakes the taxonomy into types,
   colors, migration, and the Discipline Map — changing the set later becomes a code+migration
   change, not a data edit. (Goals were Firestore docs precisely so the taxonomy could evolve.)
   For a new, unvalidated strategy, consider keeping arena definitions data-driven.
3. **Appetite for the per-completion "how hard was it?" capture?** Without it, Override Score is
   just XP re-sliced. It's a small UX addition with outsized importance to the brief's credibility.

---

## Appendix — key files this decision touches

| Concern | Path |
|---|---|
| Goal model + ~17 CBT fields | [src/types/index.ts:888-928](../src/types/index.ts#L888-L928) |
| `goal_ids` foreign keys | [index.ts:157](../src/types/index.ts#L157) · [:259](../src/types/index.ts#L259) · [:734](../src/types/index.ts#L734) · [worksheets.ts:67](../src/types/worksheets.ts#L67) |
| Goal CRUD / lifecycle / follow-through | [src/services/goals.ts](../src/services/goals.ts) |
| Measurement engine (baseline reuse) | [src/services/measurements.ts](../src/services/measurements.ts) |
| Per-goal breakdown (→ Discipline Map) | [src/services/progress.ts:153-215](../src/services/progress.ts#L153-L215) |
| Lazy "General goal" migration | [src/services/dataMigration.ts:21-80](../src/services/dataMigration.ts#L21-L80) |
| Home spine (the big rewrite) | [src/screens/Home/sections/GoalActionsSection.tsx](../src/screens/Home/sections/GoalActionsSection.tsx) |
| Home loader + blocking migration call | [src/screens/Home/HomeScreen.tsx:232](../src/screens/Home/HomeScreen.tsx#L232) |
| Goal tag picker (8 call sites) | [src/components/goals/GoalTagPicker.tsx](../src/components/goals/GoalTagPicker.tsx) |
| Color source (goal → arena) | [src/constants/goalColors.ts](../src/constants/goalColors.ts) |
| Backend (confirmed goal-free) | [functions/src/index.ts](../functions/src/index.ts) · [rulesEngine.ts:266](../functions/src/rulesEngine.ts#L266) |
