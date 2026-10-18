# Neuro-Nudge — Claude Code Context

## ⚠️ Unfinished work — read before starting anything else

*Added 2026-09-05. **Delete each item once it's done, and this whole section once
all are** — it describes work left mid-flight, not standing policy. If it has
been here a long time, ask the user whether it is still true rather than acting
on it.*

*Updated 2026-10-11 at the end of a long session that shipped (all committed,
pushed, deployed and live): "Friction you can handle" on Progress, unmultiplied
XP, the rebuilt nightly close, Move/Fuel/Sleep categories, "habit" wording
everywhere, live copy editing (Admin → Edit wording on screen), the tidbit
re-audit + Admin → Sync Tidbits, owner-only profile reads, Node 22 functions,
and the privacy policy. Items 2–5 are the remaining pre-launch list; item 2 was
recommended as the next one to do.*

**1. Device checks never done on a real phone.** Named-day
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

The 2026-10-11 releases were also only checked in the simulator (Maestro): worth
a look on a phone at Progress, the nightly close and the wording editor.

If those check out, delete this item.

**2. Fresh-account walkthrough + account deletion — NEXT UP.** Nobody has gone
through a brand-new account since the 2026-10-11 changes (onboarding now renders
through `<Copy>`, new nightly close, Today's plan card, friction card empty
state). Run it in the simulator with a throwaway signup: onboarding → first
check-in → celebration → close out the day → next day's plan on Today. Then
Settings → Delete Account end to end (calls the `deleteAccount` Cloud Function;
both app stores require it to work). **This writes to production — ask before
running, per the Maestro rule below.**

**3. No crash reporting.** Nothing tells you when the app crashes for a user.
Sentry (`@sentry/react-native`) has native code, so it needs an EAS build and a
store release; a JS-only alternative is an error boundary that logs to a
Firestore collection, shippable over the air. If anything is added, update the
"no analytics or advertising SDKs" line in `hosting/privacy.html` and redeploy
hosting.

**4. Small leftovers.**
- The user still wants to decide what to do with the header logo on Today
  (`src/navigation/HomeStack.tsx`). The title now says "Today".
- The Mind / Movement / Meals Today (built 2026-10-18, `docs/three-sections-today.md`)
  was verified by jest + `tsc` + `expo export` only — not yet run on screen.
- Copy stored in Firestore — push rules (Admin → Rules) and global reward
  messages — may still say "practice" or "rep". The code is clean.
- `docs/go-live-checklist.md` is stale: it still has Challenges and Programs
  sections and an old baseline; rewrite it against the current app.
- Only onboarding, Today, the celebration, the nightly close, Progress and the ⓘ
  intros use live-editable `<Copy>`; other screens can be moved over if the user
  wants to edit their wording (~1–2 hrs per screen).

**5. Expo push security (deferred by the user — optional).** Enabling Expo's
"Enhanced Security for Push Notifications" needs: an Expo access token stored as
the `EXPO_ACCESS_TOKEN` Firebase secret (the user creates it), `new Expo({
accessToken })` read via `defineSecret`, `secrets: [expoAccessToken]` on
`onChallengeFailure`, `checkMicroCommitmentFollowUps` and `evaluatePushRules`,
a functions deploy — and only THEN flipping the setting in the Expo dashboard,
or every push fails. Defence in depth only: push tokens stopped being readable
by other users when profiles went owner-only.

**6. Compose needs a store build before it leaves the Lab.** Compose (Admin →
Lab) shipped OTA on 2026-10-18 and works on the 2.2.0 binary only while the
app is open: that binary has no background audio, so for now
`KEEP_SCREEN_ON_WHILE_PLAYING` in
`src/screens/Lab/experiments/compose/components/SessionPlayer.tsx` keeps the
screen on during playback (a stopgap). In the next store build: bump
`version` in app.json (runtimeVersion is `appVersion`), which brings
UIBackgroundModes audio and `patches/expo-audio+1.1.1.patch`; then set that
flag to false. Before non-admins get Compose: add Anthropic and ElevenLabs to
`hosting/privacy.html` (and the App Store privacy details), and revisit the
model (Haiku) and the monthly allowance (`COMPOSE_MONTHLY_MINUTES`, 30 minutes,
one number for everyone).

## Verifying a Change

Run these before saying a change is done. There is **no `lint` or `typecheck` npm
script** — invoke the commands directly.

```bash
npm test              # jest — must be fully green
npx tsc --noEmit      # 3 pre-existing errors are expected (listed below)
```

**Jest is the real gate. It is clean today, so any failure is a regression you
introduced** — fix it rather than adjusting the test to match new behaviour,
unless the behaviour change was the point.

**Known-good `tsc` baseline — do NOT try to fix these, they are pre-existing:**

| File | Error |
|---|---|
| `src/screens/Home/MantraScreen.tsx:312` | array-style `ViewStyle` not assignable |
| `src/screens/Settings/EditProfileScreen.tsx:121` | `InputField` missing required `label` |
| `src/services/firebase.ts:2` | `getReactNativePersistence` not exported |

Any error beyond those three is yours. If the count changes, say so explicitly.

*Was four until 2026-09-18. `HowItWorksScreen.tsx:178` left the list when the
screen was deleted — it described the app as Challenges / Practices / Programs,
which is two archived features and a renamed one. Explanation now lives in the
per-screen ⓘ intros (`data/screenIntros.ts`, `ScreenIntro`, `FeatureInfoModal`).*

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

**Deploy Storage rules:**
```bash
firebase deploy --only storage
```

**Deploy several at once:**
```bash
firebase deploy --only functions,firestore:indexes,firestore:rules
```

Functions deploys first run `npm --prefix functions run sync-core`
(firebase.json predeploy), which copies `src/utils/meditation/` into
`functions/src/meditation-core/` and the voices, backgrounds and chime into
`functions/meditation-assets/`. Edit the originals, never the copies; a jest
test fails if the committed copies drift. `composeSession` needs the
`ANTHROPIC_API_KEY` and `ELEVENLABS_API_KEY` Firebase secrets.

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

**Server-written** (only Cloud Functions write them):
`composeUsage/{uid}` — Compose's monthly minutes allowance (`{ month, minutes }`;
held when a session starts, given back on a decline or failure). The owner
may read it; only the function writes it. It lives outside `users/{uid}` on
purpose: the user's own subcollections are client-writable.

**Storage** (`storage.rules`, deny-all for clients): `users/{uid}/compose/{id}.mp3`,
written by the `composeSession` function and played through the tokened URL
on the owner's `lab_compose` doc. `deleteAccount` clears `users/{uid}/`.

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

## Experiments go in the Lab

Admin → Lab holds experiments only `is_admin` accounts can see. When the user
wants to "try" or "play with" something, build it there, not straight into a
production screen. `src/screens/Lab/experiments.ts` explains how to add one:
- **Switch** — changes an existing screen; branch on `useLab('id')`
  (`src/hooks/useLab.ts`), which is always false for non-admins.
- **Screen** — standalone, opened from the Lab; load it with `require()` inside
  the registry entry so it never runs at app start.
- **Route** — something with its own route, like a full-screen mini-app
  registered in `RootNavigator` with `getComponent`. The entry's `open`
  dispatches to it. **Workouts** works this way. See `docs/mini-app-contract.md`
  ("What got built") for how a mini-app hands a finished session back to Today.

The Lab screens load lazily via `getComponent` in `AdminStack.tsx`. Don't import
from `screens/Lab` at the top of any file that loads at startup. Experiments
write to their own `users/{uid}/lab_*` subcollections, never global collections.
They ship over the air like any other change.

## Docs — what's current vs. historical

**Current, safe to build from:**
- `docs/three-sections-today.md` — Today as Mind / Movement / Meals, the quick
  sheet and press-and-hold, removed Money and food habits, live mini-apps
- `docs/habit-template-unification.md` — the active direction (practices merging
  into habits with tracking templates)
- `docs/habit-library-audit.md`, `docs/challenge-library.md`, `docs/tidbit-audit.md` — content inventories
- `docs/go-live-checklist.md`
- `docs/app-overview-user-facing.md` — the product in the user's own words
- `.maestro/README.md`, `.claude/skills/ui-test/SKILL.md`

**Personal, not in the repo:** `docs/todo.md` is the user's own running notes
and is git-ignored. It may exist on their machine and not in a fresh clone —
don't cite it as a source of truth, don't edit it, and don't act on it unless
they bring it up. (Older entries in `go-live-checklist.md` still quote it.)

**Historical — describes earlier structures, do not treat as current intent:**
- `RESTRUCTURE_PLAN.md`, `APP_OVERVIEW.md`, `TESTING.md` (a hand-run QA
  checklist from an older feature set), `possible_roadmaps/`, `program-drafts/`

When a doc and the code disagree, the code wins — say so rather than
"fixing" the code to match a stale plan.
