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

**Fresh-account walkthrough + account deletion** *(added 2026-09-05)*
Nobody has tried a brand-new account since the 2026-10-11 changes: onboarding
now renders through `<Copy>`, plus the new nightly close, Today's plan card and
the friction card's empty state. Run it in the simulator with a throwaway
signup: onboarding → first check-in → celebration → close out the day → next
day's plan on Today. Then test Settings → Delete Account end to end. It calls
the `deleteAccount` Cloud Function, and both app stores require it to work.
**This writes to production. Ask before running (see the Maestro rule in
CLAUDE.md).**

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

**Home dashboard (Lab): not tried on screen** *(added 2026-10-26)*
Admin → Lab → Home dashboard. Jest covers the numbers
(`services/homeDashboard.ts`) and tsc is clean, but nobody has looked at it
yet. Check these on a real account:
- swiping between pages and tapping the tabs
- the rings shrinking and growing back as you scroll
- the rings drawn with plain Views (no SVG)
- the heatmap and day dots
- each Start button opening its app

Known gap: a session started from here gets its "How hard was it?" question
back on Today, not on the dashboard. Meals' 0-100 score is already on its
page. Next: moving the rating handoff off Today. See
`docs/no-generic-habits-micro-apps.md`, "Built in the Lab".

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

### Drop generic habits, unify Home *(added 2026-10-24)*

See `docs/no-generic-habits-micro-apps.md`. Decided, and the Progress-screen
tracking spec is now nailed down (interview, 2026-10-24, same doc): a combined
cross-app streak + goal-% comparison up top; each card carries its own streak,
a friction number+trend, and one headline metric — Meditate's minutes/last
session, Workouts' total volume + best lift, Meals' new food-group heatmap.
Still not scoped as a build: `services/appCheckins.ts` currently makes every
app's streaks, pace, skip review and "Friction you can handle" work by writing
a mirror log onto a real habit — that foundation disappears with generic
habits, and now has to power a combined cross-app streak too, not just one
per app. Needs its own scoping pass before any of this lands.

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

- **Warm-up sets.** A per-set toggle; warm-ups log but don't count toward PRs
  or weekly volume. Bigger than it looks: a set's position in the workout is
  counted from logged sets (`services/workoutSession.ts`), so warm-ups also
  have to be skipped by round counting, the "last time" prefill, records,
  volume and step-ups.

Considered and declined: a plate-math/bodyweight calculator, attaching
photo/video to a set for form checks, and sharing a workout or PR as an image.

### Meals *(added 2026-10-24)*

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
- **Workouts exercise art.** On hold. The 5-step plan is in the doc.
- **Cold and Focus mini-apps.** Candidates. Both reuse Meditate's timer and
  bell.

---

## Done (recent)

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
`recentPlates` in `services/mealsMath.ts` (tested). Checked in the simulator (`.maestro/13a`–`13d`).

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
