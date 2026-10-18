# Three sections on Today — build plan

*Written 2026-10-18 from the founder interview. Mockup: the "Today · simplified"
board on https://claude.ai/artifact/GtfsKd2yQXzvuWWsATP2rW. When this doc and the
code disagree, the code wins.*

## What changes for the user

**Today** splits into three fixed sections — **Mind, Movement, Meals** — shown
only when they hold something. Inside a section:

| Row | Looks like | Tap | Press and hold |
|---|---|---|---|
| Habit linked to a mini-app (Workout → Workouts, Meditation → Meditate, Meals → Meals) | coloured app tile | opens the **app's own home screen**; finishing a session there is the check-in | full capture |
| Any other habit (Cold exposure and Unplugged Cardio included) | circle | **quick sheet**: tracked amounts filled in from last time, then 1 / 2 / 3 logs it | full capture |

Every row has a **›** on the right: the habit's page (history, schedule, plan,
and "About this habit" — the briefing and science, which used to open on a
tap for guided habits; the founder found that slowed logging, 2026-10-18).
The full capture is the existing "Log it" screen (day picker, notes, every
field), opened with amounts from last time. *Changed 2026-10-18 after the first
build, at the founder's request: hold was the habit page, now it's the capture.*

Order inside a section: app rows, then due today, then behind this week. Habits
not due today fold into "N more this week"; habits done today fold into "N done".

- After a log: a **"+N XP" toast**. The full celebration (with its tidbit) only
  for milestones: a streak tier crossed, or the very first check-in (points
  intro). After a Med or Hard rating the toast carries **"Add a note"**, which
  opens the existing reflection sheet.
- Header: small **XP · streak** line; the ⓘ explains sections and tap vs. hold.
  Header title "Home" becomes "Today". Today's plan keeps its current card.
- The rating question stays "How hard was it to start?" everywhere.
- The **habit page** also has a "Log with details" button: it returns to Today
  and opens the same full capture, so Today stays the one place a check-in is
  completed.

**Categories, app-wide:** the user-facing taxonomy is the three sections.
Stored `category_id`s stay as they are (Move, Fuel, Sleep, Mind, Focus) and are
grouped for display — Sleep and Focus show under Mind (as sub-labels in the
Library). **Money is removed.** Library chips, Create habit and onboarding pick
by section.

**Mini-apps go live for everyone:** Workouts, Meditate and Meals
(`release: 'live'`). Compose stays admin-only. The "Start on Today" Lab switches
are retired. A new library habit **Meals** links to the Meals app automatically.

**Removed habits — deleted, XP kept:** every Money habit, plus the food habits
Meals replaces (Eat your vegetables, Hit my protein, Cut the sugar, Eat Healthy
Food I Don't Enjoy, Cook one real meal). They leave the catalog (forced
inactive even if a Firestore catalog doc says otherwise), and on next open each
user's copies are deleted with their check-ins. XP lives on the user doc
(`totalWillpowerPoints`), so it is untouched. No users yet, so no migration
care is needed beyond that.

## How it's built

Logic goes in tested services; screens stay thin.

1. `src/data/habitSections.ts` — the three sections, which categories each
   holds, colour/icon; `sectionForCategory`, `sectionOfHabit`.
2. `src/data/removedHabits.ts` — the removed ids and categories;
   `isRemovedDefinition`, applied to the bundled catalog and the Firestore merge
   (`services/practiceCatalog.ts`).
3. `src/services/habitCleanup.ts` — `selectHabitsToPurge` (pure) and
   `purgeRemovedHabits` (deletes habit docs + their completion logs, cancels
   reminders). Run once per session from Today.
4. `src/services/todaySections.ts` — builds the three sections' rows from the
   existing pace list (`habitPace.ts`), row kinds, counts.
5. `src/services/lastMetrics.ts` — the amounts a quick log pre-fills: last
   logged value → the user's commitment → the field default; and the quick-log
   input it produces (`metrics_assumed` when left unchanged).
6. `src/services/todayRequests.ts` — in-memory handoff from the habit page back
   to Today ("open the detailed capture for this habit"), same pattern as the
   mini-app finish handoff.
7. `src/services/streakDisplay.ts` — the streak to show (expires if no activity since
   yesterday).
8. UI: `TodaySectionCard`, `TodayRow` (tap / long press with haptic / ›),
   `QuickLogSheet`, `LogToast` in `src/components/home/`; HomeScreen rewired;
   habit page button; Library / Create habit / onboarding switched to sections;
   `MINI_APPS` releases; the Meals library habit; the ⓘ copy.

## Verification

`npm test` green, `npx tsc --noEmit` at the 3-error baseline, a clean
`npx expo export`. On screen: simulator only (Maestro), and only after asking.
Not shipped OTA until the founder says so.
