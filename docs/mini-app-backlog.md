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

#### Workouts follow-up: a picture next to each exercise (on hold, 2026-10-17)

**Action item, not scheduled.** The founder wants a visual for each exercise
(a pull-up shows someone doing a pull-up) and is leaning toward **AI-generated
images**. They chose to hold off for now.

Ten options were compared side by side, with real art from each source, on a
private page: https://claude.ai/artifact/AAo93AAvFCHm3wafREr2j8 (the AI option
is F). The other options there: icons already in the app, exercise pictograms,
emoji, a muscle map, wger, free-exercise-db photos, everkinetic drawings,
ExerciseDB animations, and a custom animated figure.

The plan, when picked up:
1. **Lock one style by hand** in a chat app (ChatGPT or Gemini). Iterate on
   the pull-up until it looks like Neuro-Nudge; that image is the style
   reference for every other one.
2. **Write a pose line for each of the 48 built-ins** in
   `src/data/workoutExercises.ts`: grip, side view, which phase of the lift.
   Names alone are ambiguous (pull-up vs chin-up, deadlift vs RDL).
3. **Generate with two references each:** the style image plus a pose photo.
   Use free-exercise-db photos for pose (public domain, covers ~46 of 48).
   Don't feed in everkinetic (CC BY-SA carries over to derivatives) or
   ExerciseDB (copyrighted).
4. **The founder approves every image**, like the meditation recordings:
   correct grip and equipment, neutral back on deadlifts and rows, consistent
   look. Mirror `scripts/approveMeditation.ts`: candidates in
   `content/exercise-art/`, approvals by file fingerprint, only approved
   images copied into `assets/`.
5. **Bundle the images keyed by exercise id** (ids never change), behind a
   util that falls back to an equipment icon for exercises users create.
   Never generated live. Ships OTA. Add a jest test that every built-in has
   approved art.

Still to decide: the look (e.g. teal figure on white), one still image or
start/end frames, by hand or scripted, and which image provider. There's no
image-generation API key in `.env.local` yet. Rough cost: $10–40 for 48
exercises × ~4 candidates. Iterate at low quality; ask before using premium
models.

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

### Breathe → built as **Meditate** (Lab, 2026-10-17)

Decided in a 2026-10-17 interview and built in the Lab: one app named
"Meditate" (light theme, teal) for all six habits below. Sit, NSDR and
Breathe's "just time it" lock the phone and ring a bell (a scheduled local
notification, `services/sessionTimer.ts` + `services/sessionBell.ts`, built
to be reused by Cold and Focus). Breathe can instead follow the on-screen
pacer. NSDR opens a recording link the user saved. No clock when you peek
mid-sit. Records: longest sit / breathwork / NSDR, most minutes in a week.
History counts only sessions done in the app. Code:
`screens/Lab/experiments/meditate/`, `services/meditateMath.ts`,
`services/labMeditate.ts`. The original brainstorm entry follows.

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

#### Meditate, phase 1: guided recordings (in progress, 2026-10-17)

Pre-recorded guided sessions, written with Claude and voiced with
ElevenLabs. **The founder listens to and approves every one before any user
can hear it. Nothing is generated live.** The pipeline is built and runs on
the founder's machine: see `content/meditations/README.md`. Optional
background sounds are mixed into the approved file. Not built yet:
publishing to Firebase Storage and playback in the app. Playback with the
phone locked needs iOS background audio, which means a native build and a
store release.

#### Meditate, phase 2: Compose (building in the Lab, 2026-10-17)

The founder decided to build this now, in the Lab, tested on the simulator
before a store release. Built: a Lab mini-app "Compose" (screens in
`screens/Lab/experiments/compose/`, data in `services/labCompose.ts`); the
`composeSession` Cloud Function (`functions/src/compose.ts`) that writes with
Claude Haiku, voices and mixes with the shared engine in
`src/utils/meditation/`, and stores the MP3 privately in Storage; a private
"My recordings" library (save, rename, remove, delete); voice and background
pickers with bundled samples; background playback with lock-screen controls
(UIBackgroundModes audio, so the store release needs a native build).
Personal sessions are screened by Claude, not reviewed by the founder. The
original idea entry follows.

#### Meditate, phase 2 idea: compose your own (original write-up)

A composable guided **meditation and guided-imagery** maker. Guided imagery
here means the mental rehearsal athletes and high performers use: walking
through the race, the pitch or the hard conversation before it happens. Not
animated visuals on screen. The user describes what they want, picks length,
voice and background, and the app generates a recording they keep. Later,
they could share recordings to a user-generated library.

- **Conflicts with phase 1's rule.** A user's own generation is heard by no
  one before them. Suggested way to keep both: personal recordings get
  automated screening of the request and the script; anything shared to the
  library waits in a review queue for the founder's approval before others
  can see it. Not decided.
- **Rough size:** ~3–5 weeks for the personal generator (Claude writes the
  script in the phase 1 format, safety screening, rendering moved from the
  laptop to a cloud job, voice and background picker, per-user cost limits,
  composer, library and player screens). ~3–4 more weeks for the shared
  library (browse and search, report and block as the app stores require
  for user content, a founder review queue, cleanup on account deletion).
- **Reuses** phase 1's script format and parser, background library, mixing
  settings and voice setup. Phase 1's approved recordings become the
  library's starter shelf. Shares phase 1's native-build blocker for
  background playback.
- **Cost:** every generation costs real money, mostly the voice. A natural
  premium feature; access checks already route through one place
  (decision 12).

### Meals (built in the Lab, 2026-10-18)

Decided over several rounds on 2026-10-17 (a clickable mockup was approved
first: https://claude.ai/artifact/ComioQX7dhGJeJjf1c4FLp). Weight Watchers'
simplicity without its points: no calories, no food database, no nutrients.

- **Logging:** each of the user's own meals (how many and what they're called
  is theirs) is rated by tapping the food groups on the plate. Whole food:
  Veggies, Fruit, Chicken & turkey, Beef, Pork, Eggs, Fish & seafood, Legumes,
  Nuts, seeds & avocado, Grains & starches. Processed: Dairy (its own chip,
  semi-processed for pass/fail), Semi-processed (bread, pasta, jarred sauce)
  and Processed. The user never decides what counts — the app works out pass
  or fail. Snacks and drinks are "something additional", on top of the meals,
  rated the same way.
- **Nutrient tags (2026-10-19):** Protein, Fiber and Healthy fats, inferred
  from the groups (table in `data/mealGroups.ts`) — a plate *had* protein,
  never how much. Shown on the plate in the picker (missing ones struck
  through), as coverage on the day card ("Protein 2/4" — every plate counts,
  snacks included), and per day across the week. No nutrient goals yet.
- **Pass:** at least one whole-food group and nothing Processed. Strict mode
  (a setting): whole food only.
- **The day:** the user's goal is "pass N of my M meals"; M − N is how many
  misses the day can hold, and a failed extra is one miss. A meal marked
  "didn't eat" never counts against the day. Up to 3 food-group goals, daily
  (decide the day) or weekly (a progress bar). **No flex or cheat meals** —
  the founder rejected any allowance: the day is on target or it isn't.
- **XP:** an on-target day, closed out in Meals, hands the linked habit back
  to Today for the usual "How hard was it?" and celebration. An off-target day
  asks one optional "what got in the way?" (It was me / It was the day) and
  writes no check-in. Meals never awards XP itself.
- **Code:** rules in `services/mealsMath.ts` (tested), storage in
  `services/labMeals.ts` (`users/{uid}/lab_meals_days`, `lab_meals_prefs`),
  food groups and reasons in `data/mealGroups.ts`, screens in
  `screens/Lab/experiments/meals/`. Each day saves the rules it was scored
  under, so changing settings never rescores the past.
- **Not built yet:** a library habit of its own (link one in Meals settings
  for now — a custom "Eat real food" works); closing out from the app-wide
  nightly close (it's inside Meals for now); past weeks; a habit-detail
  highlight card (handoff #3, same as the others).
- **When it goes live:** remove Eat your vegetables, Hit my protein, Cut the
  sugar, Eat Healthy Food I Don't Enjoy and Cook one real meal from the
  library in the same release, archiving testers' copies with history kept,
  and point onboarding's Fuel picks at Meals. Alcohol-free day, Fasting and the
  water habits stay.

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
