# Home Rework — Practices-first (plan)

> **Status:** Plan for review. Implements the "rework Home around Practices" step from
> [practice-protocol-direction.md](./practice-protocol-direction.md). Makes Home reflect the
> Practice Protocol and demotes Goals from the organizing spine (without deleting them).
>
> **Last updated:** 2026-06-22

---

## The problem

The app is **split-brained**: the Practices tab is new, but **Home still opens to the old world** —
`GoalActionsSection` groups everything under Goals, shows a "Create Your First Goal" empty state,
and runs a goals migration on load. Until Home changes, the pivot doesn't land.

## What makes this easy

The Home section data (`HomeData`) is mostly goal-independent already:
- **Goal-independent (reuse as-is):** `habits` (incl. `practice_id`), `weeklyCounts`, `habitStreaks`,
  `activeChallenges`, `extendedChallenges`, `activeProgram`, `plannedHabitIds`, `weeklyPlans`.
- **Goal-specific (drop from the spine):** `goals`, `goalFollowThrough`.

And the row components (`ChallengeRow`, `HabitRow`) are goal-independent — they get reused unchanged.

## Approach (minimal + reversible)

**Repoint the `goal_actions` section to a new `TodayActionsSection`** (practices-first), keeping the
old `GoalActionsSection.tsx` file dormant in the registry slot's place. Repointing the registry entry
(`src/screens/Home/sections/index.ts`) avoids any saved-layout migration — the section id stays
`goal_actions`, only its component changes. Reverting = point it back.

## The new "Today" section

A practices-first "Today's Actions" that reuses the existing rows + data:

- **Practices, grouped Activate / Calm / Restrain** (consistent with the Practices tab) — the user's
  adopted habits, bucketed by `getPractice(habit.practice_id)?.group`. Each row = the existing
  `HabitRow` (weekly progress, streak, check-off, planner badges).
- **Other habits** — any custom (non-practice) habits in a small "Other" group, so nothing is lost.
- **Active challenges** — their own section using `ChallengeRow` (planned feats + in-progress).
- **Active program** — the existing program-dashboard link (only if enrolled).
- **PlannerBar** — kept (goal-independent).
- **Add** — the AddActivity chooser stays, repointed: "Add a practice" → the **Practices tab**
  (the curated front door); "Add a challenge" → StartChallenge. (Custom-habit creation stays
  reachable via Manage Habits.)
- **Empty state** — "Head to Practices to start your protocol" instead of "Create your first goal."

## What's removed / demoted from Home

- Goal grouping + goal headers + follow-through badges.
- "Create Your First Goal" / "Add Another Goal".
- `runGoalsMigration` on Home load (the "General goal" auto-creation) — no longer needed.
- Goals remain reachable elsewhere (Progress → Your Goals) and the data stays intact — **demoted,
  not deleted.** Reversible.

## Open forks (settle before building)

1. **Goals on Home** — remove the goal grouping entirely (cleanest), or keep a small optional
   "Goals" entry/link on Home for outcome-goal users?
2. **"Unlock challenges after 3 habits"** — keep this gamified gate, or drop it so challenges are
   always available (fits the protocol model better)?

(Minor calls I'll just make, unless you object: group the Today section by Activate/Calm/Restrain;
point "Add a practice" at the Practices tab; keep PlannerBar + program link + reflection/greeting/
mantra sections as-is.)

## Build steps (after the forks)

1. `TodayActionsSection.tsx` — practices-grouped habits + Other + challenges + program + planner +
   empty state; reuse `HabitRow`/`ChallengeRow`.
2. Repoint `goal_actions` in `sections/index.ts` to the new component (keep `GoalActionsSection`
   dormant).
3. Drop `runGoalsMigration` from the Home load path; stop computing `goalFollowThrough` for the spine
   (can leave the data field, just unused).
4. Repoint the AddActivity "habit" option to the Practices tab.
5. Leave Goals/Programs/Challenges systems otherwise untouched (dormant where applicable).

Each step is OTA. Reversible by repointing the registry entry.

## Out of scope (later)
Reframing the Progress arena views; onboarding → practices; hard-removing Goals; per-practice
baselines.
