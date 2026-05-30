# Neuro-Nudge Technical Debt & Performance Audit

**Date:** 2026-05-30

---

## 1. Architecture & Organization

### CRITICAL — God Components
| Screen | Lines | Issue |
|--------|-------|-------|
| GoalDashboardScreen.tsx | ~897 | 10+ useState, inline date utilities, 287-line StyleSheet, calendar logic, Firestore queries all in one file |
| HomeScreen.tsx | ~821 | 18 useState hooks, 172-line `loadData()` with 10+ parallel queries, 11 useCallback handlers, 8 modal states, points/habit/willpower business logic mixed in |

### HIGH — No Shared Hooks Directory
No `src/hooks/` directory exists. These patterns are duplicated across 15+ screens:
- **Firestore data loading**: `useState` + `useFocusEffect` + `useCallback` + `Promise.all` + try/catch — repeated in HomeScreen, ProgressScreen, TeamScreen, GoalDashboardScreen, etc.
- **Modal state management**: Boolean `useState` pairs with show/hide handlers — HomeScreen has 8 modal states alone
- **Date utilities**: `formatDate`, `getDaysRemaining`, `toYYYYMMDD` defined inline in GoalDashboardScreen.tsx:34-49 instead of using `utils/date.ts`

### MEDIUM — Business Logic in UI
- HomeScreen.tsx:391-509: Habit completion mixes points calculation, streak multipliers, tier milestones, willpower updates, and modal sequencing
- GoalDashboardScreen.tsx:52-66: Firestore query helper (`getActivityDates`) defined inside component
- HomeScreen.tsx:612-660: `homeData` and `homeCallbacks` objects created fresh every render

### Strengths
- **Service layer**: Well-designed, 33 thin Firestore wrapper files — screens don't call Firestore directly
- **Theme system**: Excellent consistency (9.5/10) — Colors, Fonts, Spacing used everywhere, no hardcoded values found
- **Navigation**: Clean, well-organized stack/tab structure
- **GoalDashboardScreen could decompose** into ~8 sub-components (StatusBadge, IdentityCard, FollowThroughCard, ActivityCalendar, Timeline, CBTCard, ItemsList, Actions)

---

## 2. Performance Issues

### CRITICAL — HomeScreen Data Loading
HomeScreen.tsx:182-334 fires **30+ Firestore queries on every tab focus** via `useFocusEffect`:
- 10 parallel queries in initial `Promise.all`
- Then activates scheduled challenges + converts planned items
- Then 7 more `getTomorrowPlan` calls
- Then weekly counts + habit streaks
- Then reflection status
- **No caching** — every tab switch re-fetches everything

### HIGH — Zero `React.memo` Usage
**0 components in the entire codebase use `React.memo`**. Key missing spots:
- `PlannedItemRow`, `DailyCheckInList`, all HomeScreen section components
- `homeData` and `homeCallbacks` are fresh objects on every render, breaking any downstream memoization
- `GoalHealthCard` receives complex props without memo

### HIGH — AuthContext Re-renders
AuthContext.tsx:53: Context value `{ user, userProfile, loading, refreshProfile }` is created inline — every subscriber re-renders on any value change. Should be wrapped in `useMemo`.

### MEDIUM — Inline Functions in JSX
20+ instances across screens creating new functions every render:
- ManageHabitsScreen.tsx:158-171: `.map()` with `onPress={() => setTimesPerWeek(n)}`
- TodaysPlanCard.tsx:256-278: Unplanned habits map
- DailyCheckInList.tsx:79: `onPress={() => onCheckIn(milestone.day_number)}`

### MEDIUM — Waterfall Promise.all
NightlyReflectionScreen.tsx: 3 sequential `Promise.all` calls that could be combined into one

### Positive
- **No Firestore listener leaks** — all data uses one-time `getDocs()`, no `onSnapshot` subscriptions
- **FlatList used correctly** in ManageHabitsScreen, InspirationFeedScreen

---

## 3. TypeScript Hygiene

### CRITICAL — `any` Usage: 121+ occurrences across 77 files

| Category | Count | Files |
|----------|-------|-------|
| `useNavigation<any>()` | 21 | 21 screens |
| `NativeStackScreenProps<any>` | 42 | 42 screens |
| `: any` annotations | 87 | 51 files |
| `as any` assertions | 34 | 24 files |
| **Total** | **121+** | **77** |

**Biggest gap**: No navigation `ParamList` types exist. 63 files use untyped navigation.

### HIGH — Weak Types
- 26 `Record<string, any>` usages across 13 files (services and screens)
- Worksheet screens have raw `navigation: any; route: any` props
- GoalActionsSection.tsx:506-507: `program: any; todaysProgramDay: any`
- Mock Firestore has 12 instances of `any` in test infrastructure

### HIGH — Error Handling Pattern
25+ catch blocks use `catch (error: any)` instead of `catch (error: unknown)` with type guards

### MEDIUM — Non-null Assertions
10 `!` assertions in 5 files (OnboardingScreen, CompleteChallengeScreen, WeekDayCard, ToolConversationScreen)

### Positive
- **No `@ts-ignore` or `@ts-nocheck`** anywhere
- Core types in `src/types/index.ts` are comprehensive and well-structured
- No type duplication across files — centralized types properly exported
- Service layer has excellent return type annotations

---

## 4. Firebase / Data Layer

### CRITICAL — N+1 Queries in Cloud Functions
functions/src/index.ts:
- **`morningChallengeReminder` & `eveningChallengeReminder`** (lines 94-327): Fetch ALL users with `db.collection("users").get()`, then for EACH user run 3 nested queries. With 10k users = 30k+ reads per hourly execution.
- **`checkMicroCommitmentFollowUps`** (lines 840-921): Same pattern — all users, then per-user subcollection query + individual updates

### CRITICAL — Repeated Full Dataset Downloads
Completion logs are fetched 3 separate times on HomeScreen load:
1. `getWeeklyCompletionCounts()` — fetches ALL nudge logs
2. `getHabitsStreaks()` — fetches ALL nudge logs again
3. `computeGoalFollowThrough()` — fetches ALL completionLogs again

For a user with 500 logs, this downloads the same dataset 3x.

### HIGH — Missing Query Limits
- `getPastChallenges()` fetches ALL challenges, slices client-side — needs `.limit(50)`
- `getCompletionLogs()` fetches ALL logs with no date range — could be months of data
- `getTeamStats()` fetches ALL team activity ever — should limit to 90 days

### HIGH — No Caching Layer
- No React Query / SWR or similar
- Every screen navigation re-fetches data via `useFocusEffect`
- No local persistence for rarely-changing data (user profile, challenge library)

### MEDIUM — Client-Side-Only Validation
- Username validation only in client (`users.ts:112-123`) — can be bypassed
- `createBuddyChallengeInvite()` doesn't verify partner user exists
- No explicit auth validation in service functions — relies on app sending correct `userId`

### MEDIUM — Team N+1
teams.ts: `fetchUsernames()` does individual `getDoc()` per team member

---

## 5. Dead Code & Debt

### MEDIUM — Permanently Disabled Feature Flag
featureFlags.ts: `SHOW_COMMUNITY = false` — never toggled. Keeps 7 screens and 50+ service functions in the bundle:
- All of `src/screens/Community/` (TeamScreen, CreateTeamScreen, JoinTeamScreen, InspirationFeedScreen, etc.)
- `CommunityStack.tsx` exists but is never imported in MainTabs
- Services: `reviews.ts`, `submissions.ts`, `inspirationFeed.ts` — mostly unused

### LOW — Dead Code
- ChallengesScreen.tsx: Never registered in any navigator
- calendarExport.ts: `exportToCalendar()` imported but never called
- comebackLogs.ts: `getComebackLogs()` and `recordLogView()` never imported
- ProgressStack.tsx: `ReflectionEntryScreen` imported but never used

### Positive
- **Zero TODO/FIXME/HACK comments** in entire codebase
- **Zero commented-out code blocks**
- Modern patterns throughout (Firebase v9 modular, React Navigation v7, React 19)
- No deprecated APIs

---

## 6. Bundle & Asset Hygiene

### CRITICAL — Screenshots in Bundle
assets/screenshots/: ~2.5MB of App Store screenshots bundled in the app (IMG_9646.PNG at 566KB, etc.). These should be in a separate repo or CDN — they're never displayed in the app.

### MEDIUM — Logo Optimization
`Neuro-Nudge_Logo_Blue.png` is 203KB, referenced in 4+ navigation stacks. Could be compressed or converted to SVG.

### MEDIUM — Unused Dependencies
- `react-dom` (19.1.0) — not imported anywhere, only needed for web builds (~120KB)
- `react-native-web` (0.21.0) — not imported in source files (~100KB)

### MEDIUM — Debug Logging
153 `console.log` statements across 57 files. HomeScreen.tsx alone has 21. Should be stripped in production builds.

### LOW — Seed Data in Bundle
programSeedData.ts (2,619 lines) and challengeSeedData.ts (1,880 lines) are one-time seeding utilities that get bundled at runtime.

### Positive
- Firebase imports use modular tree-shakeable syntax
- No lodash or moment.js
- Font loading is non-blocking
- Admin stack is conditionally rendered

---

## Summary Scoreboard

| Area | Grade | Top Issue |
|------|-------|-----------|
| Architecture | **B-** | 2 god components, no shared hooks |
| Performance | **C** | 30+ queries per HomeScreen focus, zero React.memo |
| TypeScript | **C+** | 121+ `any` usages, no navigation types |
| Firebase/Data | **C-** | N+1 in Cloud Functions, triple log downloads, no caching |
| Dead Code | **A-** | Clean overall, just parked community feature |
| Bundle/Assets | **B** | 2.5MB screenshots, unused deps |

### Top 5 Highest-Impact Fixes
1. ~~**Cache completion logs** — fetch once, pass to multiple consumers (saves 2x redundant full-dataset downloads)~~ **COMPLETED** (2026-05-30) — Added `fetchAllNudgeLogs()` + pure computation functions in habits.ts; HomeScreen fetches once and derives weekly counts, streaks, and goal follow-through from cached data
2. ~~**Refactor Cloud Function scheduled jobs** — stop iterating all users; use triggers or batched queries~~ **COMPLETED** (2026-05-30) — Added timezone-filtered `getUsersAtHour()` helper; refactored 4 scheduled functions to query only relevant users; added batched writes for expireStaleChallenges
3. ~~**Add `useMemo` to HomeScreen** `homeData`/`homeCallbacks` + `React.memo` to section components~~ **COMPLETED** (2026-05-30) — Wrapped homeData/homeCallbacks in useMemo, converted 5 handlers to useCallback, added React.memo to all 7 section components
4. ~~**Create navigation `ParamList` types** — eliminates 63 `any` usages in one shot~~ **COMPLETED** (2026-05-30) — Created `src/types/navigation.ts` with typed ParamList for all 9 navigators (Root, Auth, MainTabs, Home, Goals, Progress, Worksheets, Settings, Admin); updated 50+ screen files to use typed Props; reduced navigation `any` from 63 to 2 (1 dead code, 1 cross-tab component); also fixed a missing `enrollmentId` param bug in GoalDashboardScreen surfaced by the typing
5. **Remove screenshots from bundle** — instant 2.5MB savings
