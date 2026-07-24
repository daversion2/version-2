# Neuro-Nudge — Go-Live Checklist

> Goal: get the app ready to promote to real users (currently only the founder uses it).
> Focus: everything flows smoothly and makes sense. Check items off as they're verified.
>
> **Context note:** The app is mid-transition — Goals were removed, the Tools tab is hidden,
> "Challenges" is now labeled "Training," and there are dead nav routes (Arenas, Inspiration Feed,
> legacy onboarding). Much of the "makes sense" risk lives in that transitional state.

---

## 1. Core loop integrity (highest priority — every user touches this)

- [ ] **First-run cold path**: brand-new account → onboarding → first practice → celebration → Debrief → Home, with zero errors and no empty/broken sections. Test on a truly fresh account, not the founder's.
- [ ] **Home screen makes sense day 1**: rework the shown data (todo notes "2 of 3 practices this week…don't like that"). A new user with no history should see a sensible, non-confusing Home — not empty stat cards.
- [ ] **Empty states everywhere**: Progress tab, Challenges/Training home, past challenges, records — all need intentional "nothing yet" states, since every new user starts empty.
- [ ] **Progressive unlock modals fire once and in order**: Points intro → Challenges unlock (3 practices) → Plan intro. Verify they don't re-fire or stack.
- [ ] **Onboarding copy improved** and reads well end to end (6-step Override onboarding).

## 2. Remove/finish half-transitioned surfaces ("makes sense" concern)

- [ ] **Dead nav routes**: Arenas, Baseline Tests, Inspiration Feed, legacy Onboarding/Worksheet screens exist but aren't reachable — confirm no button, deep link, or reward narrative routes into them (would crash or dead-end).
- [ ] **"Training" tab consistency**: tab is labeled Training but internal copy/overview still says "Challenges." Pick one term; make copy consistent.
- [ ] **Tools tab decision**: hidden behind `TODO(tools-tab)`. Confirm nothing (Proof Points, worksheet resume banners, Your Story) still links into hidden screens.
- [ ] **Goals residue**: Goals system was deleted but overview still mentions "This counts toward [Goal]" banners, goal identity statements in reward narratives, and the day-2 goal prompt. Grep for surviving goal UI/prompts that now reference nothing.
- [ ] **Reconcile the docs**: `app-overview-user-facing.md` is stale — update it or it'll mislead testers/promoters about what actually ships.

## 3. Challenge flows (success + failure)

- [ ] Single-day **Success** path: What You Just Learned → optional reflection → RewardMoment, all clean.
- [ ] Single-day **Not Yet** path: failure reflection → failure modal → reduced XP, all clean.
- [ ] Custom challenge: create → complete → detail loop works end to end.
- [ ] Repeat-milestone badges (5th/10th/25th/50th/100th) award correctly.
- [ ] **Decision**: keep custom challenges, remove custom practices? (open question in todo.md)

## 4. Multi-day challenges

- [ ] Day X of N check-in modal; past days show ✓/✗, today shows Check In, future grayed.
- [ ] Final-day check-in routes to the final reflection correctly.
- [ ] "End Challenge Early" confirmation works.
- [ ] Buddy challenges: only keep/test if a second real account can validate — otherwise consider hiding buddy for launch (single-user product today).

## 5. Programs

- [ ] Comb through in detail (per todo.md). Enroll (Cold Turkey + Gradual Build) → daily check-in → grace days → Completion screen AND Failed screen (run grace days to 0).
- [ ] "Continue the Momentum" → Create N Habits actually creates the habits.
- [ ] **Decision**: todo.md floats "maybe remove programs for now." Cutting scope for launch is legitimate and reduces QA surface.

## 6. Notifications (push + modals)

- [ ] **Backend scheduled functions** fire correctly: `evaluatePushRules`, `checkMicroCommitmentFollowUps`, `expireStaleChallenges`, `onChallengeFailure`. Confirm deployed; verify timezone logic (token + tz saved per user).
- [ ] Push permission prompt + token registration on a **physical device** (simulator can't).
- [ ] Deep links from notifications route to the right tab/screen (not a dead route).
- [ ] **Comeback modal bug**: todo.md flags "Comeback modal keeps firing" — fix the re-fire logic; it's the first thing a returning user sees.
- [ ] Modal triggers don't stack on top of each other on Home.

## 7. Accounts, data & safety (easy to forget, painful at scale)

- [ ] **Firestore security rules** — with real users, rules are the only thing stopping one user reading/writing another's data. Audit before promoting.
- [ ] **Composite indexes** deployed (`firestore.indexes.json`) so prod queries don't fail.
- [ ] Sign-up, Google Sign-In, Sign Out, and **Clear Account** all work.
- [ ] Account deletion actually removes data (App Store requirement).

## 8. Store / distribution readiness

- [ ] Ship via **EAS OTA** for JS changes — confirm the production channel matches what users are on; app version/build current in the store.
- [ ] Privacy policy + support/feedback link reachable (Settings "Send Feedback" — confirm the URL works).
- [ ] Cold/heat exposure **safety cautions** present and clear (liability + user safety).

## 9. Instrumentation (learn from the first users)

- [ ] **Crash/error reporting** (Sentry or similar) — know when something breaks in the wild.
- [ ] Basic analytics on the core funnel: onboarding completion, first practice, challenge completion, retention.

## 10. Known baseline

- [ ] Per project memory: 21 stale Jest failures + 5 tsc errors are pre-existing baseline. Confirm nothing *new* broke before shipping.

---

## Scope decisions to make up front (shrinks what you have to QA)

1. **Cut Programs and/or Buddy challenges for launch** if not core.
2. **Resolve custom-challenges vs. custom-practices** question.

Fewer surfaces = smoother first impression.

## Suggested starting point

Start with **§1 (fresh-account cold path)** — it surfaces most of the other issues at once.
