# Pivot checklist: dropping habits

The work left to finish the move to micro-apps plus friction. The direction
is in `docs/no-generic-habits-micro-apps.md`; this is the order to do it in.
Tick an item in the same commit that finishes it. Items marked **🔒 D#**
were waiting on that founder decision; all are now decided (Phase 2).

Already done on 2026-10-31: Today is the dashboard, habit reminders are
removed, the Library tab is removed.

## Phase 1: stop the leaks

Quick, user-visible, and no decisions needed. Do these first: the first
three stop bad data piling up.

- [x] **Today stops creating habits.** Removed the `ensureCuratedPractices`
  and `purgeRemovedHabits` block from Today's `loadData`, and the seeding on
  onboarding's skip. *(2026-10-31)* The habit you pick in onboarding is
  still created until D4.
- [x] **Close the two ways to log a hidden habit.** Removed "Log with
  details" from the habit page, and "Log a habit for this day" from Progress's
  day view. Also removed the `requestDetailedLog` → `HabitCompletionModal`
  path on Today. *(2026-10-31)*
- [x] **Remove Settings → Archived Habits**, and the out-of-date line about
  reminders. *(2026-10-31)*
- [x] **Progress stops double-counting app sessions.** `withoutMirrors` in
  `services/progress.ts` keeps mirror logs out of `getCompletionLogs` (every
  Progress number) and the day view's list. Tested. *(2026-10-31)*
- [x] **Progress stops listing hidden habits.** Took By Metric, Training
  Volume and Personal Records off Progress, along with the
  `getPracticeProgress` fetch. A stopgap until Phase 4 rebuilds Progress.
  *(2026-10-31)*
- [ ] **Check the new Today on screen** with `ui-verify` (ask first).
  - *Checked read-only on 2026-10-31* (Maestro `17a`, `17b`): the tabs, pages,
    swiping and rings collapsing; the Overview cards; the Meals and Workouts
    buttons; Progress without its habit sections; the day view; Settings. Its
    bugs were fixed the same day:
    - the rings drew a half arc at 0%
    - pages ended under the tab bar
    - "Week 2 of 6" showed during the baseline phase
    - "−1 days", and two different "no streak" wordings
  - *Real test session, 2026-10-31* (Maestro `17c`, WRITES: one 1-minute
    Meditate sit, rated Easy):
    - **Worked:**
      - the rating sheet appeared after the session
      - one "Meditate" check-in worth 1 XP, and no mirror entry
      - the friction chip read "Mostly easy (1.0 of 3)"
      - the end-of-sit banner fired
      - the three fixes above held
    - **Fixed the same day:**
      - The session counted twice until a relaunch: a reload landed after the
        rating and the on-screen update added it again.
      - XP showed 269 until a relaunch: an older profile read finished last.
      - The step 3 user-doc sync could, from a stale profile copy, have undone
        the streak a rating had just stamped. It now runs in a transaction.
  - *Still unverified:*
    - the celebration (no milestone was crossed)
    - the toast's text
    - the bell's sound
  - *Second rated session, 2026-10-31:* the count went to 2 of 5 (not 3),
    XP went 270 → 271 without a relaunch, the toast read "+1 XP Meditate ·
    1 min · Easy", and the day view had two Meditate entries and no mirror.
  - `17a`'s `scrollUntilVisible` steps on the Meditate and Meals pages pass
    without scrolling, so they need explicit swipes.

## Phase 2: founder decisions

All decided 2026-10-31.

- [x] **D1. Existing habit data: keep it, hidden.** Habit docs and their old
  check-ins stay in Firestore and are never shown. Nothing to migrate or
  delete, and the choice can be reversed. Mirror logs can stop as soon as
  nothing reads them.
- [x] **D2. Progress: friction first, then the apps.** It leads with
  "friction you can handle" across Meditate, Workouts and Meals, then shows a
  longer history (weeks and months) for each app.
- [x] **D3. Nightly close: plan tomorrow's app session.** Grade the day, then
  plan one app session for tomorrow, e.g. "After coffee, I'll do Workouts".
  The "Today's plan" card shows it until that app is done.
- [x] **D4. Onboarding: the apps plus weekly goals.** Introduce Meditate,
  Workouts and Meals, and set each weekly goal. No habit is created.
- [x] **D5. Rules: rewritten around sessions.**
  - "Habits completed" becomes app sessions completed.
  - "Practices tried" becomes apps tried (0–3).
  - The rules' copy talks about sessions and apps.
- [x] **D6. Admin catalog editor: shrink it to Meditate.** Keep a small editor
  for Meditate's techniques and their steps, and remove the rest.
- [x] **D7. Tidbits and "what helped you start?": both re-keyed by app.**
  Tidbits match Meditate, Workouts or Meals, and the pattern builds up per
  app.

## Phase 3: apps stop being habits

The foundation. Today each app is a pretend habit, `app:<id>`
(`services/appCheckins.ts`), and each session also writes a mirror log onto
a real habit.

- [x] **Design the replacement** for the pretend-habit check-in:
  `docs/app-checkins-design.md`, approved 2026-10-31. Its five build steps
  are below.
- [x] **Step 1. `sessionsByDay`:** one session count, used by the dashboard.
  *(2026-10-31)* Workouts past sessions and unrated sessions now count
  toward the rings, the grid and the streaks. For Meals, any logged day
  counts as showing up (Q2).
- [x] **Step 2. `rateAppSession`:** the handoff carries the `sessionId`, and
  mirror logs stop. *(2026-10-31)* `services/appRatings.ts` (tested).
  Ratings now carry `app_id` and `session_id`.
- [x] **Step 3. One day streak and the rule counters**, from app sessions.
  *(2026-10-31)* Today's XP line shows the dashboard's streak, so it always
  matches the rings. `profileActivityPatch` keeps the user doc's
  `currentStreak` / `lastActivityDate` right for past days, and writes
  `sessions_completed`, `apps_tried` and `apps_active`. Today is left to the
  rating, so the streak-tier celebration still fires. The Cloud Function
  needs a deploy before push rules use the new counters.
- [x] **XP and the day streak** come from the apps. XP was already the
  rating. The streak is step 3.
- [ ] **The weekly review** (`skipLogic`/`skips`) counts the same way the
  dashboard does: sessions, from the apps' own data.
- [x] **Rule facts.** Both evaluators now read the new counters, falling
  back to the old ones until Today writes them. `active_habit_count` is
  `apps_active`. The fact keys are unchanged, so stored rules still work, and
  their Admin labels now say sessions and apps. The rules' copy is Phase 4.
- [x] **Stop writing mirror logs.** Done in step 2 (D1 allowed it). Old ones
  are ignored by `withoutMirrors`. `logMirrorCompletion` goes in step 5.
- [ ] **Move Meditate's technique steps** out of the practice catalog
  (`meditateMath.ts` reads `data/practices`) into Meditate itself.
- [ ] **Rebuild demo data** around app sessions (`utils/seedDemoData.ts`).
  Maestro `09*` depends on it.

## Phase 4: rebuild the screens

- [ ] **Progress**, including "Friction you can handle" across the apps.
  **🔒 D2**
- [ ] **The nightly close** and "Today's plan" (`services/nightlyClose.ts`,
  `NightlyReflectionScreen`). **🔒 D3**
- [ ] **Onboarding** stops creating a habit and stops showing a mock habit row
  (`OnboardingScreen.tsx`, `components/onboarding/`). **🔒 D4**
- [ ] **Rewrite the rules' wording** (`services/rules.ts`, plus copies already
  saved in Firestore). **🔒 D5**
- [ ] **Admin practice catalog editor.** **🔒 D6**
- [ ] **Tidbits and the "what helped you start?" pattern.** **🔒 D7**

## Phase 5: delete what nothing uses

Do this after Phases 3 and 4, so nothing still depends on it. Run
`npx tsc --noEmit` after each batch.

- [ ] **Home-stack screens:** HabitLibrary, TraditionalHabits,
  HabitLibraryDetail, CreateHabit, PracticeSession, Debrief, ArchivedHabits,
  HabitDetail, HabitActionPlan, PracticeDetail. None are reachable since
  Phase 1, which took away the last links from Progress and Settings.
- [ ] **Old Today components:** TodayAppCard, TodayRow, TodayRowPanel,
  TodaySectionCard, TodayHero and ZoneHeader. Move `CHIP_CAPTIONS` out of
  TodayHabitRow first.
- [ ] **Habit and old Progress components:** PracticeBriefingModal, the old
  Progress cards, and the PracticeSession pieces.
- [ ] **Services:**
  - with no importers: `todaySections`, `quickLog`, `homeLayout`,
    `reminderCopy`, `weeklyRadar`, `habitPace`
  - habit-only: `practicePerformance`, `raiseSuggestion`, `habitAdherence`,
    `habitCleanup`, `todayRequests`, `habitReminders`
- [ ] **Static habit data:** library, traditional habits, templates, sections,
  anchors, `habitScience`.
- [ ] **Leftovers on Today:** the `habits` and `habitStreaks` state.
  (`pendingDetailedLog` and `HabitCompletionModal` went in Phase 1.)
- [ ] **Each mini-app's context** loads `getActiveHabits` for nothing, and the
  `habitId` route params are unused.

## Phase 6: docs and tests

- [ ] **Maestro flows:** update `11`, `12`, `13a` and `16a` for the new Today,
  and retire `01`–`08`, the habit flows.
- [ ] **ⓘ intros:** rewrite the Progress and nightly ones, and remove the
  library, habit and archived ones (`data/screenIntros.ts`, plus any saved
  overrides).
- [ ] **Docs:** update `docs/app-overview-user-facing.md`,
  `docs/mini-app-contract.md`, `docs/skip-capture.md`, CLAUDE.md's
  data-model section, and the "current docs" list.
