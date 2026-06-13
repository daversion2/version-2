# Neuro-Nudge — User Triggers & Notifications Reference

All triggers that cause something to be shown or sent to a user: push notifications, in-app modals, alerts, banners, and popups.

---

## Current Feature State

| Feature | Default Visibility | Notes |
|---|---|---|
| Greeting | **Active** | Visible by default in Welcome zone |
| Your Why Summary | **Hidden (hardcoded)** | Registered in layout as visible, but component returns `null` — effectively disabled. Code preserved for future re-enablement. |
| Goals & Actions | **Active** | Main hub for challenges, habits, programs; visible by default |
| Nightly Reflection | **Active** | Reflection Banner section visible by default |
| Fun Fact | **Active** | Neuroscience fun fact card visible by default |
| Today's Plan | **Hidden by default** | In `HIDDEN_SECTIONS` in homeLayout.ts; can be re-enabled via Customize Home |
| Micro-exercises / Sprints | **Hidden by default** | In `HIDDEN_SECTIONS` in homeLayout.ts; can be re-enabled via Customize Home |
| Programs | **Hidden by default** | In `HIDDEN_SECTIONS` in homeLayout.ts; can be re-enabled via Customize Home. Existing enrollments still work. |
| Habits | **Hidden by default** | In `HIDDEN_SECTIONS` in homeLayout.ts; can be re-enabled via Customize Home |
| Buddy Challenges | **Blocked** | `SHOW_COMMUNITY = false` in featureFlags.ts hides the "Do It With a Teammate" button on CreateChallengeScreen. No way to create new buddy challenges. |
| Teams | **Semi-accessible** | Screens exist in SettingsStack (Settings → My Team), but not surfaced prominently |
| Community/Inspiration Feed | **Blocked** | CommunityStack is defined but never imported into MainTabs — completely unreachable. Feed entries are still created in the background (via Cloud Function seeder and challenge completions). |

---

## Trigger Status Key

- **ACTIVE** — fires under normal app use for most users
- **CONDITIONAL** — fires only if user has enabled a hidden feature or has legacy data
- **DEAD** — can never fire; the feature that causes it is fully blocked

---

## Push Notifications (Cloud Functions)

REDO THIS
### 1. Morning Challenge Reminder — 8 AM (REDO THIS)
**Status: ACTIVE (fallback) / CONDITIONAL (program & habit variants)**

- **When**: Hourly Cloud Function fires at 8 AM in the user's local timezone
- **Requires**: User has `expoPushToken` and `timezone` stored in Firestore
- **Logic (priority order)**:
  1. **Active Program** → "Day X of [Program Name]" / "Time to check in for today's challenge."
     - *Status: CONDITIONAL — only fires for users with existing program enrollments or who manually enabled Programs via Customize Home*
  2. **Active Habits (no program)** → "Keep Building" / "You have X habit(s) to work on today. Keep building momentum."
     - *Status: CONDITIONAL — only fires for users with existing habits or who manually enabled Habits via Customize Home*
  3. **Fallback** → "Start Your Challenge" / "You haven't set today's challenge yet. What will you conquer today?"
     - *Status: ACTIVE — fires for the majority of users who have no program or habits*
- **File**: [functions/src/index.ts:87-173](functions/src/index.ts#L87-L173)

---

REDO THIS
### 2. Evening Reminder / Congrats — 8 PM (REDO THIS)
**Status: ACTIVE (challenge/fallback variants) / CONDITIONAL (program & habit variants)**

- **When**: Hourly Cloud Function fires at 8 PM (20:00) in the user's local timezone
- **Requires**: User has `expoPushToken` and `timezone`
- **Logic (priority order)**:
  1. **Active Program**:
     - Milestone completed today → "Amazing Work Today!" / "Day X of [Program Name] — done! X day(s) to go."
     - Milestone NOT completed → "Complete Day X" / "Don't forget Day X of [Program Name]. You're X% through!"
     - *Status: CONDITIONAL — same as above, requires active program enrollment*
  2. **Active Habits (no program)**:
     - All habits done → "All Habits Logged!" / "All habits logged today. Nice consistency."
     - Habits remaining → "Finish Strong" / "You still have X habit(s) left today. Finish strong."
     - *Status: CONDITIONAL — requires active habits*
  3. **Fallback (challenges)**:
     - Challenge active → "Complete Your Challenge" / "Don't forget to complete your challenge today. You've got this!"
     - Challenge completed → "Amazing Work Today!" / "You crushed your challenge! Keep the momentum going tomorrow."
     - *Status: ACTIVE — fires for most users*
- **File**: [functions/src/index.ts:179-320](functions/src/index.ts#L179-L320)

---

JM - DOES THIS HAVE THE "WANT TO UNPACK THIS" GO DEEPER WORKFLOW?
### 3. Challenge Failure Encouragement
**Status: ACTIVE**

- **When**: User's challenge document has `status` change TO `"failed"` in Firestore
- **Trigger type**: Firestore document update (event-driven)
- **Message**: "Growth Through Effort" / "Failure is part of the journey. The fact that you tried is what matters most. Every attempt builds your willpower."
- **File**: [functions/src/index.ts:326-370](functions/src/index.ts#L326-L370)

---

### 4. Team Activity Notification
**Status: CONDITIONAL**

- **When**: A new activity document is created under `teams/{teamId}/activity/{activityId}`
- **Trigger type**: Firestore document creation (event-driven)
- **Logic**: Notifies all team members *except* the person who completed the activity, but only if they have opted in to that notification type (`challenge_completions` or `habit_completions`)
- **Message**: "Team Activity" / "[Username] just completed a [challenge/habit]!"
- **Why conditional**: Teams are accessible from Settings → My Team, but not prominently surfaced. Most users will not be in teams.
- **File**: [functions/src/index.ts:377-469](functions/src/index.ts#L377-L469)

---

### 5. Buddy Challenge Invite
**Status: DEAD**

- **Why dead**: `SHOW_COMMUNITY = false` in [src/constants/featureFlags.ts](src/constants/featureFlags.ts) hides the "Do It With a Teammate" button on CreateChallengeScreen. No new buddy challenges can be created.
- **Message (if it were active)**: "Buddy Challenge Invite!" / "[Inviter Username] wants to do "[Challenge Name]" with you!"
- **File**: [functions/src/index.ts:476-514](functions/src/index.ts#L476-L514)

---

### 6. Buddy Challenge Nudge
**Status: DEAD**

- **Why dead**: No new buddy challenges can be created (`SHOW_COMMUNITY = false`), so this trigger has no path to fire.
- **Message (if it were active)**: "Buddy Nudge!" / "[Buddy Name] sent you a nudge. You've got this!"
- **File**: [functions/src/index.ts:520-563](functions/src/index.ts#L520-L563)

---

### 7. Buddy Challenge Both Complete
**Status: DEAD**

- **Why dead**: No new buddy challenges can be created (`SHOW_COMMUNITY = false`).
- **Message (if it were active)**: "Buddy Challenge Complete!" / "You both crushed "[Challenge Name]"! Check out your reflections."
- **File**: [functions/src/index.ts:570-625](functions/src/index.ts#L570-L625)

---

### 8. Micro-Commitment Follow-Up — 10 AM
**Status: ACTIVE**

- **When**: Hourly Cloud Function fires at 10 AM in user's local timezone; looks for micro-exercises completed *yesterday* where `commitment_follow_up_sent = false`
- **Requires**: User completed a micro-exercise with a commitment text the previous day
- **Message**: "How did your commitment go?" / "Yesterday you said: '[commitment text, truncated to 80 chars]'"
- **Deep link**: Opens `MicroExerciseFollowUp` screen with the original entry ID
- **Deduplication**: Sets `commitment_follow_up_sent = true` after sending to prevent repeats
- **File**: [functions/src/index.ts:861-942](functions/src/index.ts#L861-L942)

---

## In-App Modals & Popups

### 9. Points Popup Animation
**Status: ACTIVE**

- **When**: User completes a sprint (micro-goal) or habit
- **Display**: Animated "+X pts" text that floats upward and fades out over ~1500ms
- **Type**: Non-blocking floating popup (no interaction required)
- **Note**: Sprints and habits are hidden by default but can be re-enabled via Customize Home
- **File**: [src/components/common/PointsPopup.tsx](src/components/common/PointsPopup.tsx)

---

### 10. Points Alert Modal
**Status: CONDITIONAL**

- **When**: User completes a habit and no level-up or streak tier milestone was reached
- **Display**: Modal overlay with points earned, title, and message
- **Features**:
  - "Don't show for the rest of the day" checkbox
  - OK button to dismiss
- **Logic**: Respects user's "suppress for today" preference via `shouldShowPointsAlert()`
- **Why conditional**: Triggered by habit completion specifically; habits section is hidden by default
- **File**: [src/components/common/PointsAlertModal.tsx](src/components/common/PointsAlertModal.tsx)
- **Triggered from**: [src/screens/Home/HomeScreen.tsx:482-496](src/screens/Home/HomeScreen.tsx#L482-L496)

---

### 11. Level Up Popup
**Status: ACTIVE**

- **When**: User's willpower points reach a new level threshold
- **Display**: Full-screen modal overlay with:
  - "LEVEL UP!" title
  - Animated level badge (spring animation from 0 → 1 scale)
  - 20-piece confetti animation
  - Rotating star decoration
  - Pulsing glow effect
  - Message: "Your dedication is paying off! Keep pushing your limits."
  - "Continue" button to dismiss
- **File**: [src/components/common/LevelUpPopup.tsx](src/components/common/LevelUpPopup.tsx)

---

QUESTION HERE
### 12. Clean Sweep Popup (is this still there after we removed the sprints?)
**Status: ACTIVE**

- **When**: User completes all sprints (micro-goals) in a single day
- **Display**: Floating popup "Clean Sweep! +X bonus" that animates upward and fades out over ~2000ms
- **Type**: Non-blocking floating popup
- **File**: [src/components/home/CleanSweepPopup.tsx](src/components/home/CleanSweepPopup.tsx)
- **Triggered from**: [src/screens/Home/HomeScreen.tsx:549-553](src/screens/Home/HomeScreen.tsx#L549-L553)

---

### 13. Comeback Modal (Streak Broken)
**Status: ACTIVE**

- **When**: User returns to the Home screen and `currentStreak = 0` (streak has been broken) and user has at least one active goal with CBT data
- **Logic**: JM - IS THE RECOVERY PLAN STILL USED? I DONT THINK WE CREATE IT ANYMORE
  - Only shows once per session (tracked via ref to avoid repeated displays)
  - Surfaces CBT data from the user's first goal that has `recovery_plan`, `minimum_action`, or `inner_voice`
- **Display**:
  - Header: "Welcome Back" with refresh icon
  - "You planned for days like this."
  - **Recovery plan** (if set): "Your recovery plan: '[text]'"
  - **Minimum action** (highlighted): "Your worst-day win: '[text]'" + "Can you do just that today?"
  - **Inner voice** (if set): "Your inner voice might say: '[challenge]'" → "Remember: '[response]'"
  - Framing: "Missing a day is data, not failure. One action restarts everything."
- **Buttons**:
  - "Let's Go" — dismisses modal
  - "Want to unpack this? →" — opens `MicroExerciseFeelingScreen` with `trigger_context: 'comeback'`
- **File**: [src/components/home/ComebackModal.tsx](src/components/home/ComebackModal.tsx)
- **Triggered from**: [src/screens/Home/HomeScreen.tsx:259-269](src/screens/Home/HomeScreen.tsx#L259-L269)

---

JM - QUESTION ARE WE STILL USING THESE PROGRAMS? I LIKE THE IDEA BUT MAYBE THEY STAY AWAY FOR A WHILE
### 14. Program Check-In Modal
**Status: CONDITIONAL**

- **When**: User taps the "Check In" button on their active program day
- **Display**: Modal asking "Did you complete today's challenge?" with Yes/No options
- **Why conditional**: Programs section is hidden by default; only users who enrolled before or enabled via Customize Home will see this
- **File**: [src/components/program/ProgramCheckInModal.tsx](src/components/program/ProgramCheckInModal.tsx)
- **Triggered from**: [src/screens/Home/ProgramDashboardScreen.tsx:88-99](src/screens/Home/ProgramDashboardScreen.tsx#L88-L99)

---

### 15. Points Intro Modal (One-Time)
**Status: ACTIVE**

- **When**: User completes their first habit after onboarding, and `has_seen_points_intro` is not set
- **Display**: Modal overlay explaining the Willpower Points system:
  - Flash icon + "Willpower Points" title
  - Explains: streaks multiply points, harder days earn more, level up over time
  - Footer: "Just keep showing up. The points take care of themselves."
  - "Got it" button to dismiss
- **One-time**: Sets `has_seen_points_intro = true` after display; never shows again
- **File**: [src/components/common/PointsIntroModal.tsx](src/components/common/PointsIntroModal.tsx)
- **Triggered from**: [src/screens/Home/HomeScreen.tsx:435-444](src/screens/Home/HomeScreen.tsx#L435-L444)

---

### 16. Plan Intro Modal (One-Time)
**Status: ACTIVE**

- **When**: User lands on the Home screen for the first time after onboarding, and `has_seen_plan_intro` is not set
- **Display**: Modal overlay explaining habit action plans:
  - Clipboard icon + "Your habits have a game plan" title
  - Explains built-in action plans — cues, environment tweaks, minimum version for rough days
  - Tip: Tap "My Plan" on any habit to see it
  - "Got it" button to dismiss
- **One-time**: Sets `has_seen_plan_intro = true` after display; never shows again
- **Delay**: 800ms after Home screen mounts to let the screen render first
- **File**: [src/components/common/PlanIntroModal.tsx](src/components/common/PlanIntroModal.tsx)
- **Triggered from**: [src/screens/Home/HomeScreen.tsx:368-376](src/screens/Home/HomeScreen.tsx#L368-L376)

---

### 17. Goal Prompt Modal (Day 2)
**Status: ACTIVE**

- **When**: User's second app open (`app_open_count >= 2`), user has no active goals, and `has_dismissed_goal_prompt` is not set
- **Requires**: `has_seen_plan_intro = true` (prevents stacking with the Plan Intro modal)
- **Display**: Modal overlay prompting goal creation:
  - Flag icon + "Ready to set a goal?" title
  - "You've been building your habits — nice work. A goal gives them direction and purpose..."
  - "Set My Goal" button → navigates to GoalOnboardingFlow
  - "I'll do this later" link → dismisses
- **One-time**: Sets `has_dismissed_goal_prompt = true` on either action; never shows again
- **Delay**: 800ms after Home screen mounts
- **File**: [src/components/common/GoalPromptModal.tsx](src/components/common/GoalPromptModal.tsx)
- **Triggered from**: [src/screens/Home/HomeScreen.tsx:379-390](src/screens/Home/HomeScreen.tsx#L379-L390)

---

### 18. Challenges Unlock Modal (Day 3+)
**Status: ACTIVE**

- **When**: User completes their 3rd total habit (`totalHabitsCompleted >= 3`), and `has_seen_challenges_unlock` is not set
- **Display**: Celebration modal unlocking the Challenges feature:
  - Flash icon in orange circle + "Unlocked" badge + "Challenges" title
  - Explains neuroscience behind comfort-zone expansion and willpower
  - Flow description: "Pick or create a challenge, do it, reflect and lock it in."
  - "Browse Challenges" button → navigates to StartChallenge
- **One-time**: Sets `has_seen_challenges_unlock = true` after display; never shows again
- **File**: [src/components/common/ChallengesUnlockModal.tsx](src/components/common/ChallengesUnlockModal.tsx)
- **Triggered from**: [src/screens/Home/HomeScreen.tsx:447-457](src/screens/Home/HomeScreen.tsx#L447-L457)

---

### 19. Habit Tidbit Modal
**Status: ACTIVE**

- **When**: User completes a habit and a relevant neuroscience tidbit is available (selected based on streak days, difficulty)
- **Display**: Modal with neuroscience insight:
  - Flash icon + "Your brain right now" header
  - Tidbit text explaining what's happening neurologically
  - "Learn more" link (if extended text available) → opens TidbitLearnMore full-screen
  - "Got it" button to dismiss
- **Sequence**: Shows *before* the points popup — points animation fires after tidbit is dismissed
- **File**: [src/components/habits/HabitTidbitModal.tsx](src/components/habits/HabitTidbitModal.tsx)
- **Triggered from**: [src/screens/Home/HomeScreen.tsx:500-514](src/screens/Home/HomeScreen.tsx#L500-L514)

---

### 20. Reward Moment (Challenge Completion)
**Status: ACTIVE**

- **When**: User submits a challenge result (success or fail) on CompleteChallengeScreen
- **Display**: Full-screen animated reward overlay with:
  - Personalized reward message (from user's custom pool or global defaults)
  - Narrative line (goal-centric framing, identity statement on milestones, or inner voice victory on hard challenges)
  - Points earned with streak multiplier info
  - Buddy bonus points (if applicable)
  - Repeat milestone badge (5th, 10th, 25th, 50th, 100th completion of same challenge)
  - Neuroscience tidbit (on successful completions, context-aware)
  - Radial particle burst animation (24 particles)
  - Haptic feedback
- **Sequence**: After dismissal, fires any pending Level Up popup or Streak Milestone alert, then navigates home (with optional completion message prompt for inspiration feed)
- **File**: [src/components/reward/RewardMoment.tsx](src/components/reward/RewardMoment.tsx)
- **Triggered from**: [src/screens/Home/CompleteChallengeScreen.tsx:462-470](src/screens/Home/CompleteChallengeScreen.tsx#L462-L470)

---

### 21. Fun Fact Modal
**Status: ACTIVE**

- **When**: User taps the fun fact card on the Home screen
- **Display**: Modal overlay with:
  - Lightbulb icon + "Neuroscience Fun Fact" title
  - Daily fact text (rotates daily from Firestore)
  - Source link (opens in browser, if available)
  - "Share" button (native share sheet)
  - "Close" button
- **File**: [src/components/home/FunFactModal.tsx](src/components/home/FunFactModal.tsx)

---

## Conditional UI (Time-Based Display)

### 22. Nightly Reflection Banner
**Status: ACTIVE**

- **When**: Checks `new Date().getHours() >= 20` on Home screen render
- **Display changes based on time**:
  - **Before 8 PM**: Subtle card — small "Today's Recap" label with journal icon
  - **After 8 PM**: Prominent dark banner — "Today's Recap" with moon icon, subtitle showing action count across goals, and chevron arrow
  - **Already reflected**: Compact badge showing "Reflection complete" with grade badge
- **Type**: Conditional rendering (not a modal — always visible, prominence changes by time)
- **File**: [src/components/home/NightlyReflectionBanner.tsx:17-74](src/components/home/NightlyReflectionBanner.tsx#L17-L74)

---

## Native Alert Dialogs (React Native `Alert.alert`)

### 23. Onboarding Form Validation Errors
**Status: ACTIVE**

- **When**: User attempts to advance through deferred onboarding stages without completing required fields
- **Triggers by stage**:
  - Stage 1: Opening answer < 5 chars → "Required" / "Please share what brought you here."
  - Stage 2: "Why" iterations < minimum depth → "Keep going" / "Try to go at least [X] layer deep."
  - Stage 3: Why statement parts too short → "Required" / "Please complete the 'To...' part of your Why." or "Please complete the 'so that...' part of your Why."
  - Stage 4: Past attempts field empty → "Required" / "Please answer whether you've tried this before."
  - Stage 5: Inner voice fields empty → "Required" / "Please fill in both the inner voice and your response."
  - Stage 6: Minimum action or recovery plan empty → "Required" / "Please describe your smallest possible action." or "Please describe your recovery plan."
  - Stage 7: Identity statement empty → "Required" / "Please complete your identity statement."
- **File**: [src/screens/Auth/DeferredOnboardingScreen.tsx:163-205](src/screens/Auth/DeferredOnboardingScreen.tsx#L163-L205)

---

### 24. Challenge Submit — Result Not Selected
**Status: ACTIVE**

- **When**: User tries to submit a challenge completion without selecting "Success" or "Fail"
- **Message**: "Required" / "Please select success or fail."
- **File**: [src/screens/Home/CompleteChallengeScreen.tsx:204](src/screens/Home/CompleteChallengeScreen.tsx#L204)

---

### 25. Streak Milestone Alert
**Status: ACTIVE**

- **When**: User reaches a streak tier milestone on challenge or habit completion (e.g., 7-day, 30-day streak)
- **Message**: "Streak Milestone!" / "[X]-Day Streak: [Tier Name]!\n\nYou're now earning [Multiplier]x points on all activities!"
- **Note**: On challenges, this fires *after* the Reward Moment is dismissed. On habits, it fires after the points popup.
- **File (challenge path)**: [src/screens/Home/CompleteChallengeScreen.tsx:156-164](src/screens/Home/CompleteChallengeScreen.tsx#L156-L164)
- **File (habit path)**: [src/screens/Home/HomeScreen.tsx:477-481](src/screens/Home/HomeScreen.tsx#L477-L481)

---

### 26. Cancel Challenge Confirmation
**Status: ACTIVE**

- **When**: User taps the cancel button while viewing an active challenge
- **Message**: "Cancel Challenge" / "Are you sure you want to cancel this challenge? You will not be penalized."
- **Buttons**: "Yes, Cancel" / "Cancel" (dismiss)
- **On confirm**: Shows follow-up alert — "Challenge Cancelled" / "You can start a new challenge anytime."
- **File**: [src/screens/Home/CompleteChallengeScreen.tsx:170-186](src/screens/Home/CompleteChallengeScreen.tsx#L170-L186)

---

### 27. Program Failed — Screen Navigation
**Status: CONDITIONAL**

- **When**: Missed days on an active program exceed the allowed threshold
- **Display**: Full screen navigation to `ProgramFailed` screen (replaces current screen)
- **Why conditional**: Requires an active program enrollment; programs are hidden from default home layout
- **File**: [src/screens/Home/ProgramDashboardScreen.tsx:57-59](src/screens/Home/ProgramDashboardScreen.tsx#L57-L59)

---

### 28. Goals Migration Alert (One-Time)
**Status: ACTIVE (one-time only)**

- **When**: First Home screen load after a data migration runs (`runGoalsMigration()` returns `didMigrate = true`)
- **Message**: "Goals Update" / "Your existing challenges, habits, and programs have been organized under a "General" goal. You can reassign them to specific goals anytime."
- **One-time**: Only fires when migration actually runs — existing users who haven't been migrated yet will see this once
- **File**: [src/screens/Home/HomeScreen.tsx:183-189](src/screens/Home/HomeScreen.tsx#L183-L189)

---

### 29. Notification Permission Feedback
**Status: ACTIVE**

- **When**: User enables or disables push notifications in Settings
- **Messages**:
  - Permission denied → "Notifications" / "Could not enable notifications. Check device settings."
  - Permission granted → "Notifications" / "Reminders enabled! Token saved for push notifications."
  - Error during registration → "Error" / "Failed to enable notifications: [error]"
- **File**: [src/screens/Settings/SettingsScreen.tsx:46-59](src/screens/Settings/SettingsScreen.tsx#L46-L59)

---

### 30. Account Clear Confirmation
**Status: ACTIVE**

- **When**: User confirms clearing all account data in Settings
- **Flow**: Confirmation dialog → "Clear Account" / "This will delete ALL your data... This cannot be undone." → On confirm: "Account Cleared" / "Deleted X documents. You'll see onboarding again on next launch."
- **File**: [src/screens/Settings/SettingsScreen.tsx:62-82](src/screens/Settings/SettingsScreen.tsx#L62-L82)

---

## Deep-Link Triggered Screens

### 31. Micro-Exercise Follow-Up Screen
**Status: ACTIVE**

- **When**: User taps the 10 AM micro-commitment follow-up push notification (trigger #8)
- **Display**: Asks "Did you follow through?" with the user's original commitment text
- **Response states**:
  - "Did it" → checkmark + "That's a genuine win." + encouragement
  - "Not yet" → different encouragement message
  - Load error → "Couldn't load your commitment"
- **File**: [src/screens/MicroExercise/MicroExerciseFollowUpScreen.tsx:50-59](src/screens/MicroExercise/MicroExerciseFollowUpScreen.tsx#L50-L59)

---

## Full Summary

| # | Status | Type | Trigger | What's Shown |
|---|--------|------|---------|--------------|
| 1 | **ACTIVE** (fallback) / CONDITIONAL (program/habit variants) | Push | 8 AM daily | Morning reminder — content varies by user data |
| 2 | **ACTIVE** (fallback) / CONDITIONAL (program/habit variants) | Push | 8 PM daily | Evening reminder or congrats |
| 3 | **ACTIVE** | Push | Challenge marked failed | "Growth Through Effort" message |
| 4 | CONDITIONAL | Push | Team member completes activity | Team activity alert |
| 5 | ~~DEAD~~ | Push | Buddy challenge invite created | *Blocked — SHOW_COMMUNITY=false* |
| 6 | ~~DEAD~~ | Push | Buddy sends a nudge | *Blocked — SHOW_COMMUNITY=false* |
| 7 | ~~DEAD~~ | Push | Both buddies complete challenge | *Blocked — SHOW_COMMUNITY=false* |
| 8 | **ACTIVE** | Push | 10 AM (day after micro-exercise) | Micro-commitment follow-up |
| 9 | **ACTIVE** | Floating popup | Sprint/micro-goal or habit completed | "+X pts" animation |
| 10 | CONDITIONAL | Modal | Habit completed, no milestone | Points earned alert |
| 11 | **ACTIVE** | Modal (full-screen) | New willpower level reached | "LEVEL UP!" with confetti |
| 12 | **ACTIVE** | Floating popup | All sprints done today | "Clean Sweep! +X bonus" |
| 13 | **ACTIVE** | Modal | Streak = 0, user opens Home, has goal with CBT data | "Welcome Back" with recovery data |
| 14 | CONDITIONAL | Modal | User taps Check In on program | Program check-in prompt |
| 15 | **ACTIVE** | Modal (one-time) | First habit completion after onboarding | "Willpower Points" intro explainer |
| 16 | **ACTIVE** | Modal (one-time) | First Home screen landing after onboarding | "Your habits have a game plan" intro |
| 17 | **ACTIVE** | Modal (one-time) | Second app open, no goals | "Ready to set a goal?" prompt |
| 18 | **ACTIVE** | Modal (one-time) | 3rd habit completion | "Challenges Unlocked" celebration |
| 19 | **ACTIVE** | Modal | Habit completed, tidbit available | "Your brain right now" neuroscience tidbit |
| 20 | **ACTIVE** | Modal (full-screen) | Challenge result submitted | Reward Moment with points, narrative, tidbit |
| 21 | **ACTIVE** | Modal | User taps fun fact card | Neuroscience fun fact with source + share |
| 22 | **ACTIVE** | Banner (time-based) | Time ≥ 8 PM | Prominent "Today's Recap" banner |
| 23 | **ACTIVE** | Alert | Onboarding field validation fails | Field-specific error message |
| 24 | **ACTIVE** | Alert | Challenge submitted without result | "Please select success or fail" |
| 25 | **ACTIVE** | Alert | Streak tier milestone hit | "Streak Milestone!" with multiplier info |
| 26 | **ACTIVE** | Alert (confirm) | User taps cancel on challenge | Cancel confirmation + success alert |
| 27 | CONDITIONAL | Screen navigation | Program missed days exceed limit | `ProgramFailed` screen |
| 28 | **ACTIVE** (one-time) | Alert | First load after data migration | Goals reorganization notice |
| 29 | **ACTIVE** | Alert | Notification toggle in Settings | Permission granted/denied feedback |
| 30 | **ACTIVE** | Alert | Account clear in Settings | Deletion confirmation |
| 31 | **ACTIVE** | Screen | Tap micro-commitment push notif | Follow-up prompt with commitment text |
