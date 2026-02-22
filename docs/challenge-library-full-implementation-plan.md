# Challenge Library Full Implementation Plan

## Overview

This document outlines the full implementation scope for integrating the enhanced Challenge Library metadata throughout the app. The goal is to have barrier_type, action_type, and educational content flow from library selection through to user challenges and analytics.

---

## Phase 1: Data Model Updates

### 1.1 Update Challenge Type (User's Active Challenges)

**File:** `src/types/index.ts`

Add new optional fields to the `Challenge` interface:

```typescript
export interface Challenge {
  // ... existing fields ...

  // NEW: Library metadata (optional, populated when selected from library)
  library_challenge_id?: string; // Reference to original library challenge
  barrier_type?: BarrierType;
  action_type?: ActionType;
  time_category?: TimeCategory;

  // NEW: Educational content (copied from library at selection time)
  neuroscience_explanation?: string;
  psychological_benefit?: string;
  what_youll_learn?: string;
  common_resistance?: string[];
}
```

### 1.2 Add Variations to LibraryChallenge

**File:** `src/types/index.ts`

```typescript
export interface ChallengeVariation {
  label: string; // e.g., "Easier", "Harder", "Advanced"
  description: string; // e.g., "30 seconds instead of 60"
}

export interface LibraryChallenge {
  // ... existing fields ...
  variations?: ChallengeVariation[];
}
```

### 1.3 Update Constants File

**File:** `src/constants/challengeLibrary.ts`

Add `variations` field to `SampleChallenge` interface and sample data.

---

## Phase 2: Challenge Creation Flow

### 2.1 Update createChallenge Service

**File:** `src/services/challenges.ts`

Modify `createChallenge()` to accept and store new fields:

```typescript
interface CreateChallengeInput {
  // ... existing fields ...
  library_challenge_id?: string;
  barrier_type?: BarrierType;
  action_type?: ActionType;
  time_category?: TimeCategory;
  neuroscience_explanation?: string;
  psychological_benefit?: string;
  what_youll_learn?: string;
  common_resistance?: string[];
}
```

### 2.2 Update ChallengeLibraryScreen

**File:** `src/screens/Home/ChallengeLibraryScreen.tsx`

When user selects "Use This Challenge", pass all metadata:

```typescript
const handleUseChallenge = async (challenge: LibraryChallenge) => {
  await createChallenge(user.uid, {
    name: challenge.name,
    category_id: challenge.category,
    // ... existing fields ...

    // NEW: Pass library metadata
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

### 2.3 Update BarrierChallengesScreen

**File:** `src/screens/Home/BarrierChallengesScreen.tsx`

Same changes as ChallengeLibraryScreen for the `handleUseChallenge` function.

---

## Phase 3: Challenge Detail Modal - Add Variations

### 3.1 Update ChallengeDetailModal

**File:** `src/components/library/ChallengeDetailModal.tsx`

Add a "Variations" section that displays easier/harder options:

```tsx
{challenge.variations && challenge.variations.length > 0 && (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Variations</Text>
    <View style={styles.sectionCard}>
      {challenge.variations.map((variation, index) => (
        <View key={index} style={styles.variationRow}>
          <Text style={styles.variationLabel}>{variation.label}:</Text>
          <Text style={styles.variationDescription}>{variation.description}</Text>
        </View>
      ))}
    </View>
  </View>
)}
```

---

## Phase 4: Active Challenge Experience

### 4.1 Update HomeScreen Challenge Card

**File:** `src/screens/Home/HomeScreen.tsx`

Display action_type badge on active challenge (Complete vs Resist).

### 4.2 Update CompleteChallengeScreen

**File:** `src/screens/Home/CompleteChallengeScreen.tsx`

Show educational content during/after completion:

1. **Before completion:** Show "Common Resistance" as motivation
2. **After completion:** Show "What You'll Learn" as reinforcement

Add a collapsible section:

```tsx
{challenge.common_resistance && (
  <View style={styles.motivationSection}>
    <Text style={styles.sectionTitle}>Resistance You Might Feel</Text>
    {challenge.common_resistance.map((item, index) => (
      <Text key={index} style={styles.resistanceItem}>• "{item}"</Text>
    ))}
    <Text style={styles.encouragement}>
      These thoughts are normal. Do it anyway.
    </Text>
  </View>
)}
```

### 4.3 Create/Update ChallengeDetailScreen

**File:** `src/screens/Challenges/ChallengeDetailScreen.tsx`

Display full educational context for past challenges:
- Neuroscience explanation
- Psychological benefit
- What you learned
- Common resistance faced

---

## Phase 5: Progress & Analytics

### 5.1 Add Barrier Type Analytics Service

**File:** `src/services/challenges.ts` (or new `src/services/analytics.ts`)

```typescript
export const getChallengesByBarrierType = async (
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<Record<BarrierType, number>> => {
  // Query challenges grouped by barrier_type
};

export const getBarrierTypeStreak = async (
  userId: string,
  barrierType: BarrierType
): Promise<number> => {
  // How many consecutive days user has done this barrier type
};
```

### 5.2 Update ProgressScreen

**File:** `src/screens/Progress/ProgressScreen.tsx`

Add a new section showing challenge breakdown by barrier type:

```tsx
<View style={styles.barrierBreakdown}>
  <Text style={styles.sectionTitle}>Challenges by Type</Text>
  {Object.entries(barrierCounts).map(([type, count]) => (
    <View key={type} style={styles.barrierRow}>
      <Text>{BARRIER_TYPES[type].icon} {BARRIER_TYPES[type].name}</Text>
      <Text>{count}</Text>
    </View>
  ))}
</View>
```

### 5.3 Add Insights (Optional Enhancement)

Show insights like:
- "You've done 12 Comfort Zone challenges this month"
- "Try more Delayed Gratification challenges - you've only done 2"
- "Your hardest barrier type: Ego Challenges (avg difficulty 3.8)"

---

## Phase 6: Category Migration

### 6.1 Firestore Data Migration

Existing challenges in Firestore use old categories (Mental, Physical, Social, Professional, Creative). Need to:

1. Update existing `challengeLibrary` documents to use new categories (Physical, Social, Mind)
2. Map old user challenge categories to new ones:
   - Mental → Mind
   - Professional → Mind (or keep as-is for historical)
   - Creative → Mind (or keep as-is for historical)

### 6.2 Update Category Selector

**File:** `src/screens/Home/CreateChallengeScreen.tsx`

Ensure category picker shows only: Physical, Social, Mind

### 6.3 Update ManageCategoriesScreen

**File:** `src/screens/Settings/ManageCategoriesScreen.tsx`

Review if users can still create custom categories or if we're restricting to the 3 core domains.

---

## File Summary

| File | Changes |
|------|---------|
| `src/types/index.ts` | Add fields to Challenge, add ChallengeVariation |
| `src/constants/challengeLibrary.ts` | Add variations to sample challenges |
| `src/services/challenges.ts` | Update createChallenge, add analytics functions |
| `src/screens/Home/ChallengeLibraryScreen.tsx` | Pass full metadata on selection |
| `src/screens/Home/BarrierChallengesScreen.tsx` | Pass full metadata on selection |
| `src/components/library/ChallengeDetailModal.tsx` | Add Variations section |
| `src/screens/Home/HomeScreen.tsx` | Show action_type badge |
| `src/screens/Home/CompleteChallengeScreen.tsx` | Show educational content |
| `src/screens/Challenges/ChallengeDetailScreen.tsx` | Show full educational context |
| `src/screens/Progress/ProgressScreen.tsx` | Add barrier type breakdown |
| `src/screens/Home/CreateChallengeScreen.tsx` | Verify category picker |
| `src/screens/Settings/ManageCategoriesScreen.tsx` | Review custom categories |

---

## Testing Checklist

- [ ] Select challenge from library → all metadata stored in Firestore
- [ ] View active challenge → shows action_type badge
- [ ] Complete challenge → shows educational content
- [ ] View past challenge → shows full details
- [ ] Progress screen → shows barrier type breakdown
- [ ] Categories → only Physical, Social, Mind appear
- [ ] Variations → display correctly in detail modal

---

## Notes

1. **Backward Compatibility:** All new fields are optional, so existing challenges continue to work.

2. **Firestore Indexes:** May need composite indexes for barrier_type queries:
   - `challenges` collection: `user_id` + `barrier_type` + `date`

3. **Category Migration:** Decide whether to migrate historical data or leave old categories for historical challenges.
