# Neuro-Nudge App Overview

## What It Is

A **React Native + Expo** (iOS/Android) app that combines **CBT (Cognitive Behavioral Therapy)**, habit-building, goal-setting, and social accountability — with gamification. Version 2.1.2, Firebase backend.

---

## Navigation Structure (4 tabs)

| Tab | Purpose |
|---|---|
| **Home** | Daily productivity hub — challenges, habits, programs, micro-goals, reflection |
| **Goals** | Long-term goal management with CBT-based onboarding |
| **Worksheets** | CBT worksheet library (5 templates) |
| **Settings** | Profile, categories, teams, rewards, coach platform |
| **Admin** *(conditional)* | Community submission moderation |

---

## Core Features

### Daily Productivity
- **Challenges** — create or pick from a 100+ library, complete with difficulty rating + reflection notes
- **Extended Challenges** — multi-day challenges with per-day milestones
- **Habits/Nudges** — recurring weekly habits with streak tracking
- **Micro-Goals (Sprints)** — 5 SMART goals per day with time deadlines
- **Programs** — structured 21-30 day behavior change programs (Phone Detox, Cold Exposure, etc.)

### Reflection & CBT
- **Nightly Reflection** — grade your day A-F, 4 prompts, auto-summary of completions
- **CBT Worksheets** — 5 templates (Thoughts, Beliefs, Behavior categories)
- **Micro-Exercises** — 3-question emotional wellness flows triggered by failures or low grades
- **Neuroscience Tidbits** — 80+ science facts shown contextually

### Purpose & Goals
- **Why Discovery** — 4-stage purpose discovery (stories → 5 whys → theme → why statement)
- **Goals** — CBT-structured goal creation (triggers, identity, confidence, cognitive distortions, support person)
- **Goal Follow-Through Rate** — measures commitment during goal period

### Social & Accountability
- **Teams** — create/join accountability groups, see member activity *(accessible via Settings)*
- **Buddy Challenges** — invite teammates to challenges together
- **Inspiration Feed** — community achievement feed with reactions ⚠️ *not accessible — CommunityStack exists but is not added to MainTabs; feature flag `SHOW_COMMUNITY = false`*
- **Challenge Submissions** — submit challenges to community library for approval *(accessible from challenge completion flow)*

### Gamification
- **Willpower Bank** — points per activity (challenges 1-5, habits 2-5, micro-goals 3, programs 1-5)
- **Streak System** — with multipliers (1.5x at 7 days, 2x at 21 days)
- **Levels** — calculated from total points
- **Clean Sweep Bonus** — 10 pts for completing everything planned
- **Comebacks** — detects inactivity and shows encouraging prompts
--------new feature: remove suck factor and add in 7 day average.

---

## UI Accessibility Audit

### Screens Not Accessible to Users

| Screen | File | Status | Notes |
|---|---|---|---|
| **ChallengesScreen** | `screens/Challenges/ChallengesScreen.tsx` | Orphaned | Not registered in any navigator |
| **ProgressScreen** | `screens/Progress/ProgressScreen.tsx` | Orphaned | Not registered in any navigator |
| **InspirationFeedScreen** | `screens/Community/InspirationFeedScreen.tsx` | Disabled | CommunityStack not added to MainTabs; `SHOW_COMMUNITY = false` in featureFlags.ts |

### Screens Registered in Navigation but Have No Clear UI Entry Point

| Screen | Notes |
|---|---|
| **DayDetailScreen** | Registered in GoalsStack but no visible button navigates to it |
| **ReflectionDetailScreen** | Registered in GoalsStack, appears to be deep-link only |
| **ReflectionEntryScreen** | Registered in GoalsStack, appears to be deep-link only |

### Hidden Home Layout Sections (Configured Off, Not Deleted)

These sections exist in code but are in the `HIDDEN_SECTIONS` set in `src/constants/homeLayout.ts` — kept for backward compatibility but not shown to users:

- `identity_summary`, `goals`, `willpower_summary`, `daily_challenges`, `habits`, `programs`, `extended_challenges`, `buddy_invites`, `team_activity`

### Features With Disabled Code
- **CommunityStack** (`src/navigation/CommunityStack.tsx`) — fully built but not wired into `MainTabs.tsx`. Re-enable by setting `SHOW_COMMUNITY = true` in `src/constants/featureFlags.ts` and importing the stack in MainTabs.

---

## Tech Stack

- **Frontend**: React Native 0.81, React 19, TypeScript, Expo 54
- **Navigation**: React Navigation 7 (bottom tabs + native stack)
- **Backend**: Firebase (Firestore, Auth, Cloud Functions)
- **Auth**: Google Sign-In + email/password
- **Notifications**: Expo Notifications (push, scheduled, timezone-aware)
- **State**: React Context (Auth, Walkthrough) + service functions — no Redux

---

## Codebase Organization

```
src/
├── screens/          # All UI screens (organized by feature)
├── navigation/       # Stack & tab navigators
├── services/         # Firebase Firestore service layer (~38 service files)
├── components/       # Reusable UI components (organized by feature)
├── context/          # React Context (Auth, Walkthrough)
├── types/            # TypeScript interfaces
├── constants/        # Theme, walkthrough steps, home layout
├── data/             # Static seed data (worksheets, programs, challenges, tidbits)
├── hooks/            # Custom React hooks
└── utils/            # Utility functions (date, alerts, haptics, etc.)
```

~38 Firestore service files, well-typed with TypeScript. Clear separation: `screens/` → `components/` → `services/` → `data/` (seed data). Home tab alone has 45+ screens.

### Firestore Database Structure

```
users/{userId}/
├── (main user doc) — email, username, timezone, willpower stats, home layout, etc.
├── challenges/
├── habits/
├── goals/
├── programs/programEnrollments/
├── programs/programBadges/
├── worksheets/
├── whyProfile/
├── completionLogs/
├── dailyReflections/
├── dailyPlans/
├── microGoals/
└── coachProfile/

Global Collections:
├── programs           — Program templates (system + coach-created)
├── libraries/challenges — Challenge library
├── libraries/tidbits  — Neuroscience tidbits
├── teams              — Accountability groups
├── inspirationFeed    — Public activity feed
├── challengeSubmissions
└── challengeReviews
```

---

## User Onboarding Flow

1. Auth (Google or email)
2. **Why Discovery** onboarding (4-stage purpose discovery) — if first time
3. **Walkthrough** (6-step guided tour with spotlight overlays) — if first time
4. Main app

---

## Deployment

- **JS/App changes**: EAS OTA update — `eas update --branch production --message "description"` (30-60 sec, delivered on next app launch)
- **Native module changes**: Full EAS build → App Store submission
- **Firebase**: `firebase deploy --only functions,firestore:indexes`
- **Project ID**: `version-2-4afa1`

---

## Willpower Points Reference

| Activity | Points |
|---|---|
| Daily challenge | 1-5 (user-rated) |
| Habit completion | 2-5 (by difficulty) |
| Micro-goal | 3 |
| Program day | 1-5 |
| Clean sweep bonus | 10 |
| Streak multiplier | 1.5x @ 7 days, 2x @ 21 days |

Level = total points ÷ 100 (rounded down)
