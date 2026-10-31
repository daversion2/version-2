# App check-ins without habits: design

*2026-10-31. Phase 3 of `docs/pivot-checklist.md`. Q1–Q3 decided the same
day; nothing is built yet.*

## The problem

A rated app session still poses as a habit:
- Each app is a synthetic `PracticeInstance` with the id `app:<id>`
  (`services/appCheckins.ts`), so habit-shaped code accepts it: the quick
  sheet, `completePractice` and the weekly review.
- Each session also writes a **mirror log** onto a matching real habit. That
  habit is now hidden, so the mirror is pure leftover.
- **Three places count "a session" three different ways:**
  - The dashboard counts session docs in `lab_*` over a rolling 7 days.
  - The weekly review counts days with an `app:*` log in a Monday week.
  - The day streak counts days with *any* completion log, Craving Crusher
    included.

  So a session whose rating sheet was cancelled shows on the dashboard but
  counts as missed in the review. A Workouts session logged after the fact
  has a rating but no session doc.

## What already works and stays

- **Ratings live in `users/{uid}/completionLogs`.** Each is one log:
  `type: 'nudge'`, `reference_id: 'app:<id>'`, plus `resistance` /
  `resistance_scale`. All existing app ratings are already stored this way, so
  nothing needs migrating. XP, account deletion and the push rules all read
  this collection or the counters on the user doc.
- **XP is the rating** (1–3), never multiplied.
- **The rating is asked on Today** after a session, using the same quick
  sheet, celebration and reflection.

## The proposal

### 1. A rating is an app rating, not a habit completion

A new `services/appRatings.ts` with
`rateAppSession(userId, { appId, date?, resistance, metrics?, sessionId? })`:
- It writes the same log as today (same type and `reference_id`), plus
  `app_id`.
- `session_id` links the rating to the session doc, when there is one.
  Meditate and Workouts pass it through the finish handoff. A Workouts past
  session and a Meals day close have none.
- It awards XP and updates the counters in section 4.
- It writes **no mirror log**.

Today's quick sheet calls it instead of `completePractice`. These go, once
nothing else uses them:
- `appCheckinHabit`
- `habitTickedBy`, `habitMatchesApp` and `TICKED_PRACTICE_IDS`
- `logMirrorCompletion`
- the habit branch of `trackingFor`

### 2. One way to count sessions

A single pure function, `sessionsByDay(appId, sessionDocs, ratings)`. On
each day it counts the larger of:
- that app's session docs, and
- its ratings.

This covers every case without a migration:
- **A rated session:** one doc and one rating, so 1.
- **A session whose rating was cancelled:** one doc and no rating, so 1. It
  still counts.
- **A Workouts past session:** no doc and one rating, so 1. It still counts.
- **Old ratings with no `session_id`:** they pair up with their docs by day,
  so they're never counted twice.

The dashboard, the rings, the weekly review and every streak all use this,
so they can't disagree any more. Meals counts days, not sessions; see
decision Q2.

### 3. One day streak

**A day counts toward the streak** if any app had a session on it, per
section 2 (Meals per Q2).

**What stays on the user doc:** `currentStreak` and `lastActivityDate` stay,
because the Cloud Function's push rules read them. They're recomputed from
the rule above:
- every time Today loads, from data the dashboard already has
- after each rating

A field is written only when its value changes.

**Two things this changes:**
- Unrated sessions now keep the streak alive.
- Craving Crusher stops counting toward it (Q3).

The dashboard's combined streak and the "N-day streak" on the XP line then
always match.

### 4. Counters for the rules (D5)

**Fact keys stay the same.** Rules saved in Firestore refer to them by name,
so renaming them would break every stored rule. What changes is what each
fact is computed from, and its label in Admin:

| Fact | Used to mean | Now means | Stored as |
|---|---|---|---|
| `total_habits_completed` | habit completions | app sessions completed, ever | `sessions_completed` |
| `practices_tried` | distinct habits ever logged | distinct apps used, 0–3 | `apps_tried` |
| `active_habit_count` | active habit docs | apps used in the last 28 days, 0–3 | worked out on the client, not stored |

- `sessions_completed` and `apps_tried` are new user-doc fields, recomputed
  the same way as the streak.
- The Cloud Function (`functions/src/rulesEngine.ts`) reads the new fields,
  and falls back to the old ones while they're missing.
- The old fields stay in place, hidden (D1).

### 5. The weekly review

It still reviews *last* Monday–Sunday week, but per app, from section 2:
- Meditate and Workouts: sessions against the weekly goal.
- Meals: days on target, against 7.

It no longer reads habit docs, and "a cancelled rating counts as missed" goes
away.

### 6. What doesn't change

- Friction, the tidbits and the "what helped you start?" pattern already
  work off `app:<id>` logs. Re-keying them is Phase 4 (D7).
- Old habit logs and mirror logs are already ignored on Progress
  (`withoutMirrors`).

## Order of work (each step ships on its own)

1. **`sessionsByDay`** plus tests. Switch the dashboard to it, so Workouts
   past sessions count there.
2. **`rateAppSession`.** The finish handoff carries `sessionId`, Today calls
   it, and mirror logs stop.
3. **One day streak and the counters.** Recompute them on Today load and
   after a rating. The Cloud Function falls back to the old fields.
4. **The weekly review** on `sessionsByDay`.
5. **Delete the pretend-habit code** listed in section 1.

## Decisions (founder, 2026-10-31)

- **Q1. An unrated session still counts** toward streaks, weekly goals and
  the rings. It earns no XP and adds no friction data.
- **Q2. For Meals, any meal logged counts as showing up**, a 43-score day
  included. This applies to streaks and the week grid. The Meals ring stays
  "days on target out of 7".
- **Q3. Craving Crusher doesn't count** toward the day streak.
