# Onboarding Content Config

The onboarding flow's content is admin-editable without a deploy — Tier 1 of
making onboarding data-driven, following the rules-engine philosophy:
content in a Firestore document, structure in code.

## Using it

**Admin → Onboarding Content.** Edit any field, tap Save. Every **new
signup** sees the new content immediately (existing users never see
onboarding again). **Reset to Defaults** deletes the override doc and
reverts to the built-in content.

What's editable:

- **All copy** on the 7 screens: welcome title/subtitle/button, the
  expandable "why this works" science blurbs, the settle box, timer labels,
  the bridge screen, mantra screen text, habit screen text, reveal title.
  Use `\n` in a field for a line break.
- **Timer duration** (seconds) for the sit exercise.
- **Example mantras** — one per line.
- **Foundation habit** — which habit-library habit is auto-created (with
  Day 1 logged), its display name, and weekly target.
- **Offered habits** — which habits appear as the "+ one more habit"
  choices (none checked = all except the foundation habit).

## How it works

- Config lives at **`config/onboarding`** (one document). Security: any
  authenticated user can read (new users read it right after signup);
  admins write (`firestore.rules` `config/` block).
- `src/services/onboardingConfig.ts` holds the `OnboardingConfig` type,
  `DEFAULT_ONBOARDING_CONFIG` (the original hardcoded copy, kept as the
  permanent fallback), and the fetch/save/reset functions.
- **Fail-safe by design:** the OnboardingScreen fetch is timeout-guarded
  (3 s) and every field falls back to the default if missing or the wrong
  type — a config problem can never break a new user's first screen.
- The 7-step structure is still code. Making the steps themselves
  data-driven (reorder/disable/add) is the Tier 2 follow-on, and the config
  shape was chosen so that's an additive change.
