# Neuro-Nudge: Goal-Centric Restructure Plan

> **For AI assistants:** This document is the authoritative implementation plan for restructuring Neuro-Nudge. Read it fully before starting any phase. Each phase is designed to be implemented incrementally — complete one before starting the next. Always explore the referenced files before making changes.

---

## Context & Vision

**What is Neuro-Nudge?** A React Native/Expo willpower training app where users build self-regulation through challenges, habits, and programs grounded in neuroscience.

**The problem:** The app has too many disconnected feature systems (daily challenges, extended challenges, habits/nudges, micro-goals/sprints, programs) with no clear user journey. Users don't know what to use, when, or why. Features feel like separate apps stitched together.

**The solution:** Restructure around **goals as the top-level organizing principle**. Everything the user does should serve a goal they care about. Replace abstract gamification (XP/levels) with identity evidence (follow-through rates, the user's own words reflected back).

**Target user:** A 34-year-old man who knows what to do but struggles to do it. He needs action + proof of change, not another system to manage.

**One-sentence vision:** "Set goals that matter. Take daily action. See proof you're changing."

---

## Tech Stack & Project Structure

- **Framework:** React Native / Expo SDK 54
- **Language:** TypeScript
- **Backend:** Firebase (Firestore + Auth + Cloud Functions)
- **State:** React Context API (AuthContext, WalkthroughContext) — no Redux/Zustand
- **Navigation:** React Navigation (bottom tab navigator + nested stack navigators)
- **Animations:** React Native Reanimated
- **Package manager:** npm
- **Dev command:** `npx expo start`

### Key Directory Structure
```
src/
├── components/          # Reusable UI components
│   ├── goals/           # GoalTagPicker.tsx (chip-based goal selector)
│   ├── habits/          # HabitCompletionModal.tsx
│   ├── home/            # MicroGoalCard.tsx, etc.
│   └── reward/          # RewardMoment.tsx (celebration animation)
├── constants/           # Config & constants
│   ├── homeLayout.ts    # Zone/section layout definitions
│   ├── willpower.ts     # Levels, streak multipliers, point values
│   ├── goals.ts         # Goal limits, labels
│   └── onboarding.ts    # Onboarding step definitions
├── data/                # Seed data (challenges, programs, tidbits)
├── navigation/          # All navigators
│   ├── RootNavigator.tsx
│   ├── MainTabs.tsx     # Bottom tab navigator (Home, Challenges, Community, Progress, Settings, Admin)
│   ├── HomeStack.tsx    # All routes accessible from Home tab (~25 screens)
│   └── ...Stack.tsx     # Other tab stacks
├── screens/
│   ├── Home/            # HomeScreen.tsx + all home-related screens
│   │   ├── sections/    # Home screen section components (zone-based)
│   │   │   ├── index.ts # SECTION_REGISTRY mapping
│   │   │   └── *.tsx    # Individual section components
│   │   ├── CreateGoalScreen.tsx
│   │   ├── GoalDashboardScreen.tsx
│   │   ├── CompleteChallengeScreen.tsx
│   │   └── ...
│   ├── Auth/            # Login, Signup, OnboardingScreen
│   └── Progress/        # Progress tab screens
├── services/            # Firebase/business logic
│   ├── goals.ts         # CRUD + getItemsForGoal()
│   ├── challenges.ts    # Challenge CRUD + completion
│   ├── habits.ts        # Habit CRUD + completion
│   ├── microGoals.ts    # Micro-goal CRUD + clean sweep
│   ├── programs.ts      # Program enrollment + progress
│   ├── willpower.ts     # Points calculation, level/streak logic
│   ├── userRewardMessages.ts  # Personalized reward message selection
│   ├── neuroscienceTidbits.ts # Contextual tidbit selection
│   ├── reflections.ts   # Nightly reflection CRUD
│   └── homeLayout.ts    # resolveLayout() for home customization
└── types/
    └── index.ts         # All TypeScript interfaces (800+ lines)
```

### Firestore Structure
```
users/{userId}/
├── (user doc)           # Profile, willpower stats, home_layout, settings
├── challenges/          # Daily + extended challenges (goal_ids?: string[])
├── habits/              # Nudges with target_count_per_week (goal_ids?: string[])
├── microGoals/          # Daily sprints with deadlines (goal_ids?: string[])
├── goals/               # User goals (status, dates, manual_progress)
├── programEnrollments/  # Active/completed programs (goal_ids?: string[])
├── completionLogs/      # Points/difficulty log per completion
├── reflections/         # Nightly reflection entries
├── rewardMessages/      # User's personalized message pool
└── shownTidbits/        # Tidbit recency tracking
```

### Home Screen Architecture

The home screen uses a **zone-based section registry** pattern:
- **Zones** group sections (welcome_status, todays_focus, ongoing_progress, social_extras)
- **`SECTION_REGISTRY`** in `src/screens/Home/sections/index.ts` maps section IDs to React components
- All sections receive `HomeSectionProps` = `{ data: HomeData, callbacks: HomeCallbacks, refs?: HomeRefs }`
- **`HomeData`** (defined in `src/screens/Home/sections/types.ts`) contains ALL loaded state passed to sections
- **`resolveLayout()`** in `src/services/homeLayout.ts` merges saved user layout with known sections (handles new/removed sections gracefully)
- Users can toggle section visibility via `CustomizeHomeScreen`

### Current Feature Systems

| System | Type | Firestore | Service | Key Screens |
|--------|------|-----------|---------|-------------|
| Daily Challenges | One-time, today | `challenges/` (type='daily') | `challenges.ts` | StartChallenge, CreateChallenge, CompleteChallenge |
| Extended Challenges | Multi-day with milestones | `challenges/` (type='extended') | `challenges.ts` | ExtendedChallengeProgress |
| Habits/Nudges | Recurring weekly | `habits/` | `habits.ts` | ManageHabits, HabitDetail |
| Micro-Goals/Sprints | Quick daily wins, max 5/day | `microGoals/` | `microGoals.ts` | CreateMicroGoal |
| Programs | 21-30 day curricula with education | `programEnrollments/` | `programs.ts` | ProgramDiscovery, ProgramDetail, ProgramDashboard, ProgramCompletion |

### Current Goal System (what exists today)
- Goals are an **optional tagging layer** — items have `goal_ids?: string[]` but it's never required
- Goals have **manual progress** (0-100% slider) independent of actual completions
- Max 3 active goals (constant in `src/constants/goals.ts`)
- `GoalTagPicker` component at `src/components/goals/GoalTagPicker.tsx` renders toggleable chips
- `getItemsForGoal()` in `src/services/goals.ts` fetches all items tagged to a goal
- Goal type fields: `id, user_id, name, description?, status, start_date, end_date, manual_progress, created_at, updated_at`

### Gamification (what exists today)
- **Willpower Bank:** Points earned per completion (difficulty × streak multiplier)
- **11 Levels:** "Beginner Mind" (0pts) through "Willpower Legend" (4000pts)
- **Streak multipliers:** 1.0x → 1.2x → 1.5x → 1.75x → 2.0x based on consecutive days
- **RewardMoment component:** 3-phase celebration animation (particles → personalized message → neuroscience tidbit). Triggered on challenge completion. Preserved as-is — only the content fed to it changes.
- **Reward messages:** Personalized pool per user, weighted random (favorites 3x). Service: `userRewardMessages.ts`

### Constraints
- **Incremental evolution, NOT a rewrite.** Change what exists, don't rebuild from scratch.
- **Don't delete community code.** Just hide it from UI. It comes back in a future phase.
- **Firestore backward compatibility.** The `goal_ids: string[]` field already exists on all item types. No collection renames or restructuring. Only add new fields.
- **Preserve RewardMoment.** The celebration animation stays. Only the message content evolves.
- **Existing production data must not break.** Lazy migration handles orphaned items.

---

## Phase 0: Park Community Features

**Goal:** Hide community from the UI without deleting code or data. Removes distraction immediately.

**Changes:**
- **`src/navigation/MainTabs.tsx`** — Add `const SHOW_COMMUNITY = false;` flag, conditionally render the Community `<Tab.Screen>`. Keep the import and component — just don't render it.
- **`src/constants/homeLayout.ts`** — In `DEFAULT_HOME_LAYOUT`, set `buddy_invites` and `team_activity` sections to `visible: false`
- **`src/screens/Home/CreateChallengeScreen.tsx`** — Hide the "Do It With a Teammate" buddy button behind the same `SHOW_COMMUNITY` flag (or a shared feature flag constant)

**What NOT to do:** Don't delete any community service files, types, screens, or Firestore data. All community code stays in the codebase for future re-enablement.

---

## Phase 1: Goals as the Required Anchor

**Goal:** Transform goals from optional tags into the organizing principle. Challenges, habits, and programs must belong to a goal. Micro-goals remain standalone.

### 1.1 CBT-Informed Goal Onboarding Flow

Replace the current simple goal creation (`CreateGoalScreen.tsx` — just name + description + deadline) with a guided multi-step flow rooted in Cognitive Behavioral Therapy. This is what separates Neuro-Nudge from every other goal app — it doesn't just ask "what do you want?" It asks "what's been stopping you, and how will you think differently this time?"

**New Goal Creation Flow — 5 stages, 17 prompts:**

The flow replaces `CreateGoalScreen` with a multi-step guided experience. Some prompts are required (marked **R**), others are optional but encouraged (marked **O**). Present each stage as its own screen/step with a progress indicator.

#### Stage 1: Define the Goal (Behavioral Activation)

1. **What's your goal?** (name + target date) **R**
2. **Why does this matter to you — what's the deeper reason?** **R**
   - *CBT principle: Values clarification.* Surface goals ("lose weight") have weak pull. Values-connected goals ("I want to feel confident and present with my family") activate deeper commitment.
3. **On a scale of 1-10, how confident are you that you'll achieve this?** **R**
   - *CBT principle: Self-efficacy baseline.* If they say 3, that's data. The app references this later: "You started at a 3. Look at the evidence now."

#### Stage 2: Identify Thought Patterns (Cognitive Restructuring)

4. **What's the story you tell yourself about why you haven't done this yet?** **R**
   - *CBT principle: Identifying automatic negative thoughts.* "I'm lazy." "I always quit." "I don't have discipline." Getting these on paper is the first step to challenging them.
5. **Have you tried this before? What did you tell yourself when it fell apart?** **O**
   - *CBT principle: Identifying cognitive distortions.* All-or-nothing thinking ("I missed Monday so the week is ruined"), fortune telling ("I know I'll quit by week 3"), labeling ("I'm just not disciplined"). The app could name the distortion for them.
6. **What will your inner voice say when it gets hard? What will you say back?** **R**
   - *CBT principle: Cognitive restructuring / coping statements.* The user pre-builds their counter-argument to the sabotage voice. Example:
     - Inner voice: "Just skip today, one day won't matter"
     - Response: "One day always matters. I'm building a pattern, not a perfect streak."

#### Stage 3: Design the Behavior Plan (Behavioral Experiments) — THE ACTION GENERATOR

This stage is where the goal gets loaded with real actions. By the end, the user walks away with habits, a challenge, and micro-goal templates — not an empty goal.

7. **What does a good week look like for this goal?** **R**
   - *CBT principle: Activity scheduling.* Concrete, observable behaviors. Not "be healthier" but "gym Mon/Wed/Fri, meal prep Sunday, walk 20 min daily."
8. **What habits do you need to build to make this a reality?** **R**
   - User lists habits with frequency: "Go to gym 3x/week", "Meal prep on Sundays", "No eating after 8pm"
   - → Each one directly creates a **Habit** under the goal with the frequency they specified.
9. **What's one challenge you can do this week to push yourself outside your comfort zone for this goal?** **R**
   - User names something specific and uncomfortable: "Sign up for a gym membership today", "Throw out all the junk food", "Run a full mile without stopping"
   - → Becomes their first **Challenge** under the goal, ready to start.
   - Could also offer curated suggestions from the challenge library filtered by goal category.
10. **What's the smallest possible action on your worst day?** **R**
    - *CBT principle: Graded task assignment.* On a terrible day, the win isn't a full workout — it's putting on your shoes.
    - → Saved as a **quick win template** on the goal. When the app detects low activity, it suggests: "You said on a bad day, you'd [minimum_action]. Want to add it as a quick win?"
11. **What are 2-3 things you could do when you have free time to get closer to this goal?** **O**
    - Bonus actions for extra energy/time: "Extra walking", "Research healthy recipes", "Watch a fitness tutorial"
    - → Saved as a **bonus micro-goal list** on the goal. The app can suggest these: "Got some free time? You said [bonus_action] would move you closer to [goal]."

#### Stage 4: Anticipate and Plan (Relapse Prevention)

12. **What situations or feelings trigger me to fall off?** **O**
    - *CBT principle: Trigger identification / functional analysis.* Mapping the trigger → thought → feeling → behavior chain.
13. **When that trigger hits, what will I do instead?** **O**
    - *CBT principle: Behavioral substitution.* Pre-planning the alternative behavior.
14. **What needs to change in my environment to make this easier?** **O**
    - *CBT principle: Stimulus control.* Remove cues for old behavior, add cues for new behavior. "Put gym bag by door." "Delete food delivery apps."
15. **When (not if) I miss a day, what's my plan to get back on track?** **R**
    - *CBT principle: Relapse prevention.* "When" not "if" normalizes setbacks. CBT treats a lapse as data, not failure.

#### Stage 5: Set the Identity Anchor

16. **Who am I becoming through this goal?** **R**
    - Bridges CBT and identity-based motivation. The answer becomes the seed for all identity evidence messaging. "I'm becoming someone who keeps promises to himself."
17. **Who in my life can support this? How will I ask them?** **O**
    - *CBT principle: Social support activation.* Parks naturally for community Phase 2 re-enablement.

**What the user walks away with after completing the flow:**

| Generated from | Creates | Example |
|---|---|---|
| Q8 (habits to build) | 1-5 **Habits** pre-tagged to the goal | "Go to gym 3x/week" → Habit with target_count=3 |
| Q9 (first challenge) | 1 **Challenge** ready to start | "Throw out all junk food" → Active challenge |
| Q10 (minimum action) | Saved **quick win template** for bad days | App suggests "Do 10 pushups" when activity is low |
| Q11 (bonus actions) | Saved **bonus micro-goal list** for extra time | App suggests "Go for extra walk" when user has free time |

Plus all the CBT data (identity statement, inner voice counter-argument, triggers, recovery plan, confidence baseline) that feeds into reward messaging, reflection prompts, and identity evidence throughout the app.

**How this data feeds the app experience (implemented in later phases):**
- The **identity answer** (Q16) becomes the rotating identity statement on the home screen and in reward messages
- The **confidence baseline** (Q3) gets referenced as evidence accumulates: "You started at a 3. After 40 completions, what would you rate yourself now?"
- The **counter-argument** (Q6) surfaces in reward moments: "Your inner voice said to quit. You didn't listen."
- The **minimum action** (Q10) becomes a suggested quick win when the user hasn't done anything for the day
- The **bonus actions** (Q11) surface when the app detects free time or extra energy: "Got a minute? You said [bonus_action] would help."
- The **trigger + substitute** (Q12-13) could surface as a prompt when the app detects a streak is at risk
- **Habits** (Q8) are created directly from the flow, pre-tagged to the goal
- **First challenge** (Q9) is created and ready to start immediately

**Implementation details:**
- **Create `src/screens/Home/GoalOnboardingFlow.tsx`** — New multi-step screen. Use a state machine or step index to navigate between stages. Each stage is a scrollable form section with a "Next" button. Add a progress bar at the top showing stage completion.
- **Add route in `src/navigation/HomeStack.tsx`** — Add `GoalOnboardingFlow` screen. Update the `CreateGoal` route to point here instead of the old `CreateGoalScreen`.
- **`src/types/index.ts`** — Expand the `Goal` interface with new optional fields:
  ```
  deeper_why?: string
  confidence_baseline?: number          // 1-10
  negative_story?: string
  past_attempt_story?: string
  inner_voice_challenge?: string
  inner_voice_response?: string
  good_week_description?: string
  minimum_action?: string
  bonus_actions?: string[]
  triggers?: string[]
  trigger_substitutes?: string[]
  environment_changes?: string
  recovery_plan?: string
  identity_statement?: string
  support_person?: string
  cognitive_distortions?: string[]
  ```
  All new fields are optional for backward compat with existing goals.
- **`src/services/goals.ts`** — Update `createGoal()` to accept new fields. Add a `createGoalWithActions()` function that: (1) creates the goal doc, (2) creates Habit docs from Q8 answers with `goal_ids: [newGoalId]`, (3) creates a Challenge doc from Q9 with `goal_ids: [newGoalId]`. Use existing `createChallenge()` and habit creation from `habits.ts`.
- **`src/constants/goals.ts`** — Add prompt text, placeholder text, stage labels, and validation rules for the onboarding flow.

### 1.2 Add Computed Follow-Through to Goal System

- **`src/types/index.ts`** — Add `GoalFollowThrough` interface:
  ```
  totalCommitments: number      // challenges attempted + habit target counts + program days
  keptCommitments: number       // challenges completed + habits logged + program days succeeded
  followThroughRate: number     // keptCommitments / totalCommitments (0-1)
  currentWeekCommitments: number
  currentWeekKept: number
  ```
- **`src/services/goals.ts`** — Add `computeGoalFollowThrough(userId, goalId)` function. It should:
  1. Call existing `getItemsForGoal(userId, goalId)` to get tagged challenges, habits, programs
  2. For challenges: count completed vs total (active + completed + failed)
  3. For habits: sum weekly target counts vs completion log counts
  4. For programs: count succeeded milestones vs total milestones
  5. Return a `GoalFollowThrough` object

This replaces the manual 0-100% progress slider with real, computed data.

### 1.3 Make Goal Association Required in Creation Flows

- **`src/components/goals/GoalTagPicker.tsx`** — Add `required?: boolean` prop. When true: show "Required" indicator, different empty state ("You need at least one goal — create one to get started"), and an `onCreateGoal?: () => void` callback that renders a "Create Goal" button within the picker.
- **`src/screens/Home/CreateChallengeScreen.tsx`** — Make GoalTagPicker required. Add validation: block submit if `goalIds.length === 0`. Change label from "Link to Goals" to "Which goal is this for?"
- **`src/screens/Home/ManageHabitsScreen.tsx`** — Add GoalTagPicker to the habit creation flow (it's not there currently). Make it required.
- **`src/screens/Home/ProgramDetailScreen.tsx`** — Make goal selection required before program enrollment.
- **`src/screens/Home/CreateMicroGoalScreen.tsx`** — **NO CHANGE.** Micro-goals remain standalone (they're momentum builders, not goal-tied).

### 1.4 Migrate Existing Data

- **Create `src/services/dataMigration.ts`** — Lazy migration on first app load after update:
  1. Check `has_migrated_goals_v2` boolean field on user doc
  2. If false/missing: query all active challenges, habits, and program enrollments with empty/missing `goal_ids`
  3. Auto-create a "General" goal for the user (using the existing `createGoal()` function)
  4. Batch-update all orphaned items to set `goal_ids: [generalGoalId]`
  5. Set `has_migrated_goals_v2: true` on user doc
  6. Show a one-time modal explaining the change
- **`src/screens/Home/HomeScreen.tsx`** — Add migration check at the start of `loadData()` (around line 115), before the main data fetch.

No Firestore collection restructuring needed — `goal_ids: string[]` already exists on all item types.

---

## Phase 2: Goal-Centric Home Screen

**Goal:** Restructure the home screen from 4 disconnected zones into a goal-driven daily view.

### 2.1 New Zone Layout

- **`src/constants/homeLayout.ts`** — Replace current zone structure with:
  - **Zone 1 (Welcome):** `greeting`
  - **Zone 2 (Your Goals + Today's Actions):** `goal_actions` (NEW — the centerpiece)
  - **Zone 3 (Momentum):** `sprints` (standalone micro-goals)
  - **Zone 4 (Reflect & Learn):** `identity_summary` (NEW), `reflection_banner`, `fun_fact`

  Remove from default layout: `goals`, `daily_challenges`, `habits`, `programs`, `extended_challenges`, `willpower_summary`, `buddy_invites`, `team_activity`. Keep them in the `SECTION_REGISTRY` for backward compat (users with custom layouts won't break — `resolveLayout()` in `src/services/homeLayout.ts` handles unknown sections gracefully).

### 2.2 Create GoalActionsSection

- **Create `src/screens/Home/sections/GoalActionsSection.tsx`** — The centerpiece of the new home screen. For each active goal, renders:
  - **Goal header card:** name + follow-through rate ("9/12 this week"), tappable to navigate to GoalDashboard
  - **Today's actions grouped underneath:** active challenges tagged to this goal, due habits, program step/check-in
  - **"+ Add action" button** per goal — quick-add to create a challenge/habit under this specific goal
  - **Empty state:** "Create Your First Goal" CTA if no goals exist, linking to `GoalOnboardingFlow`

  This single section replaces: `GoalsSection`, `DailyChallengesSection`, `HabitsSection`, `ProgramSection`, `ExtendedChallengesSection`

  **Implementation note:** Group existing `HomeData` arrays by `goal_ids`. For each goal, filter `activeChallenges`, `extendedChallenges`, `habits`, `activeProgram` to show only items tagged with that goal's ID.

### 2.3 Update HomeScreen Data Loading

- **`src/screens/Home/sections/types.ts`** — Add to `HomeData`:
  - `goalFollowThrough: Record<string, GoalFollowThrough>` (keyed by goal ID)
  - Add to `HomeCallbacks`:
  - `onGoalTap: (goalId: string) => void` (navigate to GoalDashboard)
- **`src/screens/Home/HomeScreen.tsx`** — In `loadData()`, after loading goals and items, compute follow-through for each goal using `computeGoalFollowThrough()`. Pass into `homeData`.
- **`src/screens/Home/sections/index.ts`** — Add `goal_actions: GoalActionsSection` and `identity_summary: IdentitySummarySection` to the registry. Keep old sections registered for backward compat.

---

## Phase 3: Weave Reflection Into Completions

**Goal:** Reflection happens during the action completion flow, not as a separate nightly activity. Scale depth by action weight.

### 3.1 Habits Get Light Reflection

- **`src/components/habits/HabitCompletionModal.tsx`** — Currently has: difficulty selector (easy/challenging) + optional notes. Evolve: replace generic "Add notes" placeholder with a rotating micro-prompt from a pool ("What almost stopped you?", "How do you feel compared to before?", "What's one thing you noticed?"). Keep it as a single short text field (max 200 chars).
- **Create `src/constants/microPrompts.ts`** — Define a pool of short reflection prompts categorized by action type (habit, challenge, micro-goal).

### 3.2 Challenges Get Goal Context

- **`src/screens/Home/CompleteChallengeScreen.tsx`** — After the reflection journal section, add a goal context banner: "This counts toward [Goal Name] — 8/11 commitments kept." Fetch the goal name and follow-through data for the challenge's `goal_ids[0]`. Also: make journaling prompts visible inline (collapsed by default) instead of hidden behind a modal button.

### 3.3 Scale Back Nightly Reflection

- **`src/screens/Home/sections/ReflectionBannerSection.tsx`** — Reframe from "Time to reflect on your day" to "Today's recap" — show a summary of what was done today with per-goal follow-through stats. Journaling becomes optional "add to today's story" rather than the primary ritual.

---

## Phase 4: Identity Evidence Gamification

**Goal:** Evolve XP/levels toward per-goal follow-through rates and identity-reinforcing language. Keep the underlying points/streak infrastructure running silently.

### 4.1 New Identity Summary Section

- **Create `src/screens/Home/sections/IdentitySummarySection.tsx`** — Replaces `WillpowerSummarySection` in the home screen with:
  - Per-goal follow-through rates as compact cards: "[Goal Name]: 9/12 this week (75%)"
  - Rotating identity statement pulled from the user's goal: "You're becoming [identity_statement from Q16]"
  - Streak reframed: "12 consecutive days of action" (not "12-day streak, 1.5x multiplier")

### 4.2 Identity-Focused Reward Messaging (Powered by Goal Onboarding Data)

The CBT data from the goal onboarding flow (Phase 1.1) feeds directly into reward messaging:

- **`src/services/userRewardMessages.ts`** — Add identity-framing message templates that interpolate:
  - Goal name and follow-through stats
  - The user's own identity statement (Q16): "You said you're becoming [identity_statement]. This is proof."
  - The user's counter-argument (Q6): "Your inner voice said [inner_voice_challenge]. You said [inner_voice_response]. You were right."pl
  - Confidence baseline callbacks (Q3): "You started at [confidence_baseline]/10. Look at you now."
- **`src/screens/Home/CompleteChallengeScreen.tsx`** — Change the narrative line computation (look for where `narrativeLine` is set, around the completion handler). Change from "Challenge {N}. Still here." to "[Goal Name]: {kept}/{total} commitments kept. You're building proof."
- **`src/constants/willpower.ts`** — Rename level titles to identity milestones. Examples:
  - "Beast Mode" → "First Steps Taken"
  - "Committed and Consistent" → "Proof of Commitment"
  - "Willpower Warrior" → "Pattern Breaker"
  - "Resilient AF" → "Undeniable Evidence"

### 4.3 Evolve GoalDashboardScreen

- **`src/screens/Home/GoalDashboardScreen.tsx`** — Replace the manual progress slider (0-100%) with:
  - Computed follow-through rate (large, prominent display)
  - Commitment calendar — days with at least one action toward this goal
  - Per-item breakdown: challenges completed/attempted, habits logged/target, program days succeeded
  - Identity statement at top: "You're 75% consistent at [Goal Name] this month"
  - Remove the manual +/- 10% progress buttons
  - Show the user's CBT data (deeper_why, identity_statement, inner_voice pair) as viewable/editable cards

### 4.4 Keep Willpower Infrastructure Running

**Do NOT remove** the points/levels/streak system in `src/services/willpower.ts` and `src/constants/willpower.ts`. It continues running under the hood for:
- Streak multiplier calculations (still affects point earnings)
- Level-up popups (reframed with new titles from 4.2)
- Historical data on the Progress tab

Only the surface-level language changes. The `RewardMoment` component (`src/components/reward/RewardMoment.tsx`) is preserved as-is — only the `message`, `narrativeLine`, and points content fed to it evolves.

---

## Phase 5: Extended Challenges

**Decision: Keep as a challenge variant.** Do NOT merge with programs.

**Reasons:**
- Programs have educational curricula (`ProgramDay` with content); extended challenges don't
- Different Firestore structures (Challenge with embedded `milestones[]` vs ProgramEnrollment with separate template doc)
- Migration would be complex and risky for existing data
- Multi-day challenges without program overhead are a valid use case

**Action:** Ensure the `GoalActionsSection` (Phase 2.2) displays extended challenges under their tagged goal alongside daily challenges. No separate code changes needed — they share the `Challenge` type with `type: 'extended'`.

---

## Implementation Order & Dependencies

```
Phase 0  →  Phase 1  →  Phase 2  →  Phase 3  →  Phase 4
(park)      (goals)     (home)      (reflect)   (identity)
                                 ↗
                        Phase 3 can run in parallel with Phase 2
```

- **Phase 0** has no dependencies — do it first
- **Phase 1** has no dependencies on Phase 0 (but do it second)
- **Phase 2** depends on Phase 1 (needs goals populated with items to display)
- **Phase 3** can run in parallel with Phase 2 (independent changes to completion flows)
- **Phase 4** depends on Phase 1 (needs follow-through data) and partially on Phase 2 (IdentitySummarySection lives in the new layout)
- **Phase 5** is a decision with no code changes — just verification

---

## Verification

After each phase, run `npx expo start` and test on device/simulator:

1. **Phase 0:** Community tab is gone. Buddy invite and team activity sections don't appear on home. "Do It With a Teammate" button is hidden in challenge creation. No crashes. All other features still work.
2. **Phase 1:** Walk through the full goal onboarding flow end-to-end — verify all 5 stages render, required fields block progression, habits and first challenge are auto-created in Firestore after completion, and the new goal appears on the home screen. Test that goal association is now required when creating challenges/habits/enrolling in programs. Test the data migration on an account that has existing challenges/habits without `goal_ids` — verify a "General" goal is created and items are tagged.
3. **Phase 2:** Home screen shows goals with their actions grouped underneath. Tapping a goal header navigates to GoalDashboard. Follow-through rates display correctly. Micro-goals still appear in their own separate section. The "+ Add action" button works. Empty state shows "Create Your First Goal" for new users. Existing users with custom home layouts don't crash (old sections still registered).
4. **Phase 3:** Complete a habit → see a rotating micro-prompt instead of generic notes field. Complete a challenge → see goal context ("This counts toward [Goal] — X/Y kept"). Nightly reflection banner shows "Today's recap" framing with per-goal stats.
5. **Phase 4:** Home screen shows identity summary with follow-through rates instead of XP/level display. RewardMoment shows identity-focused messaging referencing the user's own words from goal onboarding. GoalDashboard shows computed follow-through rate instead of manual progress slider. Level-up popup shows new identity milestone titles.
