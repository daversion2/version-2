# Neuro-Nudge User Journeys

---

## Journey 1: The Happy Path

### Day 0 — Sign Up & Onboarding

**Account Creation**
- User downloads the app, taps "Sign Up" on LoginScreen, authenticates via Google Sign-In
- Account created in Firebase Auth + Firestore user document initialized

**7-Stage WhyDiscovery Onboarding**
- **Stage 1 — Username:** Sets display name (used in community feed)
- **Stage 2 — Mindfulness:** Reads context introduction, completes 60-second mindfulness timer
- **Stage 3 — Reflection:** Answers "What did you notice?" and "What do you want to work on?"
- **Stage 4 — Goal Setup:** Enters goal name + 30-day deadline → `Goal` document created
- **Stage 5 — Action Type:** Chooses "Challenge" or "Habit"
- **Stage 6 — Challenge/Habit Creation:** Defines specifics (difficulty 1-5, frequency if habit)
- **Stage 7 — Reward Messages:** Selects 5 celebration affirmations from the global list

`has_completed_onboarding: true` is set → lands in MainTabs for the first time

---

### Day 1 — Building the Foundation

**Morning (Home Tab)**
- Sees `GreetingSection` ("Good morning, [name]"), `TodaysPlanSection`, `WillpowerSummarySection`
- Notices the `DeferredOnboardingScreen` banner → decides to complete the full CBT setup
  - Completes all 7 stages: peak moment story → 5 Whys drilling → Why Statement → Goal depth (`deeper_why`, `confidence_baseline`) → Thought patterns → Safety net (`triggers`, `recovery_plan`, `minimum_action`) → Identity statement
  - `WhyProfile` fully completed, `identity_statement` saved to goal, `why_statement` displayed on home

**Setting Up Goals (Goals Tab)**
- Taps "Add Goal" → `GoalOnboardingFlow` → creates 2 more goals (max 5 active)
- Each goal gets CBT fields: `deeper_why`, `trigger_substitutes`, `environment_changes`, `recovery_plan`

**Building Challenges (Home Tab)**
- Opens `CreateChallengeScreen` → creates 2 daily challenges, links them to goals
- Opens `ChallengeLibraryScreen` → browses by barrier type, adds a "Cold Exposure" library challenge

**Setting Up Habits (Home > ManageHabitsScreen)**
- Creates 2 habits: "Morning journaling" (3x/week) and "10-minute walk" (7x/week)
- Links both to a goal

**Starting a Program (Home > ProgramDiscoveryScreen)**
- Browses 5 programs → selects "Phone Detox" → chooses Gradual Build mode (21 days)
- `ProgramEnrollment` document created, Day 1 milestones generated

**Evening**
- Completes all challenges → `CompleteChallengeScreen` for each → rates difficulty, adds reflection
- Logs all habits on the home screen habits section
- Completes Program Day 1 milestone
- Receives `PointsPopup` for each completion, earns ~15–20 willpower points
- Difficulty-3+ challenge auto-posts to `InspirationFeedEntry` (48hr community post)
- Taps "Nightly Reflection" banner → `NightlyReflectionScreen`:
  - Grades day **A**
  - Answers prompts: went_well, hardest, tomorrow, why_connection
  - Daily summary auto-built from completed/missed items
  - Reflection streak starts: 1 day

**Reward:** Willpower level may advance → `LevelUpPopup` appears

---

### Days 2–6 — Momentum Building

Each day follows this rhythm:

**8 AM Push Notification** — "Day [N] of Phone Detox: [today's challenge]. Ready?"
- Taps notification → lands in the app, sees `TodaysPlanSection` populated

**During the Day**
- Completes daily challenges → `CompleteChallengeScreen` with difficulty rating
- Marks habits complete in `HabitsSection`
- Completes program day milestone
- Creates micro-goals (`CreateMicroGoalScreen`) with deadlines for that day's sprints
- Completes all 5 micro-goals → **Clean Sweep Bonus** earned → `CleanSweepPopup`

**Evening**
- Does nightly reflection every day → streak builds to 6
- At day 7, **streak multiplier activates: 2x points on everything**
- Progress tab (`ProgressScreen`) shows 7-day completion rate climbing toward 100%

---

### Week 2–3 — Deepening Engagement

**Goal Work (Goals Tab)**
- Reviews `GoalDashboardScreen` → follow-through rate tracking
- Opens CBT fields → reviews identity statement, updates `manual_progress`

**Community**
- Joins a team (`CreateTeamScreen`) or accepts invite code → 5-member accountability group
- Sees `TeamActivitySection` on home → teammates' completions
- Invites teammate to a buddy challenge via `BuddyPickPartnerScreen`
- Both complete it → `InspirationFeedEntry` with "buddy_completion" type + bonus points

**Worksheets (Worksheets Tab)**
- Opens `WorksheetLibraryScreen` → tries "Thought Record (ABC model)"
- Fills out sections, saves completed entry
- Returns another day → does "Beliefs Inventory"

**Why Discovery**
- Taps `WhySummarySection` on home → reviews why statement
- Reads identity affirmations daily on `IdentitySummarySection`

---

### Day 21 — Program Completion

- Completes final Phone Detox milestone
- `ProgramCompletionScreen` fires: celebration animation, completion badge awarded
- 100-point completion bonus earned → possible level up
- App suggests converting program habits into permanent nudges → user creates 2 new habits

---

### 30+ Days — Ongoing Power User

- Starts a second program ("Morning Discipline")
- Hits **30-day streak → 3x points multiplier**
- Progress tab shows: recovery speed, day-of-week patterns, goal follow-through %
- Submits a custom challenge to the library (`SubmitChallengeScreen`)
- Reviews a library challenge (`WriteReviewScreen`)
- Completes 50x repetitions of one challenge → `repeat_milestone` feed entry
- Explores `CoachApplicationScreen` → applies to become a coach

---

## Journey 2: The Not-So-Happy Path (Lapsed User)

### Day 0 — Sign Up & Partial Onboarding

- Creates account via Google Sign-In
- Starts WhyDiscovery onboarding
- Completes stages 1–4 (Username, Mindfulness, Reflection, Goal Setup)
- **Skips stages 5–7** (taps "Skip" or "Maybe Later")
- Lands in MainTabs with `has_completed_onboarding: true`, but `deferred_onboarding_progress` is only partially filled

**Day 1 Activity (30–60 min total)**
- Creates 1 daily challenge on the home screen
- Does NOT create any habits, programs, or additional goals
- Completes the challenge → `CompleteChallengeScreen` → earns ~4 points
- Does NOT do nightly reflection

**User closes app. Does not return for 3 days.**

---

### Days 2–4 — Silent Gap

**What the app is doing:**
- **Day 2, 8 AM:** Push notification fires: "Good morning! Time to tackle your challenges today."
  - User does not open it
- **Day 2, 8 PM:** "Don't forget to reflect on your day!" notification
  - User does not open it
- **Day 3, 8 AM:** Generic challenge reminder fires
  - Ignored
- **Day 4, 8 AM:** Same cadence, same result

**Firestore state:**
- Challenge from Day 1 remains `active` (never failed/archived)
- No reflection records
- Streak stays at 0 (never started)
- Willpower points: ~4

---

### Day 4 — The Comeback

**User opens app**

- **`ComebackModal` fires** (triggered by inactivity gap detection): "Welcome back! It's been a few days. No shame — let's get back on track."
- Home screen loads with stale data: the Day 1 challenge is still showing as `active` with today's date mismatched
- `TodaysPlanSection` shows items but they feel disconnected from current state
- `WillpowerSummarySection` shows Level 1, 4 points — a nearly blank slate

**What the user might do (fragmented session):**
- Scrolls home, feels overwhelmed by empty sections (no habits, no programs, no goals with depth)
- Sees `DeferredOnboardingScreen` deferred banner → taps it → gets through Stage 1 (peak moment story), then closes it again
  - `deferred_onboarding_progress.stage` saves to `1`, so if they return it picks up there
- Creates 1 new challenge → completes it → earns points
- Does NOT do nightly reflection again

**User closes app. Returns 3 days later again.**

---

### Day 7 — Second Comeback

**Same pattern:**
- `ComebackModal` fires again
- 8 AM / 8 PM notifications had fired on Days 5 and 6 — unread
- No streak exists to protect. No multiplier. No program milestones at risk.

**This time, user explores more:**
- Taps `GoalsScreen` → sees the one goal from onboarding → no linked challenges, no CBT fields
- Taps `ProgressScreen` → sees a calendar with almost all days blank, 7-day completion rate near 0%, no reflection data
- Feels friction: the app reflects their inactivity back at them accurately but there's nothing to celebrate yet

**User might:**
- Start the `DeferredOnboardingScreen` again (picks up at Stage 1 since that was saved) → maybe gets through 2–3 more stages this time
- Create a habit ("daily walk, 3x/week") — low commitment threshold
- NOT start a program (too big of a commitment after lapse pattern)

**End of session:** Completes 1 challenge, marks habit for today. No reflection.

---

### The Lapse Loop (Ongoing Pattern)

| Day | Login | Action | Gap |
|-----|-------|---------|-----|
| 1 | Yes | 1 challenge, no reflection | — |
| 2–4 | No | 3 notifications ignored | 3-day gap |
| 4 | Yes | `ComebackModal`, 1 challenge, partial deferred onboarding | — |
| 5–7 | No | 3 more notifications | 3-day gap |
| 7 | Yes | `ComebackModal`, explores Progress, creates habit | — |
| 8–10 | No | Gap repeats | — |

**What the app cannot currently do for this user:**
- It cannot automatically fail/archive stale challenges (they accumulate as "active" forever)
- It has no re-engagement content that changes (same notification copy every day)
- `ProgressScreen` recovery speed stat starts populating — the "avg days to resume after gap" metric — but there's no intervention based on it
- `MicroExerciseFeelingScreen` exists (triggered by `comeback` context) but only fires if user actively taps into it — the `ComebackModal` is the only passive trigger
- No nudge to lower the commitment level (e.g., "Just do 1 thing today" is not surfaced)
- Deferred onboarding saves progress, so a persistent banner remains until they finish — but no active follow-up

**What the app does well for this user:**
- `ComebackModal` is a compassionate re-entry point
- Deferred onboarding progress is saved — no restart penalty
- `minimum_action` field (if they ever complete CBT setup) is designed exactly for this: defining the lowest-friction version of a goal for hard days
- `recovery_plan` and `trigger_substitutes` fields in goals are built for exactly this lapse pattern — but only accessible if they complete the deferred onboarding

---

## Coverage Summary

| App Feature | Happy Path | Lapse Path |
|-------------|------------|------------|
| Account creation + onboarding | Full 7-stage + deferred CBT | Partial (stages 1–4 only) |
| Goals with CBT depth | Full | Shallow (no CBT fields) |
| Daily challenges | Daily, linked to goals | Sporadic, unlinked |
| Habits | Created and streaking | Created but inconsistent |
| Programs | Full 21-day arc | Not started |
| Nightly reflection | Daily, graded, streaking | Never |
| Micro-goals | Clean sweeps | Never |
| Willpower/levels | Advancing | Stagnant at Level 1 |
| Community/buddy | Active | Not engaged |
| Worksheets | Regular use | Never |
| Why Discovery | Complete | Never finished |
| Push notifications | Opens them | Ignores them |
| `ComebackModal` | Never triggered | Triggered repeatedly |
| Progress analytics | Rich, shows growth | Shows gaps and emptiness |

The app is well-designed for the happy path. The main gap in the lapse path is that there's no **adaptive re-engagement** — the experience for a returning user after 3 days is nearly identical to someone who just installed the app, except for the `ComebackModal`.
