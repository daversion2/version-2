# Habit Library Analysis — Research-Based Improvements

> Analysis of `src/data/habitLibrary.ts` (30 habits), the `HabitActionPlan` schema
> (`src/types/index.ts`), the completion/streak service (`src/services/habits.ts`),
> and the micro-exercises (`src/data/microExercises.ts`).
>
> Goal: increase the likelihood that a user actually achieves the habits they set out
> to do. Every recommendation is grounded in psychology and/or neuroscience research.

---

## The core thesis

The action-plan schema already encodes a real behavioral model. Mapping its five fields
onto James Clear's Four Laws (operant conditioning repackaged) shows where the gaps are:

| Law (mechanism) | Field | Covered? |
|---|---|---|
| **Make it Obvious** (cue-context association) | `cue`, `environment_change` | ✅ Strong |
| **Make it Easy** (reduce activation energy) | `minimum_version`, `environment_change` | ✅ Strong |
| (Plan for failure — WOOP) | `obstacle_plan` | ✅ Strong (rare and good) |
| **Make it Attractive** (anticipatory dopamine) | — | ❌ **Missing** |
| **Make it Satisfying** (immediate reinforcement) | points/streaks only | ⚠️ **Weak** |

**The library is excellent at *starting* a behavior and *surviving* an obstacle, but thin
on the two mechanisms that actually wire a behavior into a habit: anticipatory reward
(attractive) and immediate reinforcement (satisfying).** That is the highest-leverage place
to improve adherence.

Why it matters: habit formation is reinforcement learning in the basal ganglia. A behavior
automates when the brain gets a reward signal *close in time* to the action (Lally et al.,
2010 — median 66 days to automaticity; the curve only climbs when repetitions are *rewarded*
and *context-stable*, per Schultz on dopamine reward-prediction-error). The current loop
delivers reward (points) on a *weekly* aggregate and via streaks — both delayed and fragile,
and neither maps onto the moment of action.

---

## High-leverage ADDITIONS (schema/mechanism, ordered by expected impact)

### 1. Add an immediate "celebration / reward" step — the single biggest miss
- **Research:** BJ Fogg, *Tiny Habits* (ABC: Anchor → Behavior → **Celebration**). A felt
  positive emotion immediately after the act is the reinforcement signal; consistent with
  dopamine reward-prediction-error learning (Schultz).
- **Leverage what exists:** `CompletionLog` already captures `moodAfter` / `energyAfter` —
  the substrate is there but unused as a reinforcement loop.
- **Change:** Add `reward` / `celebration` to `HabitActionPlan`; surface a real celebration
  moment at log time (not just "+1 point"). Reflect the user's own `moodAfter` back at them
  ("You felt more energized 8 of the last 10 times you did this"). Turns existing before/after
  data into a *personalized* reinforcement signal — far stronger than generic points.

### 2. Add temptation bundling ("Make it Attractive")
- **Research:** Milkman, Minson & Volpp (2014), *Management Science* — letting people consume
  tempting audiobooks *only* at the gym raised attendance. Pairing a "want" with a "should"
  front-loads dopamine.
- **Change:** Add a `pairing` field — "I only let myself [tempting thing] while/right after
  [habit]." Natural fits already in the library: `podcast-audiobook` (literally the study),
  `workout-20min`, `outdoor-activity`, `cook-healthy-meal` + favorite playlist.

### 3. Make habit-stacking explicit (anchor as its own field)
- **Research:** Fogg's anchoring + Clear's habit stacking — "After [existing routine], I will
  [new habit]." Borrowing an already-automatic cue beats time-of-day alone. Structured
  implementation intentions beat free-text (Gollwitzer & Sheeran, 2006 meta-analysis:
  d ≈ 0.65 *when the if-then is concrete*).
- **Observation:** `cue` fields already do this implicitly ("Right after I brush my teeth"),
  but it's buried in prose.
- **Change:** Promote it to a structured `anchor` field so the UI can scaffold
  "After I ___, I will ___."

### 4. Add an identity statement
- **Research:** Self-perception theory (Bem) and identity-based habit change (Clear) — people
  sustain behaviors consistent with self-image. Identity framing ("I'm becoming a calm person")
  outperforms outcome framing.
- **Change:** Add `identity` — "Each time I do this, I'm someone who ___." Current habits are
  framed purely as actions.

---

## Mechanic changes (gate success; not library content)

### 5. Redesign the streak to prevent the "what-the-hell effect"
- **Research:** Polivy & Herman's *abstinence violation / what-the-hell effect* — one lapse
  triggers disproportionate abandonment. A pure consecutive-day streak (`getHabitStreak`) is
  brittle and all-or-nothing; resetting `currentStreak` to 0 amplifies the loss.
- **Changes:**
  - Implement Clear's **"never miss twice"** rule explicitly — after one miss, fire supportive
    messaging via the existing `giving_up` / `avoiding` micro-exercises.
  - Add **grace days / flexible streaks** (a "streak freeze," à la Duolingo). Self-compassion
    after lapse predicts *faster* recovery, not laxity (Neff; Wohl et al. on self-forgiveness
    reducing procrastination).
  - Make **weekly-target adherence** the *primary* progress metric (already computed via
    `getWeeklyCompletionCounts`) and the daily streak secondary. Weekly targets tolerate the
    natural rhythm of life; daily streaks punish it.

### 6. Constrain how many new habits a user starts at once
- **Research:** Self-regulation is limited in the moment; Fogg and Clear converge on starting
  with **1–2** habits. Onboarding into 5 predicts failure of all of them.
- **Change:** Cap / strongly nudge new users to 1–2 active habits until automaticity, then
  expand. Use `getHabitStats` automaticity proxy to gate "unlock another habit."

### 7. Set the time-to-automaticity expectation
- **Research:** Lally et al. (2010): median 66 days, range 18–254. The dropout cliff is in the
  first ~3 weeks, largely because people expect automaticity sooner and read continued effort
  as failure.
- **Change:** Surface a calibrated message in the vulnerable early window ("habits typically
  feel automatic around 2 months — effort now is normal").

---

## Habits to RECONSIDER or REMOVE

- **`daily-water` — "Drink 8 glasses of water."** The "8 glasses" figure has no good
  evidentiary basis (needs vary by person/diet/climate). Drop the false-precision number;
  reframe as "drink water with each meal" (which the `cue` already says). Staking a habit on a
  pseudo-scientific target undercuts the research-based positioning.

- **`cold-shower` — "Cold shower for 30 seconds."** Evidence for health benefits is thin/mixed;
  it's a *discipline/resilience challenge*, not a health habit. Belongs in the separate
  challenge library (`LibraryChallenge`, `barrier_type: 'comfort-zone'`), not the daily-habit
  library where it mostly generates misses.

- **Vague habits hurt automaticity:** `learn-something-new`, `creative-activity`,
  `practice-skill`, `brain-dump`. Habit formation needs a *consistent* behavior in a
  *consistent* context (Wood & Neal). Either tighten them ("doodle 5 min at my desk after
  lunch") or label them *flexible/enrichment* and set the expectation they won't automate like
  specific ones. Don't let users treat them as streak habits.

- **Redundancy in Physical movement:** `morning-walk`, `outdoor-activity`, `take-stairs`,
  `stand-up-hourly` all target "move more." Fine as menu variety, but tempts over-commitment
  (see #6). Tag them as one domain so the app can say "you already have a movement habit —
  master it before adding another."

- **`accountability_person` is empty in all 30 templates.** A field for social commitment — one
  of the best-evidenced adherence levers (commitment devices: Bryan, Karlan & Nelson; the
  StickK literature) — that is never seeded or prompted. Either prompt for it in onboarding or
  cut the dead field.

---

## What's genuinely good (keep)

- **`obstacle_plan`** is WOOP / mental contrasting with implementation intentions (Oettingen) —
  most habit apps skip this; one of the best-validated interventions. Lean into it.
- **`minimum_version`** is the two-minute rule / B=MAP "make it tiny" — the best defense against
  oversized habits.
- **Micro-exercises** are a strong self-compassion / cognitive-restructuring lapse-recovery
  layer. Underused — wire them into the streak-break moment (#5).

---

## Suggested prioritization (eng time)

1. **Immediate celebration + reflect `moodAfter` back** — biggest behavioral payoff; data
   already stored.
2. **Flexible streaks + "never miss twice" → micro-exercise** — stops the main abandonment driver.
3. **Onboarding cap at 1–2 habits** — cheap; prevents mass failure.
4. **Add `pairing` (temptation bundling) and `identity` fields** + backfill the 30 templates.
5. **Cleanup:** move cold shower to challenges, de-myth the water habit, prompt for
   `accountability_person`.

**Cleanest first PR:** #1 + #2 (reinforcement loop + flexible streaks) — both build on existing
data/services (`CompletionLog.moodAfter`, `getHabitStreak`, the micro-exercises).

---

## Key references

- Lally, van Jaarsveld, Potts & Wardle (2010), *European Journal of Social Psychology* —
  time-to-automaticity (median 66 days).
- Gollwitzer (1999); Gollwitzer & Sheeran (2006) — implementation intentions meta-analysis (d ≈ 0.65).
- Oettingen — WOOP / Mental Contrasting with Implementation Intentions (MCII).
- Milkman, Minson & Volpp (2014), *Management Science* — temptation bundling.
- Fogg (2019), *Tiny Habits* — B=MAP, ABC (Anchor-Behavior-Celebration).
- Clear (2018), *Atomic Habits* — Four Laws, identity-based habits, never miss twice, two-minute rule.
- Bem (1972) — self-perception theory.
- Polivy & Herman — abstinence violation / what-the-hell effect.
- Wood & Neal (2007) — habits as context-cued behavior.
- Neff; Wohl et al. — self-compassion / self-forgiveness and lapse recovery.
- Dai, Milkman & Riis (2014), *Management Science* — fresh-start effect.
- Bryan, Karlan & Nelson — commitment devices (StickK literature).
- Schultz — dopamine reward-prediction-error.
