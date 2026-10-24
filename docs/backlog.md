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

*(Nothing yet. Move shipped items here with the date and commit.)*
