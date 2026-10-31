# No generic habits — micro-apps + friction are the product

*Decided 2026-10-24 in a founder conversation. Supersedes the habit-centric framing in
`docs/habit-template-unification.md` (kept for history — do not build from it) and the
"habits support underneath" line in `docs/apps-first-today.md`. When this doc and the
code disagree, the code wins.*

## The decision

Generic habit tracking goes away. The product is a small, deliberately curated set of
micro-apps (Meditate, Workouts, Meals today), plus the resistance/friction rating, which
is the spine and theme of the entire app — not a feature bolted onto a habit list.

- **No more arbitrary/custom habits.** The founder's own framing: habit trackers are
  "vanilla" and saturated; a differentiated product is a few well-built experiences with
  friction measured underneath, not an open-ended list anyone can fill with anything.
- **The micro-app list grows deliberately, not generically.** Cold and Focus are already
  candidates (`docs/backlog.md`). New ones get built with the same depth as Meals/Workouts/
  Meditate — a template picker for arbitrary habits is explicitly not the growth path.
- **Friction ("how hard was it") stays the one rating that happens everywhere** — every
  app's session, not just habits. It's the thing that makes the three apps feel like one
  product instead of three unrelated tools.
- **Home becomes one unified dashboard** across the apps — today's status, each app's
  weekly goal/progress, and the friction signal, in one view. The apps themselves are
  where the actual logging happens (Meals' chips, Workouts' sets, Meditate's session).
- Self-optimizers who want to track something outside Meditate/Workouts/Meals have
  nowhere to put it in this app. That's an accepted gap, not an oversight — see Open
  questions.

## What this obsoletes

- **`docs/habit-template-unification.md`** — its entire premise (collapse `Practice` and
  `LibraryHabit`, template picker, admin template builder, restoring custom-habit
  creation) assumed habits were the long-term home for everything. None of Phases 1–5
  need to ship. The type-merge work already landed (`HabitDefinition`,
  `getHabitDefinition`) is harmless to leave as-is; the *surfacing* work (Phase 5: one
  Library screen, custom habit creation UI) should not be built.
- **The habit library, archive, custom-habit creation, and day-of-week scheduling** as
  user-facing concepts. Whatever still exists in the library (the 42+ library/traditional
  habits, `PracticesScreen`, `HabitLibraryScreen`) is a candidate for removal once the
  dashboard and the mini-apps don't depend on it — not scoped yet (see Open questions).
- **The resistance-habit-tracker-pivot framing** ("Neuro-Nudge becomes a traditional habit
  tracker whose differentiator is measuring resistance") — the habit-tracker part is
  dropped; the resistance-measurement part is promoted to the whole point of the app.

## The technical wrinkle this doc exists to flag

`docs/apps-first-today.md` (built, shipped OTA 2026-10-18) made the three apps
"first-class" on Today, but it did that by **piggybacking on habit infrastructure**:
every app check-in is a synthetic habit (`app:<id>` in `services/appCheckins.ts`), and a
session also writes a **mirror log** onto the matching real habit (Workouts → the
"Workout" habit, Meditate → "Meditation"/"Breathwork"/"NSDR") so that pace, streaks, skip
review, and "Friction you can handle" — all of which are keyed off habit check-ins — pick
the apps up for free.

If generic habits go away entirely, that foundation goes with them. Streaks, pace,
weekly skip review, and the friction-capacity headline need a home that isn't "a habit
row," which `appCheckins.ts` currently is. This is the first real design/build question
for this pivot, not a detail to patch in passing — expect it to be the bulk of the work.

## Progress-screen tracking spec (interview, 2026-10-24)

Nailed down via a persona interview — the founder answering multiple-choice
questions as the app's target self-optimizer user — before building the
Home/Progress screen. Supersedes the specific metrics guessed at in the first
mockup (`docs/no-generic-habits-micro-apps.md`'s companion artifact,
"Home — Progress Dashboard Mockup").

**Top of screen:**
- One combined streak/consistency number across all three apps — the headline,
  chosen over hard numbers, the friction trend, or an even three-way split.
- A cross-app comparison insight ("most consistent with X"), led by **% of each
  app's own weekly goal met** (normalized so the three are comparable), with the
  friction trend as a secondary note — e.g. "Most consistent: Meditate (100%) ·
  Workouts has felt easiest lately."

**Every app card, consistently:**
- Its own streak too (not just the combined number up top).
- A friction signal — the average resistance rating **and** its trend direction
  together, e.g. "4/10, down from 6." Small, next to the card's own metric, not a
  top banner (the first mockup's banner is superseded by this).
- Trends compare against **both** the user's own past **and** a set goal/target
  — not either/or.
- Default timeframe: **rolling last 7 days** (not a Monday-reset week).
- Tapping the card goes **straight to starting a session** in that app, not a
  history/detail view first.

**Per-app primary metric (the thing each card leads with):**
- **Meditate:** total minutes meditated + the last session's length. Beat
  consistency, the calm before/after shift, and technique variety in the
  interview.
- **Workouts:** combined total volume trend, with the single best/standout lift
  called out underneath it. Beat pure PR-tracking and phase/program progress.
- **Meals:** a **heatmap**, one cell per food group, shaded by servings count
  (darker = more servings) — not a %-covered number, not a pass/fail streak, not
  a by-meal breakdown. New visual; nothing currently shipped computes this.

**Serving, defined (founder, 2026-10-24):** one serving of a food group = one
plate (a meal entry or an extra) whose `groups: FoodGroupId[]` includes that
group's chip. Tapping Veggies on a meal is one veggies serving; tapping it
again on a different plate the same day is a second. This is the same
per-plate counting `countGroup()` already does for a single target group
(`services/mealsMath.ts`) — the heatmap just needs it generalized across all
`FoodGroupId`s at once, tallied over the rolling 7 days instead of one
`GroupGoal`. The raw `groups` array survives in storage per plate (pass/fail
is a derived view computed on read), so this is pulling `MealsDay`s for the
window, flat-mapping meals + extras, and counting occurrences per group — no
new storage needed. Still a product call, not yet made: whether the heatmap
includes `processed`/`semi` groups and extras alongside whole-food groups, or
whole-food groups only.

**What this doesn't answer yet:**
- The cross-app "most consistent" insight needs one comparable definition of
  "weekly goal" across apps — Meditate/Workouts already have session-count
  goals (`services/appCheckins.ts`), Meals' goal is "days on target"; the %
  needs a consistent formula across all three.
- The `appCheckins.ts` habit-piggyback problem (see above) gets **bigger**, not
  smaller: streak now needs to power a combined top-level number across all
  three apps, not just one count per app.

## Built: the main screen (Lab 2026-10-26, replaced Today 2026-10-31)

This is now the **Today tab** for every account. It started as the Lab
experiment "Home dashboard". Mockup chosen
2026-10-24: rings across the top, then Overview / Meditate / Workouts / Meals
as pages you swipe between or pick from tabs. The rings shrink to one line
once you scroll into a page. Overview carries a "week at a glance" grid, one
row per app and one column per day.

- **The numbers:** `services/homeDashboard.ts`, which is pure and tested. It
  reads each app's own collections (`lab_meditate_sessions`,
  `lab_workout_sessions`, `lab_meals_days`). Friction is the exception: it
  comes from the `app:<id>` check-in logs. The view is
  `components/homeDashboard/`, rendered by `screens/Home/HomeScreen.tsx`.
- **Two corrections to the spec above:**
  - Friction is a **3-level rating**, not 1–10 (`constants/resistance.ts`).
    Shown as "Mostly easy (1.6 of 3) · down from 2.1".
  - The week grid is the **last 7 days ending today**, not Monday to Sunday,
    so it matches the rolling window.
- **Streaks (founder, 2026-10-26):**
  - Meditate: days in a row with a session.
  - Meals: days in a row on target.
  - Workouts: weeks in a row that met the weekly goal.
  - Combined: days in a row with anything.
  - A today with nothing yet never breaks a streak.
- **Goal %:**
  - Meditate and Workouts count sessions, not days, against the weekly goal.
  - Meals counts days on target out of 7, because nothing stores a Meals
    goal.
- **Meals is scored 0–100 (founder, 2026-10-26):**
  - The Meals page leads with the 7-day average plate score, compared with
    the 7 days before. Every plate counts equally, the same as the week view.
  - Each day dot shows that day's average.
  - "On target" is a day whose average is at or above
    `scoring.on_target_threshold`, so the ring, streak and grid follow it.
- **Standout lift:** of the exercises trained in the last 4 weeks, the one
  whose best set moved furthest the right way over its last 6 sessions.
- **What carried over from the old Today (founder, 2026-10-31):**
  - HomeScreen still owns everything a check-in sets off: the "How hard was
    it to start?" sheet, XP, the celebration and toast, the weekly review,
    rule modals and the push prompt. Friction on the dashboard reads
    HomeScreen's own logs, so a rating shows at once.
  - Overview also keeps the rule banner, the XP line, "Today's plan", Close
    out the day and Craving Crusher.
- **What was removed:**
  - The habit list.
  - Browse library / Create your own.
  - The habit briefing.
  - The weekly "What got in the way?" review and the comeback flow now cover
    the apps only, because hidden habits would all read as missed.
  - **Habit reminders (2026-10-31).** Nothing schedules one any more:
    `syncHabitReminder` only cancels. Today cancels any repeating local
    notification still on the device once per session, using
    `cancelScheduledHabitReminders`. Habit reminders were the only repeating
    ones; the bells and Craving Crusher pings fire once. The toggle is gone
    from the habit plan screen, and onboarding no longer saves a reminder.
  - **The Library tab (2026-10-31).** `LibraryStack` was deleted. The library
    screens are still registered in the Home stack, but nothing links to
    them.

## Open questions (not yet decided)

- **What happens to existing habit data** on the founder's own account (streaks, XP
  history, library habits with no app behind them, e.g. water/sleep-adjacent ones)? A
  migration story, or an accepted loss pre-launch?
- **Does the habit library get deleted, or frozen/hidden?** The three library habits that
  mirror app sessions (Workout, Meditation, Breathwork/NSDR) are currently load-bearing
  per the wrinkle above — they can't just disappear until their streak/XP role moves
  somewhere native to the apps.
- **What replaces the weekly "What got in the way?" skip review** once it's not reviewing
  habit skips? Does it become per-app ("missed your Workouts goal this week")?
- **Scope and sequencing of the rebuild** — this doc records the decision, not a plan.
  Needs its own scoping pass before code changes start.

## Why

Not derivable from the code, which still reflects the apps-first-today / habit-hybrid
build. Founder confirmed the direction 2026-10-24: drop generic habits, keep building
micro-apps self-optimizers will find genuinely new, make friction the theme throughout,
unify everything on one dashboard.
