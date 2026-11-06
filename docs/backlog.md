# Backlog

The one shared list of open work. **Read this before starting a session's work.**

How to use it:
- Each item: a bold one-line title, the date it was added, and enough context
  to start without digging. Link to the design doc rather than repeating it.
- Move items between sections as priorities change. When something ships,
  move it to **Done (recent)** with the date and commit, and trim Done to
  roughly the last month.
- When a session leaves something unfinished, add it here before stopping.
- Design thinking lives in its own doc (e.g. `mini-app-backlog.md`). This file
  only holds the next action and a link.
- `docs/todo.md` is the founder's personal, git-ignored notes. It is separate
  from this file.
- **Now / Next / Later** are the pre-launch punch list — fixes, polish, and
  things that must be true before launch. **Features** (below) is a separate
  list of new capabilities to build, not required for launch. Keep an item in
  whichever list actually describes it; a feature that becomes launch-blocking
  moves up into Now/Next/Later instead of staying in Features.

---

## Now

**Work through `docs/launch-review.md`** *(added 2026-11-02)*
The app-wide launch review fixed everything small (see Done). What's left is
there, most important first: deploy rules, functions and hosting; **Sign in
with Apple** (App Store guideline 4.8: a launch blocker, not a redesign
detail) plus `app.json` permission and name fixes for the next store build;
live rule copy in Admin → Rules; then product decisions.

**Check the new onboarding on screen** *(added 2026-11-01)*
Built and green in jest, not yet seen running. It needs a throwaway signup
(**writes to production; ask first**), or Settings → Replay intro on an admin
account. Look at: the four screens; switching an app off (gone from Today's
rings, rows, pages and week grid); "Today's plan" saying start with the chosen
app until its first rating; the rating explainer on that first sheet; the
reminder prompt and the 9 PM notification. On an older account: the one-time
goals sheet. Two known gaps: Progress and the redesign's app pages still show
switched-off apps, and the friction card counts them.

**⚠ Replace the exercise library's photos and steps: they're likely copyrighted** *(added 2026-11-01)*
**Blocks launch/charging.** On
2026-11-01, 200 exercises from free-exercise-db went into Workouts (commit
a9d04c3). Their 400 photos (`assets/exercise-library/`) and their steps
(`steps` in `src/data/exerciseLibrary.ts`) were taken as public domain. They
aren't safe to ship. free-exercise-db labels its own repository public domain
(Unlicense), but:
- its maintainer says they don't know where the images came from or whether
  they're royalty-free: "use at your own risk" ([issue #2](https://github.com/yuhonas/free-exercise-db/issues/2),
  [#13](https://github.com/yuhonas/free-exercise-db/issues/13)). In Aug 2026
  they proposed replacing the images with placeholders.
- the upstream project, wrkout/exercises.json, says in its CONTRIBUTING the
  images "have been scraped off the internet" and advises against commercial
  use. A reverse image search points to Bodybuilding.com, whose terms forbid
  reuse without written permission ([issue #305](https://github.com/wrkout/exercises.json/issues/305)).
  Others suspect ExRx.net.
- the steps read like Bodybuilding.com's text ("This will be your starting
  position"), so treat them as copied too.

Names, body parts, equipment and kinds are plain facts and can stay. **They
went out in an OTA on 2026-11-01** by the founder's call: the founder is the
only user and it's all testing. Every OTA ships `main`, so replace them before
anyone else gets the app. The plan (founder's call, not yet started):
1. Delete `assets/exercise-library/` and `src/data/exerciseLibraryImages.ts`.
   Stop the import script downloading photos and copying `instructions`.
2. Give each of the 200 its own spec in the style of `src/data/exerciseDemos.ts`
   (start position, end position, up to 3 cues), written fresh. The app then
   shows them as text, like core exercises without art. `howToFor` in
   `workouts/components/exerciseHowTo.ts` already falls back to a spec, and
   the art test then needs to cover every built-in again.
3. Optional, later: generate house-style art for them with the existing
   pipeline (`content/exercise-art/README.md`). At $0.134 an image that's about
   $55 for 400, plus redos, and the founder approves each one.

Related, lower risk: that art pipeline sends these same photos to the image
model as **pose references** for the core 59 (it copies only the body
position). Decide whether to keep doing that before launch.

**Fresh-account walkthrough + account deletion** *(added 2026-09-05)*
Nobody has tried a brand-new account since the 2026-10-11 changes: onboarding
now renders through `<Copy>`, plus the new nightly close, Today's plan card and
the friction card's empty state. Run it in the simulator with a throwaway
signup: onboarding → first check-in → celebration → close out the day → next
day's plan on Today. Then test Settings → Delete Account end to end. It calls
the `deleteAccount` Cloud Function, and both app stores require it to work.
**This writes to production. Ask before running (see the Maestro rule in
CLAUDE.md).**

**Check the new Today on screen** *(added 2026-10-31)*
The last item in Phase 1 of `docs/pivot-checklist.md`. The rest of Phase 1
(the habit leaks) is done. Run `ui-verify`, asking first. Check:
- the rating sheet after a session, and the rating showing on the app's page
  (now: the two-line button anchors fit, the ⓘ opens above the sheet, and
  the toast's override line is readable before it fades)
- the celebration
- pull to refresh on Overview
- Meditate's end bell still ringing
- Progress without its habit sections

**Apple-style redesign, phases 2–4** *(added 2026-10-31)*
An Apple-simple look for the whole app. **Everyone's look since 2026-11-01**
(OTA): `App.tsx` applies it at every launch unless an admin has Lab →
"Classic look" on (`services/redesignPref.ts`, key `nn.classic`). That switch
is the escape hatch while the classic branches exist; step 5 deletes both. The design is
20 screens on a claude.ai canvas: https://claude.ai/artifact/AR5aQji6PnQTb7zmLLxryG.
Phase 1 (foundation) is built:
- theme tokens plus the `REDESIGN` values in `constants/theme.ts`, applied at
  startup by `utils/redesign.ts`
- shared pieces in `components/common/`: `ListGroup`/`ListRow`,
  `SegmentedControl`, `Stepper`, `BottomSheet`, `ProgressRing`/`AppRings`

Next:
1. Look at Phase 1 on screen with the switch on (ask first). Greys and corners
   change everywhere; check nothing reads wrong. Fonts stay the brand's: the
   founder tried the system font and reverted it (2026-10-31).
2. Phase 2: Today as one scrolling list with `AppRings`, then Progress,
   Settings, the rating sheet and Close out the day. **Today is built**
   (`components/homeRedesign/TodayView.tsx`; HomeScreen picks it with
   `isRedesignOn()`), along with the per-app pages it opens
   (`screens/Home/AppPageScreen.tsx`, route `AppPage`). Both still need an
   on-screen check. Their charts reuse the old dashboard's pieces (`DotTrend`,
   `ServingsHeatmap`, `DayDots`), which are still teal-only. **Progress and
   Settings are built too**:
   - `ProgressRedesignScreen`: friction first, then History (W/M/6M per app,
     from `services/appHistory.ts`), the phase card, and the calendar.
   - Settings: the redesign branch inside `SettingsScreen.tsx`.

   Shared header: `common/LargeTitle`. Today and AppPage still draw their own
   copy of it; switch them over. **The rating sheet is built**
   (`homeRedesign/RateSheet.tsx`; HomeScreen swaps it in for QuickLogSheet
   and both share `rateQuickLog`). It has not been seen on screen, because
   that needs a finished session. **Close out the day is deferred to D3**: its
   content (habit chips, "you showed up for N habits") changes when nightly
   planning moves to app sessions, so redesign it once, together with D3.
   Weekly goals are in Settings now (Apps and weekly goals, 2026-11-01).
3. Phase 3: restyle Meditate, Workouts and Meals onto the shared pieces.
   **Meditate is done** (2026-11-01): every
   screen, to the canvas's "Inside Meditate" boards. `meditateStyle.ts` is
   the redesign's text styles now; the start screen is a large title,
   `SegmentedControl`, `ListGroup` choice rows with a check mark and a
   `Stepper`, with only Begin pinned (the calm question moved into the
   scroll); the pacer is the dark teal room (`MeditateNight` in the theme);
   History and Settings are grouped lists. Still old-style and shared with
   the other apps, so left for their passes: `miniapps/PastSessionSheet` and
   `miniapps/WeeklyGoalPicker`. Founder looked and approved it on screen
   (2026-11-01). **Meals is done too** (2026-11-01, not yet seen on screen), to the
   "Inside Meals" boards. Meals' in-app accent is now its blue
   (`AppColors.meals`), matching its ring, instead of the Fuel amber. The day
   is a large title, a white score card with an In progress / On target /
   Off target badge and dashed-or-filled tags, and plates as grouped-list rows
   (score on the right, "+ Add" when empty); Close out the day is pinned. The
   picker has Cancel / title / Save in its header, pill chips, and a white
   verdict footer with "Didn't eat"; Clear / Delete moved to the bottom of the
   list. The shared `Stepper` gained a `tint` prop. Wording the Maestro Meals
   flows assert was kept ("Averaged 74 · …", "Breakfast: Tap to log",
   "56 · target 70+"), but the flows that tap Save or the chips by position
   haven't been rerun against the new layout. Meditate and Meals went out
   OTA on 2026-11-01 (383972e).
   **Workouts, pass 1 done** (2026-11-01, 063e70d, live OTA; not yet seen on screen): the
   three canvas boards plus everything they share. `workoutsStyle.ts` is the
   redesign's text styles (accent stays teal: white on the orange fails
   contrast); home is a large title ("Start a workout"), the phase card,
   "Your workouts" and the actions as grouped lists; the set screen puts the
   exercise name large on the grey, 44pt set pills, the step-up offer and the
   weight/reps as white panels (`NumberStepper` gained `layout="row"`), the
   plan as a grouped panel; the rest sheet has a grabber and a big light
   countdown; the summary has a check badge, stat tiles, record rows and
   "What you did" as a panel. Maestro flows 11, 12, 14a now wait for "Start a
   workout" (was "YOUR WORKOUTS") and 11 taps "Build a workout" (was "New
   workout"); not rerun. **Pass 2:** the ~25 other Workouts screens and
   modals (history, stats, phases, builder, preview, picker, editors,
   settings, weekly volume, tests) inherit the new `ws` look but still carry
   their own old font styles; move them onto `TextStyles`/`ListGroup`, plus
   `PhaseStatusCard` toward the canvas's featured card. Then
   `miniapps/PastSessionSheet` and `miniapps/WeeklyGoalPicker`.
4. Phase 4: sign-in, and restyling the new four-screen onboarding (built
   2026-11-01) onto the shared pieces. Sign in with Apple needs a native build.
5. ~~Flip it on for everyone~~ (done 2026-11-01). Then delete the classic
   branches (old dashboard, `QuickLogSheet`, `ProgressScreenClassic`,
   Settings' old branch) and the "Classic look" switch.

Decide before Phase 2: dark mode (not designed yet). Separately, Garet (the
primary brand font) has never actually loaded: its files are commented out in
`App.tsx`, so text set in it falls back to the system font. Add the font files
and uncomment them to fix it.

## Next (pre-launch)

**Device checks on a real phone** *(added 2026-09-05)*
Named-day scheduling, schedule-aware streaks, adherence and the archive screen
are live, but only jest, `tsc` and `expo export` have checked them. Two
paths have never been tried:
- *A reminder actually firing.* Day-scheduled habits schedule one weekly
  notification per chosen weekday. `toExpoWeekday` in
  `src/services/habitSchedule.ts` is tested, but nothing proves the OS delivers
  it. Set a reminder 2–3 minutes out on a scheduled day, put the app in the
  background, and confirm the notification arrives.
- *Archive surviving a relaunch.* Archive a curated practice, force-quit, then
  reopen. It must stay off Home. `ensureCuratedPractices` reactivates inactive
  curated instances and is meant to skip ones that carry `archived_at`.

The 2026-10-11 releases were only checked in the simulator. Also look at
Progress, the nightly close and the wording editor on a phone.

**Crash reporting** *(added 2026-09-05)*
Nothing tells you when the app crashes for a user. Sentry
(`@sentry/react-native`) has native code, so it needs an EAS build and a store
release. A JS-only option is an error boundary that logs to a Firestore
collection, which can ship over the air. Whichever you add, update the "no
analytics or advertising SDKs" line in `hosting/privacy.html` and redeploy
hosting.

**Rewrite `docs/go-live-checklist.md`** *(added 2026-09-05)*
It's stale: it still has Challenges and Programs sections and an old baseline.
Rewrite it against the current app.

**Compose needs a store build before it leaves the Lab** *(added 2026-10-18)*
Compose (Admin → Lab) works on the 2.2.0 binary only while the app is open.
That binary has no background audio, so `KEEP_SCREEN_ON_WHILE_PLAYING` in
`src/components/audio/SessionPlayer.tsx` keeps the screen on during playback
as a stopgap. In the next store build:
- Bump `version` in app.json (runtimeVersion is `appVersion`). The build then
  includes UIBackgroundModes audio and `patches/expo-audio+1.1.1.patch`.
- After that, set the flag to false.

Before non-admins get Compose:
- Add Anthropic and ElevenLabs to `hosting/privacy.html` and to the App Store
  privacy details.
- Revisit the model (Haiku) and the monthly allowance
  (`COMPOSE_MONTHLY_MINUTES`, 30 minutes, one number for everyone).

## Later

**Apps-first Today: untested on screen** *(added 2026-10-18)*
See `docs/apps-first-today.md`. Maestro checked the cards, the apps opening and
both "Log a past session" sheets, without saving anything. These steps haven't
been tried on screen: a finished or past session → quick sheet → +XP toast →
the matching habit ticked; the weekly-goal settings; "Add a note"; the
milestone celebration.

**Header logo on Today** *(added 2026-09-05)*
The founder still wants to decide what to do with it
(`src/navigation/HomeStack.tsx`). The title now says "Today".

**Duplicate "Unplugged Cardio" habits** *(added 2026-10-18)*
The founder's simulator account has two. Cause unknown. Ask before archiving
one.

**"Practice" / "rep" wording stored in Firestore** *(added 2026-09-05)*
Push rules (Admin → Rules) and global reward messages may still use the old
words. The code is clean.

**Move more screens to live-editable `<Copy>`** *(added 2026-09-05)*
So far only onboarding, Today, the celebration, the nightly close, Progress
and the ⓘ intros use it. Move other screens only if the founder wants to edit
their wording (~1–2 hrs per screen).

**Expo push security (optional; the founder deferred it)** *(added 2026-09-05)*
Enabling Expo's "Enhanced Security for Push Notifications" takes these steps,
in this order:
1. The founder creates an Expo access token, stored as the
   `EXPO_ACCESS_TOKEN` Firebase secret.
2. Construct `new Expo({ accessToken })`, reading the token via
   `defineSecret`.
3. Add `secrets: [expoAccessToken]` to `onChallengeFailure`,
   `checkMicroCommitmentFollowUps` and `evaluatePushRules`.
4. Deploy functions.
5. Only then flip the setting in the Expo dashboard. If you flip it earlier,
   every push fails.

This is defence in depth only: push tokens stopped being readable by other
users when profiles went owner-only.

---

## Features

New capabilities, not required for launch. The founder adds items here as
they come up in conversation; Claude can add one too when an idea surfaces
mid-task, instead of letting it evaporate. Same format as above: bold title,
date added, a sentence or two of context, link to a design doc if one exists.
No priority ordering implied — flag with a note if something's more wanted
than the rest.

### Avoidance Training: check on screen, then decide on graduating *(added 2026-11-01)*

A to-do list for what you keep putting off, built in the Lab with the
`build-micro-app` skill (`docs/micro-apps/avoidance.md`). Jest and tsc are
clean; nobody has seen it on screen. Next:
1. Try it from Admin → Lab → Avoidance Training: add with a forecast, Did it
   → rating → the dread-vs-reality line, the task editor with the keyboard up,
   the Cleared screen, and bringing over the old list. Ask before `ui-verify`.
2. If it earns a place: add it to `TodayAppId` / `TODAY_APPS`, move the rating
   to `finishSession`, migrate `lab_avoidance_*`, and decide what happens to
   the archived `AvoidanceTraining` screen and its `avoidanceTasks` data.

### Hot & Cold: check on screen, then decide on graduating *(added 2026-11-01)*

Cold plunge + sauna micro-app, built in the Lab with the `build-micro-app`
skill (`docs/micro-apps/hotcold.md`). Jest and tsc are clean, but nobody has
seen it on screen yet. Next:
1. Try it from Admin → Lab → Hot & Cold. Check the log sheet, the timer bell
   with the phone locked, and History edit/delete. Ask before running
   `ui-verify`.
2. If it earns a place: add it to `TodayAppId` / `TODAY_APPS`, move friction
   to `finishSession`, migrate `lab_hotcold_*`, give it a dashboard page.

### Drop generic habits, unify Home *(added 2026-10-24)*

The direction is `docs/no-generic-habits-micro-apps.md`. The work, in
order, is `docs/pivot-checklist.md`:
1. Stop the leaks (the **Now** item above).
2. Founder decisions D1–D7.
3. Apps stop being habits.
4. Rebuild Progress, the nightly close and onboarding.
5. Delete dead code.
6. Docs and tests.

Done so far (2026-10-31): Today is the dashboard, habit reminders are
removed, the Library tab is removed.

### Across mini-apps *(added 2026-10-24)*

Came up while reviewing Meditate/Workouts/Meals feature-by-feature. Both are
bigger, not yet scoped — discuss before building either.

- **Surface streaks more clearly on Progress.** Streaks stay owned by
  Progress, not duplicated inside each mini-app (decided when discussing a
  per-app streak counter for Meditate) — but Progress itself likely needs a
  rework to make them easy to notice, now that it has to represent Meditate,
  Workouts and Meals, not just plain habits. Scope as its own project.
- **A "program" that spans multiple mini-apps** — one day-by-day plan that
  weaves together Meditate + Workouts + Meals sessions (and potentially
  others), rather than each app's own notion of a program (Workouts already
  has phases/retests; see `mini-app-backlog.md`). Needs a different name —
  "Programs" is already an old, archived top-level collection/feature in this
  codebase (see CLAUDE.md's docs section) — and real thinking on how it
  relates to Workouts' phases, who authors a program (founder-curated vs.
  user-built), and the data model. Raised while discussing Meditate's
  multi-day-course idea.

- **Tap to cycle insights** *(founder idea, 2026-10-31)*. Many screens are
  cluttered with numbers that are useful but not always wanted. Instead, a
  small tappable insight chip shows one line at a time, and each tap cycles
  to the next. On Workouts that might be "Volume is up 8%", then the
  standout lift, then the streak. It would declutter the dashboard's pages
  in particular. Open questions:
  - Which insights belong in each app's rotation.
  - Whether the order is fixed or the most notable shows first.
  - Whether the chip remembers where you left it.

### Meditate *(added 2026-10-24)*

- **Favorites.** Star a guided recording or breathing pattern. Low value
  until the guided library grows. "Recents" already exists: the start screen
  opens on the last mode, technique, pattern, length and NSDR link
  (`startDefaults` in `services/meditateMath.ts`).
- **Ambient background sound during unguided sits.** Sit/NSDR/Breathe
  currently stay silent until the end bell. Add an optional ambient layer
  (rain, drone, etc.), reusing Compose's background-sound library.
  **Blocked on the next store build:** Sit and NSDR expect a locked phone,
  and the 2.2.0 binary can't play audio locked (same as Compose, see Next).

Considered and declined: multi-day guided courses as a Meditate-only feature
(see the cross-app program idea above instead), a post-session text note, and
Apple Health sync for mindful minutes (native work; revisit only if a store
build is already happening for another reason).

### Workouts *(added 2026-10-24)*

- **Start flow: check on screen, then OTA** *(added 2026-11-05)*. On main
  (see Done). Not OTA'd, not seen in the simulator. Flows 11, 12 and 14a were updated to the new home
  but not rerun. Old Today's dashboard button (`HomeDashboardView`) still
  opens Workouts' home, unchanged.

- **Warm-up sets.** A per-set toggle; warm-ups log but don't count toward PRs
  or weekly volume. Bigger than it looks: a set's position in the workout is
  counted from logged sets (`services/workoutSession.ts`), so warm-ups also
  have to be skipped by round counting, the "last time" prefill, records,
  volume and step-ups.

- **On the clock: check a circuit on screen** *(added 2026-11-01)*. The
  simulator run covered a single exercise only; "A round every" / "each
  round" wording and a circuit's rest-after-round are Jest-tested only.
- **On the clock: follow-ups** *(added 2026-11-01)*. Left out of the first cut
  on purpose:
  - Buttons on the summary's "tight" line that apply a longer interval or
    fewer reps to the workout (today it's advice only).
  - "Shorten the interval" as a third step-up, after 3 sessions in a row
    with lots of spare time (`trainingPhases.ts` step-ups).
  - Ladders (target reps changing per round). Targets are per item today.
  - Logging a set during the rest counts as 0s of work; it could start the
    round at that moment instead.
  - The session's "That's every set" heading shows even when a set was
    missed (plan row reads 5/6).

Considered and declined: a plate-math/bodyweight calculator, attaching
photo/video to a set for form checks, and sharing a workout or PR as an image.

### Meals *(added 2026-10-24)*

- **Rewrite the Meals Maestro flows for plates** *(added 2026-11-05)*. Meals
  no longer has set-up meals (see Done), and `10a`–`10d`, `14b`, `16a`, `18a`,
  `18c`–`18e` still select slot rows ("Breakfast: Tap to log"), the
  "MY MEALS" settings header, "Didn't eat" and "Add something". Rows are now
  labelled `<name or Meal>: <time> · <groups>`; the add row is "Log a meal".
  `18b` (reorder meals) was deleted with the feature. Chip scoring (see Done)
  also changed the picker: chips are labelled `<group>, scores <n>`, the
  Processed/Semi-processed chips are gone, the picker sections are now
  Protein / Veggies & fruit / Carbs / Fats / Takeout & ready meals, and
  `16a`'s formula numbers,
  strict mode and admin weight steppers no longer exist. Ask before running.
- **Tune the scoring model.** The food-group profiles and goal weights in
  `data/mealGroups.ts` are a first draft, and the on-target line (70) wasn't
  rechecked against them. Two things looked off at approval: Veggies score
  74 under Build muscle (below Balanced's 86), and a protein shake alone is
  62 under Balanced, so no longer on target. Tune in the Meals Scoring Model
  (https://claude.ai/artifact/L42C47AuSGJGUjuDwxR2wW): it saves to its own
  `model/draft` doc, which Claude reads back into `FOOD_GROUPS` profiles,
  `MEAL_GOALS` weights and `PROCESSING_CEILINGS`. (The older per-chip Meals
  Score Tuner artifact is superseded.)
- **Alcohol chip?** Open founder question (2026-11-05): a real part of many
  days, but a values call. Not added.
- **Change a plate's time.** A plate keeps the time it was first logged, so a
  lunch logged at 8pm reads 8pm, and one added to a past day carries today's
  time. A time picker in the meal sheet would fix both.
- **Which part of the day slips.** The Week screen's "Lunch is the one
  slipping" card went with the set-up meals. Grouping plates by time of day
  (morning / midday / evening) could bring it back.
- **Named meal templates.** Save a plate under a name ("my usual lunch").
  Only if the Recent plates row (shipped, see Done) turns out not to be
  enough.
- **Plate photo.** An optional photo per meal, stored privately, shown
  alongside the day in meal history — a visual record, not AI analysis.
- **Hydration tracking inside Meals.** A glass-count or oz tally living in
  the Meals app itself. Open question: how this relates to the existing
  water habits in the library (replace them, or coexist as a separate axis)
  — decide before building.
- **Longer-range trend view, beyond 4 weeks.** Past weeks (shipped, see Done)
  covers the last 4. A month-or-more view would need more history loaded
  and probably a chart rather than a list.

Considered and declined: AI photo recognition of plate contents, and a
lighter "eating out" logging mode.

### Mini-apps

Design and status live in `docs/mini-app-backlog.md`. Open actions:
- **Meals: not built yet.** A library habit of its own, closing out from
  the app-wide nightly close, past weeks, and a habit-detail highlight card.
  When it goes live, remove the old food habits in the same release (the list
  is in the doc).
- **Workouts exercise photos: 9 left to make.** Start/end photo pairs,
  generated with Nano Banana Pro and approved by the founder in batches of 10
  (`content/exercise-art/README.md`). They show as thumbnails in the exercise
  picker (tap for start/end and cues), in each exercise's card in the block
  editor, and on its stats screen. 34 shipped OTA 2026-11-01; 6 skipped as
  text only. Next: `generateExerciseArt.ts --next` once the Pro daily limit
  resets, review, then publish and ship OTA. The drawn-figure Lab prototype
  (Lab → Exercise figures) lost to photos and can be deleted.
- **Cold and Focus mini-apps.** Candidates. Both reuse Meditate's timer and
  bell.

---

## Done (recent)

**Meals: chip scores worked out from food profiles and goal weights** *(2026-11-05, not yet seen on screen, not OTA'd)*
Founder: replace the hand-picked chip scores with a model. Each food group
has a profile, rated 0-3 for the typical food in it: protein, fiber,
vitamins & minerals, healthy fats (add points), refined sugar or flour,
processing, animal food (0-2) (take points away). A goal is a set of
weights; a chip scores 50 + Σ rating × weight − penalties, clamped, then
capped by processing (whole 100, lightly 90, processed 60, ultra 30 — so
ultra-processed food stays ≤ 30 in every goal). Plate = average of chips,
unchanged. Each chip explains itself with a line generated from its profile
(`chipReason`), shown in the guide and on the Scores screen; the guide also
lists the goal's weights. The picker groups by plate portion: Protein ·
Veggies & fruit · Carbs · Fats · Takeout & ready meals — processed food sits
where its macros put it. Whole-food chips are now "processing 0" (same ten
as before). Users still pick a goal and can change any chip's final score;
ratings and weights are ours. Snapshots and old days unchanged. Logic in
`services/mealsMath.ts` (`profileBreakdown`, `goalScores`) and
`data/mealGroups.ts` (tested).

**Workouts: Start starts a workout** *(2026-11-05, on main, not OTA'd, not yet seen on screen)*
Founder, testing: "Start a workout" opened a menu of nine options, none of
which started one. Reviewed as a mockup first and approved as drawn.
- The Workouts page's button names the workout and opens it ("Start Pull
  Day", then the preview), with "Choose another" under it. It says "Resume
  …" for a workout left open, "Start the test" / "Retest now" when a phase
  needs one, and just opens Workouts when there's nothing to suggest.
- The pick (`services/workoutUpNext.ts`, Jest-tested): the phase's next
  workout while training, else saved workouts take turns, oldest first
  (Push → Pull → Legs → Push…), after the one done last.
- Workouts' home is titled "Workouts": a workout in progress, else the phase
  card or an Up next card (last time's numbers, Start), then Other workouts
  with a + to build one, Empty workout, and More.
- More (`WorkoutMoreScreen`) holds Phases, Test an exercise, This week and
  Log a past workout. The "Train in phases" promo card is gone from home.
- `ListGroup` takes an optional header `action` (the +).

**Meals: a score per food group, set by your goal** *(2026-11-05, not yet seen on screen, not OTA'd)*
Founder: replace the formula (whole-food ratio, nutrient bonus, processed and
strict penalties, the shake rule) with a score on every chip; a plate scores
the average of its chips. The processed side is split into named chips —
In between: Dairy, Protein shake / bar, Bread, pasta & tortillas, Sauces &
dressings; Processed: Frozen & ready meals, Processed meat, Chips &
crackers, Fast food & fried, Sweets & desserts, Sugary drinks — so the user
names what they ate instead of judging how processed it was. Old
Semi-processed / Processed chips are retired (still scored on old plates).
A goal sets the scores: Balanced (default), Build muscle, Plant-forward,
named as eating styles rather than health outcomes. Processed chips score
the same in every goal. Chosen in the first-run intro card or Settings;
Settings → Customize scores changes any chip (only changes are saved, as
`score_overrides`, so a retuned goal still reaches the rest). Each day's
rules snapshot now carries the chip scores, so switching goal never rescores
history; days saved before this keep the formula (`scoreByFormula`). Strict
mode and the admin formula steppers are gone. Prefs now save with
`mergeFields`, so a reset score is really removed. No protein bonus for now
(founder, 2026-11-05). Logic in `services/mealsMath.ts` and
`data/mealGroups.ts` (tested).

**Meals: no set-up meals — log a meal whenever you eat** *(2026-11-05, not yet seen on screen, not OTA'd)*
Founder: setting up Breakfast / Lunch / Dinner didn't fit how people eat. Now
the user taps "Log a meal", picks the food groups, optionally names it, and
saves; each plate keeps the time it was logged and the day lists plates in
that order. Snacks and drinks are just plates ("something extra" and "didn't
eat" are gone, and so is Settings → My meals). A day is pending until it's
closed out, or it closes on its own at midnight (founder, 2026-11-05): worked
out from the date, nothing is written, so a day nobody closes gets no rating
or "why". Closing needs no catch-up step. Past days of the week can still
take a forgotten meal. Old days (meals by slot + extras) are read as plates
(`platesOf`/`normalizeDay`, slot name kept, "didn't eat" dropped) and saved
in the new shape the next time they're edited, never migrated in bulk; Today,
Progress and the dashboard read both. Week screen: a Score row and a Meals
count row replace the per-slot rows. Logic in `services/mealsMath.ts`
(tested). Maestro flows still describe the old layout — see Features → Meals.

**App-wide launch review: the small fixes** *(2026-11-02, not yet seen on screen, not deployed or OTA'd)*
Eight reviewers went through the app; everything small was fixed and tested.
What's left is in `docs/launch-review.md`. Highlights beyond sign-in (below):
- Today: new accounts aren't asked about the week before they signed up;
  active users don't get "Welcome back"; Today reloads after midnight; no
  endless spinner; a session crossing midnight counts once; a rating can't be
  saved twice (fixed log id per session); one sheet at a time; intros rewritten.
- Meditate: a guided recording that plays through always reaches Done; bell
  tap opens Meditate and sounds with the app open; NSDR links can't be wiped
  by a failed load; sessions under a minute don't count.
- Workouts: a failed first load can no longer reset records or today's log;
  offline adds don't hang; no duplicate saved workouts; overnight drafts end
  at their last set.
- Meals: a day is rated once; an all-"didn't eat" day is neutral; scoring
  weights admin-only. Hot & Cold and Avoidance (Lab) fixes too.
- Progress: Day Detail reads one day; unrated sessions show on the calendar.
- Backend (needs deploy): retired social collections locked; only admins
  can start Compose; push crons batched with a longer timeout; dead tokens
  cleared; Challenges crons deleted; privacy and delete-account pages updated.

**Sign-in, onboarding and account fixes before launch** *(2026-11-02, not yet seen on screen)*
- New accounts wait on the spinner until their profile is read, and a profile
  doc with no `created_at` (made by a stray merge write) gets its base fields
  and goes through onboarding (`ensureBaseProfile` in `services/auth.ts`,
  `needsOnboarding` in `services/onboardingSetup.ts`). An account with
  `created_at` but no flag predates the flag and is let in.
- Replay intro opens on the saved setup and reminder; skipping a replay saves
  nothing; "No reminder" turns one off (`planOnboardingFinish`). "Not you? Sign
  out" on the first onboarding screen.
- A notification tap that cold-launches the app is held and followed once the
  navigator is ready and onboarding is done. The push token refreshes on launch.
- Cancelling Google sign-in shows nothing; Firebase errors read as plain text
  (`utils/authErrors.ts`). Delete Account waits the function's 300s and cancels
  reminders only once the delete succeeds. Clear Account empties the `lab_*`
  collections and resets the profile to a new account's.
- Rule targets no longer offer Challenges or Programs (now retired), and
  Programs no longer seeds production when opened.

**The rating is called the override, and it answers back** *(2026-11-01, 78a24bf, live OTA)*
The 1–3 after a session felt like paperwork: explained twice up front, then a
bare Easy / Med / Hard that changed nothing. Now:
- after a rating, the toast says one line back (`services/overrideEcho.ts`):
  the app's override falling from its first two weeks to this week once that's
  true (by half a level or more), otherwise what that level means. A rising
  override is never shown there.
- the buttons say what the start felt like: Barely thought about it / Had to
  push / Nearly didn't (`anchor` in `constants/resistance.ts`), not Easy / Med
  / Hard, which read as how hard the session was.
- one name: **friction** is what makes starting hard, your **override** is
  what it took to start anyway. Used on both rating sheets, the toast, app
  pages, dashboard chips, onboarding, the Today and Progress intros, and the
  friction card's legend ("Override it took").
- a permanent ⓘ on both rating sheets (`components/home/OverrideInfoButton.tsx`):
  How it works / Why this works.
Changed lines use new copy ids, so an older admin edit can't hide them.
Not seen on screen yet: needs a finished session (see "Check the new Today").

**Meditate: first guided NSDR, nsdr-15 is live** *(2026-11-01)*
"Deep rest body scan", 15 min, Regina over brown noise. Written script
(`content/meditations/scripts/nsdr-15.md`), rendered, approved by the founder
and published. It's the first guided recording under NSDR in Meditate.

**Meditate: focus-05, focus-15 and focus-20 are live** *(2026-11-01)*
Rendered from the focus-10 recipe (`scripts/extendRecording.ts`), listened to
and approved by the founder, published to Storage + `guidedRecordings`. The
whole focus series (5 / 10 / 15 / 20 min) is now in Meditate.

**Onboarding for the micro-apps (D4)** *(2026-11-01, 7926923 + 85c51ca, live OTA)*
Four screens replace the seven-beat habit flow: why (the friction is the
training) → apps (all three on, switch off any) → weekly goals (prefilled
3 / 3 / 5, Meals counted in days logged, pick a start app) → evening reminder
(a time, or none; picking one asks iOS). Nothing about habits is created. The
founder chose every option in an interview on 2026-11-01. Along with it:
- default goals are now 3 / 3 / 5 (were 5 / 3 / 7), and Meals' ring counts
  days logged against its goal (it was on-target days out of 7);
- switched-off apps (`users.hidden_apps`) leave Today and the weekly review;
- the start app (`users.start_app`) fills Today's plan until its first rating;
- the rating sheet explains itself once (`seen_intros.rating`), only to
  accounts that have never rated;
- older accounts get a one-time goals sheet (`users.app_goals_set`);
- Settings has Apps and weekly goals and Evening reminder; Meals has its own
  weekly goal setting like the other two.
Logic and tests: `services/appSetup.ts`, `services/closeOutReminder.ts`
(daily local notification, re-synced each launch, skipped by the habit
reminder cleanup), `services/onboardingSetup.ts`.

**Workouts: hide exercises you'll never do** *(2026-11-01, 503e23c, live OTA)*
Every exercise shows by default. In the exercise picker, the eye icon on a
row hides it in one tap, with a few seconds to Undo. Hidden ones leave the
picker, its body-part tiles and My exercises, but a search still lists them
last under "Hidden" (tap the eye to bring one back), so one never seems to be
missing and can't be recreated by name. Settings → Hidden exercises lists
them with Show and Show all. History, stats and workouts that already use
one are untouched. Stored as `WorkoutPrefs.hidden_exercise_ids`; no
migration. `visibleExercises` / `hiddenExercises` / `withExerciseHidden` in
`services/exerciseLibrary.ts` (tested). Checked on a phone by the founder.

**Workouts: 200 more exercises from free-exercise-db** *(2026-11-01, not live yet)*
Built-ins go from 59 to 259, hand-picked from
[free-exercise-db](https://github.com/yuhonas/free-exercise-db) across every
body part. Each comes with its start/end photos (bundled, 6.4 MB) and numbered
steps, shown in the picker thumbnail, the preview and the exercise's stats
screen. The 59 core exercises keep their generated art and cues. Your own
exercise wins a name clash with a new built-in (the built-in is hidden). The
list lives in `content/exercise-library/` (see its README). Rebuild with
`npx tsx scripts/importExerciseLibrary.ts`. **Its photos and steps must be
replaced before any OTA ships: see the ⚠ item at the top of Now.** Ids are
permanent once shipped.

**Workouts: This week — volume per exercise, sets added straight from it** *(2026-11-01, not live yet)*
For tracking by the week instead of by the workout (squat at 60 lb, add
reps until Sunday). Workouts home → This week lists every exercise done
since Monday from any workout: weight, reps, sets and volume, against last
week. "+" adds sets (weight × reps × how many sets, so each is a real set
and PRs stay honest); tapping an exercise shows its sets by day, each
editable or deletable — workout sets included, with records rebuilt. An
optional weekly target (reps, or seconds for holds) shows a progress bar
and keeps the exercise listed before it's been done. Added sets are saved
as an ordinary session, one per day (`log_<date>`, `logged_sets: true`), so
stats, history, PRs and the dashboard count them unchanged. The day's first
logged sets ask "rate it now?" once (founder, 2026-11-01), unless a workout
already ran that day; "Keep logging" leaves a "Rate it" card on This week,
and rating is what counts the day toward the weekly goal. Sets can only be
added for today; distance exercises can't be added here. Logic in
`services/weeklyVolume.ts` (tested); screens `WeeklyVolumeScreen`,
`WeeklyVolumeExerciseScreen`. **Not tried on screen yet.**

**Meals: Recent plates removed from the picker** *(2026-11-01, live OTA)*
Founder: with only a handful of chips it was redundant. The picker opens
straight on the chips. `recentPlates` and its `.maestro/13a`–`13d` flows are
gone; the four earlier weeks still load, for Past weeks.

**Meals: your own foods, a Carbs tag, and reordering meals** *(2026-11-01, 932f4ba, live OTA)*
Settings → My foods: name a food the groups don't fit ("Carb supplement"),
give it a score (starts at the on-target line) and tags. On its own a plate
scores what you gave it; with other food it's one share of the plate at that
score — Chicken + Rice (80) + a 60 food = 73 (founder, 2026-11-01: blend by
share). Its tags show but never add points. A new Carbs tag sits on Grains,
Fruit, Legumes and Semi-processed and is information only, so no existing
score moves. Removing a food archives it; days keep the definitions they
were saved with, and a past day learns any food logged on it later
(`mergeCustomGroups`). Ids are `custom_…`; no migration. Meals also move
up/down in Settings (`moveSlot`). Custom foods can't be a food-group goal
yet. Logic in `services/mealsMath.ts` (tested). Checked in the simulator
2026-11-01 (`.maestro/18a`–`18e`; 18b/18e assume Lunch, Dinner, Breakfast).

**Meals: a protein shake on its own counts as an on-target meal** *(2026-11-01, 2ca2f54, live OTA)*
The Supplements chip is now "Protein shake" (shakes, powder, bars). A plate
that's only a shake scores exactly `on_target_threshold`, strict mode or not,
so a shake-for-lunch counts without sinking the day; before, it scored 5 and
could push the day off. Mixed with food it scores as semi-processed, as
before. Still tagged Protein. The id stays `supplements`, so saved days need
no migration. Vitamins deliberately left out (founder, 2026-11-01: keep it
simple). `isShakeOnly` in `services/mealsMath.ts` (tested).

**Workouts: blocks on the clock (EMOM-style intervals)** *(2026-11-01, live OTA)*
A block can run "On the clock" instead of resting after each set: a round
starts every N seconds and whatever's left after the work is rest. A circuit
fits a whole round in one interval (decision 2026-11-01: option B on the
canvas https://claude.ai/artifact/UCsACsCqRKsfwcLoedoZPY). Finish early →
rest till the next start; finish late → the next round starts at once, no
make-up. Start the clock, Pause/Resume, and "Missed this set" (only before
a round's first set; never logged as a set, so records and volume are
untouched). Each round's work time is kept; the summary shows the average
against the interval and flags it past 85%. Per block: the Rest/On the clock
switch in the block editor. One optional field, `WorkoutBlock.intervalSec`;
old workouts are unchanged. Engine in `services/workoutSession.ts` (tested);
the phase "shorter rests" change skips clock blocks. Checked in the simulator
2026-11-01 with a single exercise (throwaway workout, discarded); three rough
edges it found were fixed the same day.

**Today is the dashboard; habit reminders and the Library tab removed** *(2026-10-31, 1063111, live OTA)*
Today shows the rings, then Overview and a page each for Meditate, Workouts
and Meals, instead of the habit list. The rating sheet, XP, celebrations,
the weekly review and rule pop-ups are unchanged. Habit reminders are no
longer scheduled, and any still on a phone are cancelled on launch. The
Library tab is gone. Not tried on screen yet. Open follow-ups are under
"New Today: what hiding habits left behind".

**Meals: 0-100 spectrum scoring, replacing pass/fail** *(2026-10-26, not live yet)*
Each plate scores 0-100 instead of pass/fail: whole-food ratio dominates,
a small bonus per nutrient tag, a flat penalty for Processed on top of the
ratio dilution it already causes, and (strict mode only) a penalty for
Dairy/Semi-processed/Supplements. A day's score is the plain average of its
plates (meals + extras); on/off is kept for streaks and the habit check-in,
now `average >= on_target_threshold` instead of a miss-counting pass goal.
Daily/weekly food-group goals are a progress readout only — they no longer
gate on/off. No early mid-day verdict: a day stays "pending" until every
meal is logged/skipped. All five weights are admin-tunable in Meals →
Settings (the whole app is already admin-only). `scorePlate`/`scoreVerdict`/
`scoreDay` in `services/mealsMath.ts` (tested); `MealsScoringWeights` in
`types/meals.ts`; defaults in `data/mealGroups.ts`. Old saved days/prefs
missing the `scoring` field are backfilled with defaults on read
(`rulesForDay`, `getMealsPrefs`). Not tried on screen yet.

**Workouts: rest alert when the phone is locked** *(2026-10-24, 0886ce1, live OTA)*
A notification ("Rest's up · Up next: …") when rest ends while the app is in
the background. It's scheduled only on going to the background and called off
on return, so there's no banner on top of the in-app countdown. Asks for
notification permission once, at the first rest. Reuses Meditate's bell.
`screens/Lab/experiments/workouts/useRestBell.ts`. Not yet tried on a phone.

**Meals: Recent plates in the picker** *(2026-10-24, 0886ce1, live OTA)*
Up to 4 plates logged in the last 4 weeks, shown above the chips. Plates from
the same meal come first (your usual lunch when you tap Lunch); for
"something additional", past snacks come first, with their names. A tap fills
the chips and you still press Save, so pass or fail shows first.
Removed 2026-11-01 (see above).

**Workouts: best-set trend per exercise** *(2026-10-24, bebf7b8, live OTA)*
On an exercise's stats screen, above Records: one dot per session (last 12)
for the best set: top weight (× reps), most reps, longest hold or fastest
time. Higher is always better, so a run's time is drawn flipped, and a line
reads "Up 10 lb over 6 sessions". `bestSetTrend` / `describeTrend` in
`services/workoutStats.ts` (tested), `TrendChart` in `StatsParts.tsx`.

**Meals: Past weeks** *(2026-10-24, bebf7b8 + 293a0de, live OTA)*
At the bottom of the week view: the 4 weeks before this one, newest first.
Each shows days on target, a dot per day, plates passed and nutrient
coverage. Each day is scored under the rules it was saved with. Not tappable
yet: the day screen only knows this week. `pastWeeks` in
`services/mealsMath.ts` (tested).

**Meditate: calm before and after** *(2026-10-24, not live yet)*
An optional "How calm do you feel?" row (1 tense to 5 calm) above Begin, and
"How calm do you feel now?" on the Done screen. Saved on the session as
`calm_before` / `calm_after`. After 3 sessions answered both times, Done and
History say "You usually finish 1.5 points calmer". History rows show
"Calm 2 → 4". Logic in `services/meditateMath.ts` (tested); the scale is
`meditate/components/CalmScale.tsx`. Past sessions logged after the fact
don't ask.

**Workouts: test an exercise any time** *(2026-10-24, not live yet)*
A "Test an exercise" card on Workouts home (opens a picker), and a "Test
this" link plus a Tests history on each exercise's stats screen. It's tested
the same way as a phase test, and the result is compared with the last test
done the same way. A weighted test only compares at the same weight, and it
starts at the weight you last tested at. One history combines standalone
tests with phase baselines and retests. Stored in
`users/{uid}/lab_workout_tests`. Logic in `services/exerciseTests.ts`
(tested); the screen is `ExerciseTestScreen.tsx`.

**Already built (found 2026-10-24):** supersets/circuits. A Workouts block
holds several exercises, with rest after each round, not between them.
