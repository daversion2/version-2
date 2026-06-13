# Neuro-Nudge — Feature Reference

> A comprehensive catalog of all live, production features in the Neuro-Nudge app.
> Intended as a reference for AI agents working on or understanding this codebase.

## App Overview

Neuro-Nudge is a **CBT-informed personal growth app** built with React Native + Expo, Firebase (Firestore, Cloud Functions, Auth), and Google Sign-In. It helps users build willpower and positive habits through daily challenges, structured programs, reflective journaling, and interactive cognitive-behavioral tools.

**Tech stack:** React Native, Expo (custom dev build), Firebase (Firestore + Cloud Functions + Auth), Google Sign-In (native module), Expo Notifications (push).

---

## Core Systems

### Willpower Points System

Every action in the app earns **willpower points**, which serve as the primary engagement and progress metric.

- **Challenge completion:** Base points = difficulty rating (1-5) x streak multiplier
- **Failed challenge:** 1 point x streak multiplier (rewards the attempt)
- **Reflection bonus:** +1 point for writing a journal entry on a challenge
- **Habit completion:** Easy = 1 point, Challenging = 2 points, each x streak multiplier
- **Worksheet/tool completion:** 2 base points + 1 bonus if mood improved by 3+ points
- **Micro-exercise completion:** 2 points

**Streak multiplier tiers** (based on consecutive active days):
| Tier | Multiplier |
|------|-----------|
| Starting | 1.0x |
| Building Momentum | 1.25x |
| On Fire | 1.5x |
| Unstoppable | 1.75x |
| Legendary | 2.0x |

**Willpower Quotient (WPQ):** Average difficulty of last 10 days, categorized into tiers: Comfort Zone, Steady Builder, Challenge Seeker, Limit Pusher.

### Three Life Domains

All challenges and habits are categorized into one of three domains (plus user-created custom categories):
- **Physical** — exercise, sleep, health, nutrition
- **Social** — relationships, community, connection
- **Mind** — meditation, mindfulness, mental health, learning

### Goal System

Users can have up to **3 active goals** simultaneously. Goals are the organizing principle — challenges, habits, programs, and worksheets are all tagged to goals.

- Goals have a name, description, and end date (default 30 days)
- CBT-enhanced fields: deeper_why, triggers, recovery_plan, identity_statement
- Goal health is calculated as **follow-through rate** (commitments kept / total commitments)
- Statuses: active, completed, not_completed (expired), archived

---

## Features by App Section

### 1. Onboarding

**Initial onboarding flow** for new users:
1. **Pattern discovery** — User identifies which mental patterns they experience (racing thoughts, restlessness, anxiety/worry, self-criticism, distraction)
2. **Personalized feedback** — Science-backed response based on selected patterns
3. **Timed pause exercise** — 60-second meditation/mindfulness moment
4. **Mantra selection** — Choose or create a personal mantra from curated examples
5. **Username creation** — Set unique username (3-20 chars, alphanumeric + underscore)
6. **Push notification consent**

**Deferred onboarding:** Users who skip can complete onboarding later from Settings. Progress is saved between sessions.

**Goal Onboarding Flow** (multi-stage goal creation):
1. Goal name and description
2. Thought patterns (has user tried this before?)
3. Baseline confidence rating
4. Inner voice challenges (what the inner critic says, user's response)
5. Target completion date

---

### 2. Home Tab

The **primary engagement hub** with a customizable section layout. Users can toggle visibility and reorder sections.

**Available home screen sections:**
- **Greeting** — Personalized welcome message
- **Mantra** — Displays the user's active mantra
- **Goal Actions** — Quick actions for active goals (challenges, habits, programs)
- **Active Challenges** — Current daily/extended challenges with quick-complete
- **Habits** — Today's habits with completion toggles and weekly count
- **Fun Facts** — Random neuroscience/psychology fun facts
- **Reflection Banner** — Prompt to complete daily reflection
- **Willpower Stats** — Current points, streak, multiplier tier

**Key actions from Home:**
- Start/complete challenges
- Log habit completions
- Open nightly reflection
- Access micro-exercises
- Navigate to any feature

---

### 3. Challenges

The core daily activity. Two types:

**Daily Challenges:**
- One-off tasks completed within the day
- Have a name, description, category, difficulty (1-5), success criteria
- Optional deadline time
- Tagged to one or more goals
- Include a "why" field for personal motivation
- Support scheduling for future dates

**Extended Challenges:**
- Multi-day challenges (7-90+ days)
- Auto-generated day-by-day milestones
- Daily check-in required
- Accumulated points across the duration

**Challenge lifecycle:**
1. Create (custom or from library)
2. Active — user works on it
3. Complete — mark as done with difficulty rating + optional journal entry
4. Not Yet — mark as not completed (positive framing, not "failed")

**On completion, the user sees:**
- Reward moment modal with animations
- Points calculation with streak multiplier
- Neuroscience tidbit with "Learn More" option
- Milestone celebrations (at 5, 10, 25, 50, 100 completions of same challenge)
- Streak tier transition notifications
- Haptic feedback

**Barrier types** (challenge categorization for analytics):
- Comfort zone, delayed gratification, discipline, ego, energy drainer

**Action types:**
- Complete (start doing something) vs. Resist (stop doing something)

**Challenge Library:**
- Curated library of pre-built challenges
- Filterable by time category (5-min, 15-min, 30-min, 1-hour, ongoing)
- Filterable by life domain
- Beginner challenges section
- One-click creation from library template

**Repeat tracking:** When a user completes the same named challenge multiple times, the app tracks milestones (5, 10, 25, 50, 100+ completions).

---

### 4. Habits

Recurring behaviors tracked against weekly targets.

- **Create habits** with name, category, target count per week, and goal tagging (required)
- **Log completions** with difficulty (easy/challenging) and optional notes
- **Backdate** habit logs for previous days
- **Streaks** — consecutive days with at least one completion (current + longest tracked)
- **Weekly completion visualization** — progress toward weekly target

**Habit Action Plan** (behavioral science-based, 5 steps):
1. **When & where** — Implementation intention (specific time and place)
2. **Environment changes** — Friction reduction strategies
3. **Obstacle pre-planning** — WOOP method (what could go wrong + plan)
4. **Minimum version** — Smallest possible version to prevent all-or-nothing thinking
5. **Accountability person** — Who to tell

**Habit Library:** 50+ pre-built habits organized by category (Physical, Mental, Social, Work, Sleep, Nutrition), each with a pre-filled action plan including cue, environment changes, obstacle plan, minimum version, and accountability suggestions.

---

### 5. Structured Programs

Multi-day guided programs (typically 21 days) with daily content and check-ins.

- **Enrollment:** Max 1 active program at a time
- **Modes:** "Cold Turkey" and "Gradual Build"
- **Daily content:** Challenge for the day + educational blurb
- **Grace days:** Automatically applied for missed days (configurable per program)
- **Completion:** Awards bonus points, creates a program badge
- **Habit conversion:** After completing a program, suggested habits can be converted to real tracked habits
- **Failure/Abandonment:** Programs can fail (too many missed days) or be voluntarily abandoned

---

### 6. Goals Tab

Lists all active goals with key metrics:
- Goal name and description
- Days remaining until deadline
- Follow-through percentage (color-coded: green/orange/red)
- Count of linked challenges, habits, and programs
- Completed goals section (hidden by default, toggleable)
- Overall progress view across all goals

**Goal Dashboard** (per-goal detail view):
- Goal status and core metrics
- All linked challenges, habits, programs
- Follow-through statistics
- Edit/manage options
- Extend deadline capability

---

### 7. Progress Tab

Comprehensive analytics dashboard:

**Consistency metrics:**
- Active days (7-day window)
- Week-over-week comparison (this week vs last week vs personal best)
- Average recovery speed (gap days between streaks)

**Habit health scores:** Ranked list of habits by completion percentage and streak

**Day-of-week patterns:** Chart showing which days the user is most active

**Reflection tracking:**
- Most recent grade
- Average grade across all reflections
- Reflection streak (consecutive days)

**Interactive calendar:** Marks active days, tappable to drill into daily detail

**Day Detail view:** Shows all challenges completed, habits logged, and reflection entry for any selected date

---

### 8. Nightly Reflection

End-of-day journaling with structured prompts:

1. **Day grade** — A, B, C, D, F
2. **What went well** — Free text
3. **What was hardest** — Free text
4. **Plan for tomorrow** — Free text
5. **Additional prompt** — Rotating daily prompts for deeper reflection

**Daily summary card:** Auto-generated comparison of this week vs last week (habits, challenges)

**Tomorrow's plan builder:**
- Suggested habits for tomorrow
- Schedule challenges for the next day
- Habit selection checklist

**Bad day support:** When a user grades their day as D or F, a compassionate modal appears with supportive messaging.

**Calendar export:** Option to export tomorrow's plan to device calendar.

---

### 9. Tools Tab (Interactive CBT Worksheets)

**Worksheet Library** with templates in three categories:
- **Thoughts** — Cognitive reframing tools
- **Beliefs** — Core belief examination
- **Behavior** — Action planning and experiments

**Available worksheet templates:**
1. **Thought Record (ABC Model)** — Situation → Automatic thought → Emotions → Evidence for/against → Balanced thought
2. **Cognitive Distortions** — Identify distortion type, examine evidence, find realistic alternative
3. **Smart Action Plan** — Identify obstacle, break into steps, plan implementation
4. **Core Belief Arrow** — Surface the core belief underneath surface-level anxiety
5. **Behavioral Experiment** — Design and run a test of an assumption
6. **Worry Worry Worry** — Worst-case scenario analysis vs actual probability
7. Additional templates...

**Worksheet features:**
- Multi-step conversational flow (not a static form)
- Step types: intro, mood rating (before/after), section intro, field questions, goal selection, completion
- Save and resume drafts
- Goal tagging
- Mood before/after tracking
- Points earned on completion (bonus for mood improvement)
- Full history with mood delta display

---

### 10. Micro-Exercises

Quick, context-triggered interventions accessible from the home screen. Four exercises:

1. **"I'm being hard on myself"** — Cognitive distortion identification via thought challenging
2. **"I keep avoiding this"** — Break avoidance loops via action planning
3. **"I feel like giving up"** — Motivation recovery via comeback planning
4. **"Everything feels like too much"** — Overwhelm management via prioritization

**Flow:** Feeling selection → 3 guided questions → Commitment → Completion affirmation

**Triggers:** Can be surfaced after reflection, challenge failure, comeback from inactivity, or prolonged inactivity.

**Follow-up:** Push notification sent later to check if user followed through on their micro-exercise commitment.

---

### 11. Mantras

Multi-mantra system for personal affirmations:
- Up to **5 mantras** per user
- One is set as "active" and displayed on the home screen
- Add, edit, delete, and set active
- Curated examples with science-backed guidance on effective mantras
- Legacy single-mantra system auto-migrates to new multi-mantra format

---

### 12. Weekly Planner

Plan an entire week at a glance:
- Week view with previous/next/current navigation
- Day cards showing: planned habits, scheduled challenges, program content
- Calendar export functionality
- View past and future weeks

---

### 13. Settings

- **Edit Profile** — Username editing with validation and availability checking
- **Manage Categories** — Add/edit custom categories with colors (beyond default Physical/Social/Mind)
- **Manage Reward Messages** — Customize the celebration messages shown after completions
- **How It Works** — Educational guide explaining app features
- **Replay Onboarding** — Re-run the onboarding flow
- **Enable Notifications** — Push notification preferences
- **Clear Account** — Full data deletion and reset to fresh state

---

### 14. Push Notifications (Cloud Functions)

**Morning reminder** (8 AM user timezone, hourly check):
- Priority 1: Nudge about active program day
- Priority 2: Remind about active habits count
- Priority 3: Prompt to create a challenge

**Evening reminder** (8 PM user timezone, hourly check):
- Priority 1: Congratulate or remind about program day
- Priority 2: Remind about remaining habits
- Priority 3: Congratulate or remind about daily challenges

**Event-triggered notifications:**
- Challenge failure — Encouragement message ("Growth Through Effort")
- Micro-exercise follow-up — Check if user followed through on commitment

---

### 15. Admin Features (Admin-only tab)

- **Dashboard:** Total users, 7-day active, 30-day active, challenge library stats, submission pipeline stats
- **Challenge Management:** CRUD for library challenges
- **Fun Facts Management:** CRUD for neuroscience fun facts
- **Neuroscience Tidbits Management:** CRUD for educational snippets
- **Seed Operations:** Reseed programs, reward messages, tidbits

---

## Data Architecture

### Firestore Collections (per user)
- `users/{uid}` — Profile, willpower stats, settings, push token, timezone
- `users/{uid}/goals` — Goals with CBT fields
- `users/{uid}/challenges` — Daily and extended challenges
- `users/{uid}/habits` — Active habits
- `users/{uid}/completionLogs` — Points and completion records
- `users/{uid}/reflections` — Daily reflections
- `users/{uid}/worksheetEntries` — Completed worksheets and micro-exercises
- `users/{uid}/programEnrollments` — Program participation
- `users/{uid}/comebackLogs` — Comeback attempt tracking

### Shared Collections
- `challengeLibrary` — Curated challenge templates
- `programs` — Program templates
- `funFacts` — Neuroscience fun facts
- `neuroscienceTidbits` — Educational snippets
- `rewardMessages` — Celebration messages

---

## Key Behavioral Design Patterns

1. **"Not Yet" framing** — Failed challenges are labeled "Not Yet" instead of "Failed" for positive framing
2. **Attempt recognition** — Even failed challenges earn 1 point (rewards effort over outcome)
3. **Streak multipliers** — Increasing returns for consistency, not perfection
4. **Grace days** — Programs allow missed days rather than instant failure
5. **Minimum version** — Habit action plans include a "smallest possible version" to prevent all-or-nothing
6. **Bad day compassion** — Low reflection grades trigger supportive messaging
7. **Implementation intentions** — Habit action plans use "when/where" specificity
8. **WOOP method** — Obstacle pre-planning built into habit action plans
9. **Micro-exercise triggers** — Context-aware interventions based on user state
10. **Progressive engagement** — Points, streaks, and milestones create compounding motivation
