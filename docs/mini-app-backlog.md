# Mini-App Backlog

**Status: brainstorm, for review — nothing here is scheduled.** Companion to
`mini-app-contract.md` and the 2026-10-16 interview (`mini-apps-behind-habits`
in Claude's memory). Grounded in the habits that actually exist today —
`src/data/habitLibrary.ts`, `src/data/traditionalHabits.ts`, and the practice
catalog in `src/data/practices.ts` (meditation, breathwork, cold exposure,
which already have their own session templates and metric fields).

## How to read this

Four tiers:
- **Now** — the one already decided (Workouts)
- **Next** — strong candidates, each mostly reusing an engine Workouts or the
  next build already pays for
- **Later** — real ideas, smaller audience or more open questions
- **Not a mini-app** — habits that are better left as a plain check-in, and why

Ranking is mine; the call is yours. The main lever: **does this habit need
more than one number?** A workout needs an exercise, a weight and a rep count
all at once — a mini-app earns its keep. A made bed needs a checkbox.

## The shape: three engines, not ten one-offs

Candidates below mostly configure one of three reusable pieces rather than
being built from nothing — this is the same idea the original brief called
"engines," trimmed to what this app's own habits actually need:

| Engine | What it is | Built once for |
|---|---|---|
| **Timer** | guided session, a pacing/countdown visual, an optional running tally | Breathe |
| **Log** | pick an item from a list, enter a number or two, see history + personal bests | Workouts |
| **Journal** | a free-text entry with a prompt, a history you can scroll and search | — (nothing yet) |

A mini-app that's "mostly the Timer engine with a different accent and copy"
is a few days of work, not a few weeks. Worth sequencing with that in mind —
see **Cold** and **Focus** below.

---

## Now

### Workouts
- **Habits:** `workout`, `trad-exercise`
- **Engine:** Log
- **Signature interaction:** log a set (weight × reps) as you go, rest timer
  between sets, personal records called out at finish
- **Why it's distinct:** a check-in asks "how hard was it," a lifter also
  wants "how much, and is that more than last time" — that's a second axis
  a plain habit card has nowhere to put
- **Effort:** scoped in `mini-apps-behind-habits` — strength only, no GPS/cardio, ships OTA

---

## Next

### Cold
- **Habits:** `cold_exposure` (already has its own template — a water-temp
  metric field exists today, see `habitTemplates.ts`)
- **Engine:** Timer
- **Signature interaction:** hold timer + temp entry, "longest hold" and
  "coldest" records, same shape as a workout PR
- **Why build it second:** the habit already asks for a number the plain
  capture sheet handles awkwardly (a slider for temperature). A mini-app is a
  better home for data this habit already wants to collect.
- **Effort:** small once Breathe's Timer engine exists — same countdown
  component, different copy and accent

### Breathe
- **Habits:** `meditation` (aliases: `morning-meditation`, `trad-meditate`),
  `breathwork` (alias: `breathing-break`), `nsdr`
- **Engine:** Timer
- **Signature interaction:** pick a pattern (box breathing, 4-7-8, NSDR
  script), a pacing visual, minutes logged over time
- **Why three habits at once:** these are already near-duplicates of each
  other in the library (see the `morning-meditation` → `meditation` alias
  map in `practices.ts`) — one app absorbing three habits is the clearest
  case for decision 5 (one app, many habits).
- **Effort:** first build of the Timer engine, so it carries that cost;
  Cold and Focus ride on it afterward

### Focus
- **Habits:** `deep-focus-session`, `dreaded-task-first`, `inbox-after-focus`,
  `phone-free-first-hour`
- **Engine:** Timer (same pacing component as Breathe, no breathing visual —
  a plain countdown, maybe a distraction tally button)
- **Signature interaction:** start a block, optional tally of times you
  almost picked up your phone, minutes of deep work trending over weeks
- **Why it's distinct:** four separate "sit down and don't get up" habits
  that currently have nothing to show for themselves beyond a checkmark —
  a running "deep work minutes this month" number is the kind of proof this
  app's whole positioning is built on
- **Effort:** small — mostly the Timer engine with a tally feature bolted on

---

## Later

### Reading
- **Habits:** `trad-read`, `trad-learn-language`, `trad-learn-skill`
- **Engine:** Log, light
- **Signature interaction:** "what are you working through" — a current
  book/skill, pages or minutes, a shelf of finished ones
- **Why later:** real, but thin — three habits with modest week-one upside.
  Good second or third thing to build once the Log engine exists from
  Workouts, not a reason to build it first.

### Money
- **Habits:** `check-the-numbers`, `pay-myself-first`, `wait-24-hours`,
  `no-spend-day`, `trad-budget`
- **Engine:** Log
- **Signature interaction:** a spend log, a no-spend streak, a running total
  moved toward a goal — five habits that are all really facets of one
  "money app"
- **Why later, not next:** real appetite (five habits map to it), but it
  touches money data, which deserves its own think on what gets stored and
  how plainly it's shown — worth a short dedicated conversation before
  scoping it, not a reason to drop it.

### Journal
- **Habits:** `trad-journal`, `note-one-good-thing`
- **Engine:** Journal (new — nothing today reuses this)
- **Signature interaction:** a prompt, free text, a scrollable/searchable
  history
- **Why later:** this is explicitly the dormant CBT-worksheet territory
  flagged in product-vision-priorities memory — "introspection... coming
  back as a peer, not stay dormant." A Journal mini-app and the worksheets'
  eventual revival are close enough in spirit that it's worth deciding how
  they relate before building either.

### Connection
- **Habits:** `reach-out`, `make-the-call`, `phone-free-dinner`
- **Engine:** Log, very light
- **Signature interaction:** a log of who you reached out to, a streak of
  weeks with at least one real conversation
- **Why later:** smallest audience of the set. Fine candidate once the Log
  engine is cheap to stand up a fourth time; not worth building early.

---

## Not a mini-app

Keep these as plain check-ins — a mini-app would add friction without adding
anything worth tracking:

- **`trad-make-bed`, `trad-tidy`, `trad-floss`, `trad-skincare`** — genuinely
  one bit of information each (did it happen). A mini-app here is a solution
  looking for a problem.
- **`protect-attention` (no social media before noon)** — the thing worth
  measuring (actual phone pickups) lives at the OS level, not in anything
  Neuro-Nudge can log by hand. Revisit only if screen-time APIs ever enter
  the picture — that's native work, not a mini-app.
- **`plan-tomorrow`** — already owned by the nightly close flow. A separate
  mini-app would compete with a screen that already does this job well.
- **Sleep habits** (`consistent-bedtime`, `wind-down`, `no-snooze`,
  `caffeine-cutoff`) — flagged in the original brainstorm as the weak case:
  without a watch or Apple Health, logging sleep by hand has limited value,
  and that integration is native code (a store release), not an OTA-shippable
  mini-app. Worth a real "Sleep" app later, but gated on that native work,
  not on anything in this backlog.
- **`trad-10k-steps`** — a single running number (today's step count). Worth
  showing somewhere, maybe eventually inside Workouts, but doesn't justify
  being its own app.

---

## Open questions for you

- **Build order:** Workouts first is already decided. After that — Breathe
  (stands up the Timer engine, three habits at once) or Reading/Cold
  (smaller, proves a second mini-app is actually cheap once Workouts exists)?
- **Money:** worth a short dedicated conversation on what gets stored and
  shown before it gets scoped, given it's the one candidate touching
  financial data.
- **Journal vs. the dormant CBT worksheets:** same question as above but for
  introspection — one thing, or two, and which comes first?
