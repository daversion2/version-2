# Neuroscience Tidbit Audit

> The card shown after a habit check-in — "Your brain right now", inside
> `HabitCelebrationModal`.
>
> Status: **rewritten 2026-09-18 for the resistance-habit-tracker direction.**
> Code is in; **the Firestore step has NOT been run** — see "Shipping this" at
> the bottom. Until it is, users still see the 2026-07 set.

---

## Why it was rewritten (2026-09-18)

Two separate problems, found by auditing the pool against the app as it actually
ships today.

**1. More than half the library was unreachable.** 17 of 31 tidbits
(`challenge_type`, `state`, `generic`) were only ever read by
`selectTidbitForCompletion`, whose sole entry point is `CompleteChallengeScreen`
— reachable only from `ChallengesHomeScreen`, which came off the tab bar when
Challenges was archived. That content had been dead since the tab restructure
and nothing surfaced it.

**2. The 14 that did fire argued against the product.** They were written in
2026-07 for the override thesis, which held that a habit becoming easier was a
*failure* ("you're not building something that runs itself"). The app now sells
a falling resistance score as its headline proof of change. The tidbits were
contradicting the chart.

Smaller but real: the copy used "rep" 8 times and "practice" 14 times, both
against the standing voice rules; and the `struggle` bucket had swallowed most
check-ins (see below).

---

## The thesis the new set is written to

**Repetition automates the launch, not the work.**

What the basal ganglia takes over is *initiation* — the cue-to-action link, the
negotiation that used to happen before anything began. The effort itself stays
effortful. That is why a habit can be easy to start and just as hard to finish,
and it is exactly what a falling resistance score measures.

This reconciles the two things the app has to say at once: *this gets easier*
(true, and measurable) and *the hard days are the valuable ones* (also true).
The 2026-07 audit cut six tidbits for mentioning automaticity at all; that was
over-corrected, and the mechanism is back — bounded by the line above.

Voice rules, unchanged and now enforced by test: never "rep", never "practice"
as a noun for the tracked thing, never promise effortlessness.

---

## Selection

`selectHabitTidbit` in [neuroscienceTidbits.ts](../src/services/neuroscienceTidbits.ts),
called from `HomeScreen` and `PracticeSessionScreen`. Cascade:

| Step | Bucket | Fires when |
|---|---|---|
| 1 | `struggle` | `isReturn` — streak was 0 and they've done this habit before |
| 1 | `hardest` | resistance level 3, "took everything I had" |
| 2 | `habit_type` | the habit's **name** matches `deriveHabitType` |
| 3 | `easing` | level 1 **and** streak ≥ 7 |
| 3 | `established` | streak ≥ 30 |
| 3 | `streak` | streak ≥ 7 |
| 3 | `new_habit` | streak ≤ 14 |
| 4 | `generic` | fallback, then recycle if the 14-day window excluded everything |

Three things worth knowing about that order:

- **Level 2 routes nowhere special, deliberately.** The old cascade used the
  legacy binary, where `resistance >= 2` meant "challenging" — so two of the
  three levels landed in `struggle`, and most check-ins drew from the same two
  tidbits. Level 2 is the ordinary answer; it now falls through to the streak
  buckets where the variety is. Pinned by test.
- **`habit_type` sits below the urgent states.** A comeback deserves a response,
  not a lecture on BDNF. It sits above the streak buckets because it's the most
  specific thing the pool knows about this habit.
- **`easing` needs a streak behind it.** An easy day on day two is one easy day,
  not the curve bending.

`isReturn` is derived at the call sites as `streakBefore === 0 && !firstTry`.
Before this rework nothing passed it at all, so `struggle` was only ever reached
via the binary — the bucket carrying the comeback message was, in effect,
firing for the wrong reason.

---

## The set — 32 tidbits, all reachable

Source of truth for copy is [tidbitSeedData.ts](../src/data/tidbitSeedData.ts).

**`habit_type` (9)** — the science of one kind of habit, matched off the name.
Nine types, chosen to cover the library: `workout` (BDNF), `cold`
(norepinephrine), `meditation` (grey matter / amygdala), `breathwork` (vagal
tone), `sleep` (consolidation), `journaling` (affect labelling), `screen_limit`
(variable reward), `diet` (preference shift), `deep_work` (acetylcholine).

Six of these are rewrites of the stranded `challenge_type` tidbits — the best
content in the dead half, retargeted from challenges to habits. `sleep`,
`journaling` and `screen_limit` are new, and cover the library habits that had
nothing to say to them.

**`hardest` (3)** — ACC/effort; extinction burst; stress inoculation.
The extinction-burst pair was stranded in `state`; it belongs here, where it
lands on the day it describes.

**`struggle` (3)** — Lally missed-day; comeback/reward-system; self-compassion
vs. self-criticism. This is the highest-stakes bucket in the product — the
response to a lapse is what decides whether it ends — and it was previously
reachable only by accident.

**`easing` (3)** — new bucket, and the one that carries the differentiator.
Chunking (Graybiel), context/cues (Wood), dopamine shifting to the cue
(Schultz). All three are revivals of tidbits the 2026-07 audit cut for
automaticity, reframed around initiation cost.

**`established` (3)** — grey matter (Hölzel/Lazar); amygdala down-regulation;
myelin, reframed as why *starting* got cheap.

**`streak` (4)** — identity; the basal-ganglia launch handoff (the thesis stated
outright); distress tolerance; urge surfing (Marlatt).

**`new_habit` (4)** — Lally training curve / 21-day myth; the prefrontal cost of
the early days; Amabile progress principle; learned industriousness
(Eisenberger, explicitly hedged — the evidence leans on animal work).

**`generic` (3)** — dopamine starts at the decision; task-bracketing /
follow-through; sleep consolidation.

### Accuracy notes

- Citation policy carried over from the habit-science work: **verified or
  absent**. Every named study was already cited in the previous set or its
  audit; no new names were introduced.
- The softest claim is still learned industriousness. It is hedged in the copy
  itself ("hold it loosely") rather than left to the reader.
- Two tidbits cite Lally, in `new_habit` (the curve) and `struggle` (the missed
  day). Different angles, different buckets, and they cannot both fire on the
  same check-in — but it's the one overlap in the set.

---

## What the tests cover

[neuroscienceTidbits.test.ts](../src/services/__tests__/neuroscienceTidbits.test.ts)
— 23 tests, and the service had none before this.

Selection: every bucket, the cascade's precedence, the level-2 regression, the
legacy-binary and legacy-1–10-scale paths, the 14-day exclusion, recycling, and
the empty pool.

Content, which is the part likely to drift: every bucket the selector asks for
is populated; no bucket is used that the selector never asks for; every
`habit_type` value is reachable from some real habit name; no duplicate text
(the seeder dedupes on it); and **the voice rules are asserted** — a "rep" or a
"the practice" in new copy fails the suite.

`deriveHabitType` pattern order is load-bearing and pinned: "Screen-free
wind-down" must reach `sleep` rather than `screen_limit`, "No phone for the
first 30 minutes" must reach `screen_limit` rather than `deep_work`.

---

## Shipping this — READ BEFORE SEEDING

**Source of truth is Firestore** (`neuroscienceTidbits`), not the seed file.
[seedTidbits.ts](../src/utils/seedTidbits.ts) is **append-only and dedupes by
exact `text`** — it only ever adds.

Every string in the set was rewritten, so **nothing will dedupe**. Seeding
without deactivating first leaves ~63 active tidbits, old and new, competing in
the same buckets — `generic`, `new_habit`, `streak`, `established` and
`struggle` all still exist under those names. Users would get a random mix of
two contradictory sets, and the old half still says "rep" and "practice".

Order matters:

1. Commit + `eas update --branch production` so the bundle carries the new data
   **and the bulk button in step 2** — that button ships in the same JS bundle,
   so it won't exist in the app until this update lands.
2. **Admin → Tidbits → "Deactivate all".** Mandatory, not housekeeping.
   `getAllActiveTidbits` filters on `active`, so this fully clears the pool.
   Nothing is deleted and "Reactivate all" puts it back — the button pair is
   `setAllTidbitsActive` in the service, covered by test.
3. **Admin → Dashboard → Seed Tidbits** to add the 32.
4. Back on Admin → Tidbits, confirm it reads **63 tidbits (32 active)**. If
   active is higher than 32, step 2 didn't take and both sets are live.
5. Complete one habit and confirm the card reads correctly.

The old docs stay in Firestore as inactive rows. That's deliberate — it keeps
the rollback one tap away. Delete them row by row later if the admin list gets
annoying; there is no bulk delete on purpose, because an append-only seeder
plus a bulk delete is a bad thing to have within one tap of each other.

**Why not a script:** `firestore.rules` gates `neuroscienceTidbits` writes to an
authenticated uid with `is_admin == true`, so a headless client gets
`permission-denied`. [runSeedTidbits.ts](../scripts/runSeedTidbits.ts) exists as
a backup but needs a service-account key or `gcloud` ADC.

---

## If Challenges ever comes back

`selectTidbitForCompletion`, the `challenge_type` / `category` / `state` /
`generic` context types, and `deriveChallengeType` (now an alias of
`deriveHabitType`) are all still in place — archived, not deleted, matching how
`MainTabs` treats the stack itself. But **nothing seeds those types any more**,
so restoring the tab gives challenge completions an empty pool. That's a content
task at that point, not a code one. The retired copy is in git at `824d1cf`.
