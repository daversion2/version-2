# Onboarding Config

The onboarding flow is admin-configurable without a deploy, following the
rules-engine philosophy: **composition and content in a Firestore document,
renderers in code.**

Tier 1 (June 2026) made the copy and knobs editable; Tier 2 (June 2026)
made the flow itself **steps-as-data**: the config is an ordered array of
step objects that can be reordered, switched off, and extended with generic
info pages.

## Using it

**Admin → Onboarding Content.** The screen lists the flow top to bottom —
one collapsible card per step. Tap a card to edit its content and button
label. Every **new signup** sees the saved flow immediately (existing users
never see onboarding again). **Reset to Defaults** deletes the override doc
and reverts to the built-in 7-step flow.

Per step you can:

- **Reorder** middle steps with the up/down arrows.
- **Switch a step off** to skip it (the switch on the card). Welcome and
  Reveal are structural — always first/last, can't be disabled.
- **Edit all content** — copy, science blurbs, button labels, timer
  duration, example mantras (one per line), the foundation habit
  (id/display name/weekly target), and which habits are offered.
- **Add an info page** — a generic headline + body (+ optional expandable
  "why this works") step you can insert anywhere in the middle. These are
  the only addable/deletable steps; the specialized steps (timer, mantra,
  habits, …) exist at most once.

### Step types

| Type | Renders | Notes |
|---|---|---|
| Welcome | Full-screen intro | Always first |
| Settle | Intention box + science toggle | |
| Timer exercise | The 60-second sit (duration configurable) | Also hosts the "Just take me to the app" skip link |
| Bridge | Headline/body/kicker page | |
| Info page | Generic headline + body + optional science | Addable/deletable |
| Mantra picker | Free-text + example chips | Next is gated on a non-empty mantra |
| Habit picker | Locked foundation habit + pick-one list | Next is gated on a selection |
| Reveal | Summary + completion | Always last |

### Skipping steps changes completion behavior

- **Mantra picker off** → no mantra is collected or saved; the Reveal hides
  the mantra card.
- **Habit picker off** → no habits are created and no Day 1 is logged; the
  Reveal hides the habit rows.

## How it works

- Config lives at **`config/onboarding`**: `{ steps: [{ id, type, enabled,
  next_button, content }] }`. Security: authenticated read (new users read
  it right after signup), admin write (`firestore.rules` `config/` block).
- `src/services/onboardingConfig.ts` holds the types, the default flow
  (original hardcoded copy, kept as the permanent fallback), the
  **sanitizer**, and fetch/save/reset.
- **Fail-safe by design** — the sanitizer guarantees a renderable flow no
  matter what's stored: unknown step types are dropped, duplicate
  singletons deduped, Welcome/Reveal injected and pinned if missing or
  misplaced, every content field falls back individually on missing or
  wrong-typed values, and the OnboardingScreen fetch is timeout-guarded
  (3 s). Documents saved in the Tier 1 flat shape are migrated on read.
  The sanitizer is unit-tested (`__tests__/onboardingConfig.test.ts`).
- Renderers stay in code (`OnboardingScreen.tsx`) — one per step type,
  driven by `step.content`. Adding a brand-new step *type* is a code
  change; composing the flow out of existing types is not.
