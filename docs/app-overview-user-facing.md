# Neuro-Nudge — App Overview (User-Facing)

> This document describes what the app is for, the user journeys, and every feature a user can actually see and interact with in the current UI. The codebase contains additional built-but-unsurfaced features (see the final section); those are deliberately excluded from the main body.

---

## What the App Is For

Neuro-Nudge is a **willpower training app**. Its core premise: modern life (notifications, feeds, engineered dopamine hits) has weakened people's capacity for deliberate discomfort, and that capacity — the "override" — is trainable like a muscle.

The app trains it through three pillars:

- **Practices** — recurring daily/weekly disciplines (meditation, breathwork, cold exposure, etc.) done as repeated "reps."
- **Challenges** — one-off or multi-day willpower tests the user creates or picks from a curated library.
- **Programs** — structured multi-week guided journeys with a prescribed challenge each day.

Everything feeds a shared reward system: **XP** (with streak multipliers and bonuses), **streaks** with named tiers, difficulty ratings ("how hard was the override?"), and celebration moments. Neuroscience education is woven throughout — a post-first-practice "Debrief," tidbit facts after completions, and a "How It Works" explainer. Light social features (accountability teams, buddy challenges) round it out.

**Target user:** self-optimizers who want a discipline-building system grounded in behavioral science (habit anchoring, CBT-style reflection, identity statements).

---

## App Structure

After sign-in and onboarding, the app is a 5-tab experience (a 6th **Admin** tab appears only for admin accounts):

| Tab | Entry screen | Purpose |
|---|---|---|
| **Home** | HomeScreen | The daily hub: practices, active challenges, programs, goals, reflections |
| **Challenges** | ChallengesHomeScreen | Challenge hub: active/past challenges, library, create |
| **Progress** | ProgressScreen | Stats, charts, calendar, records, goals progress |
| **Tools** | WorksheetLibraryScreen | Guided worksheets + "Proof Points" narrative-identity tool |
| **Settings** | SettingsScreen | Profile, why, team, privacy, notifications, education |

---

## Journey 1: Sign-Up and Onboarding

**Auth** (`src/screens/Auth/LoginScreen.tsx`, `SignupScreen.tsx`)
- Sign in / create account with **email + password** or **Google Sign-In**.

**Onboarding** (`src/screens/Auth/OverrideOnboardingScreen.tsx`) — a single 6-step interactive flow shown until completed:

1. **Hook** — "Notifications interrupt your sentence." Animated fake notification banners interrupt the copy as the user reads.
2. **Dopamine** — an interactive simulated feed; the user taps repeatedly and watches a dopamine graph spike, then the baseline sink. Gated: requires 4 taps to continue.
3. **Sit** — "Feel it for yourself": a 60-second breathing timer the user actually sits through (or skips). A "Just take me to the app" escape hatch here skips the rest of onboarding.
4. **Override** — introduces the core concept: practicing deliberate discomfort trains the prefrontal cortex.
5. **Picker** — "Pick one. Just one." The user selects a starting practice from 7 defaults (with a safety caution shown for cold/heat exposure). Gated: must select one.
6. **Reveal** — summary of what they just did, plus a teaser: "After your first practice, we'll show you exactly what it did to your brain."

On completion the app seeds the user's default practices, sets the chosen starting practice, and lands them on Home.

---

## Journey 2: The Daily Practice Loop (Core Loop)

### Adopting and viewing practices
- Practices appear as cards on **Home**: name, icon, weekly target badge (e.g., "5x/week"), intensity flame meter, current streak, and a "Done today" badge once logged.
- **Manage Practices** (`PracticesScreen`) lists adopted practices and lets the user add custom ones.
- **Practice Detail** (`PracticeDetailScreen`) shows the catalog entry: description, why it works, how-to steps, the science, variations, and a minimum version, with an **Adopt** action.

### Running a session — Ready → Go → Capture (`src/screens/Practices/PracticeSessionScreen.tsx`)
Tapping a practice with a full session flow launches three beats:

1. **Ready** — a briefing card: *What you do*, *The override urge* (when resistance will hit), and *Your anchor* (what to hold onto). Buttons: **Begin** / **Learn more**.
2. **Go** — one of three session modes depending on the practice:
   - **Timer** (e.g., meditation): full-screen countdown, skippable.
   - **Breath pacer** (e.g., breathwork): animated inhale/hold/exhale pacer with selectable duration (1–20 min) and technique (box, 4-7-8, …).
   - **Away** (e.g., cold plunge, pushups): "Set your phone down… Come back and log it when you're done," with an **I'm done** button.
3. **Capture** — log the rep: difficulty achieved (1–5), practice-specific metrics (duration, technique, temperature, reps…), and an optional journal note. Button: **Log & Celebrate**.

### Quick-log
Practices without a full session flow (e.g., custom habits) open a **completion modal** instead: difficulty slider (1–5) + optional journal note (which earns bonus XP).

### Celebration
Every completion fires the **celebration modal** (`HabitCelebrationModal`): confetti, XP earned, current streak with tier name (e.g., "Day 7: Disciplined"), and any bonus label ("First time trying this practice — XP doubled"). A neuroscience **tidbit modal** may also appear with a "Learn more" expansion.

### The Debrief (one-time, post-first-practice) (`src/screens/Home/DebriefScreen.tsx`)
After the user's very first practice, a 3-screen cinematic explainer unlocks (also reachable via a persistent "See what just happened in your brain" card on Home until viewed):
1. **Your First Override** — the pull to quit *was* the training; ties the rep to prefrontal cortex training and 2,000-year-old Stoic voluntary hardship.
2. **The Pleasure Trap** — an interactive "Then ↔ Now" slider the user drags from 50,000 years ago to today; unlocks the next step at the far end.
3. **The Research** — four animated count-up stat cards (dopamine from cold water, meditation pathways, trainability, "weeks not years"), closing with "Same time tomorrow."

### Practice history & action plan (`MyPracticeDetailScreen`)
Per-practice detail page with: current/longest streak, total completions, total XP, active-since date, a completion heat-map calendar, a weekly trend bar chart, timestamped notes, and a **Delete Practice** action. It also hosts the **Action Plan** editor — habit-science scaffolding the user fills in: *After I…* (anchor cue), *Pair it with*, *Environment tweak*, *Obstacle plan (if-then)*, *Minimum version*, and an accountability person.

---

## Journey 3: Challenges

### Starting one
From Home or the Challenges tab the user reaches a start hub with four routes: **Create** a custom challenge, browse the curated **Challenge Library**, browse **Barrier/Action challenges**, or revisit **Past Challenges**.

- **Create Challenge** (`CreateChallengeScreen`): name, description, expected difficulty (1–5), optional deadline, "why it matters," success criteria, optional goal link — and an option to pair with a **buddy** (picks a teammate via `BuddyPickPartnerScreen`).
- **Library challenges** carry educational content: neuroscience explanation, psychological benefit, what you'll learn, and a list of "common resistance" thoughts.

### Completing a single-day challenge (`CompleteChallengeScreen`)
- Shows the challenge, a countdown if a deadline is set, and a pre-completion **"Feeling Resistance?"** expandable listing typical objections ("These thoughts are normal. Do it anyway.").
- The user picks a result — **Success** or **Not Yet** — and rates the difficulty of the override (1–5).
- On **Success**: an expandable **"What You Just Learned"** (with "The Science"), an optional conversational **post-challenge reflection** (hardest moment, what pushed you through, next-time rule), and a "This counts toward [Goal]" banner if goal-linked.
- On **Not Yet**: a failure-reflection input ("I got distracted by…", earns bonus XP), then a **failure modal** capturing barriers and a "Next time, I'll…" commitment. Failed challenges still earn reduced XP when reflected on.
- Either way, a **RewardMoment** fires: confetti, a reward message (user-customizable — see Settings), a narrative line (goal progress, streak day, or an identity statement like "You said you're becoming X — today is evidence"), points + streak multiplier, buddy bonus if both partners completed, repeat-milestone badges (5th/10th/25th/50th/100th time), and a neuroscience tidbit.

### Extended (multi-day) challenges (`ExtendedChallengeProgressScreen`)
- "Day X of N" progress bar and a daily checklist: past days show ✓/✗, today shows a **Check In** button, future days are grayed.
- **Check-in modal**: Yes/No for the day, effort rating (1–5) on success, optional note. Completing the final day routes to the final reflection screen.
- **Buddy challenges** add: partner name and status, their day-by-day dot row, "checked in today" status, and a **Nudge** button that sends the partner a notification.
- **End Challenge Early** (with confirmation) is always available.

### Challenge history
- **Challenges tab home** shows active challenges plus summary stats and past challenges.
- **Challenge Detail** (`ChallengeDetailScreen`): status badge, repeat stats ("Completed 5 times · First… Last…"), dates, expected vs. actual difficulty, XP awarded, all the descriptive/educational fields, the captured reflection, a **Delete** action, and a **Submit to Library** button (below).

### Submitting to the community library
Completed, eligible challenges can be submitted for review (`SubmitChallengeScreen`). The user tracks them under **Settings → My Submissions**: status badges (Pending Review / Approved / Not Approved / Withdrawn), rejection feedback when declined, and a **Withdraw** option while pending.

---

## Journey 4: Programs (Multi-Week Guided Journeys)

### Enrolling
- **Program Discovery** → **Program Detail** (full description + research) → choose a mode — **Cold Turkey** (all-in) or **Gradual Build** (ramping difficulty) — and **Enroll**.

### The daily dashboard (`ProgramDashboardScreen`)
- Header with program icon, name, and mode badge; "Day X of Y" with progress bar; stats grid (Days Succeeded, XP Earned, **Grace Days Remaining** — red at 0).
- **Today's Challenge card**: name, description, success criteria, difficulty dots, and a **Check In** button (or "Checked in today").
- A collapsible **educational blurb** for the day, and a **progress calendar** color-coded green (succeeded) / orange (grace day) / gray (upcoming).
- **Abandon Program** (with confirmation).

### Check-in modal
Yes/No for the day; on Yes an effort rating 1–5 (Minimal → Intense, which sets the XP); on No a notice that a **grace day** will be consumed ("You won't earn XP, but your program continues"); optional note.

### Endings
- **Completion screen** (`ProgramCompletionScreen`): trophy, badge name (e.g., "The Unflinching Stoic"), stats summary (success rate, XP, grace days used, bonus XP), and a **"Continue the Momentum"** step that converts program activities into ongoing habits via pre-checked checkboxes and a **Create N Habits** button.
- **Failed screen** (`ProgramFailedScreen`): shown when grace days run out — an empathetic "Program Ended" with a *What You Accomplished* card, encouragement copy (suggesting Gradual Build if Cold Turkey was too intense), and **Try Again** / **Return Home** buttons.

---

## Journey 5: Goals

- **Goal creation** is a multi-step flow (name, why, obstacles, how it's measured, commit), reachable from Home, the Challenges tab, and Progress. Drafts are saved — a resume banner appears if one is abandoned.
- **Goals Progress** (Progress tab) lists active goals as health cards: follow-through % badge, status (On track / At risk / Falling behind, color-coded), days remaining, linked items ("2 challenges, 3 habits, 1 program"), a weekly follow-through bar and "This week: X/Y kept." Past goals collapse into a section below.
- **Goal Dashboard** shows a single goal with its linked challenges/habits/programs and an edit action.
- Goals thread back through the app: completion screens show "This counts toward [Goal]," and goal identity statements surface in reward narratives.
- A one-time **"Set up your first goal"** prompt appears on Home around day 2 if the user has none.

---

## The Progress Tab

**Main screen** (`src/screens/Progress/ProgressScreen.tsx`):
- **Override Score card** — this week's total overrides (practice reps + completed challenges) with a week-over-week trend.
- **Time filter chips** — 7d / 30d / 90d / All — filter everything below.
- **Hero stats row** — Completions, XP, Streak, Active Days, and **Tried** (distinct practices sampled out of the catalog).
- **Training Volume** — a two-column grid of the user's practices ordered gentle → extreme, each showing reps, XP, and logged metrics (time, temperature); untrained practices are grayed with an "UNTRAINED" badge. A horizontal challenges strip summarizes completions, XP, and average difficulty.
- **Training Quality card** and an **activity trend chart** for the period.
- **Goal bar chart** — per-goal XP or completions (toggleable).
- **Activity calendar** — dots on active days; tapping a date opens Day Detail.
- **Personal Records** — all-time bests (longest sit, coldest plunge, longest fast, best streak…).

**Day Detail** (`DayDetailScreen`):
- Date summary with total XP and action count, plus every completed practice/challenge with type badge, time, XP, and notes.
- **Yesterday is editable**: challenges get an **Edit Difficulty** button (with XP delta preview), practices can be deleted, and an **"Add Forgotten Practice"** button opens a backdate modal (pick practice, difficulty, notes).

---

## The Tools Tab (Worksheets & Your Story)

**Worksheet Library** (`WorksheetLibraryScreen`):
- A featured **Proof Points** card ("Map your hard moments into proof you can survive anything" — tagged *narrative identity*).
- A resume-draft banner if a worksheet is in progress.
- Category filter chips and a grid of worksheet templates; tapping one starts a guided, conversational step-by-step form (`ToolConversationScreen`).
- A history icon in the header opens **Worksheet History** → per-entry detail views.

**Your Story / Proof Points** (`src/screens/YourStory/`):
- **Landing page** explains the concept (your past hardships are proof you can survive; the app resurfaces them when you need them), shows a proof-point count, and offers **Add a Proof Point** and **View Your Story**.
- **Add Proof Point** — full-screen entry form.
- **Proof Point Library** — scrollable list of entries; tap to view/edit.
- Proof points feed back into Home: if the user breaks a streak, a **Story Reminder modal** can resurface one of their own proof points.

---

## The Settings Tab

**Settings home** (`SettingsScreen`) — a list of cards:

| Card | What it does |
|---|---|
| **Profile** | Edit username (validated 3–20 chars, availability-checked) |
| **My Why** | View/edit the personal Why statement; links into the 6-stage **Why Discovery** flow of drilling questions |
| **Reward Messages** | Curate the messages shown after challenge completion: pick from a global default list or write up to 30 custom messages (120 chars, categorized Identity/Effort/Contrast/General/Custom, with favorites and delete) |
| **How It Works** | Full educational explainer: the three pillars, how they combine, the XP formulas, the streak-multiplier tier table (1.0x → 2.0x), the "Suck Factor" difficulty tiers (Comfort Zone → Limit Pusher), and a Safety First section |
| **My Team** | Accountability teams (below) |
| **My Submissions** | Track library submissions (see Challenges journey) |
| **Privacy** | Toggle anonymous sharing to the Inspiration Feed (difficulty ≥3 completions, name never shown) and, if in a team, teammate-notification toggles for challenge/practice completions |
| **Send Feedback** | Opens an external feedback form |
| **Replay Intro** | Restart the onboarding flow |
| **Notifications** | **Enable Reminders** — morning nudge to set a challenge, evening nudge to complete it |
| **Clear Account** | Delete all data (with confirmation) |
| **Sign Out** | With confirmation |

### Teams
- **No team yet:** Create Team and Join Team (by invite code) cards.
- **In a team:** team card with member count; stats row (Team Streak, Longest Streak, Days Active); a large shareable **invite code**; member previews with creator/"You" badges; **Leave Team** (creators are warned about ownership transfer).
- **Team Detail:** "X of Y showed up today," weekly Mon–Sun activity bar chart, and a live activity feed of teammates' challenge/practice completions with relative timestamps.
- Teams also power **buddy challenges** (partner pairing + nudges) and the teammate push notifications controlled in Privacy.

---

## Reminders, Notifications, and Re-Engagement

- **First-rep reminder** — after the user's first completion, a modal asks them to pick a daily reminder time; per-habit reminders can be managed from the Action Plan.
- **Morning/evening challenge reminders** — enabled from Settings.
- **Comeback check-in** — if the user returns after missing days, Home shows either a **Comeback modal** (pick a habit + name the reason for the miss and recommit) or a **Story Reminder modal** (a resurfaced proof point), depending on whether they've written any.
- **Push notification deep links** — notifications can open a micro-exercise follow-up ("How did it go?") or route to a specific tab.

## Progressive Unlocks (One-Time Moments)

The app staggers its surface area for new users:
- **Points Intro modal** — after the first completion, explains the XP system.
- **Challenges Unlock modal** — "You've unlocked Challenges!" after 3 practice completions.
- **Plan Intro modal** — explains the daily plan/weekly planner.
- **Goal prompt** — day-2 nudge to create a first goal.
- **Debrief** — the post-first-practice science explainer.

## Additional Home Features

- **Nightly Reflection** — a persistent "Reflect on today" banner leading to an evening reflection flow; reflections are then browsable per-day in the Progress tab.
- **Micro-exercises** — short guided sequences (feeling check-in → questions → commitment → celebration → later follow-up), triggered from a reflection CTA or push notifications.
- **Weekly Planner** — a week-at-a-glance of challenge/program/goal status.
- **Customize Home** — reorder/personalize which sections appear on the home feed.
- **Mantras** — view and manage personal mantras.
- **Traditional Habit Library** — browse conventional habits (distinct from core practices) with detail pages and a create-goal CTA.

---

## The XP System (as the user experiences it)

- **Practices:** base XP scales with difficulty (≈ difficulty × 10), multiplied by the streak tier, +bonus for journaling, and **2× for the first time trying a practice**.
- **Challenges:** higher base (≈ difficulty × 15), streak multiplier, reflection bonus; failures with reflection still earn reduced XP.
- **Programs:** the daily effort rating (1–5) sets the day's XP; grace days earn none.
- **Streak tiers** carry names (e.g., "Disciplined" at day 7) and rising multipliers up to 2.0x, all documented for the user in *How It Works*.

---

## In the Codebase but NOT Visible in the Current UI

These exist in `src/` but are not reachable through any registered navigation path — excluded from everything above:

- **Community / Inspiration Feed tab** — `src/navigation/CommunityStack.tsx` and `InspirationFeedScreen` exist but are never added to the tab bar. (Users can still *opt in to sharing* to this feed via Privacy settings; they just can't view it.)
- **Arenas & Baseline Tests** — `ArenaDetailScreen` / `BaselineTestScreen` are registered in the Progress stack, but nothing navigates to them (arena categories were removed from the Progress screen).
- **Legacy onboarding** — `OnboardingScreen.tsx` and `WhyDiscoveryOnboarding.tsx`, superseded by `OverrideOnboardingScreen` and `WhyDiscoveryFlow`.
- **Legacy screens** — `ChallengesScreen.tsx` (superseded by `ChallengesHomeScreen`), `WorksheetScreen.tsx` (superseded by `ToolConversationScreen`), and a duplicate `AdminSubmissionsScreen` in the Settings folder.
- **Admin tab** — fully functional content-management suite (challenges, tidbits, fun facts, rules, tools, micro-exercises, reflection prompts, practices, submission review), but visible only to accounts with `is_admin: true`, so not part of the normal user experience.
