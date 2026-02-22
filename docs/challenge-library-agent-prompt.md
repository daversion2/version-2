# AI Agent Prompt: Challenge Library Full Implementation

## Context

You are working on a React Native/Expo app called "Neuro-Nudge" - a daily challenge app that helps users build willpower through small, uncomfortable challenges. The Challenge Library feature has been partially implemented with browsing UI, filtering, and challenge selection. Your task is to complete the full implementation by flowing challenge metadata through the entire app.

## Project Location

Working directory: `/Users/jonathonmcfadden/_Version_2/neuro-nudge`

## What's Already Done

1. **Challenge Library UI** - Users can browse challenges by barrier type, filter by time/category
2. **New Types** - `BarrierType`, `TimeCategory`, `ActionType`, `LibraryChallenge` interface with educational fields
3. **Constants File** - `src/constants/challengeLibrary.ts` with all configurable labels and sample challenges
4. **Components** - `FilterChipBar`, `BarrierTypeCard`, `LibraryChallengeCard`, `ChallengeDetailModal`, `InfoModal`
5. **Screens** - `ChallengeLibraryScreen`, `BarrierChallengesScreen`
6. **Draft Challenges** - 19 challenges with full metadata in `docs/challenge-library-draft.md`

## Your Task

Implement the full scope as outlined in `docs/challenge-library-full-implementation-plan.md`. Here's a summary:

### Phase 1: Data Model Updates

**File: `src/types/index.ts`**

Add these fields to the `Challenge` interface (user's active challenges):

```typescript
// Add to Challenge interface:
library_challenge_id?: string;
barrier_type?: BarrierType;
action_type?: ActionType;
time_category?: TimeCategory;
neuroscience_explanation?: string;
psychological_benefit?: string;
what_youll_learn?: string;
common_resistance?: string[];
```

Add `ChallengeVariation` interface:

```typescript
export interface ChallengeVariation {
  label: string; // e.g., "Easier", "Harder"
  description: string;
}
```

Add `variations?: ChallengeVariation[]` to `LibraryChallenge` interface.

**File: `src/constants/challengeLibrary.ts`**

Update `SampleChallenge` interface to include `variations` and update sample data accordingly. Refer to `docs/challenge-library-draft.md` for variation examples.

### Phase 2: Challenge Creation Flow

**File: `src/services/challenges.ts`**

Update `createChallenge()` to accept and store the new metadata fields.

**Files: `src/screens/Home/ChallengeLibraryScreen.tsx` and `src/screens/Home/BarrierChallengesScreen.tsx`**

Update `handleUseChallenge()` to pass all metadata when creating a challenge:

```typescript
const handleUseChallenge = async (challenge: LibraryChallenge) => {
  await createChallenge(user.uid, {
    // existing fields...
    library_challenge_id: challenge.id,
    barrier_type: challenge.barrier_type,
    action_type: challenge.action_type,
    time_category: challenge.time_category,
    neuroscience_explanation: challenge.neuroscience_explanation,
    psychological_benefit: challenge.psychological_benefit,
    what_youll_learn: challenge.what_youll_learn,
    common_resistance: challenge.common_resistance,
  });
};
```

### Phase 3: Challenge Detail Modal - Variations

**File: `src/components/library/ChallengeDetailModal.tsx`**

Add a "Variations" section that displays easier/harder options when available.

### Phase 4: Active Challenge Experience

**File: `src/screens/Home/HomeScreen.tsx`**

Display an action_type badge on the active challenge card (e.g., "Complete" vs "Resist").

**File: `src/screens/Home/CompleteChallengeScreen.tsx`**

Show educational content during/after completion:
- Before: Show "Common Resistance" quotes as motivation
- After: Show "What You'll Learn" as reinforcement

**File: `src/screens/Challenges/ChallengeDetailScreen.tsx`**

Display full educational context for viewing past challenges.

### Phase 5: Progress & Analytics

**File: `src/services/challenges.ts` (or new `src/services/analytics.ts`)**

Add functions:
- `getChallengesByBarrierType(userId, startDate?, endDate?)` - Returns counts by barrier type
- `getBarrierTypeStreak(userId, barrierType)` - Consecutive days for a barrier type

**File: `src/screens/Progress/ProgressScreen.tsx`**

Add a section showing challenge breakdown by barrier type with icons.

### Phase 6: Category Migration (Lower Priority)

Review and update category handling:
- Ensure category picker in `CreateChallengeScreen` shows only: Physical, Social, Mind
- Review `ManageCategoriesScreen` for custom category handling
- Consider Firestore migration for existing data (optional)

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/types/index.ts` | Type definitions |
| `src/constants/challengeLibrary.ts` | Configurable labels, sample data |
| `src/services/challenges.ts` | Challenge CRUD operations |
| `src/services/challengeLibrary.ts` | Library filtering/querying |
| `src/screens/Home/ChallengeLibraryScreen.tsx` | Main library browse screen |
| `src/screens/Home/BarrierChallengesScreen.tsx` | Barrier-filtered view |
| `src/components/library/ChallengeDetailModal.tsx` | Detail view modal |
| `src/screens/Home/HomeScreen.tsx` | Main home with active challenge |
| `src/screens/Home/CompleteChallengeScreen.tsx` | Challenge completion flow |
| `src/screens/Progress/ProgressScreen.tsx` | User progress/stats |
| `docs/challenge-library-draft.md` | Challenge content with variations |
| `docs/challenge-library-full-implementation-plan.md` | Detailed implementation plan |

## Important Notes

1. **Backward Compatibility** - All new fields must be optional. Existing challenges should continue to work.

2. **Type Safety** - Use existing types from `src/types/index.ts`. Don't create duplicates.

3. **Styling** - Follow existing patterns using `Colors`, `Fonts`, `FontSizes`, `Spacing` from `src/constants/theme.ts`.

4. **Testing** - After implementation, verify:
   - Selecting a library challenge stores all metadata in Firestore
   - Active challenge shows action_type badge
   - Completion screen shows educational content
   - Past challenge detail shows full context
   - Progress screen shows barrier type breakdown
   - Variations display in detail modal

5. **Firestore Indexes** - May need composite index for `challenges` collection: `user_id` + `barrier_type` + `date`

## Getting Started

1. Read `docs/challenge-library-full-implementation-plan.md` for detailed specifications
2. Read `docs/challenge-library-draft.md` for challenge content including variations
3. Start with Phase 1 (Data Model Updates) as other phases depend on it
4. Work through phases sequentially, testing each before moving on

## Questions to Consider

- Should variations be selectable, or just informational? (Current plan: informational)
- Should we track which variation the user actually did? (Current plan: no)
- How should educational content be displayed on completion? (Collapsible sections recommended)

Good luck!
