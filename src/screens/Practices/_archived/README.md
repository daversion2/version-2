# Archived screens

Unrouted, kept for reference, and left in a state where `tsc` still compiles
them so restoring one is a routing change rather than a repair job.

## `PracticesScreen.tsx` — archived 2026-09-06

The practice-management screen, routed as **`ManageHabits`**.

**Why it was retired.**

1. **One way in, and it wasn't a button.** Nothing in the app navigated to it.
   Its only entry point was the CTA on the seeded rule *"Journey day 3: set a
   weekly goal"*.
2. **It rendered a taxonomy the app dropped.** It groups by `PRACTICE_GROUPS`
   (Activate / Calm / Restrain / Custom). D1 in
   `docs/habit-template-unification.md` made `HabitCategory` (Body / Focus /
   Mind / Money) the only taxonomy, and Today and Library both use it — so a
   day-3 user was pulled into groupings that exist nowhere else in the product.
3. **Everything it offered already lives somewhere current:** editing a
   schedule, renaming and archiving are all on `MyPracticeDetailScreen`; the
   door to archived habits is in Settings; browsing is the Library tab.
   `HomeScreen` already claimed as much in a comment — "it now belongs to the
   habit's own detail screen (WeeklyGoalSheet), which is the only place that
   still offers it" — which was true of everything except this screen.

**What changed alongside it**

- The day-3 rule's `cta_target` was dropped and its copy rewritten. Its **name
  was deliberately left alone**: `seedDefaultRules` matches on `name` and skips
  rules that already exist, so renaming it would seed a second day-3 rule beside
  the live one.
- `ManageHabits` was removed from `CTA_SCREEN_TARGETS` so no new rule can point
  at it, and added to `RETIRED_CTA_SCREENS` so the copy already stored in
  production Firestore dismisses quietly instead of navigating nowhere.
- The `ManageHabits` entry in `HomeStackParamList` was **kept**, because this
  file still references it via `HomeScreenProps<'ManageHabits'>`.

**To restore it:** re-add the `<Stack.Screen name="ManageHabits">` entry to
`src/navigation/HomeStack.tsx`, and take `'ManageHabits'` back out of
`RETIRED_CTA_SCREENS`. Expect to update the group rendering first — it is the
main reason the screen was retired.
