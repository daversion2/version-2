# Mini-App Contract

**Status: first mini-app (Workouts) built in the Lab, 2026-10-17. See "What
got built" at the bottom.** Companion to the 2026-10-16 interview
(decisions recorded in Claude's memory as `mini-apps-behind-habits`) and the
clickable mockup built from it. Revisit this doc — names, shapes, the lot —
once Workouts v1 actually gets built; treat everything here as the shape of
the thing, not the final API.

**What this is for.** A mini-app can look however it wants inside — Workouts
and Breathe don't have to share a single pixel of layout. What they *do* have
to share is what they hand back to Neuro-Nudge, because that's the only thing
that makes a 3rd and 10th mini-app cheap instead of each one re-solving XP,
offline saves, and release gating from scratch. This is that short list, plus
a lightweight "is it ready to release" checklist.

This only applies to things on the mini-app track (full-screen, own accent,
attached to one or more habits). It's not a general component checklist —
most of the app will never need any of this.

---

## The five handoffs

Every mini-app hands these five things to the shell. Everything else — its
layout, its data model, its own screens — is the mini-app's own business.

### 1. A manifest entry — how it gets registered

Static data, not behavior. One object per mini-app, the same shape the
`LAB_EXPERIMENTS` registry already uses for Lab switches
(`src/screens/Lab/experiments.ts`) — a mini-app is really just a Lab *screen*
entry with a couple of extra fields.

```ts
// Illustrative — names TBD when this gets built.
interface MiniAppManifest {
  id: string;              // 'workouts' — stable forever, stored on habits
  title: string;            // 'Workouts'
  icon: string;              // one icon, shown everywhere it appears
  accent: string;            // one hex color — the only visual override
  habitIds: string[];       // library habit ids this app can attach to
  entry: () => React.ComponentType;  // lazy-loaded, like Lab screens today
  release: 'lab' | 'live';  // flips from Admin, no app update (decision 11)
}
```

A habit opts in by carrying `appId: 'workouts'` (or similar) on its template
or custom config — not by the mini-app reaching out to find its habits.

### 2. The finish handoff — never roll your own XP screen

The single most important rule: **a mini-app never shows its own "you're
done" screen.** It calls back into the same shared flow a plain check-in
uses — the friction question, then the XP celebration — and that flow is the
only thing that ever writes XP or a streak.

```ts
// Illustrative.
finishSession({ habitId: 'workout', appId: 'workouts' });
// → hands off to the existing habit-completion flow (services/practices.ts /
//   willpower.ts), which asks "How hard was it?" and awards 1–3 XP exactly
//   like it does today. The mini-app supplies the habit id; nothing else.
```

If a mini-app finds itself computing a number it's about to call XP, that's
the bug (decision 7) — XP is always the 1–3 rating, never scaled by duration,
volume, or anything the mini-app tracked.

### 3. A highlight summary — small and stable

The habit detail page and Progress's drill-in (decision 8) need just enough
from a mini-app to render one card, without reaching into its full data
model. One function, one small shape:

```ts
// Illustrative.
interface MiniAppHighlight {
  lastSessionLabel: string;   // 'Push Day · 2 days ago'
  headlineStat: string;        // 'Bench Press 80 kg' — whatever the app
}                               // considers worth bragging about right now
getHighlight(habitId: string): Promise<MiniAppHighlight | null>;
```

The mini-app's own history, charts, and records stay inside the mini-app.
This is only the one card's worth that appears outside it.

### 4. Local-first session writes — if there's a live session

Only applies to a mini-app with something running in real time (a workout, a
timed breath session) — not to one that's just a form. Per decision 9, the
in-progress session is written to the phone as it goes, through one shared
helper every such mini-app uses, rather than each one inventing its own
AsyncStorage key and its own retry logic.

```ts
// Illustrative — one shared utility, not per-app code.
saveSessionDraft(appId, sessionId, data);  // local, survives a dropped signal
flushSessionDraft(appId, sessionId);        // called once back online
```

### 5. Access through the one gate

Whether a mini-app is visible — Lab-only, released to everyone, and later,
possibly, paywalled (decision 12) — is decided in one place, not checked
ad hoc with `is_admin` scattered through the mini-app's own code.

```ts
// Illustrative.
canOpenMiniApp(appId, userProfile): boolean;
```

A mini-app calls this once, at its entry point. It never decides its own
visibility.

---

## Must-haves before a mini-app ships to Lab

- [ ] Manifest entry: id, title, icon, **one** accent color, the habit(s) it attaches to
- [ ] Uses the shared Button / Card / Sheet primitives and the app's existing fonts — the "own app" feel comes from accent + layout, not new components
- [ ] Opens full-screen from the habit's Start button; the habit's quick 1–3 chips still work without it (a mini-app is never the *only* way to check a habit off)
- [ ] Ends every session through the shared finish handoff — no custom XP or streak UI
- [ ] Writes only to its own `users/{uid}/<appId>_*` subcollections — never a global collection, never `completionLogs` directly
- [ ] If it has a live session: in-progress data survives a dropped connection
- [ ] Has a `getHighlight()` for the habit-detail card
- [ ] Checks `canOpenMiniApp()` rather than its own admin check

## Must-haves before flipping it Lab → Everyone

- [ ] You've actually used it for a couple of weeks on your own account
- [ ] Content (routines, patterns, copy) is good enough to ship — it's in code, so an OTA update, not a blocker, but don't release it half-written
- [ ] `tsc` and `jest` are clean, same bar as everything else in this repo

## Explicitly not required (yet)

Keeping this list short on purpose — these are real future needs, just not
blockers for a first mini-app:

- A tester rollout stage (decision 11 skipped it — Lab → Everyone only)
- Admin-editable content (decision 10 — code first, admin editor later)
- Payment / premium handling (decision 12 — the gate exists, nothing uses it yet)
- Full offline browsing of history — only the in-progress session needs to survive offline, not the whole mini-app

---

## What got built (Workouts v1, Lab — 2026-10-17)

The handoffs above now exist as real code. Where this doc and the code
disagree, the code wins:

| Handoff | Where | Notes |
|---|---|---|
| 1. Manifest | `MINI_APPS` in `src/services/miniApps.ts` | Data only (id, title, icon, accent, habitIds, release). The component is a root route, `WorkoutsApp` in `RootNavigator`, loaded with `getComponent` + `require`. |
| 2. Finish | `finishSession` / `takePendingFinish` in `miniApps.ts` | The app saves its own session, sets the handoff and closes. Today picks it up on focus and opens the existing `HabitCompletionModal`, locked to today, with the session length prefilled into the habit's duration field (`checkinMetricsFor`). XP, streak and celebration are untouched. |
| 3. Highlight | **not built** | No habit-detail card or Progress drill-in yet. |
| 4. Drafts | `src/services/miniAppDrafts.ts` | AsyncStorage, per app and per user, written after every change. No upload queue: the session is saved to Firestore only at Finish, with a timeout and a retry message if offline. |
| 5. Gate | `canOpenMiniApp` in `miniApps.ts` | `release: 'lab'` means admins only. Workouts, Meditate and Meals are `live` since 2026-10-18; their habits open them from Today (docs/three-sections-today.md). |

Linking: library habits listed in the manifest's `habitIds` link automatically.
Any other habit links from Workouts → Settings, stored in
`lab_workout_prefs/main.linked_habit_ids` (`isHabitLinkedToMiniApp`).

Workouts' own data lives in `users/{uid}/lab_workout_*`: workouts, sessions,
records, prefs, the user's own exercises (deleting one sets `archived_at` so
history still resolves it, and its logging type locks once it's been logged),
and form cues (`lab_workout_notes`, keyed by exercise id, built-ins included). The logic lives in `services/workoutSession.ts`
(the session engine) and `services/workoutMath.ts` (units, prefill, records),
both tested. The screens are in `screens/Lab/experiments/workouts/`.

**Moving it Lab → everyone** means renaming the `lab_workout_*` collections
(or migrating them), flipping `release` to `'live'`, and building handoff #3.
