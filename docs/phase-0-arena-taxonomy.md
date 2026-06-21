# Phase 0 — Arena Taxonomy & Content Mapping (first pass)

> **Status:** First draft for review. Implements Phase 0 of
> [arenas-vs-goals-decision.md](./arenas-vs-goals-decision.md). Defines the arenas (six from the
> brief + a 7th added in review) and maps every existing challenge + habit onto them, grounded in
> the actual repo content
> (57 challenges in [challengeSeedData.ts](../src/data/challengeSeedData.ts), 42 habits across
> [habitLibrary.ts](../src/data/habitLibrary.ts) + [traditionalHabits.ts](../src/data/traditionalHabits.ts)).
>
> **The point of this pass:** turn "define the arenas" into something concrete to react to, and
> prove out (or disprove) the migration before any code. **It does both — and it surfaced two
> findings that need your decision before we build anything.**
>
> **Last updated:** 2026-06-21

---

## TL;DR — two findings that need a decision

1. **Breathwork has ZERO challenge content and exactly ONE habit.** The six-arena model has a
   bucket with almost nothing in it. Breathwork is entirely net-new content + the breath-pacer
   tool — it cannot be populated by re-tagging.

2. **A large slice of existing content didn't fit any of the original six arenas** — now
   resolved by **adding a 7th arena (Impulse Control)** and **pruning** the rest. ~32 items were
   off-thesis: the resist-the-urge cluster (no sugar/caffeine/snooze, fasting, speech restraint)
   moved into the new Impulse Control arena; the remainder (wellness, hygiene, finance, admin,
   chores — make your bed, floss, track spending, plan your day) is pruned or hidden. The six
   discomfort arenas are about **overriding a stop signal**; Impulse Control is about **overriding
   a craving** — same override mechanism, opposite direction. See the
   [resolved decision](#decision-7th-arena--prune-resolved) below.

Everything else maps cleanly. Physical, Social, Boredom, Cognitive, and now Impulse Control are
well-populated; Mental Stillness is viable; **only Breathwork is empty.**

---

## The seven arenas (proposed definitions)

This is the artifact to mark up. Each arena = one flavor of "stop signal" + its neuroscience +
how we measure a baseline. (Six are from the brief; #7 Impulse Control was added per the
[leftover-bucket decision](#decision-7th-arena--prune-resolved).)

| # | `arena_id` | Display name | The stop signal it trains | Neuroscience hook | Baseline metric | Color | Icon (Ionicons) |
|---|---|---|---|---|---|---|---|
| 1 | `mental_stillness` | **Mental Stillness** | "I can't just sit here — I need to *do* something" | Default-mode-network regulation, ACC strengthening, interoceptive awareness | Duration of uninterrupted stillness | `#217180` (brand teal) | `flower-outline` |
| 2 | `physical_discomfort` | **Physical Discomfort** | "This hurts / I'm cold / I want to stop" | Norepinephrine spike, post-exposure dopamine, stress inoculation, ANS regulation | Duration in cold/heat or effort held | `#FF5B02` (brand orange) | `barbell-outline` |
| 3 | `deliberate_boredom` | **Deliberate Boredom** | "I'm bored — let me grab my phone" | Dopamine-receptor upregulation, DMN engagement | Duration without reaching for stimulation | `#64748B` (slate) | `hourglass-outline` |
| 4 | `breathwork` | **Breathwork** | "I'm activated and want to wait until I feel calm" | Vagal tone, HRV improvement, parasympathetic activation | Subjective stress rating before→after (delta) | `#4A90D9` (sky) | `pulse-outline` |
| 5 | `social_discomfort` | **Social Discomfort** | "They'll judge me / this will be awkward" | Amygdala-reactivity reduction, social-threat recalibration | Completion (binary) + subjective difficulty rating | `#E85D75` (coral) | `people-outline` |
| 6 | `cognitive_resistance` | **Cognitive Resistance** | "This is too hard to think about right now" | PFC activation, working-memory engagement, cognitive-fatigue tolerance | Duration of focused effort | `#7B61FF` (purple) | `school-outline` |
| 7 | `impulse_control` | **Impulse Control** *(Delayed Gratification)* | "I want this *now*" — the urge to take the immediate reward/relief | PFC top-down inhibition over limbic reward-seeking; reduced delay-discounting; dopamine regulation | Completion + urge-intensity rating (or duration resisted) | `#2ECC71` (emerald) | `hand-left-outline` |

> **Note — the override still holds, inverted.** Arenas 1–6 train overriding a *stop/avoid* signal
> (push through discomfort). Arena 7 trains overriding a *go/grab* signal (resist a craving). Same
> core — PFC authority over limbic reactivity — just the opposite direction. Framed as: "the moment
> between your brain saying *indulge* and you choosing to abstain." Added per the leftover-bucket
> decision below; it absorbs the largest off-thesis cluster (food/substance restraint, snooze,
> speech restraint) and is arguably core to self-discipline that the original brief under-weighted.

Colors are drawn from the existing brand ([theme.ts](../src/constants/theme.ts): teal/orange)
plus the existing goal palette ([goalColors.ts](../src/constants/goalColors.ts): purple, sky,
coral) so they're already on-brand and visually distinct.

**Mental Stillness vs. Deliberate Boredom** (the easy-to-confuse pair, per the brief): Stillness
is about the *internal* urge to escape your own mind (observing thoughts); Boredom is about
resisting *external* stimulation (the phone, noise, input). Items are sorted accordingly below.

---

## Hard-coded vs. data-driven (recommendation)

**Recommendation: single typed source of truth now; designed to graduate to a Firestore config
later.** Concretely:

- Define the six arenas as one typed constant array in **`src/constants/arenas.ts`** (id, name,
  color, icon, neuroscience blurb, baseline config). One file, type-safe, easy to edit — *not*
  scattered across the codebase.
- Keep the **item→arena assignment data-driven** (an `arena_id` field on each library item / in
  Firestore), never inferred at runtime.
- Shape the arena constant to mirror the existing [onboardingConfig](./ONBOARDING-CONFIG.md)
  pattern so it *can* move to a `config/arenas` Firestore doc later **if** the set needs to
  change without a release.

This is the pragmatic middle the [decision doc](./arenas-vs-goals-decision.md) Open Question #2
points at: don't over-engineer a CMS for six rarely-changing arenas, but don't bake the values
so deeply (into types, migrations, colors) that changing the *set* becomes a migration. The
biggest hard-coding risk is `arena_id` string literals leaking everywhere — the single-file
source of truth contains that.

---

## Category → arena mapping (coarse — and why it's not enough)

The existing taxonomies don't line up with arenas, which is exactly why item-level mapping is
required:

| Existing challenge "Life Domain" | Maps to arena(s) | Clean? |
|---|---|---|
| **Physical** (21) | → Physical Discomfort | Mostly (minus diet/impulse items) |
| **Social** (14) | → Social Discomfort | Mostly |
| **Mind** (22) | → splits across Mental Stillness, Deliberate Boredom, **and** Cognitive Resistance | **No — one category, three arenas** |

| Existing habit categories | Maps to arena(s) | Clean? |
|---|---|---|
| Body, Focus, Mind, Money, Connection / traditional-health, -mind, -productivity, -lifestyle, -learning | → scattered; many → *no arena* | **No** |

**The punchline the decision doc predicted, now confirmed:** category-level inference puts every
"Mind" challenge in one bucket when they belong in three different arenas, and it has no signal
at all for Breathwork. **Items must be tagged individually** (and library content should be born
arena-tagged going forward).

---

## Item-level mapping — coverage report

Counts are approximate (a handful of items are genuinely borderline and flagged). Full per-arena
lists below.

| Arena | Challenges | Habits | Verdict |
|---|:--:|:--:|---|
| Mental Stillness | ~6 | 2 | Viable (gained the reflective journaling items) |
| Physical Discomfort | ~11 | ~4 | **Strong** (food-restriction items moved to Impulse Control) |
| Deliberate Boredom | ~7 | ~4 | Good |
| **Breathwork** | **0** | **1** | **Empty — net-new content required** |
| Social Discomfort | ~12 | ~3 | **Strong** |
| Cognitive Resistance | ~6 | ~5 | Good |
| **Impulse Control** *(new, 7th)* | **~10** | **~4** | **Good — absorbs the largest leftover cluster** |
| **Prune / de-emphasize** | ~2 | ~16 | Off-thesis wellness/admin/hygiene/finance — cut or hide |

### Mental Stillness
**Challenges:** Sit in Complete Silence · Sit with an Uncomfortable Emotion · Meditate Without
Moving · Go an Entire Day Without Speaking · Journal for X Minutes · Write a Letter to Your Future
Self · *(borderline: Journal About Your Biggest Fear)*
**Habits:** 5-minute meditation · Meditate (traditional)

### Physical Discomfort
**Challenges:** Cold Water Face Splash · Cold Shower · Ice Bath / Cold Plunge · No Hot Water All
Day · Take the Stairs All Day · Do X Burpees · Hold a Wall Sit · Go a Day Without Sitting · Carry
a Loaded Rucksack · Spin Class then Run · Sleep on the Floor · Eat Something You Dislike · Stretch
Without Your Phone
**Habits:** 20 minutes of movement · Exercise · Hit 10,000 steps · Stretch *(all mild — exercise,
not "exposure")*
*(Fasting / OMAD / No Eating After 7 PM moved to Impulse Control — they're restraint, not exposure.)*

### Deliberate Boredom
**Challenges:** Do Absolutely Nothing for One Hour · No Phone for the First X Hours · No Social
Media for the First X Hours · No Phone for X Hours · No Social Media All Day · Zero Background
Noise All Day · Go 24 Hours Without Checking the Time
**Habits:** No phone for the first 30 minutes · No social media before noon · Screen-free
wind-down · Limit screen time (traditional)

### Breathwork
**Challenges:** *(none)*
**Habits:** A real midday pause *(the only breathwork item in the entire app)*

### Social Discomfort
**Challenges:** Call Someone Instead of Texting · Introduce Yourself to a Neighbor · Start a
Conversation with Strangers · Ask for Brutally Honest Feedback · Apologize to Someone · Disagree
Out Loud in a Group · Record and Post a Video · Sing or Perform · Make a Request You Expect to Be
Denied · Eat Alone at a Restaurant · Say No to Non-Essential Requests · No Phone During Social
Interaction
**Habits:** Call instead of text · Send one genuine message · Phone-free meal with someone

### Cognitive Resistance
**Challenges:** Read Without Stopping · Deep Work Block (Zero Distractions) · Do the Hardest Task
First · Tackle the Procrastinated Task · Learn Something You're Terrible At · Write Down Every
Excuse You Make *(self-monitoring effort)*
**Habits:** One deep focus block · First focus block before email · Read · Practice a language ·
Practice a skill

### Impulse Control *(new, 7th arena)*
**Challenges:** No Caffeine · No Added Sugar · No Cooked Food · No Eating After 7 PM · Eat One
Meal (OMAD) · Fast for X Hours · Wake Up Without Snooze · No Complaining 24h · No Gossip · No
Lying 24h
**Habits:** Water only today · Cut the sugar · Get up at the first alarm · Wake up early
*(Protect my bedtime is borderline — resisting the urge to stay up; could live here.)*

---

## Decision: 7th arena + prune *(resolved)*

**Decision (2026-06-21): add the 7th arena (Impulse Control) AND prune the off-thesis content.**

The impulse-control cluster now has a home (see the [Impulse Control](#impulse-control-new-7th-arena)
list above): food/substance restraint, snooze, and speech restraint moved there; the reflective
journaling challenges moved to Mental Stillness / Cognitive Resistance. What remains is genuinely
off-thesis for an override-training app — **prune or hide it:**

**Challenges to prune (~2 — pure chores, no override):** Make Your Bed · Organize the Most
Chaotic Space

**Habits to prune (~16 — wellness / hygiene / finance / admin / gratitude):**
- *Wellness:* Drink more water · Eat your vegetables · Take vitamins · Cook one real meal · Get
  outside in the morning
- *Hygiene:* Floss · Skincare routine
- *Finance:* Look at my accounts · Track today's spending · Move money toward a goal · Track your
  spending (traditional)
- *Admin / chore:* Set tomorrow's top priority · Plan your day · Make your bed · Tidy up
- *Reflection (keep only if it earns an arena):* Name one good thing · Practice gratitude ·
  Journal (traditional) — these arguably belong to Mental Stillness if reframed; otherwise prune

**Note:** "prune" can mean *hard-delete from the seed library* or *keep but hide from the
arena-organized surfaces* (a reversible soft option). Most of these live in the **Traditional
habit library** ([traditionalHabits.ts](../src/data/traditionalHabits.ts)), which is almost
entirely generic wellness — the cleanest single thing to cut or gate. Recommend soft-hiding
first (reversible), hard-pruning the Traditional library once the arena direction is validated.

---

## Status: Phase 0 IMPLEMENTED (2026-06-21)

The taxonomy below is now in code (compiles clean; pre-existing unrelated tsc errors aside):

- ✅ `ArenaId` union added in [src/types/index.ts](../src/types/index.ts)
- ✅ Source of truth: [src/constants/arenas.ts](../src/constants/arenas.ts) — the 7 `ARENAS`
  (id/name/subtitle/stopSignal/neuroscience/baseline/color/icon), `getArena`, `getArenaColor`,
  `UNASSIGNED_ARENA_COLOR`, and the `CATEGORY_FALLBACK_ARENA` (flagged last-resort-only)
- ✅ Optional `arena_id` + `off_thesis` fields on `LibraryChallenge`, `LibraryHabit`, and the
  local `SeedChallenge` (optional, per the safe-migration strategy)
- ✅ **All 99 library/seed items tagged** inline so content is born arena-tagged:
  80 `arena_id` + 19 `off_thesis` (57 challenges + 21 curated habits + 21 traditional habits)

**Not yet (later phases):** `arena_id` on user-facing entities (Challenge, Nudge,
ProgramEnrollment, WorksheetEntry), the ArenaPicker, the "By Arena" Home lens, Override Score,
baselines, and the Discipline Map — these are Phases 1–5 in
[arenas-vs-goals-decision.md](./arenas-vs-goals-decision.md).

### Next step
~~Phase 1~~ **Phase 1 underway** — see [arenas-vs-goals-decision.md](./arenas-vs-goals-decision.md)
(Phase 1 row). `arena_id` is now on all four user-facing entities, the `ArenaPicker` is built and
required in manual challenge creation, arena auto-derives from the library on challenge-use and
habit-add, and arena chips show on active item detail screens.

---

## Open questions specific to Phase 0

1. ~~**Leftover bucket:** add a 7th arena, allow untagged, or prune?~~ **Resolved: 7th arena
   (Impulse Control) + prune.** Remaining sub-question: hard-delete the pruned items or
   soft-hide them? (recommend soft-hide first — reversible)
2. **Arena names:** "Mental Stillness" vs "Meditation" vs "Stillness"? "Cognitive Resistance" vs
   "Hard Mental Work"? These are user-facing — worth getting right now since they'll appear
   everywhere.
3. **Breathwork content:** confirmed it's net-new. Is building the breath-pacer + authoring
   breathwork challenges in scope soon, or does Breathwork ship as a "coming soon" arena first?
