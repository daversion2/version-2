# The Practice Protocol — Revised Direction

> **Status:** Plan for review. Supersedes the arena-categorization framing in
> [arenas-vs-goals-decision.md](./arenas-vs-goals-decision.md) and
> [phase-0-arena-taxonomy.md](./phase-0-arena-taxonomy.md) as the *organizing concept*.
> Produced from a direction conversation (2026-06-21). The proof-of-growth machinery from
> Phase 3 is **kept and reframed**; the per-item *arena tagging* layer is **retired**.
>
> **Last updated:** 2026-06-21

---

## TL;DR

Stop categorizing overrides into abstract arenas. Instead, give users a concrete, opinionated
**Practice Protocol** — a small set of recurring practices to do on a cadence — and keep
**Challenges** for the discrete feats/reps they take on. Outcome goals are deferred; process
goals live on as per-practice targets.

> **Practices** = the recurring protocol you *maintain*.
> **Challenges** = the discrete undertakings you *take on*.

---

## Why (the decisions behind this)

From the direction conversation, in order:

1. **Practices are the daily core; Challenges stay** for non-recurring overrides. *(role)*
2. **Fixed no-equipment core + access-dependent add-ons** (not fully fixed, not fully personalized). *(roster type)*
3. **Roster = 8 practices:** Meditation, Breathwork, Cold, Heat, Movement, Deliberate Boredom, Fasting, Reflection. *(content)*
4. **Per-practice weekly targets** (e.g. "meditate 5×/week") — i.e. habit-style tracking. *(cadence)*
5. **Practices replace the abstract arenas**, but with a **light display grouping**. *(structure)*
6. **Grouping = Activate / Calm / Restrain.** *(grouping)*
7. **Goals:** keep **process goals** (they *are* the practice targets); **defer outcome goals**
   (the deadline + CBT/why entity stays dormant/optional, revisit later). *(goals)*
8. **Challenges are not only situational** — a planned feat ("run 10 miles", "fast 4 days") is
   also a challenge. **Keep the challenge setup largely as it is today.** *(correction)*

---

## The Practice roster

Targets are **defaults** (process goals) — user-adjustable. Baseline = the periodic test whose
delta over time is the **Discomfort Shift**.

| Practice | Group | Core / Optional | Default target | Baseline (Discomfort Shift) |
|---|---|---|---|---|
| **Meditation** | Calm | Core | 5×/wk | duration of stillness |
| **Breathwork** | Calm | Core | daily | stress rating, before → after |
| **Reflection** | Calm | Core | daily | — (streak/quality; mood optional) |
| **Movement** | Activate | Core | 4×/wk | duration / effort held |
| **Deliberate Boredom** | Restrain | Core | 3×/wk | duration without stimulation |
| **Cold exposure** | Activate | Optional* | 3×/wk | duration in cold |
| **Heat exposure** | Activate | Optional* | 2×/wk | duration in heat |
| **Fasting** | Restrain | Optional* | 1–2×/wk | fasting-window duration |

\* Optional = access/intensity-dependent (plunge, sauna, medical considerations). **Core ≈ 5**
(no equipment) — but **core/optional is admin-editable** (Resolved #1), so this is a default, not fixed.

> **v1 scope:** the **baseline / Discomfort Shift** column is a **later iteration** (Resolved #4).
> v1 ships practices as **curated habits with weekly targets + streaks only** — no per-practice
> baseline yet.

**Groups are display-only** (no per-item tagging): **Activate** (Cold · Heat · Movement) ·
**Calm** (Meditation · Breathwork · Reflection) · **Restrain** (Fasting · Deliberate Boredom).

---

## How each piece works

### Practices
- A **Practice** is a curated definition: id, name, group, core/optional, default weekly target,
  `baselineUnit` (duration / rating / completion), icon, color, "why it works" blurb, how-to.
- **Implement as curated habits.** A practice maps onto the existing habit model — a weekly
  target (`target_count_per_week`), completion logging, and streaks already exist. Practices are
  essentially first-class, app-defined habits **plus a baseline dimension**. This reuses the most
  code and matches the "per-practice targets" decision.
- **Process goals = the targets.** "Meditate 5×/week" is just a practice's weekly target.
- **Baseline + Discomfort Shift per practice** — reuses the Phase 3 baseline store, Stopwatch,
  and the per-item detail screen (re-keyed from arena → practice). Reflection has no natural
  duration baseline, so it tracks streak/quality only (flagged below).

### Challenges (keep ~as-is)
- Challenges remain the existing system: single-day + **extended/multi-day**, difficulty pre/post,
  post-challenge reflection, the library, buddy challenges. **No rework planned.**
- They are **discrete undertakings**, which can be **planned feats** ("run 10 miles", "fast 4
  days", "10-minute cold plunge") *or* **situational reps** ("have the hard conversation").
- Challenges keep their **existing** categorization (life domains Physical/Mind/Social, action
  type) — they do **not** get the retired arena tags.
- Conceptually: a Challenge is often a bigger, one-off expression of the same muscle a Practice
  trains daily (a 4-day fast is a Restrain challenge; 10 miles is an Activate challenge).

### Goals
- **Process goals:** kept — they are the practice targets.
- **Outcome goals** (finite, deadline, CBT/why): **deferred.** Leave the existing Goal entity and
  its machinery **dormant/optional** — don't expand, don't delete (reversible). Revisit after
  Practices ship.

---

## Mapping to what's already shipped (Phases 0–3)

The good news: the **proof-of-growth infrastructure survives**. The **arena *categorization*
layer is what goes.**

### ✅ Reuse (as-is or lightly re-keyed)
- `Stopwatch` component — as-is.
- Baseline store + Discomfort Shift ([arenaBaselines.ts](../src/services/arenaBaselines.ts)) —
  re-key `arena_id` → `practice_id`.
- `BaselineTestScreen` — keyed by practice.
- Habit system (targets, completion logs, streaks) — practices ride on it.
- **Challenges** — entire system unchanged.
- CBT worksheets — the **Reflection** practice can launch these.
- Override Score concept — reframe as practice/challenge "reps."

### 🔄 Reframe
- [arenas.ts](../src/constants/arenas.ts) (7 arenas) → **`practices.ts`** (8 practices +
  Activate/Calm/Restrain groups + core/optional + baseline unit + default target).
- `ArenaDetailScreen` → **`PracticeDetailScreen`** (target, streak, baseline, Discomfort Shift).
- `getArenaProgress` / Discipline Map → **by-practice and by-group** progress dashboard.
- Admin "Arena Adoption" (3.4) → practice usage telemetry (or drop).

### 🗑️ Retire (delete or leave dormant — all additive, low-risk)
- `arena_id` tagging on challenges / habits / programs / worksheets (Phase 1) — practices are a
  fixed roster, not per-item tags.
- `ArenaPicker` in the creation/edit flows.
- Arena **chips** on library cards + detail screens.
- `arenaForChallenge` / `arenaForHabit` resolvers + `CATEGORY_FALLBACK_ARENA`.

**Honest note:** this retires a meaningful slice of the just-committed Phase 0–1 work. It was all
*additive* (optional fields, extra UI), so removal is low-risk, and the conceptual exploration is
what produced this clearer direction. Phase 2 (CBT→user-level) and Phase 3 (proof layer) largely
survive.

---

## Resolved decisions (2026-06-21)
1. **Core vs optional is admin-editable.** The core/optional flag (and default targets/grouping)
   is managed from an Admin "Practices" screen backed by a Firestore config with code seed
   defaults — the onboardingConfig pattern. Not hardcoded.
2. **Reflection reuses existing reflection.** The Reflection practice is a normal check-off habit;
   it leans on the reflection the app already has (habit completion notes, nightly reflection,
   post-challenge reflection). No new reflection or baseline system for it.
3. **Practice = curated habit, minimal change.** Practices ride on the existing habit model
   (template → adopt → weekly target + completion + streak). Keep it light now; "we'll add more to
   practices later."
4. **Baselines / Discomfort Shift deferred.** v1 = curated habits with targets + grouping. The
   Phase-3 baseline machinery stays in place and gets reframed onto practices in a *later*
   iteration, not v1.
5. **Onboarding unchanged for now** — revisit later.
6. **Naming locked:** "Practices" and "Reflection".

---

## Build sequence — v1 (light; baselines/onboarding deferred)
1. **Define the practices** (code seed, e.g. `practices.ts`): the 8, each with group
   (Activate/Calm/Restrain), default core/optional flag, default weekly target, icon, blurb —
   curated-habit shaped (basically `LibraryHabit` + group + core flag).
2. **Admin "Practices" config** — a Firestore config (code seed fallback) + a small Admin screen
   to toggle core/optional and edit targets/grouping (mirrors onboardingConfig / admin patterns).
3. **Adopt-a-practice = create a habit** with the practice's default target; completion + streak
   reuse existing habit code. Reflection practice = a normal check-off habit (existing reflection).
4. **Practices dashboard** grouped Activate/Calm/Restrain (core shown; optional add-on-able), each
   row = weekly-target progress + streak. Tap → existing habit detail for now.

**Deferred (later iterations, not v1):** per-practice baselines + Discomfort Shift (reframe
Phase 3 onto practices); onboarding switch to practice setup; retiring the now-dormant arena
tagging UI (picker/chips/resolvers); reframing the proof view (Discipline Map → by-practice).
**Untouched:** Challenges and outcome Goals stay as-is.

Each step is OTA and independently shippable.

---

## Appendix — key files
| Concern | Path |
|---|---|
| Arena constants → becomes practices.ts | [src/constants/arenas.ts](../src/constants/arenas.ts) |
| Baseline store + Discomfort Shift (re-key) | [src/services/arenaBaselines.ts](../src/services/arenaBaselines.ts) |
| Stopwatch (reuse) | [src/components/common/Stopwatch.tsx](../src/components/common/Stopwatch.tsx) |
| Arena/Practice detail + baseline test | [src/screens/Arenas/ArenaDetailScreen.tsx](../src/screens/Arenas/ArenaDetailScreen.tsx) · [BaselineTestScreen.tsx](../src/screens/Arenas/BaselineTestScreen.tsx) |
| Progress aggregation → by-practice | [src/services/arenaProgress.ts](../src/services/arenaProgress.ts) |
| Habit model (practices ride on it) | [src/services/habits.ts](../src/services/habits.ts) · [src/types/index.ts](../src/types/index.ts) (Nudge) |
| Challenges (unchanged) | [src/services/challenges.ts](../src/services/challenges.ts) |
| Arena tagging to retire | [src/components/arenas/ArenaPicker.tsx](../src/components/arenas/ArenaPicker.tsx) · [arenaForChallenge.ts](../src/utils/arenaForChallenge.ts) · [arenaForHabit.ts](../src/utils/arenaForHabit.ts) |
