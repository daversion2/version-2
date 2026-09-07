# Archived screens

Screens that have been superseded but are kept for reference. **Nothing in the
app imports them.** They are left in a state where `tsc` still compiles them, so
restoring one is a routing change rather than a repair job.

## `OverrideOnboardingScreen.tsx` — archived 2026-09-06

The onboarding flow used from the "Training Your Override" era through to the
habit/template unification. Six steps: a notification hook, a THEN→NOW slider
introducing the pleasure trap, a 60-second sit, a dark "deliberate discomfort"
reveal, a pick from the six curated practices, and a summary.

**Why it was replaced.** It argues for the previous product. The app is now a
habit tracker built on resistance, with ~45 habits across Body / Focus / Mind /
Money; the archived flow offers only the curated extremes (cold, heat, fasting,
meditation, boredom), never mentions the resistance rating the user is asked at
every check-in, and never sets an amount, a schedule, an anchor or a reminder —
the four fields that make a habit a commitment.

It also left `journey_checkins.baseline` unwritten despite
`services/checkins.ts` documenting onboarding as the thing that captures it, so
the day-14 and day-28 retakes had no "before" to compare against.

**To restore it,** point the `Onboarding` route in
`src/navigation/RootNavigator.tsx` back at this file. Note that the replacement
also narrowed `ensureCuratedPractices` (see `services/practices.ts`) so that a
user who picked a starting habit gets only that habit seeded — restoring this
screen without revisiting that would land a new account on a near-empty Today.

**Worth keeping from it:** the writing. The pleasure-trap copy on the `origin`
and `sit` steps is the best long-form material in the app and belongs on the
science pages of the Mind and Focus habits, or behind a "Why this app exists"
entry in Settings.

## `DeferredOnboardingScreen.tsx` — archived 2026-09-06

The "finish setting up later" flow: a full-screen modal that replayed the parts
of onboarding a user had skipped, resuming from
`User.deferred_onboarding_progress`.

**Why it was archived.** It was registered in `HomeStack` as
`DeferredOnboarding` and **reachable from nowhere** — no screen navigated to it,
no rule CTA targeted it, no banner opened it. Whatever used to open it was
removed before this sweep. It is also superseded by `OnboardingScreen`, which
is short enough that deferring it is no longer a problem worth solving.

### Supporting code

Still referenced by this file, so it stays until this file goes:

- `saveDeferredOnboardingProgress` and `completeFullOnboarding` in
  `services/users.ts`

Already dead *before* this sweep — **nothing calls them, including this
screen**, so they can be deleted independently:

- `clearDeferredOnboardingProgress` and `dismissOnboardingBanner`
  (`services/users.ts`)
- the `deferred` parameter on `markOnboardingComplete` — the live
  `OnboardingScreen` never passes it, and only the archived
  `OverrideOnboardingScreen` ever did
- `User.onboarding_deferred` and `User.onboarding_banner_dismissed`

**To restore it:** re-add the `<Stack.Screen name="DeferredOnboarding">` entry
to `src/navigation/HomeStack.tsx` — its `HomeStackParamList` entry was kept,
since this file types itself with `HomeScreenProps<'DeferredOnboarding'>` — and
add something that actually navigates to it.
