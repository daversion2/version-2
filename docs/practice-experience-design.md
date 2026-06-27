# Practice Experience Design — Ready / Go / Capture

> **Status:** Design decisions for review. Builds on
> [practice-protocol-direction.md](./practice-protocol-direction.md) — that doc decided *which*
> practices exist and how they're grouped/tracked; this doc decides *what doing each practice
> actually feels like*, screen by screen.
> Produced from a design conversation (2026-06-27).
>
> **Last updated:** 2026-06-27

---

## TL;DR

A practice is a **rep of overriding an urge**. The app's job is to be a great **coach before**
and a **journal after** — and to **get out of the way during**, because for most practices the
phone is the enemy of the rep (you can't hold a phone in a cold plunge, and clock-watching kills
boredom).

That gives every practice a three-beat shape:

```
  READY  ───────►   GO   ───────►  CAPTURE
 (briefing)      (do the rep)      (the override
  on-screen      phone away or      reflection)
                 guided timer)
```

**Ready** and **Capture** are the *same two components* for every practice, driven by per-practice
content. The only thing that branches is the **middle beat**. That branch defines three archetypes.

---

## The core insight: shape of difficulty

A generic countdown ignores that each practice gets hard at a *different point*. Map the urge
curve and the right UX falls out:

```
Cold / Heat:  Cold hits at the START (the gasp); Heat builds and peaks LATE
Boredom:      hardest in the MIDDLE (restless trough); clock-watching makes it worse
Meditation:   urge spikes come in WAVES, unpredictable
Fasting:      hardest in DISCRETE SPIKES (hunger waves, hours apart) — not continuous
Movement:     hardest near the END (the "I want to stop" at effort ceiling)
Harder Choice: ONE binary moment (the choice), then it's over
```

The briefing aims you at *that* moment; the capture asks about *that* moment.

---

## The three archetypes

| Archetype | Middle beat | Practices |
|---|---|---|
| **1. Timed / phone-present** | Ready → live timer + chime → Capture. The app *is* present and guides. | Meditation, Breathwork |
| **2. Away-from-phone** | Ready → handoff screen → (phone down) → "I'm done" → Capture. App shuts up; chime or self calls them back. | Cold, Heat, Boredom |
| **3. Single-moment** | Pre-commit → confirm. No session, no timer. | The Harder Choice |

Plus **three parked** (see end): Reflection, Movement, Fasting.

---

## The shared screens

### Ready (briefing) — same skeleton, per-practice fills
A ~15-second briefing, not a wall of text. Up to four blocks:

1. **What to expect** — the difficulty arc, so the hard part doesn't surprise them.
2. **Focus on** — the one anchor/technique.
3. **The override** — name the urge they're about to resist. *(This is the thesis, surfaced
   before the moment instead of only after.)*
4. **Handoff** — start the timer, or "put your phone down."

A **"I know this one — skip brief"** shortcut exists for veterans; new users get the full briefing.
Not every practice uses every block (e.g. Breathwork has no difficulty spike, so it drops "what to
expect").

### Capture — same skeleton, per-practice fills
Confirms the rep and — critically — logs **the override**: did the urge come, and did you stay/push
past it. This is the genuinely new, on-thesis data the current completion modal doesn't collect.
Ends with points + streak.

---

## Per-practice decisions

### 1. Meditation — *Timed / phone-present*
- **Ready:** length only (5/10/15/custom). **No technique/style choice** — keep it simple, one
  instruction: notice the urge, don't act, return.
- **During:** **pure stillness** — quiet countdown + one-line reminder + chime. No urge-tap counter
  (tapping is a small action against stillness).
- **Capture:** "the urge to move/stop — did it come?" (a lot / some / barely) + optional one line.

### 2. Breathwork — *Timed / phone-present*
- **Ready:** pattern (Box / 4-7-8 / Physiological Sigh) + length. No "what to expect" block —
  breathwork has no difficulty spike.
- **During:** **animated breath pacer** — circle expands/contracts to pace inhale/exhale/holds.
  This is the one practice where on-screen guidance *is* the technique. **Build it for v1** (not a
  later follow-up).
- **Capture:** framed as **feeling-change**, not override — "did you hold the pace?" + a
  before/after check (calmer / same / wired). Honest to breathwork's real payoff (state
  regulation).

### 5. Cold Exposure — *Away-from-phone* (flagship of this archetype)
- **Defining arc:** front-loaded shock — the whole battle is the first 20–30 seconds.
- **Ready:** expect ("first 30s are the worst, then it quiets") / focus ("long slow exhales,
  control the gasp") / override ("you'll want out — don't obey it").
- **Go:** "Put your phone down → get in." No live timer. "I'm done" returns them.
- **Capture:** **log duration after** with quick chips (1:00 / 2:00 / 3:00 / custom). **Temp
  optional** (secondary field; duration is the headline). Override: urge to get out came? + did you
  stay?

### 6. Heat Exposure — *Away-from-phone*
- **Twin of Cold with a reversed arc** — easy at first, urge to leave builds and peaks late.
- **Kept as its own separate practice** (not merged with Cold into a "Temperature" toggle).
- **Inherits all of Cold's settings** (log-after chips, temp optional); only the briefing copy and
  arc differ ("the urge to leave builds slowly and peaks near the end").

### 7. Deliberate Boredom — *Away-from-phone* (most distinctive design)
- **Unique twist:** the phone *is* the temptation. It stays **right there, face-down**, and
  resisting the urge to flip it over is the practice.
- **During:** **invisible timer** — no visible countdown (clock-watching defeats the practice). The
  **chime is the only signal**; screen goes dark.
- **Capture:** **"What came up while you were bored?" is the HERO** — boredom reframed as a
  thinking/insight practice, not just impulse control. The override (did you make it / how strong
  was the pull) is captured as secondary confirmation.

### 9. The Harder Choice — *Single-moment* (renamed/broadened from "Eat Food I Don't Enjoy")
- **Broadened scope:** not just "eat food I don't enjoy" — covers skipping dessert, no seconds,
  water over soda, etc. Same single-moment override, wider net.
- **Model: pre-commit then confirm.** Before a meal/moment, *"I'm taking the harder option"* →
  confirm after + note what you overrode. **The commitment is the rep, made *before* temptation
  hits.**
- No timer, no session — the fastest, lowest-ceremony thing in the app. The real work happens at
  the table; the app just marks the rep.

---

## Parked (revisit later)

| Practice | Why parked | The open question |
|---|---|---|
| **Reflection** | Treated as **separate from practices** — it's on-phone writing, already the most built-out flow ([NightlyReflectionScreen.tsx](../src/screens/NightlyReflectionScreen.tsx)). Doesn't fit Ready→Go→Capture. | Whether to reframe its prompts around the override theme later. |
| **Movement** | **Scope undecided** — too broad to fit one practice cleanly (lifting vs. running vs. rucking). | Is the override "showing up" or "push past wanting to stop"? Decide scope before designing. |
| **Fasting** | **Its own background-state model** — spans 12–36 hrs, not a session; difficulty comes in discrete hunger waves hours apart. Biggest net-new build. | Live state + "riding a wave" override taps + mealtime notifications, vs. simpler log-after. |

---

## What this means for the build

- **Two reusable components** — `Ready` and `Capture` — driven by per-practice content fields on
  [practices.ts](../src/data/practices.ts). Differentiation lives in *content + which middle-beat
  fires*, not in N separate builds.
- **Middle beat branches three ways:** live timer + chime (already built — `c43910d`), away-from-phone
  handoff, or none (single-moment).
- **New on-thesis data:** the Capture "override" block (urge came? / did you stay?) is not collected
  today; it's the data the whole protocol claims to train.
- **Reuses existing machinery:** the timer + keep-awake + chime, and `HabitCompletionModal` /
  completion-logging path get *extended*, not replaced. (Detailed code mapping is the next doc.)
