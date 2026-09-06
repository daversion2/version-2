# Neuro-Nudge — Claude Code Context

## ⚠️ Unfinished work — read before starting anything else

*Added 2026-09-05. **Delete each item once it's done, and this whole section once
all are** — it describes work left mid-flight, not standing policy. If it has
been here a long time, ask the user whether it is still true rather than acting
on it.*

**1. In-app account deletion is written but NOT deployed.** Sitting uncommitted
in the working tree: `firebase.json` (gains a `hosting` block),
`functions/src/index.ts` (an `onCall` account-deletion function), and an
untracked `hosting/` directory (`delete-account.html`, `index.html`,
`favicon.ico`).

None of it is in the JS bundle, so **the OTA published on 2026-09-05 does not
include it** and the delete-account page does not work until:

```bash
git add firebase.json functions hosting
git commit -m "Add in-app account deletion with hosted delete-account page"
firebase deploy --only functions,hosting && git push
```

An OTA will never carry this — it needs the Firebase deploy. Account deletion is
usually App Store compliance work, so check whether it is on a deadline rather
than assuming it can wait.

**2. The 2026-09-05 OTA shipped without ever running on a device.** Named-day
scheduling, schedule-aware streaks, adherence and the archive screen are live to
all users, verified by jest + `tsc` + a clean `expo export` only. Two paths
cannot be proven from the test suite and were never exercised:

- **A reminder actually firing.** Day-scheduled habits now schedule one weekly
  notification per chosen weekday. The JS→Expo weekday conversion is pinned by
  `toExpoWeekday` in `src/services/habitSchedule.ts` and tested, but nothing
  proves the OS delivers. Set a reminder 2–3 minutes out on a scheduled day,
  background the app, and confirm it arrives.
- **Archive surviving a relaunch.** Archive a curated practice, force-quit,
  reopen. It must stay off Home — `ensureCuratedPractices` reactivates inactive
  curated instances and is meant to skip ones carrying `archived_at`.

If both check out, delete this item.

**3. Known and unguarded: the iOS 64-notification cap.** A day-scheduled habit
now consumes one scheduled notification *per day* rather than one total, so ten
Mon/Wed/Fri habits use thirty slots. iOS silently drops anything past 64 — no
error anywhere, reminders just stop. Not a problem at current habit counts; fix
it before it is.

## Verifying a Change

Run these before saying a change is done. There is **no `lint` or `typecheck` npm
script** — invoke the commands directly.

```bash
npm test              # jest — must be fully green
npx tsc --noEmit      # 4 pre-existing errors are expected (listed below)
```

**Jest is the real gate. It is clean today, so any failure is a regression you
introduced** — fix it rather than adjusting the test to match new behaviour,
unless the behaviour change was the point.

**Known-good `tsc` baseline — do NOT try to fix these, they are pre-existing:**

| File | Error |
|---|---|
| `src/screens/Home/MantraScreen.tsx:312` | array-style `ViewStyle` not assignable |
| `src/screens/Settings/HowItWorksScreen.tsx:178` | array-style `ViewStyle` not assignable |
| `src/screens/Settings/EditProfileScreen.tsx:121` | `InputField` missing required `label` |
| `src/services/firebase.ts:2` | `getReactNativePersistence` not exported |

Any error beyond those four is yours. If the count changes, say so explicitly.

### What the tests actually cover

`jest.config.js` sets `roots: ['<rootDir>/src']` and
`testMatch: ['**/__tests__/**/*.test.ts']` — **`.tsx` is excluded by that
pattern**, so components and screens are not unit-tested at all. Coverage is
collected only from `src/services/` and `src/utils/`.

The practical consequence: **put logic in a service or util, not in a screen.**
That is not a style preference here — it is the difference between code that can
be tested and code that cannot.

Firebase is replaced wholesale by hand-written mocks in
`src/services/__mocks__/` (`firestore.ts`, `firebaseApp.ts`, `firebaseAuth.ts`).
If you use a Firestore SDK function that isn't mocked yet, add it there — the
test will fail with an unhelpful "not a function" until you do.

## Checking a Change On Screen (ask first)

**ALWAYS ask the user before running any Maestro flow, the `ui-test` skill, or
the `ui-verify` agent. Never launch one on your own initiative — not even when a
change obviously touches a screen, and not as part of a longer task.** Say what
you'd run and why, then wait for an explicit yes.

Two reasons this needs permission rather than a heads-up:
- The flows drive the **iOS simulator signed in to the user's real account** and
  assert against whatever data that account already holds.
- Only one simulator exists, so a run seizes it and can take minutes.

Once approved:
- The `ui-test` skill covers the environment quirks (iOS accessibility labels
  gain a leading comma; text selectors are full-string regexes; tab-bar taps).
  Read it before writing a selector — each quirk cost several failed runs to find.
- Existing flows live in `.maestro/` (see `.maestro/README.md`).
- A **JS-only change needs no rebuild** — Metro fast-refreshes it into the
  running app, so edit and re-run the flow.

Jest proves the functions are right; this proves the assembled app renders.

## Running the App

This app uses native modules (Google Sign-In, etc.) and **cannot run in Expo Go**.

**To start the simulator:**
```bash
npx expo run:ios
```
This compiles the full native iOS build. Takes a few minutes the first time; faster on subsequent runs.

**If the native build already exists and you just need the bundler:**
```bash
npx expo start --dev-client
```
Then open the app manually from the simulator.

Do NOT use `npx expo start` + press `i` — it will crash with a `TurboModuleRegistry` / `RNGoogleSignin` error because Expo Go doesn't include the native modules.

## Pushing to the Live Production App (OTA Update)

When the user says "push to production", "push to live", "ship this", or similar — this means an **EAS OTA (over-the-air) update**, NOT an App Store submission.

OTA updates push the JS bundle directly to users' devices without going through App Store review. Users get the update automatically on their next app launch. This works for any change that is pure JavaScript/TypeScript (screens, logic, data, styles). It does NOT work for native module changes.

**Command:**
```bash
eas update --branch production --message "description of what changed"
```

This builds and uploads iOS + Android bundles simultaneously. Takes ~30–60 seconds. No confirmation needed — just run it.

**Do NOT use:**
- `eas build` — this creates a full native binary (for App Store submissions only, takes 15–30 min)
- `eas submit` — this submits to the App Store for review

EAS project: `neuro-nudge-v2` (account: `jonnymcfadden1528s-organization`)
Dashboard: https://expo.dev/accounts/jonnymcfadden1528s-organization/projects/neuro-nudge-v2/updates

## Deploying Firebase

**Deploy Cloud Functions:**
```bash
firebase deploy --only functions
```

**Deploy Firestore indexes:**
```bash
firebase deploy --only firestore:indexes
```

**Deploy security rules:**
```bash
firebase deploy --only firestore:rules
```

**Deploy several at once:**
```bash
firebase deploy --only functions,firestore:indexes,firestore:rules
```

Firebase project ID: `version-2-4afa1`

If not authenticated: `firebase login`

## Firestore Data Model

**Per-user data** lives under `users/{uid}/<subcollection>`:
`habits`, `challenges`, `completionLogs`, `reflections`, `skipLogs`,
`skipReviews`, `proofPoints`, `worksheets`, `challengeStats`,
`challengeFailureLogs`, `comebackLogs`, `cravingLogs`, `avoidanceTasks`,
`programEnrollments`, `programBadges`, `rewardMessages`, `ruleState`,
`shownTidbits`, `whyProfile`.

**Global, mostly read-only** top-level collections:
`challengeLibrary`, `neuroscienceTidbits`, `rules`, `programs`,
`rewardMessages`, `funFacts`.

**The rules footgun:** `firestore.rules` wildcards
`users/{userId}/{subcollection}/{docId}`, so a **new user subcollection needs no
rule change**. A **new top-level collection does** — add it to `firestore.rules`
and deploy, or reads succeed locally and fail only in production.

New queries that combine a `where` with an `orderBy` usually need an entry in
`firestore.indexes.json` plus a deploy.

## Seeding Data — write path to production

There is no staging project. **Anything that seeds writes to real production
Firestore.** Never run a seeder without the user explicitly asking.

- Prefer the **in-app admin seeders** (Settings → Admin), which are admin-gated
  and append-only — this is the intended path for tidbits.
- `scripts/*.ts` are standalone equivalents with their own Firebase app. They
  work, but bypass the in-app guards.
- `src/utils/seed*.ts` holds the shared seeding logic; `src/data/*SeedData.ts`
  holds the content.

## Git

Solo repo. **Commit and push straight to `main`** — no feature branches, no PRs,
unless the user asks for one.

## Tech Stack
- React Native 0.81 + Expo SDK 54 (custom dev build, not Expo Go)
- React 19, TypeScript 5.9 (`strict: true`)
- Firebase JS SDK v12 (Firestore, Cloud Functions, Auth)
- Google Sign-In (native module)
- Expo Notifications (push), Reanimated 4, React Navigation 7
- Jest 30 + ts-jest; Maestro for UI flows

## Key Directories
- `src/screens/` — All app screens, grouped by tab (`Home/`, `Progress/`, `Practices/`, `Settings/`, …)
- `src/components/` — Feature-grouped components; **`common/` holds 21 shared
  primitives** (`Button`, `Card`, `InputField`, `Dropdown`, `Slider`,
  `StepFlowShell`, `FeatureInfoModal`, …). Check here before building a new one.
- `src/services/` — Firestore service functions; the tested layer
- `src/utils/` — Pure helpers (dates, haptics, alerts) + seeding logic; also tested
- `src/hooks/`, `src/context/` — `AuthContext`, `ToolsContext`, `useRuleSurfaces`
- `src/navigation/` — `RootNavigator` → `MainTabs` → per-tab stacks
- `src/data/` — Static content: habit templates & library, override tactics,
  metric families, worksheet templates, micro-exercises, mantras, seed data
- `src/types/` — TypeScript interfaces (`index.ts`, `navigation.ts`)
- `src/constants/theme.ts` — Colors, Fonts, FontSizes, Spacing, BorderRadius
- `functions/src/index.ts` — All Cloud Functions (scheduled + triggered)
- `firestore.rules`, `firestore.indexes.json` — Security rules and composite indexes
- `.maestro/` — UI flows (see the ask-first rule above)

## Conventions

- **Always style from `src/constants/theme.ts`.** Hardcoded hex has leaked in
  (`#D32F2F`, `#2E7D32`, …) — don't add more. If a colour is genuinely missing,
  add it to the theme.
- Reuse `src/components/common/` primitives rather than re-implementing them.
  Note `InputField` requires a `label` prop.
- Services take `userId` explicitly and return typed results; screens call
  services, they don't reach into Firestore directly.
- Match the copy voice of surrounding screens — see the docs below.

## Docs — what's current vs. historical

**Current, safe to build from:**
- `docs/habit-template-unification.md` — the active direction (practices merging
  into habits with tracking templates)
- `docs/habit-library-audit.md`, `docs/challenge-library.md`, `docs/tidbit-audit.md` — content inventories
- `docs/go-live-checklist.md`, `docs/todo.md`
- `docs/app-overview-user-facing.md` — the product in the user's own words
- `.maestro/README.md`, `.claude/skills/ui-test/SKILL.md`

**Historical — describes earlier structures, do not treat as current intent:**
- `RESTRUCTURE_PLAN.md`, `APP_OVERVIEW.md`, `TESTING.md` (a hand-run QA
  checklist from an older feature set), `possible_roadmaps/`, `program-drafts/`

When a doc and the code disagree, the code wins — say so rather than
"fixing" the code to match a stale plan.
