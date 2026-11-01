# <Name> — micro-app spec

*Status: Lab. Written <YYYY-MM-DD> from the idea: "<the user's words, verbatim>".*
*Id: `<id>` (permanent — MiniAppId, `lab_<id>_*` collections, Lab flag).*

## Who uses it

<One specific person, one sentence.>

**The moment they open it:** <where, how long they have, what's in their hands>.

## What they want to do (max 3)

1. <job>
2. <job>
3. <job>

## What we track (max 3 facts per entry)

| Fact | Type | Shown where / decides what |
|---|---|---|
| | | |

## What we deliberately don't track

| Not tracked | Why |
|---|---|
| | |

## The simplest flow

**Signature interaction (open → logged, ≤ 3 taps, zero setup):**
1.
2.
3.

**Defaults that make zero setup work:** <…>

## How it fits Neuro-Nudge

- **Friction (1–3, `RESISTANCE_LEVELS`):** asked when <…>.
- **Weekly goal:** <unit> × <default number>.
- **Streak:** <one sentence>.
- **Dashboard metric (on graduation):** <the one number or visual>.
- **Accent / icon:** <theme token> / `<ionicon-name>`.

## Screens (max 4)

| Screen | Route | What's on it |
|---|---|---|
| | `<Name>Home` | |

## Data model

`users/{uid}/lab_<id>_<thing>` — <doc id scheme, e.g. date or auto-id>

```ts
// the stored shapes
```

## Pure logic (`services/<id>Math.ts`, all tested)

- `fnName(...)` — <what it decides>

## Out of scope for v1

-

## Open questions — each with the default chosen

- **<question>** — Defaulted to <X> because <Y>.

## Graduating to live (not done in the Lab build)

- Add `<id>` to `TodayAppId` / `TODAY_APPS`, switch friction to `finishSession`.
- Rename or migrate `lab_<id>_*`, flip `release` to `'live'`.
- A dashboard page / ring.
