# Neuro-Nudge — App Overview

> What the app is, why it exists, and what a user can actually see and do in it
> today. Rewritten 2026-10-11 to replace the "willpower training" overview
> (Challenges / Programs / XP multipliers), which described an earlier product.
> When this doc and the code disagree, the code wins — fix the doc.

---

## What it is

Neuro-Nudge is a **habit tracker that measures how hard each habit is to start**,
not just whether you did it.

The thesis: what repetition makes automatic is the *starting*. As a habit beds in,
the friction of starting it falls while the habit itself stays exactly as
demanding. That falling friction is **evidence, not the goal**. The goal is the
person behind it getting **mentally stronger**, with more total capacity to handle
friction. One habit gets easier, so they can carry more habits or harder ones.
What the app celebrates is "you're getting stronger", and "this got easier" is
the proof.

**Positioning:** *a habit tracker that finally understands why you skip.* It does
the standard tracking well, and it records resistance at exactly the moment
other apps record guilt.

**Target user:** self-optimizers, the Huberman/Goggins crowd. They're already
into discipline and want a system grounded in science, plus proof it is working.
It is not built for beginners who need hand-holding or for a broad
"build better habits" audience.

## How it differs from a typical habit app

| Typical habit app | Neuro-Nudge |
|---|---|
| Records done / not done | Records **how hard it was to start** on every check-in |
| Success is a long streak | Success is **resistance falling while capacity grows** |
| A missed day is a failure, with guilt | A miss or hard day is **information**: skip reviews, a smaller plan |
| Habits are labels | Every library habit carries **its mechanism and the research behind it** |
| Reminders are the main lever | Proven behaviour-change techniques: **anchors, minimum versions, when-then plans** |
| Points for engagement | **XP = total friction overcome**, never multiplied |

---

## Core concepts

- **Habit.** The one thing users track. It comes from three places:
  - the curated **Library**, about 40 habits, each with a trigger ("after I…"), a minimum version and an explanation of why it works;
  - **custom** habits the user writes, picking a tracking template: just the check-in, time, distance, reps/sets, count, or a grade;
  - **guided habits**, the few curated ones that add a session (timer, breath pacer, or "put your phone down"). Meditation, Breathwork, Cold and Heat Exposure, and Unplugged Cardio are examples.

  There is no separate "practice" concept anywhere the user can see. The word
  survives only in code identifiers (`PracticeInstance`, `practice_id`, …).

- **Sections:** Mind · Movement · Meals (Sleep and Focus habits sit under Mind;
  Money was removed 2026-10-18). Stored categories are grouped into these — see
  `data/habitSections.ts` and `docs/three-sections-today.md`.

- **Schedule.** Each habit has either named days (Mon / Wed / Fri) or a weekly
  count ("4× a week, any days").

- **Resistance rating.** Every check-in is rated **1 Easy / 2 Med / 3 Hard**, meaning
  how hard it was to *start*. This is the headline metric.

- **XP.** The running total of friction overcome. Each check-in earns its
  rating (Easy 1, Med 2, Hard 3). XP is **never multiplied**: not by streaks,
  first tries, or bonuses. It only goes up, and a missed day never removes it.
  Riding out a craving earns a flat 2.

- **Streaks.** Consecutive active days. Named tiers (Starting → Building Momentum
  → On Fire → Unstoppable → Legendary) are celebrated when crossed. They are
  cosmetic only and do not touch XP.

- **Friction you can handle.** The Progress headline. *Friction faced* counts
  each check-in at how hard its habit was when the user started it, so it climbs
  as they take on more or harder habits and never drops because a habit got
  easier. *Friction felt* is what those check-ins cost now (today's ratings). The
  gap between them is the strength gained: "Your last 7 days would have felt
  like an 18 when you started. They felt like a 13." Logic in
  `services/frictionCapacity.ts`.

---

## App structure

Four tabs: **Today · Library · Progress · Settings**. Admin tools live inside
Settings and are visible only to admin accounts.

---

## Journey 1 — Onboarding

An interactive flow that teaches the premise before asking for anything:

1. **Premise / Neurons / Thesis.** Friction is the training. Repetition rewires
   the starting, and "I didn't want to" becomes "I did it anyway."
2. **The loop, demonstrated.** Pick a habit, rate it 1/2/3, optionally reflect.
3. **Pick one habit.** The likeliest first picks lead each category. It lands on
   Today with the catalog's default schedule, which can be changed later.

## Journey 2 — Today (the daily loop)

- **Three sections — Mind, Movement, Meals** — each one card showing only what
  needs you today: app habits first, then due today, then behind this week.
  Habits with nothing owed today fold into "N more this week"; done ones into
  "N done". A section with nothing in it isn't shown.
- **Tap to log:** a sheet opens with the habit's numbers already set to last
  time; 1 / 2 / 3 (how hard it was to start) logs it. **Press and hold** opens the
  full check-in (notes, every number, a day you forgot). The **›** on the right
  opens the habit's page. The ⓘ in the header explains all three.
- **Apps:** a habit with a coloured tile opens its app — Workouts, Meditate or
  Meals — and finishing a session there is the check-in.
- **After logging:** a "+N XP" message. The full celebration (streak tier,
  tidbit) is kept for milestones. After a **Med or Hard** rating the message
  offers "Add a note" — the reflection ("What helped you get started?") that
  builds a personal pattern of what works.
- **Guided habits** run a three-beat session: **Ready** (what you'll do, when the
  urge to quit hits, what to hold onto) → **Go** (timer, breath pacer, or "set
  your phone down") → **Capture** (rating plus tracked amounts).
- **Today's plan.** Last night's when-then sits at the top until the habit it
  names is logged.
- **Weekly skip review.** A habit that fell short of last week's target asks
  "What got in the way?" A skip is a *week* that fell short, never a single
  empty day.
- **Comeback.** Returning after missed days gets a recommit moment, not a
  scolding.
- **Craving Crusher.** A Today card for riding out an urge in the moment.

## Journey 3 — Closing out the day (nightly reflection)

About 60 seconds, in three beats:

1. **One win, already found.** "You did *Workout* even though it was hard."
2. **Grade the effort.** "How hard did you push yourself today?" A–F, framed as
   choices ("Showed up", "Pushed myself", …). This feeds the Progress charts.
3. **Tomorrow's when-then.** Pre-filled from the habit due tomorrow that the user
   has rated hardest recently: "When *I finish work for the day*, then *Workout*."
   On a **bad day** (D/F, or nothing logged on a scheduled day) there's a
   self-forgiveness note, and the plan shrinks to the habit's minimum version.

## Journey 4 — Library

- Browse by category, or search. Each habit page shows its description, why it
  works, the science and cited research, plus an editable schedule,
  per-occasion amount where relevant ("80 oz"), action plan and reminder.
  **Add to my habits** puts it on Today.
- **Create a custom habit:** name, category, schedule, tracking template.
- **Traditional Habits:** a secondary list of conventional staples.

## Journey 5 — A habit's own page

Current and longest streak, total check-ins, total XP, completion calendar,
weekly trend, "This has gotten easier" when resistance falls, performance on
tracked amounts, recent notes, schedule, the **Action Plan** (after I…, pair it
with, environment tweak, obstacle plan, minimum version, accountability), and
**Archive Habit**. Archived habits are restorable from Settings → Archived
Habits, and nothing is deleted.

## Journey 6 — Progress

"What has actually changed, rather than how much you have done."

- **Friction you can handle.** Friction faced (bars) and felt (dots) over the last
  8 rolling 7-day windows, growth against the user's first weeks, and the
  then-vs-now sentence.
- Time filter (7d / 30d / 90d / All), headline stats, and an activity trend.
- **Days you showed up.** A calendar where tapping a day opens Day Detail. The
  last 7 days are editable: log a forgotten habit, or delete an entry.
- **Habit by Habit**, **Totals by Type** (amounts across habits), **Personal
  Bests**.
- Nightly reflection history and grade charts.

## Settings

Profile · Archived Habits · Notifications (push opt-in) · Tutorial (replay
onboarding) · Send Feedback · Sign out · Delete account · Admin (admins only).

### Admin: editing wording live

Admin → **Edit wording on screen** puts a dotted underline under every editable
piece of text. Long-press one to change its wording, and it goes live for every
user on their next app open, with no release needed. **All wording** lists
what's been on screen this session, plus anything already edited, for alerts,
placeholders and titles that can't be long-pressed. Wording only: `**…**` marks
the words that use the spot's existing emphasis style, and `{name}`
placeholders are filled in by the app. Edits live in the `appCopy` Firestore
collection keyed by copy id; defaults stay in code (`<Copy>`, `useCopy()`,
`services/appCopy.ts`). Covered so far: onboarding, Today, the celebration,
the nightly close, Progress, and every ⓘ intro.

## Notifications & server

- **Per-habit reminders**, scheduled on each chosen weekday.
- **Server-driven nudges.** Cloud Functions evaluate admin-authored rules on a
  schedule (`evaluatePushRules`) and follow up on small commitments.
- Account deletion runs server-side (`deleteAccount`).

---

## Copy voice — rules that hold everywhere

- It's a **habit**, never a "practice". Avoid "rep" in user-facing copy.
- Celebrate **growing capacity**. "Got easier" is evidence, not the trophy.
- XP is **friction overcome**. Never imply streaks or bonuses multiply it.
- Explanations split into **How it works** and **Why this works** (the science).
  Each screen has a first-open ⓘ intro (`data/screenIntros.ts`).

---

## In the codebase but NOT part of launch

These are built but deliberately unrouted or dormant. Don't surface or extend
them for v1 without a decision:

- **Challenges / Training** (one-off and multi-day tests, library, buddies)
- **Programs** (multi-week guided journeys)
- **Tools tab:** CBT worksheets and Proof Points / Your Story. Introspection for
  v1 is the nightly close plus per-habit reflection.
- **Goals**, **Teams / community feed**, **Mantras**, **Micro-exercises**,
  **Weekly planner**, the old customisable Home layout
- **Why Discovery / My Why.** Dropped for launch. `why_statement` survives only
  as an optional `{why_statement}` rule placeholder for older accounts.

## Open items (as of 2026-10-11)

- **Copy stored in Firestore** (the habit catalog's science text, reward messages,
  push rules) may still say "practice" or "rep". The code is clean; edit the live
  copies under Admin.
