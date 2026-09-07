# Archived Home surfaces

Unrouted and unreferenced, kept for reference. Left in a state where `tsc` still
compiles them, so restoring one is a routing change rather than a repair job.

Both entries here are fallout from the **Today rebuild** (commits `9c16cfa`
"Rebuild Today as sections of one-tap cards" and `60887cd`), which replaced a
user-arrangeable stack of Home *sections* with a fixed Today screen built from
`TodayHero` + `TodayHabitRow` + `buildTodaySections`. The old machinery was left
in the tree rather than removed.

## `sections/` — archived 2026-09-06

Seven files: `HomeHero`, `MantraSection`, `AlsoTodaySection`,
`PracticesSection`, `CravingCrusherSection`, plus `index.ts` (the section
registry) and `types.ts`.

**Nothing imported any of them** — not the registry, not the individual
components. `HomeScreen` builds Today directly. Verified file by file before
archiving.

Not to be confused with live code of similar name:
`components/home/TodayHero.tsx` is the current hero and is unrelated to
`sections/HomeHero.tsx`.

## `CustomizeHomeScreen.tsx` — archived 2026-09-06

Let the user show, hide and reorder the Home sections. Routed as
`CustomizeHome`, but **nothing navigated to it** — and the sections it managed
are the archived ones above, so it edited the layout of a screen that no longer
reads a layout.

### Supporting code kept alive only for it

These are now referenced *only* by the archived screen. They go when it goes:

| File | What it does |
|---|---|
| `src/services/homeLayout.ts` | reads/writes `User.home_layout` |
| `src/constants/homeLayout.ts` | `SECTION_IDS`, `ZONE_CONFIG`, labels, icons |
| `User.home_layout` (`types/index.ts`) | the persisted arrangement |

`resetOnboarding` in `services/users.ts` also clears `home_layout`, which is
harmless either way.

## Restoring either

Re-add the `<Stack.Screen>` entry to `src/navigation/HomeStack.tsx` — the
`CustomizeHome` entry in `HomeStackParamList` was kept for exactly this. For
`sections/`, note that `HomeScreen` no longer has a section-rendering loop to
plug them into; that would need rebuilding first.
