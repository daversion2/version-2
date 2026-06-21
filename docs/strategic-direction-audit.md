# Strategic Direction Audit — "Training Your Override"

> **Status:** Working document. Produced from a codebase audit against the new strategic
> direction brief (the "Training Your Override" direction). This is a gap analysis and a
> prioritized starting point — **not** a finalized build plan.
>
> **Last updated:** 2026-06-21

---

## 0. The new direction in one line

**Neuro-Nudge is a self-discipline training app built around one mechanism: training your
ability to override your brain's "stop signal."** Every feature is either an **arena** to
practice the override, a **tool** to understand it, or a **mirror** to show you're getting
better.

Six **arenas** of practice:

1. **Mental Stillness** (Meditation) — foundational arena + primary baseline test
2. **Physical Discomfort** (cold/heat/effort)
3. **Deliberate Boredom** (no stimulation)
4. **Breathwork** (state regulation on demand)
5. **Social Discomfort** (hard conversations, boundaries)
6. **Cognitive Resistance** (deliberately hard mental work)

Three **proof-of-growth** systems the direction calls for:

- **Override Score** (weekly count of overrides across arenas)
- **Arena Baselines + Discomfort Shift** (periodic baseline tests; the delta is the proof)
- **Discipline Map** (visual of which arenas you've trained — strength + avoidance)
- **Neuroscience Milestone Unlocks** (earned educational content at thresholds)

---

## 1. Headline finding

The app is **much more built-out than the brief assumes** — and that's the central tension,
not a shortage of features. The codebase is a large, mature, **goals-centric** product
(goals contain habits + challenges + programs) wrapped in a heavy social layer (teams, buddy
challenges, inspiration feed, community submissions/reviews).

The new direction is **narrower and more opinionated**: one mechanism, six arenas, a few
proof-of-growth metrics.

So the work is less "build the vision from scratch" and more **refocus + reframe + fill three
specific holes**. The biggest risk is **sprawl diluting the single idea**, not missing
capability.

### The keystone gap

The brief's core organizing concept — the **Arena** (Physical / Mental / Social / Cognitive +
Boredom + Breathwork) — **does not exist as a first-class taxonomy anywhere in the data
model.** Almost everything in the new direction hangs off it (Discipline Map, arena
baselines, arena-tagged challenges/habits, arena landing screens). This is the single most
important thing to add, and most other work depends on it.

---

## 2. Audit answers

### Q1 — Features that map cleanly (KEEP, just reframe)

| Feature | Why it fits | Reframe needed |
|---|---|---|
| **Challenges** ([src/types/index.ts:107-158](../src/types/index.ts#L107-L158)) | Already multi-day; has `difficulty_expected` + `difficulty_actual` (1-5); post-challenge reflection; failure reflection; neuroscience fields | Frame as "structured override events." The pre/post difficulty rating the brief asks for **already exists** — wire it into Discomfort-Shift tracking. |
| **Habits / Nudges** ([src/types/index.ts:251-263](../src/types/index.ts#L251-L263)) | Streaks, completion logging, rich action plans, library | Reframe as "daily override reps." Mostly language + a neuroscience hook. |
| **CBT Worksheets** (4 templates, [src/data/worksheetTemplates.ts](../src/data/worksheetTemplates.ts)) | "Challenge That Thought," "Name Your Thinking Trap," "Find the Root," "Turn 'I Should' Into a Plan" — already debugging-flavored, not clinical | Reframe as "cognitive override / mental debugging." Content stays. Map to Social + Cognitive arenas. |
| **Nightly Reflection** ([NightlyReflectionScreen.tsx](../src/screens/Home/NightlyReflectionScreen.tsx)) | Full feature: prompts, A–F grade, daily summary, streak | Prompts are generic. Swap to override-audit prompts. **Prompts are admin-configurable in Firestore** → partly a content edit. |
| **Neuroscience Tidbit infrastructure** ([src/services/neuroscienceTidbits.ts](../src/services/neuroscienceTidbits.ts)) | Context-aware short + extended text, 14-day dedup, admin-editable | Ready for the "2-3 sentence, insider-knowledge" delivery the brief wants. **Content is sparse** — needs writing, not building. |
| **Rules engine + placeholders** ([src/services/rulesEngine.ts](../src/services/rulesEngine.ts)) | `{habits_completed}`, `{challenges_completed}`, `{reflection_streak}`, `{tidbit}` already exist | Can drive milestone-unlock messaging with minimal new code. |

### Q2 — Features that exist but need significant change (MODIFY)

- **Meditation** — Today it is *only a habit* (`morning-meditation`, "5-minute meditation" in
  [src/data/habitLibrary.ts](../src/data/habitLibrary.ts)). **No session experience**: no
  timer, no ambient sound, no post-session reflection, no duration logged beyond binary
  completion. The brief wants this *elevated to the foundational arena and primary baseline
  test.* Significant build. (Reusable seed: the 60-second guided sit timer in
  [OnboardingScreen.tsx:370-414](../src/screens/Auth/OnboardingScreen.tsx#L370-L414).)
- **Challenge taxonomy** — Currently tagged by `barrier_type` (legacy), `action_type`
  (resist/complete), `time_category`, and a free-text "Life Domain" (Physical/Mind/Social).
  Adjacent to but **not** the six Arenas. Needs an `arena` field + re-tagging the 57 seed
  challenges.
- **Reflection prompts** — Content swap to override-audit framing (see Q1).
- **Onboarding** — See Q5.
- **Progress screen** ([HeroStatsRow.tsx](../src/components/progress/HeroStatsRow.tsx)) —
  Tracks Actions / Streak / XP / Days Active. None is the **Override Score**, **Arena
  Baselines**, or **Discipline Map**. See Q6.

### Q3 — Features that don't serve the new direction (CONSIDER DEPRIORITIZING)

Not bad features — but they pull focus from the single mechanism and carry large maintenance
surface:

- **Goals system** ([Goal](../src/types/index.ts#L888-L928), GoalCreationFlow, GoalDashboard,
  measurement logs, visualization settings) — The app is currently *organized around goals.*
  The new direction is organized around *arenas and the override.* **Biggest architectural
  decision:** goals vs. arenas as the primary organizing axis. Likely demote, not delete.
- **Teams / Buddy challenges / Inspiration feed / Community submissions & reviews** —
  Substantial social layer (multiple Firestore collections, 5 of 9 Cloud Functions, ~15
  screens). The persona "responds to systems and evidence more than motivation and hype." The
  **seeded fake inspiration feed** ([seedInspirationFeed](../functions/src/index.ts#L730-L816))
  in particular sits awkwardly with an evidence-driven ethos. Candidate to hide initially.
- **Programs** (5 multi-day templates, badges, enrollments) — Overlaps heavily with multi-day
  extended challenges. Could fold into "arena programs" or shelve.
- **XP / willpower / streak-multiplier scoring** ([src/services/willpower.ts](../src/services/willpower.ts)) —
  Generic gamification. Doesn't measure capacity growth the way Override Score / baseline
  deltas do. May coexist as a secondary layer, but it is not the proof-of-growth the brief
  wants.

### Q4 — Missing entirely (NEW — with rough complexity)

| Gap | Complexity | Notes |
|---|---|---|
| **Arena as a first-class concept** (type + field on challenges/habits/meditation/breathwork, filtering, arena landing) | **Medium** | The keystone. Everything else depends on it. |
| **Meditation session experience** (timer, optional ambient sound, duration log, post-session reflection) | **Medium** | Reuse onboarding timer + reflection patterns. |
| **Breathwork tool** (visual breath pacer: box, 4-7-8, physiological sigh; duration + pre/post stress rating) | **Medium** | Today only a habit description + one tidbit. No pacer exists. Net-new UI. |
| **Deliberate Boredom challenge type** (duration-without-stimulation timer) | **Low–Medium** | Distinct from meditation; reuse a timer + arena tag. |
| **Override Score (weekly)** — overrides across arenas | **Medium** | Decide what counts as an "override rep"; aggregate from existing completion logs. |
| **Arena Baselines + Discomfort Shift** (periodic baseline tests, delta tracking) | **Medium–High** | New data model (baseline records per arena over time) + retest scheduling + delta viz. `difficulty_expected`/`difficulty_actual` give a partial head start. |
| **Discipline Map** (visual: Physical/Mental/Social/Cognitive fill-in over time) | **Medium** | Depends entirely on the Arena taxonomy existing first. |
| **Neuroscience Milestone Unlocks** (earned content at thresholds) | **Low–Medium** | Tidbit infra + rules engine exist; needs content + threshold trigger + an "unlocked" surface. |
| **Override narrative woven through** onboarding, framing, prompts | **Low (content), broad (touchpoints)** | Pervasive copy work. |

### Q5 — Onboarding: how far from what's required

**Current** ([OnboardingScreen.tsx](../src/screens/Auth/OnboardingScreen.tsx), admin-configurable
via Firestore `config/onboarding` — see [docs/ONBOARDING-CONFIG.md](./ONBOARDING-CONFIG.md)):

> Welcome → Settle → **60-second meditation timer** → Bridge → **Mantra picker** →
> **Habit picker** → Reveal

**What's good:** Already a guided, narrated, neuroscience-flavored flow with a working
stillness timer — structurally close to the brief's "Sit quietly for as long as you can.
Don't judge it. Just notice."

**Gap from the brief:**

- The 60-second timer is a *fixed first exercise*, **not a baseline test** — it doesn't
  measure "how long can you sit" or store an arena baseline. The brief wants onboarding to
  establish **Meditation baseline #1**.
- Heavy emphasis on **mantra** (a redirect-thought tool) as the centerpiece — useful, but not
  the override narrative. Needs reframing around "training your override."
- No arena introduction, no Discipline Map seeding, no other-arena baselines.
- Already admin-editable → **a lot of the reframe is content/config, not code.**

**Verdict:** ~50% there structurally; needs the baseline-test mechanic + narrative reframe.

### Q6 — Progress/tracking: where it is and what changes

**Location:** Progress tab → [ProgressScreen.tsx](../src/screens/Progress/ProgressScreen.tsx) +
[src/components/progress/](../src/components/progress/); scoring in
[src/services/willpower.ts](../src/services/willpower.ts) +
[src/constants/willpower.ts](../src/constants/willpower.ts).

**Current system:** XP with streak multipliers (1.0x→2.0x), lifetime counters
(`totalHabitsCompleted`, `totalChallengesCompleted`), per-habit streak/heatmap stats,
reflection grades, charts.

**What the new direction needs that doesn't exist:**

1. **Override Score** — weekly count of overrides across arenas. Aggregatable from existing
   `completionLogs`, but the concept + surface don't exist.
2. **Arena Baselines + Discomfort Shift** — periodic baseline tests and the delta between
   them. **No baseline data model exists today.** This is the brief's core proof-of-growth
   and the biggest tracking gap.
3. **Discipline Map** — needs the Arena taxonomy (Q4) first.

The existing XP/streak machinery can stay as a secondary engagement layer, but it is **not**
the capacity-growth measurement the brief is built around.

---

## 3. Prioritized roadmap

### Phase 0 — One decision blocks everything

- [ ] **Decide: Arenas vs. Goals as the primary organizing axis.** The app is goals-first;
  the brief is arena-first. Pick before building anything below.
  → **Recommendation written up in [arenas-vs-goals-decision.md](./arenas-vs-goals-decision.md)**
  (ship Coexist now as a reversible Phase 1 of an arena-first end state; don't big-bang Replace).
- [ ] **Decide: the social layer** (teams / buddies / inspiration feed) — keep, hide, or cut?
  ~15 screens + 5 Cloud Functions either way.

### Phase 1 — The keystone (unblocks the most)

- [ ] Add **Arena** as a first-class type + field on challenges, habits, meditation, breathwork.
- [ ] Re-tag the 57 seed challenges ([src/data/challengeSeedData.ts](../src/data/challengeSeedData.ts))
  + habit libraries to arenas.

### Phase 2 — Make the two foundational arenas real

- [ ] **Meditation session experience** (timer + duration log + post-session reflection).
- [ ] **Breathwork pacer** (box / 4-7-8 / physiological sigh; pre/post stress rating).

### Phase 3 — Reframe (cheap, high narrative payoff, mostly content/config)

- [ ] Override-audit **reflection prompts** (admin config edit).
- [ ] **Onboarding** narrative reframe + turn the 60-sec sit into a stored **baseline test**.
- [ ] Write **neuroscience tidbit** content + wire **milestone unlocks** (infra already exists).

### Phase 4 — Proof of growth (the differentiator)

- [ ] **Override Score** (weekly).
- [ ] **Arena Baselines / Discomfort Shift**.
- [ ] **Discipline Map**.

### Phase 5 — Decide later

- [ ] What to do with **Goals**, **Programs**, **Teams/Buddies/Feed** (deprioritize, hide, or
  fold in).

---

## 4. Open decisions (need a human call)

1. **Arenas vs. Goals** as the primary axis (Phase 0) — reshapes the entire plan.
2. **Social layer** — keep / hide / cut.
3. **XP/willpower** — keep as a secondary layer, or retire in favor of Override Score?
4. **Programs vs. extended challenges** — consolidate?

---

## Appendix — Key file references

| Area | Path |
|---|---|
| Core data model | [src/types/index.ts](../src/types/index.ts) |
| Worksheet types | [src/types/worksheets.ts](../src/types/worksheets.ts) |
| Rules engine types | [src/types/rules.ts](../src/types/rules.ts) |
| Challenge seed data (57) | [src/data/challengeSeedData.ts](../src/data/challengeSeedData.ts) |
| Worksheet templates (4) | [src/data/worksheetTemplates.ts](../src/data/worksheetTemplates.ts) |
| Habit library | [src/data/habitLibrary.ts](../src/data/habitLibrary.ts) · [traditionalHabits.ts](../src/data/traditionalHabits.ts) |
| Onboarding screen | [src/screens/Auth/OnboardingScreen.tsx](../src/screens/Auth/OnboardingScreen.tsx) |
| Nightly reflection | [src/screens/Home/NightlyReflectionScreen.tsx](../src/screens/Home/NightlyReflectionScreen.tsx) |
| Progress screen | [src/screens/Progress/ProgressScreen.tsx](../src/screens/Progress/ProgressScreen.tsx) |
| Scoring engine | [src/services/willpower.ts](../src/services/willpower.ts) · [src/constants/willpower.ts](../src/constants/willpower.ts) |
| Neuroscience tidbits | [src/services/neuroscienceTidbits.ts](../src/services/neuroscienceTidbits.ts) |
| Rules engine | [src/services/rulesEngine.ts](../src/services/rulesEngine.ts) · [src/services/rules.ts](../src/services/rules.ts) |
| Cloud Functions (9) | [functions/src/index.ts](../functions/src/index.ts) |
