# Apps first on Today

*Decided 2026-10-18 in a founder interview, the evening after the three-section
Today shipped (`docs/three-sections-today.md`). When this doc and the code
disagree, the code wins.*

## The decision

The mini-apps are the main thing; habits support underneath. Before this, an
app only appeared on Today — and only earned anything — through a habit linked
to it. Now:

- **Meditate, Workouts and Meals are always on Today**, one at the head of each
  section (Mind, Movement, Meals), as a larger card: the weekly goal ("1 of 3
  this week"), what you did last time, and Start / Open. The whole card opens
  the app's own home screen. All three sections therefore always show; one
  with no habits under its app offers a quiet "Add a habit".
- **A finished session is a check-in of its own.** Today asks "How hard was it
  to start?" and it earns 1–3 XP, like any habit. Every session counts (two
  workouts = two); Meals is one per day, its on-target day close.
- **Each app has a weekly goal**, set in the app: Workouts 3×, Meditate 5× by
  default (Meals counts days on target, 7). A week that falls short joins the
  weekly "What got in the way?" review.
- **Habits never open apps.** Every habit row taps to the quick sheet.
- **Existing Workout / Meditation habits stay.** A session ticks its direct
  library match — Workouts → Workout, Meditate → Meditation, or Breathwork /
  NSDR for those modes — with one rating and one XP award. Custom habits are
  never ticked; there is no linking.
- **Credit only comes through the app.** Workouts and Meditate gained "Log a
  past session" (day within the last week, minutes, and Meditate's mode).
- The Meals library habit added that morning was removed (copies deleted, XP
  kept), like Money.

## How it's built

- `services/appCheckins.ts` — each app is a synthetic habit `app:<id>` whose
  target is the weekly goal. Its check-ins are ordinary nudge logs filed under
  that id, so pace (`habitPace.ts`), the skip review (`skipLogic.ts`), the day
  streak and "Friction you can handle" (`frictionCapacity.ts`) count them with
  no changes of their own.
- The matching habit gets a **mirror log** (`practices.logMirrorCompletion`):
  `difficulty: 0`, no rating, no points, `mirror_of` the app's log. It ticks the
  habit for its week and streak while the effort is counted once.
- The apps hand a finished session back with `finishSession({ appId,
  durationSec, date?, mode? })`; Today opens the quick sheet (duration filled
  in) and files it. The apps' "Check off a habit" choosers and settings links
  are gone; their settings hold the weekly goal (`WeeklyGoalPicker`).
- A Meditate past session is also saved to Meditate's history
  (`meditateMath.pastSession`). A Workouts past session is a check-in only —
  it has no sets to put in Workouts' history.
