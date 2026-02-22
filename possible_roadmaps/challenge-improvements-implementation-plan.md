# Challenge Improvements Implementation Plan

**Scope:** 4 approved changes to the challenge system
**Created:** February 2026

---

## Approved Changes

| # | Change | Description |
|---|--------|-------------|
| 2 | Extended Challenges | Add multi-day challenges with duration and milestone markers |
| 5 | Failure Reflection | Add specific "What got in the way?" prompt when marking failed |
| 7 | Repeat Tracking | Track how many times a challenge has been completed |
| 9 | Milestone Progress | Every day of an extended challenge is automatically a milestone |

---

## Critical Codebase Context

Before implementing, be aware of these existing patterns:

### Existing Challenge Interface (src/types/index.ts)
```typescript
export type ChallengeStatus = 'active' | 'completed' | 'failed' | 'archived' | 'cancelled';

export interface Challenge {
  id: string;
  user_id: string;
  name: string;
  category_id: string;              // NOTE: Stores category NAME, not ID
  date: string;                      // YYYY-MM-DD
  difficulty_expected: number;       // 1-5
  status: ChallengeStatus;
  difficulty_actual?: number;
  points_awarded?: number;
  reflection_note?: string;
  reflection_hardest_moment?: string;  // Defined but NOT used in UI
  reflection_push_through?: string;    // Defined but NOT used in UI
  reflection_next_time?: string;       // Defined but NOT used in UI
  created_at: string;
  completed_at?: string;
  description?: string;
  success_criteria?: string;
  why?: string;
  deadline?: string;                 // ISO 8601 timestamp
}
```

### Key Service Patterns (src/services/challenges.ts)
- Firestore path: `users/{userId}/challenges/`
- `getActiveChallenge()` returns single active challenge (limit 1)
- `createChallenge()` throws error if active challenge exists
- `completeChallenge()` creates CompletionLog entry automatically
- Only `reflection_note` is saved via `saveReflectionAnswers()`

### Points Calculation (src/services/willpower.ts)
- `calculateChallengePoints(difficulty, streakDays, hasReflection)` applies streak multiplier
- `calculateFailedChallengePoints(streakDays, hasReflection)` uses base of 1
- Reflection bonus: +1 point if `reflection_note` is non-empty

### Navigation (src/navigation/HomeStack.tsx)
- Route names: 'Home', 'StartChallenge', 'CreateChallenge', 'CompleteChallenge', 'PastChallenges', etc.
- CompleteChallenge expects `route.params.challenge` as Challenge object

---

## Change #2 & #9: Extended Challenges with Daily Milestones

These are tightly coupled and will be implemented together.

**Key Design Decision:** Every day of an extended challenge is automatically a milestone. This creates a simple, consistent model where users check in daily to mark their progress.

### Data Model Changes

**File:** `src/types/index.ts`

```typescript
// Add new type
export type ChallengeType = 'daily' | 'extended';

// Add new interface for daily milestones (one per day)
export interface ChallengeMilestone {
  id: string;
  day_number: number;         // Day 1, Day 2, Day 3, etc.
  completed: boolean;
  completed_at?: string;      // ISO 8601
  note?: string;              // Optional daily reflection/note
}

// Update Challenge interface - add these fields:
export interface Challenge {
  // ... existing fields ...

  // NEW FIELDS
  challenge_type: ChallengeType;        // 'daily' (default) or 'extended'
  duration_days?: number;               // For extended: how many days (e.g., 7)
  milestones?: ChallengeMilestone[];    // For extended: one milestone per day, auto-generated
  start_date?: string;                  // For extended: when challenge began
  end_date?: string;                    // For extended: calculated end date
}
```

### Service Changes

**File:** `src/services/challenges.ts`

**New Functions:**
```typescript
import { doc, updateDoc, query, where, getDocs, collection, limit } from 'firebase/firestore';
import { db } from './firebase';

// Auto-generate milestones for duration
export function generateMilestones(durationDays: number): ChallengeMilestone[] {
  return Array.from({ length: durationDays }, (_, i) => ({
    id: `day-${i + 1}`,
    day_number: i + 1,
    completed: false,
  }));
}

// Get active extended challenge (separate from daily)
export async function getActiveExtendedChallenge(
  userId: string
): Promise<Challenge | null> {
  const q = query(
    collection(db, 'users', userId, 'challenges'),
    where('status', '==', 'active'),
    where('challenge_type', '==', 'extended'),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Challenge;
}

// Mark a daily milestone as complete
export async function completeMilestone(
  userId: string,
  challengeId: string,
  dayNumber: number,
  succeeded: boolean,
  note?: string
): Promise<void> {
  const challengeRef = doc(db, 'users', userId, 'challenges', challengeId);
  const challenge = await getChallengeById(userId, challengeId);
  if (!challenge || !challenge.milestones) throw new Error('Challenge not found');

  const updatedMilestones = challenge.milestones.map(m =>
    m.day_number === dayNumber
      ? { ...m, completed: true, completed_at: new Date().toISOString(), succeeded, note }
      : m
  );

  await updateDoc(challengeRef, { milestones: updatedMilestones });
}

// Check if all milestones are complete
export function areAllMilestonesComplete(milestones: ChallengeMilestone[]): boolean {
  return milestones.every(m => m.completed);
}

// Calculate current day of extended challenge
export function getCurrentDayNumber(startDate: string): number {
  const start = new Date(startDate);
  const today = new Date();
  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // Day 1 is the start date
}
```

**Updated Functions:**

```typescript
// Update createChallenge signature to accept new fields:
export async function createChallenge(
  userId: string,
  data: Omit<Challenge, 'id' | 'user_id' | 'status' | 'created_at'>
): Promise<string> {
  // IMPORTANT: Update validation logic
  // - If challenge_type === 'daily' (or undefined for backwards compat):
  //   Check getActiveChallenge() - throw if exists
  // - If challenge_type === 'extended':
  //   Check getActiveExtendedChallenge() - throw if exists

  // For extended challenges, auto-generate milestones:
  if (data.challenge_type === 'extended' && data.duration_days) {
    data.milestones = generateMilestones(data.duration_days);
    data.start_date = new Date().toISOString().split('T')[0];
    // Calculate end_date
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + data.duration_days - 1);
    data.end_date = endDate.toISOString().split('T')[0];
  }

  // ... rest of existing createChallenge logic
}
```

### Screen Changes

#### CreateChallengeScreen Updates

**File:** `src/screens/Home/CreateChallengeScreen.tsx`

**New UI Elements:**

```
┌─────────────────────────────────────────┐
│ New Challenge                           │
├─────────────────────────────────────────┤
│                                         │
│ Challenge Type                          │
│ ┌─────────────┐  ┌─────────────┐       │
│ │   Daily     │  │  Extended   │       │
│ │  (1 day)    │  │ (Multi-day) │       │
│ └─────────────┘  └─────────────┘       │
│                                         │
│ [If Extended selected:]                 │
│                                         │
│ How many days?                          │
│ ┌───┐ ┌───┐ ┌───┐ ┌────┐ ┌────┐       │
│ │ 3 │ │ 7 │ │14 │ │ 21 │ │ 30 │       │
│ └───┘ └───┘ └───┘ └────┘ └────┘       │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ℹ️ You'll check in each day to     │ │
│ │   mark your progress. Every day    │ │
│ │   completed earns you points!      │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Preview:                                │
│ ○ Day 1  ○ Day 2  ○ Day 3  ○ Day 4    │
│ ○ Day 5  ○ Day 6  ○ Day 7             │
│                                         │
│ ... existing fields (name, category,   │
│     difficulty, description, etc.) ... │
│                                         │
└─────────────────────────────────────────┘
```

**New State:**
```typescript
const [challengeType, setChallengeType] = useState<'daily' | 'extended'>('daily');
const [durationDays, setDurationDays] = useState(7);
// Milestones auto-generated based on durationDays, no state needed
```

**New Components Needed:**

1. **ChallengeTypeSelector** - Two-button toggle (Daily / Extended)
2. **DurationSelector** - Chip-style buttons for common durations (3, 7, 14, 21, 30) + custom input
3. **MilestonePreview** - Simple visual showing the days (circles representing each day)

**Behavior:**
- Default to "Daily" (current behavior)
- When "Extended" selected, show duration selector
- Milestones auto-generated (no user customization needed)
- Preview shows visual representation of the X days

#### New Screen: ExtendedChallengeProgressScreen

**File:** `src/screens/Home/ExtendedChallengeProgressScreen.tsx`

**Purpose:** View and update daily progress on an active extended challenge

```
┌─────────────────────────────────────────┐
│ ← Back                                  │
├─────────────────────────────────────────┤
│                                         │
│ No Social Media for 7 Days              │
│ Day 4 of 7                              │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ████████████░░░░░░░  57% (4/7)     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Daily Check-ins                         │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ✓ Day 1                    Feb 18  │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ ✓ Day 2                    Feb 19  │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ ✓ Day 3                    Feb 20  │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ ✓ Day 4                    Feb 21  │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ ○ Day 5                            │ │
│ │   [Check In Today]                 │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ ○ Day 6                            │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ ○ Day 7                            │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ─────────────────────────────────────── │
│                                         │
│ [End Challenge Early]                   │
│                                         │
└─────────────────────────────────────────┘
```

**Daily Check-in Flow (when tapping "Check In Today"):**

```
┌─────────────────────────────────────────┐
│              Day 5 Check-in             │
├─────────────────────────────────────────┤
│                                         │
│ Did you stick to your challenge today?  │
│                                         │
│ ┌─────────────┐  ┌─────────────┐       │
│ │     ✓      │  │     ✗      │       │
│ │    Yes     │  │     No     │       │
│ └─────────────┘  └─────────────┘       │
│                                         │
│ Quick note (optional)                   │
│ ┌─────────────────────────────────────┐ │
│ │ How did today go?                   │ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Confirm Check-in]                      │
│                                         │
└─────────────────────────────────────────┘
```

**Features:**
- Progress bar showing days completed / total days
- List of all days with completion status
- Current day highlighted with "Check In Today" button
- Past days show completion date
- Future days shown but not actionable
- "End Challenge Early" option (calculates partial completion)
- When final day checked in, trigger full completion flow with reflection

**Points System for Extended Challenges:**
- Each daily check-in: +1 point (base)
- Completing all days: +bonus points based on difficulty
- Streak multiplier applies to daily check-ins

#### HomeScreen Updates

**File:** `src/screens/Home/HomeScreen.tsx`

**Changes:**
- Show both active daily challenge AND active extended challenge (if exists)
- Extended challenge card shows progress and today's check-in status
- Tap extended challenge card → navigate to ExtendedChallengeProgressScreen

```
┌─────────────────────────────────────────┐
│ Today's Challenge                       │
│ ┌─────────────────────────────────────┐ │
│ │ Cold Shower                         │ │
│ │ Difficulty: 3                       │ │
│ │ [Complete Challenge]                │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Extended Challenge                      │
│ ┌─────────────────────────────────────┐ │
│ │ No Social Media for 7 Days          │ │
│ │ Day 5 of 7                          │ │
│ │ ████████████░░░░░░░  57% (4/7)     │ │
│ │                                     │ │
│ │ ○ Today's check-in: Not done       │ │
│ │ [Check In Now]                      │ │
│ └─────────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

**Or if already checked in today:**

```
│ Extended Challenge                      │
│ ┌─────────────────────────────────────┐ │
│ │ No Social Media for 7 Days          │ │
│ │ Day 5 of 7                          │ │
│ │ █████████████░░░░░░  71% (5/7)     │ │
│ │                                     │ │
│ │ ✓ Checked in today!                │ │
│ │ [View Progress]                     │ │
│ └─────────────────────────────────────┘ │
```

#### StartChallengeScreen Updates

**File:** `src/screens/Home/StartChallengeScreen.tsx`

**Changes:**
- Add fourth option: "Start Extended Challenge"
- Or: integrate into CreateChallengeScreen with type toggle (recommended)

---

## Change #5: Failure-Specific Reflection

### Screen Changes

**File:** `src/screens/Home/CompleteChallengeScreen.tsx`

**Current Flow:**
1. User taps "Fail"
2. Same optional journal entry as success
3. Submit

**New Flow:**
1. User taps "Fail"
2. Show failure-specific prompt: "What got in the way?"
3. Single text input (optional but encouraged)
4. Submit

**UI Design:**

```
┌─────────────────────────────────────────┐
│ [When result === 'failed']              │
│                                         │
│ What got in the way?                    │
│ Understanding obstacles helps you       │
│ overcome them next time.                │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │                                     │ │
│ │ I got distracted by...              │ │
│ │                                     │ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│ Optional — no judgment, just learning   │
│                                         │
└─────────────────────────────────────────┘
```

**Implementation:**

```typescript
// Add new state (alongside existing journalEntry state)
const [failureReflection, setFailureReflection] = useState('');

// In handleSubmit, update the completeChallenge call:
await completeChallenge(user.uid, challenge.id, {
  status: result,
  difficulty_actual: difficulty,
  reflection_note: result === 'completed' ? journalEntry.trim() : undefined,
  failure_reflection: result === 'failed' ? failureReflection.trim() : undefined,
});

// For points calculation, check EITHER reflection:
const hasReflection = result === 'completed'
  ? journalEntry.trim().length > 0
  : failureReflection.trim().length > 0;

// Conditional rendering - show different UI based on result
{result === 'failed' && (
  <View style={styles.failureReflectionSection}>
    <Text style={styles.sectionLabel}>What got in the way?</Text>
    <Text style={styles.reflectionSubtext}>
      Understanding obstacles helps you overcome them next time.
    </Text>
    <InputField
      label=""
      value={failureReflection}
      onChangeText={setFailureReflection}
      placeholder="I got distracted by..."
      multiline
      numberOfLines={4}
    />
    <Text style={styles.optionalText}>
      Optional — no judgment, just learning
    </Text>
  </View>
)}

{result === 'completed' && (
  // Keep existing journalEntry UI unchanged
)}
```

**Add these styles:**
```typescript
failureReflectionSection: {
  marginTop: Spacing.lg,
},
reflectionSubtext: {
  fontFamily: Fonts.secondary,
  fontSize: FontSizes.sm,
  color: Colors.gray,
  marginBottom: Spacing.sm,
},
optionalText: {
  fontFamily: Fonts.secondary,
  fontSize: FontSizes.xs,
  color: Colors.gray,
  fontStyle: 'italic',
  marginTop: Spacing.xs,
},
```

### Data Model Changes

**File:** `src/types/index.ts`

```typescript
// Add to existing Challenge interface:
export interface Challenge {
  // ... existing fields ...

  // NEW FIELD
  failure_reflection?: string;  // "What got in the way?" response
}
```

### Service Changes

**File:** `src/services/challenges.ts`

**Update `completeChallenge` function signature:**

```typescript
// Current signature:
export async function completeChallenge(
  userId: string,
  challengeId: string,
  result: {
    status: 'completed' | 'failed';
    difficulty_actual: number;
    reflection_note?: string;
  }
): Promise<void>

// Updated signature - add failure_reflection:
export async function completeChallenge(
  userId: string,
  challengeId: string,
  result: {
    status: 'completed' | 'failed';
    difficulty_actual: number;
    reflection_note?: string;
    failure_reflection?: string;  // NEW
  }
): Promise<void> {
  // In the update object, add:
  // ...(result.failure_reflection && { failure_reflection: result.failure_reflection }),
}
```

**IMPORTANT:** The existing `saveReflectionAnswers` function only saves `reflection_note`. For failure reflection, include it directly in the `completeChallenge` call, OR create a new function `saveFailureReflection`.

---

## Change #7: Repeat Tracking

### Data Model Changes

**File:** `src/types/index.ts`

```typescript
export interface Challenge {
  // ... existing fields ...

  // NEW FIELDS
  original_challenge_id?: string;  // ID of first instance (for linking repeats)
  repeat_number?: number;          // Which repeat this is (1 = first time, 2 = second, etc.)
}
```

**Alternative approach (aggregated tracking):**

```typescript
// New collection: users/{userId}/challengeStats/{normalizedName}
export interface ChallengeRepeatStats {
  id: string;                    // Normalized challenge name (lowercase, trimmed)
  name: string;                  // Display name
  total_completions: number;     // Times completed successfully
  total_attempts: number;        // Times attempted (including failures)
  first_completed_at?: string;   // First successful completion
  last_completed_at?: string;    // Most recent completion
  challenge_ids: string[];       // All challenge IDs with this name
}
```

**Recommended: Use aggregated tracking** — simpler queries, better for display

### Service Changes

**File:** `src/services/challenges.ts` (or create new file `src/services/challengeRepeatStats.ts`)

**New Functions:**
```typescript
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from './firebase';

// Normalize challenge name for consistent matching
function normalizeChallengeName(name: string): string {
  return name.toLowerCase().trim();
}

// Get repeat stats for a challenge name
export async function getChallengeRepeatStats(
  userId: string,
  challengeName: string
): Promise<ChallengeRepeatStats | null> {
  const normalizedId = normalizeChallengeName(challengeName);
  const docRef = doc(db, 'users', userId, 'challengeStats', normalizedId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as ChallengeRepeatStats;
}

// Update repeat stats when challenge completed
export async function updateChallengeRepeatStats(
  userId: string,
  challenge: Challenge,
  result: 'completed' | 'failed'
): Promise<ChallengeRepeatStats> {
  const normalizedId = normalizeChallengeName(challenge.name);
  const docRef = doc(db, 'users', userId, 'challengeStats', normalizedId);
  const existing = await getDoc(docRef);

  if (!existing.exists()) {
    // Create new stats document
    const newStats: ChallengeRepeatStats = {
      id: normalizedId,
      name: challenge.name,
      total_completions: result === 'completed' ? 1 : 0,
      total_attempts: 1,
      first_completed_at: result === 'completed' ? new Date().toISOString() : undefined,
      last_completed_at: result === 'completed' ? new Date().toISOString() : undefined,
      challenge_ids: [challenge.id],
    };
    await setDoc(docRef, newStats);
    return newStats;
  } else {
    // Update existing
    const updates: any = {
      total_attempts: increment(1),
      challenge_ids: [...existing.data().challenge_ids, challenge.id],
    };
    if (result === 'completed') {
      updates.total_completions = increment(1);
      updates.last_completed_at = new Date().toISOString();
      if (!existing.data().first_completed_at) {
        updates.first_completed_at = new Date().toISOString();
      }
    }
    await updateDoc(docRef, updates);
    return { ...existing.data(), ...updates, id: normalizedId } as ChallengeRepeatStats;
  }
}

// Check for milestone completions (5, 10, 25, 50, 100)
export function getRepeatMilestone(completions: number): number | null {
  const milestones = [5, 10, 25, 50, 100, 250, 500, 1000];
  return milestones.includes(completions) ? completions : null;
}
```

**Update `completeChallenge` in challenges.ts:**
```typescript
// At the end of completeChallenge, add:
await updateChallengeRepeatStats(userId, challenge, result.status);
```

**Firestore Path:** `users/{userId}/challengeStats/{normalizedName}`

### Screen Changes

#### ChallengeDetailScreen Updates

**File:** `src/screens/Challenges/ChallengeDetailScreen.tsx`

**Add repeat count display:**

```
┌─────────────────────────────────────────┐
│ Cold Shower                             │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 🔄 Completed 12 times               │ │
│ │    First: Jan 15 · Last: Feb 20    │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Category: Physical                      │
│ Difficulty: 4                           │
│ ...                                     │
└─────────────────────────────────────────┘
```

#### PastChallengesScreen Updates

**File:** `src/screens/Home/PastChallengesScreen.tsx`

**Add repeat count to each card:**

```
┌─────────────────────────────────────────┐
│ Cold Shower                             │
│ Physical — Difficulty: 4                │
│ Completed 12 times                      │
└─────────────────────────────────────────┘
```

#### CompleteChallengeScreen Updates

**File:** `src/screens/Home/CompleteChallengeScreen.tsx`

**After successful completion, show repeat milestone if applicable:**

```
┌─────────────────────────────────────────┐
│           🎉 Challenge Complete!        │
│                                         │
│ You've now completed "Cold Shower"      │
│ 10 times!                               │
│                                         │
└─────────────────────────────────────────┘
```

---

## New Files to Create

| File | Purpose |
|------|---------|
| `src/components/challenge/ChallengeTypeSelector.tsx` | Daily/Extended toggle (similar to existing Button component with 2 options) |
| `src/components/challenge/DurationSelector.tsx` | Duration picker (similar to existing DifficultySelector pattern) |
| `src/components/challenge/MilestonePreview.tsx` | Visual preview of days (row of circles) |
| `src/components/challenge/DailyCheckInList.tsx` | List of days with check-in status (use Card component) |
| `src/components/challenge/ProgressBar.tsx` | Visual progress indicator (simple View with percentage width) |
| `src/components/challenge/CheckInModal.tsx` | Daily check-in modal (use existing Modal pattern from CompleteChallengeScreen) |
| `src/screens/Home/ExtendedChallengeProgressScreen.tsx` | Extended challenge detail/progress |
| `src/services/challengeRepeatStats.ts` | (Optional) Separate file for repeat tracking logic |

**Component Implementation Notes:**

### ChallengeTypeSelector.tsx
```typescript
// Use same pattern as existing category chips in CreateChallengeScreen
// Two TouchableOpacity buttons with selected state styling
interface Props {
  value: 'daily' | 'extended';
  onChange: (type: 'daily' | 'extended') => void;
}
```

### DurationSelector.tsx
```typescript
// Use DifficultySelector as reference - similar chip-style buttons
// Preset values: 3, 7, 14, 21, 30
interface Props {
  value: number;
  onChange: (days: number) => void;
}
```

### ProgressBar.tsx
```typescript
// Simple implementation:
interface Props {
  progress: number; // 0-1
  color?: string;   // Default to Colors.primary
}
// Render: outer View (gray bg), inner View (colored, width = progress * 100%)
```

### CheckInModal.tsx
```typescript
// Use Modal pattern from CompleteChallengeScreen (lines 294-310)
interface Props {
  visible: boolean;
  dayNumber: number;
  onConfirm: (succeeded: boolean, note?: string) => void;
  onClose: () => void;
}
```

---

## Files to Modify

| File | Changes | Details |
|------|---------|---------|
| `src/types/index.ts` | Add ChallengeType, ChallengeMilestone, ChallengeRepeatStats, update Challenge interface | Lines ~31-53 |
| `src/services/challenges.ts` | Add extended challenge functions, update createChallenge validation, update completeChallenge | Add imports, new functions, modify existing |
| `src/screens/Home/CreateChallengeScreen.tsx` | Add challenge type selector, duration selector, milestone preview | Add 2 new state vars, import new components, conditional rendering |
| `src/screens/Home/CompleteChallengeScreen.tsx` | Add failure reflection UI, repeat milestone celebration | Add failureReflection state, conditional rendering, update handleSubmit |
| `src/screens/Home/HomeScreen.tsx` | Fetch and display extended challenge card | Add getActiveExtendedChallenge call, new card component |
| `src/screens/Home/PastChallengesScreen.tsx` | Fetch and show repeat count on each card | Call getChallengeRepeatStats for each unique challenge name |
| `src/screens/Challenges/ChallengeDetailScreen.tsx` | Show repeat stats section | Fetch stats on mount, display in UI |
| `src/navigation/HomeStack.tsx` | Add ExtendedChallengeProgress route | Add to Stack.Screen list with challenge param |

### Navigation Update Details

**File:** `src/navigation/HomeStack.tsx`

```typescript
// Add import
import ExtendedChallengeProgressScreen from '../screens/Home/ExtendedChallengeProgressScreen';

// Add to Stack.Navigator children:
<Stack.Screen
  name="ExtendedChallengeProgress"
  component={ExtendedChallengeProgressScreen}
  options={{ title: 'Challenge Progress' }}
/>

// Navigation call from HomeScreen:
navigation.navigate('ExtendedChallengeProgress', { challenge: extendedChallenge });
```

---

## Implementation Order

### Phase 1: Data Model & Services (Foundation)

**Step 1.1: Update types/index.ts**
```typescript
// Add after existing ChallengeStatus type (around line 31):
export type ChallengeType = 'daily' | 'extended';

export interface ChallengeMilestone {
  id: string;
  day_number: number;
  completed: boolean;
  completed_at?: string;
  succeeded?: boolean;  // true = kept challenge, false = broke it
  note?: string;
}

export interface ChallengeRepeatStats {
  id: string;
  name: string;
  total_completions: number;
  total_attempts: number;
  first_completed_at?: string;
  last_completed_at?: string;
  challenge_ids: string[];
}

// Update Challenge interface - add these fields after existing fields:
// challenge_type?: ChallengeType;  // Optional for backwards compat, defaults to 'daily'
// duration_days?: number;
// milestones?: ChallengeMilestone[];
// start_date?: string;
// end_date?: string;
// failure_reflection?: string;
```

**Step 1.2: Update challenges.ts**
- Add new imports (query, where, limit from firebase/firestore)
- Add generateMilestones, getActiveExtendedChallenge, completeMilestone functions
- Update createChallenge to handle extended type and generate milestones
- Update completeChallenge to accept failure_reflection

**Step 1.3: Create challengeRepeatStats.ts (or add to challenges.ts)**
- Add getChallengeRepeatStats, updateChallengeRepeatStats, getRepeatMilestone functions

**Step 1.4: Test**
- Manually create extended challenge document in Firestore console
- Verify functions work correctly

### Phase 2: Failure Reflection (Quick Win)

**Step 2.1: Update CompleteChallengeScreen.tsx**
- Add `const [failureReflection, setFailureReflection] = useState('');`
- Add conditional UI for failure reflection (after result selection)
- Update handleSubmit to include failure_reflection in completeChallenge call
- Update hasReflection check to include failure reflection

**Step 2.2: Test**
- Complete a challenge with "Fail" result
- Verify failure_reflection is saved to Firestore
- Verify points bonus applies for failure reflection

### Phase 3: Repeat Tracking (Quick Win)

**Step 3.1: Update completeChallenge in challenges.ts**
- Add call to updateChallengeRepeatStats at end of function
- Import the function if in separate file

**Step 3.2: Update ChallengeDetailScreen.tsx**
- Add state for repeat stats
- Fetch stats in useEffect using challenge.name
- Display stats section if stats exist

**Step 3.3: Update PastChallengesScreen.tsx**
- Fetch unique challenge names on load
- Get repeat stats for each
- Display count on cards

**Step 3.4: Update CompleteChallengeScreen.tsx**
- After completion, check for milestone (5, 10, 25, etc.)
- Show celebration modal if milestone reached

**Step 3.5: Test**
- Complete same challenge multiple times
- Verify count increments
- Verify milestone celebration at 5, 10 completions

### Phase 4: Extended Challenges (Larger Feature)

**Step 4.1: Create components**
```
src/components/challenge/
├── ChallengeTypeSelector.tsx
├── DurationSelector.tsx
├── MilestonePreview.tsx
├── ProgressBar.tsx
├── DailyCheckInList.tsx
└── CheckInModal.tsx
```

**Step 4.2: Update CreateChallengeScreen.tsx**
- Add challengeType and durationDays state
- Import and render ChallengeTypeSelector
- Conditionally render DurationSelector and MilestonePreview
- Update handleCreate to pass new fields

**Step 4.3: Create ExtendedChallengeProgressScreen.tsx**
- Accept challenge from route params
- Display progress bar, day list, check-in button
- Handle check-in flow with modal
- Handle "End Challenge Early" action

**Step 4.4: Update HomeScreen.tsx**
- Add state for extended challenge
- Fetch with getActiveExtendedChallenge
- Render extended challenge card with today's status
- Navigate to ExtendedChallengeProgress on tap

**Step 4.5: Update navigation/HomeStack.tsx**
- Add ExtendedChallengeProgress screen

**Step 4.6: Full end-to-end testing**
- Create extended challenge
- Check in daily
- Complete all days
- Verify points awarded correctly
- Test "End Challenge Early"
- Test having both daily and extended active

---

## Testing Checklist

### Failure Reflection
- [ ] Failure shows "What got in the way?" prompt
- [ ] Reflection is optional (can submit without)
- [ ] Reflection is saved to challenge document
- [ ] Reflection displays in ChallengeDetailScreen

### Repeat Tracking
- [ ] First completion creates repeat stats
- [ ] Subsequent completions increment count
- [ ] Count displays on ChallengeDetailScreen
- [ ] Count displays on PastChallengesScreen
- [ ] Milestone celebration at 5, 10, 25, 50, 100 completions

### Extended Challenges
- [ ] Can create daily challenge (default, unchanged)
- [ ] Can create extended challenge with duration
- [ ] Milestones auto-generated (one per day)
- [ ] Extended challenge appears on HomeScreen
- [ ] HomeScreen shows today's check-in status
- [ ] Can view extended challenge progress screen
- [ ] Can check in for current day
- [ ] Cannot check in for future days
- [ ] Can check in for missed past days (backfill)
- [ ] Daily check-in awards points
- [ ] Can end challenge early
- [ ] Full completion (all days) triggers reflection flow
- [ ] Can have one daily + one extended simultaneously
- [ ] Completion bonus awarded when all days done

---

## Open Questions for Review

1. **Extended + Daily coexistence:** Can user have both active at once? (Assumed: Yes)

2. **Extended challenge points:** How are points calculated?
   - Option A: +1 point per daily check-in, +bonus on full completion
   - Option B: Points only on full completion (all days)
   - Option C: +1 per check-in, no completion bonus
   - **Recommended:** Option A — rewards daily engagement + completion

3. **Repeat tracking scope:** Track by exact name match or fuzzy match?
   - Exact: "Cold Shower" ≠ "cold shower" ≠ "Cold shower"
   - Normalized: All variations count as same challenge

4. **Missed day handling:** What happens if user misses a day's check-in?
   - Option A: Can backfill (check in for yesterday)
   - Option B: Missed days stay incomplete, challenge continues
   - Option C: Auto-fail after X consecutive missed days
   - **Recommended:** Option B — missed days stay incomplete, user can still complete remaining days

5. **Check-in restrictions:** When can a user check in?
   - Current day only (strict)
   - Current day + backfill past days (flexible)
   - **Recommended:** Allow backfill for past days (life happens)

6. **Daily check-in confirmation:** Should "No" (failed day) still count as a check-in?
   - Yes, honesty is rewarded (still +1 point, day marked as attempted)
   - No, only successful days count
   - **Recommended:** Yes — encourage honesty, track attempted vs completed

---

## Estimated Effort

| Phase | Effort | Dependencies |
|-------|--------|--------------|
| Phase 1: Data Model | Small | None |
| Phase 2: Failure Reflection | Small | Phase 1 |
| Phase 3: Repeat Tracking | Medium | Phase 1 |
| Phase 4: Extended Challenges | Large | Phase 1 |

**Recommended approach:** Complete Phases 1-3 first (smaller, high-value changes), then tackle Phase 4 (larger feature).

---

## Potential Issues & Edge Cases

### Backwards Compatibility
- **Issue:** Existing challenges don't have `challenge_type` field
- **Solution:** Treat undefined `challenge_type` as `'daily'` throughout the code
- **Code pattern:** `challenge.challenge_type ?? 'daily'` or `challenge.challenge_type || 'daily'`

### Extended Challenge + Streak Calculation
- **Issue:** Current streak logic in willpower.ts is based on daily activity
- **Question:** Do extended challenge check-ins count toward streak?
- **Recommendation:** Yes - each check-in counts as daily activity
- **Implementation:** When completing a milestone, also call the streak update logic

### Points for Extended Challenges
- **Issue:** Current calculateChallengePoints uses difficulty_actual which is set on completion
- **For daily check-ins:** Use base 1 point + streak multiplier
- **For final completion:** Use difficulty_expected + bonus + streak multiplier
- **New function needed:**
```typescript
export function calculateMilestonePoints(streakDays: number): number {
  const multiplier = getStreakMultiplier(streakDays);
  return Math.round(1 * multiplier); // Base 1 point per check-in
}
```

### Extended Challenge Expiration
- **Issue:** What happens when end_date passes and not all milestones are complete?
- **Recommendation:** Auto-mark as 'completed' with partial completion percentage
- **Implementation:** Could use a scheduled function or check on app load

### Repeat Stats for Extended vs Daily
- **Question:** Should extended challenges count toward repeat stats?
- **Recommendation:** Yes, track separately or together based on preference
- **Note:** The normalized name approach handles this automatically

### Firestore Index Requirements
- **New query:** `where('status', '==', 'active'), where('challenge_type', '==', 'extended')`
- **Action needed:** Create composite index in Firestore console or firebase.json
```json
{
  "indexes": [
    {
      "collectionGroup": "challenges",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "challenge_type", "order": "ASCENDING" }
      ]
    }
  ]
}
```

### UI Edge Cases
1. **No categories yet:** CreateChallengeScreen handles this, ensure extended flow does too
2. **Challenge during walkthrough:** Walkthrough mode pre-fills fields; ensure it still works with new fields
3. **Deadline on extended:** Consider hiding deadline field for extended challenges (use end_date instead)
4. **Long challenge names:** Ensure UI handles long names in progress screen
