# Handoff: brand and copy changes (2026-11-28)

*Written at the end of a cloud session (2026-11-27 → 28) so a session running
on the founder's Mac can take over. Everything here was decided by the founder
in the "Neuro-Nudge copy review" doc
(https://claude.ai/artifact/PhjVQxPcyX1Bj4gbPYSN93). If this file and that doc
disagree, the doc wins; ask the founder.*

## What was done

1. **Market research** → `reports/Neuro Nudge go to market messaging.md`
   (notes in `research_notes/Neuro Nudge go to market messaging/`). Key
   findings: no competitor weights sessions by how hard they were to start;
   "override" is unclaimed; several landing-page science claims overreach.
2. **Brand and voice** → `docs/brand.md` (synced copy) and the founder's live
   "Neuro-Nudge brand" doc (https://claude.ai/artifact/Hs9u8ixNd3tjcfU6vBFfp7).
   Tagline "Do hard shit (most of the time)."; the enemy is **the pull** (of
   comfort); the move is **override**; voice is calm, self-aware, funny, never
   alpha, never preachy; **wins get no applause**. Read it before writing copy.
3. **Copy review** → the doc above: every user-facing line checked against the
   brand; the founder marked each row. The final list is below.
4. Backlog: founder to switch off four notification rules (top of
   `docs/backlog.md` → Now); "bring app copy in line with the brand" (Later).

Nothing in the app has been changed yet. All work so far is on branch
`claude/exciting-euler-ibwaug`; merge it into `main` first.

## Changes to make in code

Line numbers are from 2026-11-28 and may have drifted; search for the current
text. **"Live" = a `<Copy>`/`useCopy` default or ⓘ intro key**: change the
code default, and the founder checks Admin → All wording in case a live
override already exists. Everything else ships only with an OTA.

### Science and claims

| File | Current | Change to |
|---|---|---|
| `src/data/screenIntros.ts:71` (live `intro.progress.point1`) | "…The dots are the override it actually took. The gap between them is how much stronger you've got." | "…The dots are the override it actually took. The gap shows how your hard things feel to you now, against how they felt at first." |
| `src/components/home/OverrideInfoButton.tsx:74-75` (live `override.effort.science2`) | "**Staying with it is the exercise** …a region studies link to tenacity and willpower. The hard starts, and the hard last minutes, are where it's working hardest." | "**Staying with it** Doing something you'd rather avoid engages the anterior mid-cingulate cortex, a region research links to persistence." |
| `src/components/onboarding/OnboardingSetupBeats.tsx:102` (live `onboarding.science.effort.stay`) | "**Staying with it:** keeping going works a brain region linked to tenacity, and with practice, effort itself feels less unpleasant." | "**Staying with it:** research links a brain region to persistence, and rewarding effort builds tenacity." (founder's wording; keep it) |

### Onboarding (all live)

| File | Current | Change to |
|---|---|---|
| `OnboardingSetupBeats.tsx:47-54` (`onboarding.science.source.headline` / `.body`) | "That 'I don't want to' has **a source.**" / "Before anything hard, your brain predicts what it will cost. The resistance you feel is that prediction." | "That 'I don't want to' is **the pull of comfort.**" / "Before anything hard, your brain predicts what it will cost, and you feel it as a pull toward the easy option. Your phone, feed and couch are built to make giving in automatic." Keep "That's your override." |
| `src/services/onboardingSetup.ts:70` (`onboarding.cta.twice`) | "Why it gets easier →" | "What it builds →" |
| `OnboardingSetupBeats.tsx:99` (`onboarding.science.effort.start`) | "**Getting started:** each time you begin when you'd rather not, you practise the override itself." | "**Getting started:** each time you begin when you'd rather not, that's an override." |
| `OnboardingSetupBeats.tsx:105` (`onboarding.science.effort.helper`) | "The region is the anterior mid-cingulate cortex, most active when you do what you'd rather not. …Both count, and the hard ones count most." | "The region is the anterior mid-cingulate cortex (aMCC). Some days will feel easy and some won't. Both count, and the hard ones count more." |
| `OnboardingSetupBeats.tsx:211` (`onboarding.goals.body`) | "Pick numbers you can hit this week, even a slow one. Raise them once they feel easy." | "Pick numbers you can hit on a slow week. Most of the time is the goal, not every time." |

### Today

| File | Current | Change to |
|---|---|---|
| `src/constants/willpower.ts:6-10` (streak tiers, shown by the celebration) | Starting / Building Momentum / On Fire / Unstoppable / Legendary | Starting / Rolling / Steady / Stubborn / Capable |
| `src/services/overrideEcho.ts:40-41` (toast after a start rated 3) | "That took everything, and you started anyway. Starts like this train your override most." / "A hard start, done. These are the ones doing the training." | "Nice work! Now refrain from posting about it on Instagram." |
| `src/services/overrideEcho.ts:33` (toast after a start rated 1) | "An easy start. Showing up is the training, every time." | "Woah… look at you making it look easy!" |
| `src/components/home/ComebackModal.tsx:192-193, 232` (comeback step 3) | "Commit to one thing today" / "Even if it's not perfect." / button "Let's Do This" | "Pick one for today" / "Small counts." / button "I'm in" |
| `src/components/habits/HabitCelebrationModal.tsx:349` (live `celebration.tidbitLabel`) | "Your brain right now" | "From the research" |
| `src/data/screenIntros.ts:57-58` (live `intro.today.science1`) | "**Your override is the measurement** …so the number falls while the session itself stays exactly as demanding. Watching that fall over weeks is the point of tracking it at all." | "**Your override is the record** Your brain predicts what a thing will cost, and you feel it as resistance. Each rating records what a session cost you. Over months, you see how hard your hard things feel to you." |
| `OverrideInfoButton.tsx:70-71` (live `override.effort.science1`) | "**Starting is a skill you practise** Each time you begin when you'd rather not, you practise acting against the prediction…" | "**Starting can become automatic** Each time you begin when you'd rather not, you act against the prediction…" (rest unchanged) |
| `src/components/homeRedesign/AppsCard.tsx:217` | "Everything's done today" | "Everything's done today. Noted." |

### Progress

| File | Current | Change to |
|---|---|---|
| `src/components/progress/FrictionCard.tsx:37,54` and `screenIntros.ts:70` (live `progress.friction.label`, `intro.progress.point1`) | "Friction you can handle" | "Friction you've taken on" |
| `FrictionCard.tsx:40` (live `progress.friction.empty`) | "Log a few sessions and this will show how much friction you're handling, and how much easier it's getting." | "Log a few sessions and this will show how much friction you're taking on." |

### Micro-apps

| File | Current | Change to |
|---|---|---|
| `src/screens/Lab/experiments/avoidance/AvoidanceHomeScreen.tsx:149` | "Today's rep" | "Up today" |
| `AvoidanceHomeScreen.tsx:99` | "Cleared. That's a rep." | "Cleared. Noted." |
| `AvoidanceHomeScreen.tsx:175-176` | "…Each day, face one. Most turn out easier than you feared, and the list proves it." | "…Each day, face one, then check your prediction against how it actually went." |
| `src/data/screenIntros.ts:114` (Close out the day intro) | The whole ⓘ intro for Close out the day | **Remove it** (the screen no longer has an intro). |
| `src/screens/Lab/experiments/workouts/WorkoutSummaryScreen.tsx:339`, `WorkoutDoneItScreen.tsx:268` | "…how hard you pushed…" | "…how hard it was to keep going…" |
| `src/screens/Lab/experiments/meditate/MeditateDoneScreen.tsx:116` (ended early) | "Of {n} planned. Showing up is what counts." | "Better than nothing!" (on its own) |

### Notifications and rules

Rules have two copies: the seed in `src/services/rules.ts` (used only for a
fresh environment) and the live rule in Firestore, edited in Admin → Rules.
Change the seed here; the founder changes the live rule.

| Where | Current | Change to |
|---|---|---|
| `rules.ts:189-190` seed + `ComebackModal.tsx:37-38` fallback ("Comeback check-in", pop-up) | "Welcome Back" / "You've been away for a couple days. That's okay — life happens. Let's figure out what's next." | Body: "The pull of comfort gets everyone now and then. A couple of days off doesn't undo anything. Back at it?" Title: see open questions. |
| `rules.ts:218` seed ("Push opt-in ask", pop-up) | "You've finished your first session. A nudge when it matters makes the next one easier to start — and we'll keep it to three a week, at most." | "First session done. Want to turn on reminders for the future?" Keep the separate "at most three a week" line in `PushOptInModal.tsx:94`. |
| `rules.ts:236-237` seed ("Comeback nudge", parked push) | "We miss you" / "It's been a couple of days. One small win today gets you moving again." | "Been a few days." / "No lecture. One short session and you're back." |
| `rules.ts` seeds: "Journey day 0: first check-in tonight", "Journey day 7: week one recap", "Journey day 28: the science said 2–4 weeks", "Challenge failed encouragement" | — | **Remove these four seeds.** The founder switches the live rules off (backlog). |
| `src/screens/Lab/experiments/hotcold/HotColdContext.tsx:220-221` (timer bell, local notification) | "${time} in the cold. Get out when you're ready, then log it." | "${time} in the cold. Time to get out. Warm up, then log it." |

### Not changing (founder's call)

Grade F "Took the easy way"; the Meditate peek-screen line (the founder will
write a new one); "It was me" in the weekly review; the Progress "as starting
gets easier" sentence; and every row the founder left unmarked: the Progress
empty week, Avoidance "passed over", Close out the day's nothing-logged and
win lines.

## Website (`hosting/index.html`, `hosting/support.html`)

Deploying the site is a Firebase Hosting deploy: **ask the founder first**
(CLAUDE.md: Firebase deploys need an explicit ask).

| Where | Current | Change to |
|---|---|---|
| Hero subhead `:134`, meta description `:2`, og:description `:5` | "One app to track your workouts, meals and meditation, built around the one thing other apps skip: strengthening the part of your brain that overrides that 'I'll start tomorrow' voice." | "One app to track your workouts and meditation, built around the one thing other apps skip: overriding that 'I'll start tomorrow' voice." |
| Trust strip `:136` | "Built on neuroscience" | "Grounded in research on resilience and tenacity" |
| "Sound familiar?" `:138` | "Sound familiar?" | "Sound familiar? That's the pull." |
| Why-it's-hard lead `:146` | "Acting anyway is called an override, and like any skill, it gets stronger with practice." | "Acting anyway is an override. The more often you start, the easier starting tends to get." |
| Step texts `:165,166` | "The voice says…" (twice) | "The pull says…" |
| Step 1 science `:165` | "The science: starting when you'd rather not is practice at acting against your brain's prediction." | "The science: your brain predicts the cost of starting. You feel it as resistance, and starting anyway is the override." |
| Step 2 science `:166` | "The science: the hard last minutes are where the effort region works hardest." | "The science: habit research separates starting from carrying on, so we ask about both." |
| Apps section `:173-176` | "Use it where you usually give in." + Meals card | "Use it where the pull usually wins." Add a Hot & Cold card ("Get in the water." / "Just a warm shower today." / "Cold plunges and saunas: how long, how cold, how hard it was to get in. Know your limits."). Drop the Meals card if Meals is hidden. |
| `support.html:45-69` | Only Privacy, Terms, Delete | Add a first row: "Get help" / "Email us at [founder's support email]. A real person reads it." (ask for the address) |

Keep as they are: page title, science card 2 (aMCC), the outcomes section, the
final call to action.

## For the founder (needs their logins or hands)

- Switch off the four rules in Admin → Rules (don't delete them).
- Update the live text of "Comeback check-in", "Push opt-in ask" and
  "Comeback nudge" in Admin → Rules to match the table above.
- After the OTA, check Admin → All wording for any live overrides of the
  "live" lines above.
- App Store Connect subtitle: "The hard way, most of the time" (approved for
  now).
- Write a new line for the Meditate peek screen.

## Open questions for the founder

1. **Landing-page headline.** The founder approved "Do hard shit. *Most of the time.*",
   then decided "don't swear where it will cause issues; we'll pick the clean
   line later". Ask whether to change the hero now or wait for the clean line.
2. **Comeback pop-up title.** The founder's rewrite covers the body only. Keep "Welcome
   back", or something else?
3. **Hiding Meals and Craving Crusher.** The founder was "thinking of hiding"
   both. Ask
   before building it. Hiding Meals also means onboarding stops listing it and
   pre-filling its goal. Their copy fixes are parked in the review doc's
   "Hidden apps" section.
4. **Support email** for the support page.

Decided for later, not now: the clean App Store/ads tagline; Comfort Inc.;
visual identity; pricing and merch; making the toasts live-editable (Admin).

## How to ship

1. `git fetch origin claude/exciting-euler-ibwaug && git merge origin/claude/exciting-euler-ibwaug` on `main`.
2. Make the code changes above. Some strings are asserted in jest tests
   (e.g. `overrideEcho`, `frictionCapacity`, `onboardingSetup`, `rules`):
   update a test only where the copy change is the point.
3. `npm test` (must be green) and `npx tsc --noEmit` (the 3 known errors only).
4. Commit to `main`, push, then the OTA:
   `eas update --branch production --message "Copy: brand voice pass"`
   (standing instruction: no need to ask). Note the OTA in `docs/backlog.md`.
5. Website: only after the founder says yes, `firebase deploy --only hosting`.
6. Ask before any Maestro/simulator check (CLAUDE.md).
