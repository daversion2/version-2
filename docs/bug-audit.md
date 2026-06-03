# Bug Audit — Remaining Issues

Audit performed 2026-06-02. High severity (7) and medium severity (12) bugs have been fixed.

---

## Low Severity

### 20. Tool conversation draft silently lost on save failure
**File:** `src/screens/Tools/ToolConversationScreen.tsx`
**Issue:** `saveDraft` has no `try/catch`. If it fails, the user's worksheet responses are lost and `navigation.goBack()` never executes, leaving them stuck.

### 21. `canSubmitChallenge` / `submitChallenge` logic inconsistency
**Files:** `src/services/submissions.ts`
**Issue:** The UI check and the actual submission disagree on whether withdrawn submissions can be resubmitted, causing "you can submit" to display but the action to throw.

### 22. Date parsing assumes valid format without validation
**File:** `src/screens/Goals/GoalsScreen.tsx`
**Issue:** `getDaysRemaining` would render "NaN days remaining" if a goal has a malformed `target_date`.

---

## Fixed — High Severity (2026-06-02)

- [x] ~~1. Save button permanently disabled after successful onboarding~~
- [x] ~~2. Same save button bug in Why Discovery onboarding~~
- [x] ~~3. ProgramCheckInModal permanently stuck in loading state~~
- [x] ~~4. Infinite loading spinners on worksheet screens~~
- [x] ~~5. Worksheet detail shows raw Firestore IDs instead of goal names~~
- [x] ~~6. Micro-exercise question flow hardcoded to 3 questions~~
- [x] ~~7. Alert.prompt iOS-only crash on Android~~

## Fixed — Medium Severity (2026-06-02)

- [x] ~~8. Race conditions in willpower point system — converted to Firestore transactions~~
- [x] ~~9. Evening notifications spam for multiple challenges — consolidated to one notification~~
- [x] ~~10. Program notifications for stale enrollments — added dayNumber guard~~
- [x] ~~11. `getHourInTimezone` returning 24 at midnight — added `% 24` normalization~~
- [x] ~~12. Seed feed entries with future timestamps — clamped jitter to `now`~~
- [x] ~~13. 16 modals missing `onRequestClose` — added Android back button support~~
- [x] ~~14. ComebackModal trapping users after step 1 — added dismiss links on steps 2/3~~
- [x] ~~15. Silent failures with no user feedback — added Alert.alert to catch blocks~~
- [x] ~~16. Unhandled promise rejections — added try/catch to async operations~~
- [x] ~~17. Wasted Firestore read in DayDetailScreen — removed unused `getTotalPoints` call~~
- [x] ~~18. Micro-commitment query unbounded — added 7-day date filter~~
- [x] ~~19. Users without timezone invisible — added fallback queries for null/empty timezone~~
