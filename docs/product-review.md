# Neuro-Nudge: Full Product Review

_May 31, 2026 — Focus: day-to-day UX experience_

_Note: Trigger/notification logic, contextual surfacing of CBT data, and push notification configuration are out of scope for this pass. Those will be addressed in a separate rules/trigger configuration layer._

## What the app is

A CBT-informed habit-building app that uses daily challenges, habits, structured programs, worksheets, and neuroscience education to help users build willpower. It has a gamification layer (points, streaks, multipliers) and a goal system that ties everything together.

---

## What works well

### 1. The goal creation flow is excellent
The 5-step flow (Name → Why → Measurement → Obstacles → Commit) is the best part of the app. It's grounded in real psychology — identity statements, implementation intentions, obstacle planning, visualization. This is genuinely well-designed CBT work.

### 2. Home screen architecture is clean
The zone-based layout (Welcome → Today's Actions → Reflect) with items grouped under goals makes the daily experience clear. Users can see exactly what they need to do under each goal, with follow-through badges and weekly progress.

### 3. Positive framing throughout
"Not Yet" instead of "Failed," "Growth Through Effort" on challenge failure, comeback modal for streak breaks — this is trauma-informed and appropriate for the target population.

### 4. The reward sequence is well-choreographed
Habit complete → tidbit → learn more → points popup → streak milestone alert. Each step has its purpose and they chain cleanly.

### 5. Action plans on habits
The cue/environment/obstacle/minimum/accountability structure with expandable "My Plan" on each habit row is behavioral science done right.

---

## Critical issues (things that feel broken or contradictory)

### 1. Challenge and habit creation aren't connected to goals
When you tap "+ Challenge" or "+ Habit" under a goal on the home screen, it navigates to `StartChallenge` or `ManageHabits` — generic screens with no goal context passed. The user has to manually tag the goal during creation. This breaks the mental model: "I'm adding something to THIS goal" but the flow doesn't carry that through.

### 2. Challenges are locked behind 3 habit completions
The `challengesUnlocked` gate (`totalHabitsCompleted >= 3`) hides all challenge UI until the user completes 3 habits.

**Update:** An unlock teaser has been added showing "X habits away from unlocking Challenges" — this addresses the discoverability gap.

### 3. No habit deletion
The habits service has no `deleteHabit()` function. Users can create habits but there's no way to remove them from the data layer. The `ManageHabitsScreen` likely has a delete button that either silently fails or doesn't exist, leaving users stuck with habits they no longer want.

---

## UX flow issues (things that feel disconnected)

### 4. Home tab and Goals tab show overlapping but different views of the same data
- Home shows goals with their linked habits/challenges inline, follow-through badges, weekly counts
- Goals tab shows the same goals as cards with follow-through bars, linked item counts, measurement progress

A user looking at both tabs sees the same information presented differently. The Goals tab doesn't add much that the Home screen doesn't already show. It could be a stronger dedicated "goal management" space — archive/complete goals, reorder them, see historical trends — rather than a second summary view.

### 5. The Progress tab exists but isn't navigable from the home screen
The `__progressTab` navigation hack goes to Goals, not Progress. There's no obvious way to jump from the home screen to the Progress tab. For a behavior change app, reflection on past progress should be a first-class action, not hidden in a tab you have to discover.

### 6. "Plan Your Week" planner exists but has unclear value
The `PlannerBar` at the top of the goal actions area links to `WeeklyPlanner`. But the home screen already shows habits with "Today" badges, "Planned for Wed" labels, and challenge rows. It's not clear what the planner adds that the home screen doesn't already handle, or why a user would go there.

### 7. Programs are hidden by feature flag
`HIDDEN_SECTIONS` hides programs from the default layout. Existing enrollments still work (there's a ProgramRow in GoalActionsSection), but new users can't discover programs. If they're not ready for production, the ProgramRow rendering for active enrollments should still work, but the discovery path is dead.

---

## Missing pieces

### 8. No "today view" or daily summary
The home screen shows everything by goal, which is good for goal-level thinking but bad for daily planning. There's no view that simply answers: "What do I need to do today?" The `TodaysPlanCard` component exists in the components but doesn't appear to be in the active home layout sections.

### 9. No way to add a challenge or habit directly from the Goal Dashboard
The GoalDashboardScreen shows linked items but has no "+ Add Challenge" or "+ Add Habit" button. Users have to go back to the home screen and use the add buttons there (which, as noted in #1, don't carry goal context anyway).

### 10. `done_by_date` measurement type has no automatic tracking
For goals with a "reach a number" measurement, users can log progress via `LogProgressModal`. But for "done by date" goals, there's no measurement logging at all — the measurement progress section only renders for `reach_number`. These goals just show follow-through rate, which doesn't capture whether the actual deadline-based deliverable was completed.

### 11. The greeting section is impersonal
`GreetingSection` shows "Good morning" / "Good afternoon" / "Good evening" but doesn't include the user's name. The `userProfile` has a `username` field. "Good morning, Jon" would be a small but meaningful personalization.

---

## Data layer concerns

### 12. No transactions on multi-document operations
Buddy challenge completion, program completion, and goal creation with actions all modify multiple Firestore documents without transaction wrappers. A failure mid-sequence leaves partial state. Low frequency but real risk.

### 13. Completion logs for habits are never cleaned up
Deleting a challenge properly deletes its logs. But habits have no delete function, and even if one were added, there's no cleanup logic for orphaned completion logs. This inflates historical stats.

### 14. `computeGoalFollowThrough` runs on every screen load
Both HomeScreen and GoalsScreen call `computeGoalFollowThrough` for every active goal on every focus event. This makes 3+ Firestore queries per goal per screen visit. Consider caching this value on the goal document itself and updating it on activity completion.

---

## Priorities

| Priority | What | Why |
|----------|------|-----|
| 1 | **Pass goal context through challenge/habit creation** | When tapping "+ Challenge" under a goal, pre-select that goal in the creation flow. |
| 2 | **Add habit deletion** | Basic CRUD gap. Users need to remove habits they've outgrown. |
| 3 | **Add "+ Challenge / + Habit" to GoalDashboard** | Let users manage goal items from the goal detail screen. |
| 4 | **Differentiate the Goals tab** | Make it a management view (archive, reorder, compare) rather than a second summary of the home screen. |
| 5 | **Personalize the greeting** | "Good morning, Jon" takes 5 minutes and changes the feel. |
| 6 | **`done_by_date` measurement handling** | These goals currently have no way to track whether the deliverable was actually completed. |

---

## Summary

The app has a strong foundation — the architecture is clean, the behavioral science is real, and the goal creation flow is genuinely good. The main day-to-day UX gaps are around navigation flow (goal context not carrying through to creation screens, Goals tab duplicating the Home screen) and missing CRUD operations (habit deletion). Once the core daily experience is tight, a trigger/rules layer can be added to surface the right CBT data at the right moments.
