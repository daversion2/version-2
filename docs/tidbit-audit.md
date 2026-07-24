# Neuroscience Tidbit Audit — Practice Completions

> Audit + rewrite of the neuroscience tidbits that pop up **after a practice is completed**.
> Motivation: the originals were written for a habit-formation app and celebrated *automaticity*
> ("this becomes effortless, your basal ganglia takes over"). That directly contradicts the app's
> current thesis — deliberately doing hard things outside your comfort zone to train the *override*.
> If a practice becomes automatic/effortless, it's no longer training the override.
>
> Status: **Applied** (commit `ef5fb4b`, OTA on production branch, runtime 2.2.0, 2026-07-24).

---

## Scope: which tidbits fire after a practice

After a practice completion the app calls `selectHabitTidbit`, which **only** selects tidbits where
`context_type === 'habit'` ([neuroscienceTidbits.ts](../src/services/neuroscienceTidbits.ts)). The
`challenge_type`, `state`, and `generic` tidbits fire after **challenges**, not practices — so this
audit covered only the 14 `habit` tidbits.

Selection buckets (`context_value`) and their priority logic:
- `struggle` — returning after a miss, or rated the practice "challenging"
- `established` — streak ≥ 30
- `streak` — streak ≥ 7
- `new_habit` — streak ≤ 14
- `generic` — fallback when no state matches

The rewrite kept the same bucket distribution: **generic 3, new_habit 4, streak 3, established 2, struggle 2 = 14**.

---

## Original audit verdicts (14 habit tidbits)

| # | Theme | Verdict | Why |
|---|-------|---------|-----|
| 1 | Basal-ganglia "chunking" — *less brainpower required* | **Cut** | celebrates effortlessness |
| 2 | Task-bracketing completion signal | **Rework** | "completion matters" good, wrapped in automaticity |
| 3 | Sleep consolidation — *tomorrow's habit is easier* | **Rework** | science good, "easier" frame off |
| 4 | Dopamine migrates to cue — *teaching your brain to want it* | **Cut** | "wanting it automatically" undercuts override |
| 5 | Lally 66-day / 21-day myth | **Rework** | habit-timeline framed |
| 6 | PFC → basal ganglia — *future you won't have to think* | **Cut** | automaticity |
| 7 | Identity — *casting a vote for who you are* | **Keep** | strong fit |
| 8 | Myelin — *dial-up → fiber, 100x faster* | **Cut** | speed/automaticity |
| 9 | Context/cue (Wendy Wood) — *brain recognizes setting and executes* | **Cut** | context-binding automaticity |
| 10 | Harvard gray-matter — *brain reshapes around what you practice* | **Keep** | fit |
| 11 | PFC → basal ganglia — *don't feel like decisions* | **Cut** | automaticity |
| 12 | Stress defaults to encoded habit | **Rework** | resilience angle salvageable |
| 13 | Lally missed-day — *you're back* | **Keep** | comeback/resilience |
| 14 | Amabile progress principle — small wins/momentum | **Keep** | fit |

**Result: Keep 4, Rework 4, Cut 6.** The 6 cuts all shared one flaw — selling the practice becoming automatic/effortless.

---

## Final set (14, all in the override/discomfort frame)

Source of truth for copy is [src/data/tidbitSeedData.ts](../src/data/tidbitSeedData.ts) (the `HABIT` section).

**generic**
- ACC / effort — "the moment you wanted to stop and didn't, your anterior cingulate cortex lit up" (replaced #1)
- Follow-through — "finishing matters more than starting" (reworked #2)
- Sleep — "today's effort becomes tomorrow's capacity" (reworked #3)

**new_habit**
- Effort valuation — "dopamine tracks the effort it took" / learned industriousness (replaced #4)
- Prefrontal override — "your PFC does a real rep… stronger under load" (replaced #6)
- Training curve — "no magic number of reps… missing a day doesn't set you back" (reworked #5)
- Progress principle — Amabile small wins (kept #14)

**streak**
- Identity — "casting a vote for a new identity" (kept #7, "habit"→"practice")
- Distress tolerance — "your baseline moves… harder to rattle" / hormesis (replaced #8)
- Urge surfing — "the urge to quit isn't a command, it's a wave" (replaced #9)

**established**
- Gray matter — Harvard MBSR (kept #10, "habit"→"practice")
- Amygdala down-regulation — "harder to alarm" (replaced #11)

**struggle**
- Stress inoculation — "practicing discomfort when you don't have to" (reworked #12)
- Comeback — Lally missed-day (kept #13)

### Accuracy notes
- ACC/effort, urge-surfing, hormesis/stress-inoculation, amygdala-reactivity claims are well-grounded.
- The softest claim is the `new_habit` effort-valuation tidbit's "learned industriousness" (Eisenberger) — real and cited, but based heavily on animal work. Hedge if desired.
- Two tidbits cite the Lally study (the `new_habit` training-curve one and the `struggle` comeback one). Different angles/buckets, but note the mild overlap.

---

## How to apply changes (the seeding pipeline)

**Source of truth is Firestore** (`neuroscienceTidbits` collection), NOT the seed file.
[src/utils/seedTidbits.ts](../src/utils/seedTidbits.ts) is **append-only and dedupes by exact `text`** —
it only ever *adds*, never updates or deletes.

To change what users see:
1. Edit [src/data/tidbitSeedData.ts](../src/data/tidbitSeedData.ts).
2. Ship it (commit + `eas update --branch production`) so the app bundle has the new seed data.
3. Delete the stale tidbits in **Admin → Tidbits** (or toggle inactive), then
   **Admin → Dashboard → Seed Tidbits** to add the new ones. The button runs as your authenticated
   admin account.

**Why not seed from a script:** Firestore rules gate `neuroscienceTidbits` writes to
`request.auth.uid` with `is_admin == true` ([firestore.rules](../firestore.rules)). A headless client
script gets `permission-denied`. [scripts/runSeedTidbits.ts](../scripts/runSeedTidbits.ts) exists as a
backup but needs a service-account key or `gcloud` ADC to bypass rules.

**Editing an existing tidbit's text** via the seeder creates a *duplicate* (new text ≠ old), so always
deactivate/delete the old one in Admin too.
