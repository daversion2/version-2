# Testing Checklist

## Micro-Exercise Question Flow

- [ ] Open each of the 5 feelings and read through all 3 questions — verify they flow naturally from one to the next
- [ ] Verify affirmation text on the complete screen matches the feeling you selected

## Challenge Failure → Micro-Exercise (Bug Fix)

- [x] Mark a challenge as failed → tap "Feel like unpacking this?" → complete the micro-exercise flow
- [x] Return to the home screen and confirm the **challenge is gone**
- [x] Verify the failure is recorded in Firestore (`worksheets` collection with `status: failed`)
- [N] Optionally fill in the failure reflection text before tapping "Feel like unpacking this?" → confirm it saves with the failure record

## Nightly Reflection → Micro-Exercise (Bug Fix)

- [x] Give yourself a D or F grade → tap "Work through this →" → complete the micro-exercise
- [x] Return home, then navigate back to the reflection screen → confirm the **grade is saved**
- [x] Verify the reflection appears in Firestore with the correct grade

## Worksheet Complete Button (Bug Fix)

- [x] Open any worksheet, leave required fields (`*`) blank → tap Complete → confirm you get the "Missing Fields" alert instead of a greyed-out button
- [x] Fill in all `*` fields → tap Complete → confirm it saves and awards points
- [x] Verify `*` appears next to required field labels throughout the worksheet

## Worksheet Template Renames

- [x] Open the Worksheets tab and confirm the 5 new names appear on the cards:
  - "Challenge That Thought"
  - "Name Your Thinking Trap"
  - "Put It to the Test"
  - "Find the Root"
  - "Turn 'I Should' Into a Plan"
- [x] Open each worksheet and verify the description at the top reads naturally
- [ ] On the micro-exercise Complete screen, tap "Want to go deeper?" → confirm the linked worksheet opens with the new name as its title

## Regression — Existing Flows Unaffected

- [ ] Complete a challenge successfully (not failed) → confirm normal reward flow still works
- [ ] Save a worksheet as draft → resume it → complete it
- [ ] Submit a nightly reflection normally (without tapping "Work through this") → confirm it saves
