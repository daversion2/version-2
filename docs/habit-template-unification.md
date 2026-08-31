# Habit + Template Unification — Build Scope

**Goal:** collapse `Practice` and `LibraryHabit` into one entity. Every habit is a
habit; some habits carry a **template** (typed tracking fields) and a **session flow**
(Ready → Go → Capture). "Cold Exposure" and "Drink more water" become the same kind
of thing at different richness levels.

**Out of scope here** (tracked separately): the binary→scale resistance rating, the
tab restructure, retiring Challenges/Programs/Craving Crusher.

---

## Where we're starting from

Already true:

- Adopted practices are **already stored as habits** in `users/{uid}/habits` as
  `PracticeInstance`, linked to the catalog by optional `practice_id`. No data migration
  needed for user habits.
- `TrackingField[]` is already the template system: typed, keyed, written to
  `CompletionLog.metrics` as a generic map. Multi-field templates already ship
  (cold exposure = `duration_min` + `water_temp_f`).
- `practicePerformance.ts` already auto-derives trend charts from any numeric metric key.
- 21 curated + 21 traditional library habits already authored, with categories,
  action plans and identity statements.
- 13 practices already carry full science content (`science`, `research` with citations,
  `howTo`, `tips`, `resistanceMoment`, `ready`).

Blocking:

1. `tracking` / `flow` / `ready` live only on `Practice`, resolved via
   `getPractice(practiceId)`. Library and custom habits fall back to `[]`.
2. No `'scale'` field type — can't express "how well did I stick to plant-based today"
   as something that trends.
3. `DOSE_CONFIGS` and `RECORD_OVERRIDES` in `practicePerformance.ts` hardcode cold/heat
   behavior by practice id.
4. Two competing taxonomies: `PracticeGroup` and `HabitCategory`.
5. `SHOW_HABIT_LIBRARY = false` — the library is switched off.

---

## Decisions (locked)

| # | Decision | Consequence |
|---|---|---|
| **D1** | **`HabitCategory` is the only taxonomy.** Body / Focus / Mind / Money / Connection. `PracticeGroup` (activate/calm/restrain/custom) is dropped. | The 13 practices need `category_id` assigned — they only have `group` today. `resolvePracticeGroup`, `PRACTICE_GROUPS`, `getPracticesByGroup` and the `custom` group all go away. Touches `PracticesScreen`, the admin editor, and `PracticeInstance.group`. |
| **D2** | **All 42+ habits move into the Firestore catalog.** One authoring surface; content fixes ship without an OTA. | One-time seed of the library habits into the collection. Validator rework. Bundled data stays as the offline fallback. |
| **D3** | **Custom habits pick from ~6 preset templates.** Time / Distance / Reps / Count / Grade / None. | No template builder. A picker on the create-habit screen, and custom habits get trend charts for free. |
| **D4** | **All 29 missing science sections get authored before Phase 5.** | Content is a blocking deliverable, and it's the long pole. Runs as a parallel track from day one — it isn't code and doesn't wait on the refactor. |
| **D5** | **Pre-launch — just the founder and a few testers.** | No dual-read window, no staged rollout, no backward-compat shims. We can reseed the catalog and drop legacy fields freely. This removes most of the risk originally scoped into Phase 4. |

**D5 unlocks a freebie:** renaming `practiceCatalog` → `habitCatalog` was previously
gated on a dual-read migration. With no live users that cost is gone, so the rename is
now essentially free and worth doing — the word "practice" should not survive in code
once practices aren't a concept.

---

## Two parallel tracks

```
TRACK A — CODE                              TRACK B — CONTENT (D4)
Phase 1 (type merge)                        29 science sections
   ├─ Phase 2 (templates + 'scale')         + category_id for 13 practices (D1)
   ├─ Phase 3 (analytics de-hardcode)       + templates for ~15-20 library habits
   └─ Phase 4 (catalog + admin)             ↓
        └─ Phase 5 (surface) ←──────── gated on Track B completing
```

Track B is the critical path. Phases 1–4 are internal and ship behind the existing
flag — nothing is user-visible until Phase 5, so the code can land incrementally on
`main` without a broken intermediate app.

---

## Phase 1 — Unify the type

**Files:** `src/types/index.ts`, `src/data/practices.ts`, `src/data/habitLibrary.ts`,
`src/data/traditionalHabits.ts`

- Introduce `HabitDefinition` as the single catalog entity. Everything past
  `id / name / description / category_id / suggested_target_per_week` is optional:

  ```ts
  interface HabitDefinition {
    id; name; description; category_id; suggested_target_per_week;
    action_plan?; identity?;

    // absorbed from Practice — all optional
    tracking?: TrackingField[];
    flow?: 'tap' | 'timer' | 'away' | 'moment';   // default 'tap'
    timer?: boolean; timerDisplay?: 'countdown' | 'pacer' | 'hidden';
    ready?: { whatYouDo?; override?; focus; handoffCta? };
    resistanceMoment?: string;
    science?: string; whyItWorks?: string;
    howTo?: string[]; howToTitle?: string; tips?: string[];
    research?: ResearchEntry[]; techniques?; variations?; minimumVersion?;
    intensity?; color?; icon?; core?; order?; active?;
  }
  ```

- Add `flow: 'tap'` — the plain one-tap check-in, the default when unset. This is what
  lets a library habit and a cold plunge share one code path.
- **D1:** assign `category_id` to all 13 practices; delete `PracticeGroup` and its
  helpers. Decide where `intensity` (the 1–3 flame meter) surfaces now that groups are
  gone — recommend keeping it as a per-habit badge.
- `getHabitDefinition(id)` resolves across the merged set; keep `getPractice` as a thin
  alias so the 12 call sites migrate incrementally rather than in one commit.
- Merge `HABIT_LIBRARY` + `TRADITIONAL_HABIT_LIBRARY` + `PRACTICES` into one exported
  list. **Ids must not change** — they're the Firestore doc ids and the `practice_id`
  foreign key on adopted habits.

---

## Phase 2 — Templates for every habit

**Files:** `src/components/habits/PracticeCaptureFlow.tsx`,
`src/components/habits/HabitCompletionModal.tsx`, create-habit screen, `src/data/*`

- Stop resolving templates from `practice_id` inside the capture flow. Resolve from the
  habit's definition id, or accept `tracking` as a prop — so custom habits can carry one.
- Add `type: 'scale'` to `TrackingField`:

  ```ts
  type: 'duration' | 'number' | 'choice' | 'scale'
  // scale adds: min/max (default 1–5), labels?: { low: string; high: string }
  ```

  It must store a **number** so `numericValues()` picks it up and it trends like any
  other metric. (`choice` deliberately routes to distributions instead — a grade wants
  a line, not a pie.)
- **D3:** define the six presets as named `TrackingField[]` constants and add the picker
  to habit creation.
- Friction rule, enforced in the flow: resistance is always one question; templates
  render in `compact` mode (single screen) by default; only `flow: 'timer' | 'away'`
  habits earn the stepped one-question-per-screen ceremony.

**Sequencing note:** the binary→scale resistance change also edits this file. Do the two
together in one pass rather than touching the capture flow twice.

---

## Phase 3 — De-hardcode the analytics overlays

**Files:** `src/services/practicePerformance.ts`,
`src/services/__tests__/practicePerformance.test.ts`

- `DOSE_CONFIGS` → an optional `dose?: { durationKey; magnitudeKey; baseline; direction;
  title; description }` on the habit definition. Cold and heat become data, and any
  future two-factor habit gets dose scoring without a code change.
- `RECORD_OVERRIDES` → `record?: { label?; icon?; pick?: 'max' | 'min' }` on the
  `TrackingField` itself, next to the metric it describes.
- Teach the trend/record/chart derivation about `'scale'` fields.
- Verify the gating constants still read sensibly per habit type
  (`MIN_RATED_FOR_CHART`, `MIN_DOSE_SESSIONS`, etc.).

**Note:** `practicePerformance.test.ts` builds off `getPractice('cold_exposure')` and
`getPractice('meditation')`. Expect to update it; it's the best regression net here.

---

## Phase 4 — Catalog + admin editor

**Files:** `src/services/practiceCatalog.ts` → `habitCatalog.ts`,
`src/screens/Admin/AdminPracticeEditScreen.tsx` (417 LOC),
`src/screens/Admin/AdminPracticesScreen.tsx` (245 LOC), `firestore.rules`

D5 makes this substantially cheaper than originally scoped — no live data to protect.

- Rename the collection `practiceCatalog` → `habitCatalog` and reseed from scratch.
  No dual-read needed.
- `validatePractice` → `validateHabitDefinition`. It currently **requires** `group`,
  `flow`, `core`, `suggested_target_per_week`, `order`, `whyItWorks`, `science`,
  `howTo`, `tips`. Under the unified type most are optional. Required set becomes
  `id`, `name`, `description`, `category_id`. Keep the fallback-to-bundled behavior on
  validation failure — it's good design independent of user count.
- Drop the legacy `ready.expect` / `ready.overrideUrge` normalization shim. It exists
  only for pre-2026-07 remote docs, and we're reseeding.
- **D2:** seed all 42 habits (`seedPracticeCatalogFromBundled` is the existing pattern).
- Admin editor gains a **template builder** — add/remove/reorder `TrackingField`s,
  including `scale` with its labels, plus the `dose` and `record` config from Phase 3.
  This is the bulk of the phase's remaining work.

---

## Phase 5 — Surface it

**Gated on Track B (D4) completing.**

**Files:** `src/constants/featureFlags.ts`, `src/screens/Practices/PracticesScreen.tsx`
(364), `src/screens/Home/HabitLibraryScreen.tsx` (78),
`src/screens/Home/HabitLibraryDetailScreen.tsx` (588),
`src/screens/Practices/PracticeDetailScreen.tsx` (353),
`src/components/habits/HabitLibraryList.tsx` (283)

- Flip `SHOW_HABIT_LIBRARY = true`, then delete the flag.
- **One Library screen.** `PracticesScreen` and `HabitLibraryScreen` browse the same
  conceptual thing. Merge into a single surface grouped by `HabitCategory` (D1), with
  rich habits visually distinguished (the intensity flames already exist).
- **One detail screen.** `HabitLibraryDetailScreen` (588) and `PracticeDetailScreen`
  (353) both render a habit's page — one has action-plan/identity content, the other has
  science/research/howTo. The unified screen shows whichever sections the definition
  populates. Biggest UI consolidation in the scope, and the one that makes "every habit
  has a science page" real.
- Restore custom habit creation with the preset template picker (D3).

---

## Relative effort

| Track | Item | Size | Why |
|---|---|---|---|
| B | **29 science sections (D4)** | **Largest** | Not code. Critical path. Start now, run parallel to everything. |
| A | Phase 1 — type merge | Medium | Mechanical but wide; the alias avoids a big-bang commit. D1 adds the category remap. |
| A | Phase 2 — templates + scale | Medium | New field type, capture-flow rework, preset definitions |
| A | Phase 3 — analytics | Small | Two config objects → data; tests already cover the behavior |
| A | Phase 4 — catalog + admin | Medium | Was Large; D5 removes the migration risk. Template-builder UI is what's left. |
| A | Phase 5 — surface | Large | Two detail screens (941 LOC combined) and two browse screens collapse into one each |

## Remaining risks

- **Ids must survive the merge.** Adopted habits carry `practice_id`; the catalog doc id
  is the same string. Renaming an id orphans a user's habit and its history.
- **Baseline noise:** the repo already has ~21 stale jest failures and ~5 tsc errors
  predating this work. Don't read them as regressions, but capture a clean before/after
  failure list so real breakage stays visible.
- **Content quality is the product.** D4 makes 29 science sections a blocking
  deliverable. If they end up thin or generic, the merge succeeds and the positioning
  still fails — this is the thing to protect.

---

# DECISIONS LOG — made during the build

Recorded per the "decide and document" instruction. Each of these was a fork not
covered by D1–D5.

**1. Kept the `practiceCatalog` collection name and `practices.ts` filename.**
D2 selected "Everything" (catalog reach), not the rename option. Renaming would
have churned ~20 import sites for no functional gain. The TYPES are renamed
(`HabitDefinition`), which is where the confusion actually lived.

**2. Deduped 6 overlapping habits instead of authoring science three times.**
`move-20min` / `trad-exercise` → `movement`; `morning-meditation` /
`trad-meditate` → `meditation`; `breathing-break` → `breathwork`;
`trad-budget` → `log-the-spend`. `SUPERSEDED_HABIT_IDS` keeps the retired ids
resolving so no adopted habit is orphaned. This also corrected the content count:
it was 42 habits needing science, not the 29 quoted when D4 was decided.

**3. Corrected practice count: 9, not 13.** The earlier figure counted the 4
PracticeGroup definitions as practices.

**4. Resistance is a NEW field, not a widened `difficulty`.** Legacy logs store
1 or 2 in `difficulty`; a legacy 2 ("hard") and a new 2 ("trivial") would be
indistinguishable and every historical trend would invert. `difficulty` is still
derived and written on every log so streaks and XP are untouched.

**5. Scale is 1–10, and starts unanswered.** A defaulted rating would poison the
trend it exists to draw, so the Log button stays disabled until the user answers.

**6. Science content lives in an overlay** (`data/habitScience.ts`) keyed by id
rather than inlined, so writing can be revised without touching habit structure.

**7. Citation policy: verified or absent.** Four citations were looked up and
used. Where a mechanism is established but no specific study was verified, the
entry ships prose and no `research` array. The "brain drain" smartphone study
was deliberately excluded — widely quoted, but it failed to replicate.

**8. `getDefaultSeedPractices` scoped to session-bearing habits.** Merging the
library into the catalog would otherwise have seeded ~45 habits onto every new
user's home screen. Covered by test.

**9. `fetchPracticeCatalog` merges against the full catalog.** It iterated
`BUNDLED_PRACTICES`, which would have emptied the library one second after
startup once the remote load completed. Covered by test.

**10. Adopting a habit writes `practice_id`.** Without it the adopted habit
resolved to nothing and lost its template, session flow and science page.

---

# NOT DONE — remaining work

- **Admin template builder UI.** The validator, the data model (`TrackingField`
  with `scale`/`record`, `HabitDefinition.dose`) and the widened seeder are all
  in. The admin editor still exposes the original field set, so templates and
  dose config are not yet editable from the panel — they are editable in code.
- **Custom-habit template picker UI (D3).** Fully built at the data layer
  (`data/habitTemplates.ts`, `PracticeInstance.template_id`, capture-flow
  `tracking` prop, tests). It has no host screen: custom habit creation was
  removed from the app before this work started, so there is nothing to attach
  the picker to. Restoring that creation flow is its own task.
- **Firestore reseed not executed.** `seedPracticeCatalogFromBundled()` now
  covers all 45 definitions, but it runs through the in-app admin action (the
  project's established pattern for content seeding) rather than a CLI script,
  and no service-account credentials were introduced to do it headlessly.
  Run it from Admin when ready. The app works from the bundled catalog until then.
- **Old screens still routed.** `PracticesScreen` and `TraditionalHabitsScreen`
  remain in the navigator. They are superseded by the merged library but were
  left in place rather than removed blind.
- **Tab restructure** (Today / Library / Progress / Settings) and retiring
  Challenges / Programs / Craving Crusher — explicitly out of scope for this run.
- **Visual QA.** Not possible unattended. The merged library and detail screens
  compile and are covered by data-level tests, but no one has looked at them.
