# Launch review — what's left for you (2026-11-02)

An app-wide review before launch found the problems below. Everything small
was fixed in the same pass (see the commit). What's here is too big to change
without you: it needs a decision, a store build, a deploy, or a large rework.

Most important first.

## 1. Deploy what this pass changed

These are committed but do nothing until deployed. They're safe to run, but
they're yours to run.

```bash
firebase deploy --only firestore:rules,functions,hosting
```

- **Security rules.** The old social collections (`teams`, `buddyChallenges`,
  `duoStreaks`, `inspirationFeed`, `fistBumps`, `challengeReviews`,
  `reviewVotes`, `challengeSubmissions`, `coachApplications`) were open to any
  signed-in user to read and write. Nothing in the app uses them now, so their
  rules are gone and they fall back to deny. The admin-only Compose feature
  also rejects requests from non-admins at the rules level now. Before this,
  anyone could start its 2 GiB function.
- **Functions.**
  - The hourly push jobs handle users 20 at a time and have a 9-minute limit.
    Before, they would time out at a couple of hundred users, and the same
    users at the end of the list would never get a push.
  - Dead push tokens (app deleted, new phone) are cleared from the account.
  - Account deletion also sweeps `buddyChallenges` and coach `programs`.
  - `expireStaleChallenges` and `onChallengeFailure` (both for the archived
    Challenges feature) are deleted. **The deploy will ask to delete them
    from production: say yes.**
- **Hosting.** The privacy policy and delete-account page described a habits
  app. They now describe Meditate, Workouts and Meals.

## 2. App Store blockers (need a store build)

- **Sign in with Apple.** Google sign-in is offered on iOS with no Sign in
  with Apple. Under App Store guideline 4.8, review can reject any new build
  for this, including the next one, which Compose already needs. It needs
  `expo-apple-authentication`, the Apple developer setup, Firebase's Apple
  provider, and token revocation on account deletion. Alternative: drop
  Google sign-in on iOS.
- **`app.json` cleanup, all baked into the binary:**
  - `"expo-audio"` adds a **microphone** permission the app never uses (and
    Android `RECORD_AUDIO`, a Play-flagged permission). Use
    `["expo-audio", {"microphonePermission": false, "recordAudioAndroid": false}]`.
  - `NSCameraUsageDescription: "This app does not use the camera."` Remove it.
    No included library uses the camera. Reword the photo-library string.
    It's needed for a linked API, but "does not access your photos" is weak.
  - `"name": "neuro-nudge"` becomes the home-screen label. Use "Neuro-Nudge".
  - `updates.fallbackToCacheTimeout: 30000` can hold the splash screen for up
    to 30s on bad Wi-Fi (an App Review risk). Use `0`.
  - The Android notification icon is the full-colour logo, which Android
    shows as a white square. It needs a white-on-transparent icon.
- **Guided audio stops when the phone locks** (no background audio in the
  2.2.0 binary). It's live for everyone now that Meditate has guided
  recordings. A line on the guided screen now says to keep the screen on.
  The real fix is the store build already on the backlog.

## 3. Live content in Firestore (Admin screens)

Changing the code's seed text doesn't change what's already in production.

- **Admin → Rules.** The live push and pop-up copy still talks about habits,
  for example "You've logged your first habit…", "tried {practices_tried}
  habits", "Retake your day-one baseline". The seed text in
  `src/services/rules.ts` was rewritten. Copy it across to the live rules.
- **Turn off the "Micro-commitment follow-up" rule.** It serves a flow new
  users can't reach.
- **Admin → Copy.** If you ever saved an override for the Today intro, it
  still shows the old swipe/tabs wording. The default in code was rewritten.
- **Old social data.** Check whether production still holds docs in `teams`
  or `duoStreaks`. Account deletion can't sweep them (no single owner field).
  If they're empty, nothing to do. If not, delete them.

## 4. Product decisions

- **Nightly close still runs on habits** (pivot checklist D3). New users get
  no win card and no plan chips, and a typed plan never clears from Today.
  The copy was softened, but the flow needs the planned rework.
- **Close-out after midnight files under the wrong day.** Closing out
  Tuesday at 00:30 saves Wednesday's reflection. Pick a rollover hour (3 or
  4 AM is typical) and it's a small change.
- **The weekly "What got in the way?" review counts ratings, not sessions**
  (Phase 3). A ring can show 3/3 while the sheet says "you got 1". A Meals
  user who never taps "Close out the day" gets "0 of 5" every Monday. (New
  accounts no longer get asked about the week before they signed up. That
  part was fixed.)
- **One rating, three names.** "Override" (rating sheet, app pages, toast),
  "friction" (Progress), and "How hard was it to start?" (the question). Pick
  one name for users.
- **Meals:**
  - The best possible plate with default weights scores 85, while the copy
    says "0 to 100". A custom food can be set to 100, beating salmon and veg.
    Rescale or reword.
  - Past days can't be edited (only this week's). On Monday you can't add
    Sunday's dinner.
  - The scoring weights are now admin-only. Users keep the "On target at"
    threshold. Say if you want that hidden too.
- **Guided recordings: scrubbing to the end gets full credit.** Seeking to
  the last seconds of a 20-minute recording logs 20 minutes.
- **Push notifications aren't registered at onboarding.** Allowing
  notifications at the reminder step grants permission but doesn't register
  for server nudges. Those only start from the Settings toggle or the
  opt-in pop-up.
- **The day-28 journey check-in.** Keep it or retire it. It compares against
  day-one answers that new accounts don't have (the copy was softened).

## 5. Bigger engineering work

- **Offline saves.** Firestore uses a memory-only cache. A rating, meal or
  workout saved with no signal can be lost if the app is killed before
  reconnecting. Fix with a persistent cache, or a local outbox for ratings.
- **Scale.**
  - The hourly crons read every user doc (two scan everyone, 48 times a day).
    Store a timezone bucket per user and query by it.
  - Workouts reads up to 5,000 session docs on every open.
  - Progress rebuilds friction baselines from all history.
  - None of this matters at launch. All of it grows with each user's history.
- **The "We miss you" push reads a stale activity date.** Unrated sessions
  don't move `lastActivityDate`, so an active user can get it. The in-app
  "Welcome back" pop-up was fixed. The push needs a server-side "last session
  date" field.
- **Legacy code still loaded at startup.** About 10k lines of habit,
  challenge and program screens are in the bundle but unreachable (Phase 5).
  There are also six dead `common/` components and about 20 dead home and
  progress components. `common/StepFlowShell` imports from
  `screens/Tools/components`, which blocks deleting Tools.
- **39 screens build their own `<Modal>`** instead of `common/BottomSheet`.
- **Today's redesigned strings are hard-coded**, so the admin copy editor
  can't change them.
- **Brand fonts never load** (already on the backlog). Text falls back to
  the system font.
