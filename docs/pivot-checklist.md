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
  - *Still to do* (it writes a real check-in):
    - a session leads to the rating sheet, and the rating shows on the
      app's page
    - the celebration
    - Meditate's end bell still rings
    - re-check the fixes above
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
- [ ] **Step 1. `sessionsByDay`:** one session count, used by the dashboard.
- [ ] **Step 2. `rateAppSession`:** the handoff carries the `sessionId`, and
  mirror logs stop.
- [ ] **Step 3. One day streak and the rule counters**, from app sessions.
- [ ] **XP and the day streak** (`willpower.ts`) come from app check-ins, not
  habits.
- [ ] **The weekly review** (`skipLogic`/`skips`) counts the same way the
  dashboard does: sessions, from the apps' own data.
- [ ] **Rule facts.** Replace `active_habit_count` (`useRuleSurfaces.ts`) and
  the Cloud Function's `practices_tried` / `totalHabitsCompleted`
  (`functions/src/rulesEngine.ts`) with app-session facts. **🔒 D5**
- [ ] **Stop writing mirror logs** (`practices.logMirrorCompletion`, called
  from HomeScreen), once nothing reads habit logs. **🔒 D1**
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
