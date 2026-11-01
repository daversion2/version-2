---
name: build-micro-app
description: Build a new Neuro-Nudge micro-app end to end, in the Lab (admin-only), from a one-line idea. Use when the user gives a micro-app idea ("build a Sleep micro-app", "/build-micro-app Cold plunge", "make a reading tracker app") and wants it specced and built without hand-holding. Covers the spec-sheet thinking (who uses it, what they track and don't, simplest possible flow, fit with friction), every file a micro-app touches, and the verify/commit steps.
---

# Build a micro-app, end to end

The user hands you an idea — often one line. You do three things in order and
don't stop between them unless something below says to:

1. **Spec** — think it through and write the spec sheet.
2. **Build** — follow the spec, in the Lab, wired the same way as Meals.
3. **Verify and ship** — jest, tsc, docs, commit, push.

Read before starting (in this order, skim the rest):
- `docs/no-generic-habits-micro-apps.md` — why micro-apps are the product and
  friction is the spine. The "Built: the main screen" section is what the
  dashboard expects from an app.
- `docs/mini-app-contract.md` — the five handoffs; "What got built" is current.
- `docs/mini-app-backlog.md` — the idea may already have notes here (Cold, Focus…).
- `docs/micro-apps/` — earlier specs written with this skill. Copy their depth.

---

## 1. Spec (write it, then keep going)

Copy `.claude/skills/build-micro-app/spec-template.md` to
`docs/micro-apps/<id>.md` and fill every section. `<id>` is lowercase, one
word, permanent (it becomes `MiniAppId`, the collection prefix and the Lab
flag id — never renamed later).

Think like a product person, not a form-filler. For each section:

- **Who uses it.** One specific person, in one sentence, in this app's
  audience (self-optimisers building habits who already use Meditate /
  Workouts / Meals). Then the moment they open it: where they are, how much
  time they have, what's in their hands.
- **Jobs.** At most three things they want to *do*. If a fourth seems
  necessary, it's v2.
- **Track.** At most three stored facts per session/day, each tied to a
  screen that shows it or a decision it changes. If nothing reads it, don't
  store it.
- **Don't track.** An explicit list, with a reason each. This section is
  where simplicity is won — be generous with it. Typical cuts: free-text
  notes as a required field, calories/precise quantities, photos, social,
  reminders, anything a wearable does better, anything needing setup before
  the first log.
- **Simplest flow.** Write the signature interaction as numbered taps.
  Target: open → logged in **≤ 3 taps**, works with **zero setup** (sane
  defaults, settings optional), **one primary screen** that is both the log
  and today's status. Max 4 screens total for v1 (primary, history/week,
  settings, and one optional guide/session screen).
- **Fit with Neuro-Nudge.** Fill all four:
  - *Friction*: when does the 1–3 "How hard was it to start?" question get
    asked (end of a session? closing the day?). Use `RESISTANCE_LEVELS` from
    `constants/resistance.ts` — never a new scale.
  - *Weekly goal*: what one unit counts (sessions or days on target), and the
    default number.
  - *Streak*: one sentence definition (days in a row / weeks meeting goal),
    following the rules in the dashboard doc (today with nothing never breaks it).
  - *Dashboard metric*: the one number or small visual its Today card would
    lead with once it graduates.
- **Data model, screens, pure logic, out of scope, open questions.**
  Open questions get a **chosen default** each ("Defaulted to X because Y")
  — don't stop to ask. Ask the user only if the idea itself is unclear
  enough that two reasonable readings would produce different apps (e.g.
  "Sleep" = sleep log vs. wind-down timer). Then one `AskUserQuestion` with
  both readings, and continue on the answer.

Commit the spec on its own first (`<Name>: spec sheet`) so the reasoning is
reviewable separately from the code.

---

## 2. Build — every file, in order

Model everything on **Meals** (`screens/Lab/experiments/meals/`,
`services/labMeals.ts`, `services/mealsMath.ts`, `types/meals.ts`). It's the
cleanest small one. Workouts and Meditate are bigger references for live
sessions and timers. Names below use `<id>` = `cold`, `<Name>` = `Cold`.

### Logic and data (do these first — they're the tested layer)

1. **`src/types/<id>.ts`** — the stored shapes (`<Name>Session` / `<Name>Day`,
   `<Name>Prefs`) and `<Name>StackParamList`. Every stored doc that can be
   rated carries `resistance?: 1 | 2 | 3` and `resistance_scale?: 3`.
2. **`src/data/<id>*.ts`** (only if there's static content: presets,
   techniques, copy lists) plus `DEFAULT_<NAME>_PREFS`.
3. **`src/services/<id>Math.ts`** — every rule, total, streak, record and
   "on target" decision as pure functions. Screens call these; screens
   contain no arithmetic beyond formatting.
4. **`src/services/__tests__/<id>Math.test.ts`** — cover each function in
   the spec's "Pure logic" list, including the empty-history case, a today
   with nothing logged, and a day/week boundary. Run `npx jest <id>Math`.
5. **`src/services/lab<Name>.ts`** — Firestore reads/writes only, under
   `users/{uid}/lab_<id>_*` (the wildcard rule covers it; no rules change, no
   global collections). Copy `labMeals.ts`: `col`/`ref` helpers, prefs doc
   `main` merged over defaults, `stripUndefined` from `labWorkouts`, range
   queries on one field only (avoids composite indexes). If you need a
   Firestore function not exported by `services/__mocks__/firestore.ts`,
   add it there.

### Registration (the shell)

6. **`src/services/miniApps.ts`** — add `<id>` to `MiniAppId` and an entry
   in `MINI_APPS` with **`release: 'lab'`**, an Ionicons `icon`, and an
   `accent` taken from `constants/theme.ts` (`CategoryColors` / `AppColors`).
   If no existing colour fits, add one to the theme — never inline hex.
7. **`src/services/__tests__/miniApps.test.ts`** — add `<id>` alongside
   `compose` in "opens a Lab mini-app for admins only".
8. **`src/types/navigation.ts`** — `<Name>App: undefined;` in
   `RootStackParamList`, with a one-line comment.
9. **`src/navigation/RootNavigator.tsx`** — a `Stack.Screen` beside
   `MealsApp`: `getComponent={() => require(...).<Name>App}`,
   `options={{ presentation: 'fullScreenModal', gestureEnabled: false }}`.
10. **`src/screens/Lab/experiments.ts`** — an entry with `id: '<id>'`, a
    one-line `description` in the user's voice, and
    `open: (navigation) => navigation.dispatch(CommonActions.navigate({ name: '<Name>App' }))`.

### Screens — `src/screens/Lab/experiments/<id>/`

11. **`components/<id>Style.ts`** — `<NAME>_ACCENT = MINI_APPS.<id>.accent`,
    shared styles. Everything else from `theme.ts`.
12. **`<Name>Context.tsx`** — loads prefs + the window of data once, exposes
    optimistic saves that roll back and `showAlert` on failure, refreshes
    `today` on `AppState` active, and `closeApp`. Copy `MealsContext.tsx`'s
    shape.
13. **`<Name>App.tsx`** — the `canOpenMiniApp('<id>', userProfile)` gate
    with the "isn't available on this account yet" fallback, then the
    provider and a native stack. Header styling copied from `MealsApp.tsx`.
    Load screens with `getComponent` + `require` if any pull in a native
    module (see `ComposeApp.tsx`).
14. **The screens from the spec.** Reuse `components/common/` before
    building anything: `Button`, `Card`, `BottomSheet`, `ListGroup`/`ListRow`,
    `SegmentedControl`, `Stepper`, `Slider`, `ProgressRing`, `Stopwatch`,
    `MiniBars`, `DifficultySelector`, `InputField` (needs `label`). The
    primary screen's header gets a close (X) on the left and
    history/settings icons on the right, like `MealsDayScreen`.
15. **Friction, in the Lab.** Lab apps are not in `TodayAppId`, so Today
    ignores their `finishSession` handoff — don't call it. Instead ask the
    1–3 question inside the app at the moment the spec chose, using the
    labels from `RESISTANCE_LEVELS`, and store it on the session/day doc. No
    XP, no celebration of its own. (Graduating the app = adding it to
    `TodayAppId`/`TODAY_APPS` and switching to `finishSession`; that's a
    separate, user-approved step — note it in the spec, don't do it.)

### Rules that always apply

- Nothing from `screens/Lab` is imported at the top of a file that loads at
  startup. Only `require()` inside `getComponent` / registry functions.
- No new npm dependency, and nothing native — it must ship over the air. If
  the idea truly needs a native module, stop and tell the user before
  building.
- No writes to global collections, `completionLogs`, or habits.
- Copy: short, plain, second person, sentence case, matching Meals/Meditate.
  Curly apostrophes (`’`) like the surrounding screens.

---

## 3. Verify and ship

```bash
npm test              # fully green
npx tsc --noEmit      # exactly the 3 baseline errors listed in CLAUDE.md
```

Fix anything new; say so if the tsc count changed. Then:

- **Docs:** finish `docs/micro-apps/<id>.md` with a "What got built" section
  (files, collections, deviations from the spec and why). Add a short entry
  to `docs/mini-app-backlog.md` linking to it, and a **Features** item in
  `docs/backlog.md` for the on-screen check and graduation.
- **Commit and push** (`<Name> (Lab): …`). Branch per CLAUDE.md / session
  instructions.
- **On-screen check: ask first.** Offer to run `ui-verify` on the new Lab
  entry; never start it unprompted (CLAUDE.md). Say the app is in Admin →
  Lab → `<Name>`, ships via OTA, and only admin accounts can see it.

Final message to the user, in this order: what got built and where to open
it; the 3–5 product calls you made that they might disagree with (from the
spec's "Don't track" and "Open questions"); what's left for graduation.
