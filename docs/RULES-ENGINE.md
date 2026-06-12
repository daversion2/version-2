# Rules Engine

A configurable rules engine that controls **when** user-facing surfaces fire (push notifications today; in-app modals and banners next) and **what they say** — all editable from the Admin screen with no code deploy.

Changing a rule (e.g. switching the comeback push from 48 hours of inactivity to 24) is a Firestore document edit made through the admin UI. The Cloud Function picks it up on its next hourly run. **No `eas update`, no `firebase deploy`.**

---

## Part 1: Using It (Admin Guide)

### Accessing the admin screen

The Rules admin lives inside the app's existing Admin tab, which appears only for users whose Firestore user document has `is_admin: true`.

| Where | How |
|---|---|
| **Desktop browser** | `npm run web` → opens `http://localhost:8081` → log in → **Admin** tab |
| **iOS Simulator** | `npx expo run:ios` → **Admin** tab |
| **Physical device** | Requires shipping the JS via `eas update --branch production` first |

Then: **Admin → Manage → Notification & Popup Rules**.

### First-time setup

1. Tap **Seed Default Rules**. This creates the built-in "Comeback nudge" rule, **disabled**.
2. Tap the rule card to open the editor and review it.
3. Flip the switch to **enable**. The hourly Cloud Function evaluates it on its next run.

### Anatomy of a rule

Every rule has five parts, all editable in the rule editor:

#### 1. Surface — what kind of thing fires

| Surface | Delivered by | Status |
|---|---|---|
| `push` | Cloud Function → Expo Push API | **Live (Phase 1)** |
| `modal` | In-app on the Home screen, evaluated on the client | **Live (Phase 3)** — App open event only |
| `banner` | In-app at the top of the Home screen, evaluated on the client | **Live (Phase 3)** — App open event only |

**Modal:** a centered popup with the rule's title, body, and a dismiss button labeled by the **CTA label** field ("Got it" if blank). At most one rule modal shows per app open (highest priority), it waits its turn behind the app's built-in modals, and its fire is recorded only when actually shown.

**Banner:** an inline card at the top of the Home screen with an X to dismiss. Its fire is recorded when shown, so "Once per day" shows it once per day, "No cap" shows it every app open (there is no force-cap on in-app surfaces — they're less intrusive than pushes).

#### 2. Event — when the rule is evaluated

| Event | Checked by | Status |
|---|---|---|
| `Hourly schedule` | `evaluatePushRules` Cloud Function, every hour | **Live** |
| `Challenge failed` | `onChallengeFailure` Firestore trigger | **Live (Phase 2)** |
| `Team member activity` | `sendTeamActivityNotification` Firestore trigger | **Live (Phase 2)** |
| `Buddy challenge invite` | `sendBuddyChallengeInvite` Firestore trigger | **Live (Phase 2)** |
| `Buddy nudge sent` | `sendBuddyChallengeNudge` Firestore trigger | **Live (Phase 2)** |
| `Buddy challenge complete` | `sendBuddyBothComplete` Firestore trigger | **Live (Phase 2)** |
| `Micro-commitment follow-up` | `checkMicroCommitmentFollowUps` Cloud Function, hourly | **Live (Phase 2)** |
| `App open` | HomeScreen mount via `useRuleSurfaces` | **Live (Phase 3)** — modal/banner surfaces only |
| `Habit completed` / `Reflection saved` | The respective client flows | Planned |

> Push rules must use one of the **Live** server events above — the editor warns you if you pick a client-side event for a push. One enabled push rule per event is evaluated (highest priority wins if you create several).

**Placeholders.** Event-triggered rules can use `{placeholder}` tokens in the title and body, filled in from the event at send time (e.g. `{username} just completed a {activity_type}!`). The editor lists each event's available placeholders above the content fields. Unknown placeholders are left literal so typos are visible. Available per event:

| Event | Placeholders |
|---|---|
| Challenge failed | `{challenge_name}` |
| Team member activity | `{username}`, `{activity_type}` |
| Buddy challenge invite | `{inviter_username}`, `{challenge_name}` |
| Buddy nudge sent | `{sender_username}` |
| Buddy challenge complete | `{challenge_name}` |
| Micro-commitment follow-up | `{commitment}` |

**Micro-commitment follow-up timing:** its `Hour of day == N` condition doubles as the send hour (default 10 AM local) — change the condition value to move the send time. Each exercise entry is only followed up once (tracked by a flag on the entry), so "No cap" is the right frequency for it.

**Global placeholders** are available on **every** rule — any event, any surface (push, modal, banner):

| Placeholder | Resolves to |
|---|---|
| `{username}` | The recipient's username |
| `{why_statement}` | Their "why" from Why Discovery |
| `{mantra}` | Their active mantra (falls back to first mantra, then the legacy field) |
| `{streak}` | Current streak in days, as a number |
| `{xp}` | Total willpower points, as a number |
| `{tidbit}` | A random **active** neuroscience tidbit |
| `{fun_fact}` | A random fun fact |
| `{reward_message}` | A random **active** reward message |
| `{proof_point}` | A random entry from the user's own Your Story proof points (the "what you did" text) |

Rules of the road:

- **Missing value → no delivery.** If a rule references `{why_statement}` and a user has none (or a pool like fun facts is empty), that user is silently skipped for this rule — never sent broken copy. The hourly cron falls through to the next matching rule; the skip is logged in the Cloud Function logs.
- **Selection is pure random** per send — there's no no-repeat tracking yet.
- **Pushes truncate pool content** at 120 characters; in-app modals/banners show full text.
- **Event placeholders win on name collisions** — `{username}` on a Team activity rule is the teammate who completed the activity (the event's meaning), not the recipient.
- Pools are fetched lazily — only when a rule's content actually uses them — and once per cron run, not per user.

Example: a daily "tidbit of the day" banner is just a banner rule on App open with body `💡 {tidbit}` and frequency "Once per day". A comeback push that hits harder: `Remember your why: "{why_statement}"`.

#### 3. Conditions — who the rule applies to

Conditions are rows of **fact · operator · value**, ANDed together (all must match). Available facts:

| Fact | Meaning | Source |
|---|---|---|
| Days since last activity | Days since the user last completed anything | `lastActivityDate` on the user doc (falls back to signup date for new users) |
| Current streak (days) | Consecutive-day activity streak | `currentStreak` |
| Total XP | Lifetime willpower points | `totalWillpowerPoints` |
| Habits completed (lifetime) | Total habit completions | `totalHabitsCompleted` |
| App opens (lifetime) | Total app launches | `app_open_count` |
| Days since signup | Account age in days | `created_at` |
| Active goals | Number of active goals | Currently always 0 in scheduled context (needs a subcollection read — wired for future use) |
| Hour of day in user timezone | 0–23, timezone-aware | Computed from the user's `timezone` field |

Operators: `==` `!=` `>` `>=` `<` `<=`. All values are numbers.

**Important pattern for push rules:** always include a `Hour of day == N` condition. Without it, the push fires the first hour the other conditions become true — which could be 3 AM in the user's local time. The seeded comeback rule uses `== 18` (6 PM).

**Activity is tracked at day granularity** (`lastActivityDate` is a date, not a timestamp), so inactivity thresholds are in days: "48 hours" = `Days since last activity >= 2`, "24 hours" = `>= 1`.

A rule with **no conditions matches every user** — the frequency cap is then the only limit. The editor shows a hint when you do this.

#### 4. Frequency cap — how often it can fire per user

| Type | Behavior |
|---|---|
| Once ever | Fires one time per user, period. (Right for intro/unlock-style messages.) |
| Once per day | At most once per user per local calendar day. |
| Cooldown (hours) | At most once per N hours (e.g. 72 = at most every 3 days). |
| No cap | No limit — **but** scheduled (Hourly schedule) push rules with "No cap" are force-capped to once per day as a safety backstop, since an hourly cron would otherwise send 24 pushes/day. Event-triggered rules (buddy, team, failure, follow-up) genuinely have no cap with this setting, which is the default for them — they're naturally rate-limited by the event itself. |

**Priority** breaks ties when multiple rules match the same user at the same moment — higher fires first. For scheduled pushes, **at most one rules-engine push is sent per user per hourly run** (the highest-priority match), so users are never stacked with notifications.

#### 5. Content — what the user sees

- **Title** and **Body** — the notification/popup text.
- **CTA label** — the modal's dismiss-button text ("Got it" if blank). Modal surface only — pushes and banners don't have a CTA button (banners are dismissed with their X).
- **CTA action / Tap action** — where the modal's button (or tapping the push notification) leads:
  - **Nothing** — just dismisses (the default).
  - **Open app screen** — a curated list of param-less destinations (Start a challenge, Create a goal, Manage habits, Nightly reflection, Weekly planner, Programs, Progress tab, Tools tab). Curated so a rule can never point at a screen that needs parameters or doesn't exist; adding a destination is a one-line change to `CTA_SCREEN_TARGETS` in `src/types/rules.ts`.
  - **Open URL** — any `http(s)://` link, opened in the browser. Validated on save.

  For pushes the target travels in the notification's data payload (`cta_screen` / `cta_url`) and is handled by the notification-tap listener in `RootNavigator` (works from cold start too). A bad target degrades to a plain dismiss — it never crashes.
- The editor shows a live **preview** as you type, plus an "opens:" line when a CTA action is set.

### Worked example: change the comeback push from 2 days to 1 day, sent at 9 AM

1. Admin → Notification & Popup Rules → tap **Comeback nudge**
2. In Conditions, change `Days since last activity >= 2` → value to `1`
3. Change `Hour of day == 18` → value to `9`
4. Save. Done — live within the hour, no deploy.

### The kill switch

`PUSH_NOTIFICATIONS_ENABLED` in `functions/src/index.ts` is a **global** kill switch for ALL pushes — every rules-engine evaluation point (the hourly cron, the Firestore triggers, and the micro-commitment follow-up) checks it before evaluating. It is currently `true`. Setting it to `false` and running `firebase deploy --only functions` silences everything without ever falsely recording that a rule fired.

---

## Part 2: How It Works (Architecture)

### The big picture

```
                        ┌──────────────────────────────┐
                        │  Firestore: rules/{ruleId}   │
                        │  (admin-writable documents)  │
                        └──────┬───────────────┬───────┘
                 reads hourly  │               │  reads on app events
                               ▼               ▼
              ┌────────────────────┐   ┌─────────────────────┐
              │ Cloud Function     │   │ Client (Phase 3)    │
              │ evaluatePushRules  │   │ evaluateRulesForUser│
              │ (hourly cron)      │   │ (modals/banners)    │
              └─────────┬──────────┘   └──────────┬──────────┘
                        │ per user:               │
                        │ build facts →           │ same evaluator,
                        │ match conditions →      │ same ruleState
                        │ check frequency cap     │
                        ▼                         ▼
              ┌────────────────────┐   ┌─────────────────────┐
              │ Expo Push API      │   │ In-app modal/banner │
              └─────────┬──────────┘   └──────────┬──────────┘
                        └──────────┬──────────────┘
                                   ▼
                ┌─────────────────────────────────────┐
                │ Firestore: users/{uid}/ruleState/   │
                │ {ruleId} — per-user firing history  │
                │ (powers frequency capping)          │
                └─────────────────────────────────────┘
```

The design splits into three layers:

1. **Rules as data.** A rule is a Firestore document, not code. The condition language is deliberately small — numeric facts compared with six operators — so the admin UI can't express something that breaks the app. Copy, timing, thresholds, and caps all live in the document.
2. **A pure evaluator.** Condition matching and frequency capping are pure functions with no Firebase dependency — same logic on client and server, fully unit-tested.
3. **Evaluation points.** Places that load enabled rules, compute the user's facts, run the evaluator, deliver the surface, and record the fire. Phase 1 ships one: the hourly Cloud Function for pushes.

### Data model

**`rules/{ruleId}`** (root collection):

```jsonc
{
  "name": "Comeback nudge",                  // admin-facing label
  "description": "Re-engage inactive users", // admin-only notes
  "enabled": false,
  "surface": "push",                         // push | modal | banner
  "event": "scheduled_hourly",               // which evaluation point checks it
  "conditions": [                            // ANDed; empty = match everyone
    { "fact": "days_since_last_activity", "op": ">=", "value": 2 },
    { "fact": "local_hour", "op": "==", "value": 18 }
  ],
  "frequency": { "type": "cooldown_hours", "hours": 72 },
  "priority": 10,                            // higher fires first on collision
  "content": { "title": "We miss you", "body": "...", "cta": "..." },
  "created_at": "...", "updated_at": "..."   // ISO timestamps
}
```

**`users/{uid}/ruleState/{ruleId}`** — per-user firing history:

```jsonc
{
  "rule_id": "...",
  "last_fired_at": "2026-06-10T23:00:00.000Z", // ISO timestamp
  "last_fired_date": "2026-06-10",             // YYYY-MM-DD in user's timezone
  "fire_count": 3
}
```

This replaces the pattern of ad-hoc per-feature flags on the user doc (`has_seen_points_intro`, `lastComebackDate`, …) with one generic mechanism. When Phase 3 migrates the in-app modals, those legacy flags retire in favor of `ruleState` docs.

**Security** (`firestore.rules`): `rules/` is readable by any authenticated user (the client must evaluate modal rules locally) and writable only by admins (`is_admin == true`). `ruleState` is covered by the existing owner-only user-subcollection rule. The Cloud Function uses the Admin SDK, which bypasses security rules.

### File map

| File | Role |
|---|---|
| `src/types/rules.ts` | Type definitions + the fact/operator/event vocabularies the admin UI renders from |
| `src/services/rulesEngine.ts` | **Pure evaluator**: `conditionMet`, `ruleMatches`, `frequencyAllows`, `buildUserFacts`, `selectFiringRules`. No Firebase imports. |
| `src/services/rules.ts` | Firestore service: admin CRUD, `getEnabledRulesForEvent`, `evaluateRulesForUser` (client evaluation for Phase 3), `recordRuleFired`, `seedDefaultRules` + `DEFAULT_RULES` |
| `functions/src/rulesEngine.ts` | **Mirror** of the types + pure evaluator for the Cloud Functions package (see "kept in sync" below) |
| `functions/src/index.ts` → `evaluatePushRules` | The hourly scheduled function that delivers push rules |
| `src/screens/Admin/AdminRulesScreen.tsx` | Rule list: enable toggles, delete, seed defaults |
| `src/screens/Admin/AdminRuleEditScreen.tsx` | Rule editor: condition builder, frequency, content, live preview |
| `src/services/__tests__/rulesEngine.test.ts` | Unit tests for the evaluator (operators, AND logic, every frequency type, fact derivation, priority ordering) |

**Why the evaluator exists twice:** `functions/` is a separate npm/TypeScript package deployed to Cloud Functions; it can't import from `src/` without breaking the Firebase deploy bundling. The evaluator is small (~150 lines) and pure, so it's duplicated with `KEEP IN SYNC` comments in both files. If you change evaluation semantics, change both and run the tests.

### The hourly push flow, step by step

`evaluatePushRules` (cron `0 * * * *`, UTC) does the following each hour:

1. **Kill switch check** — exits immediately if `PUSH_NOTIFICATIONS_ENABLED` is false.
2. **Load rules** — `rules` where `enabled == true`, filtered to `surface == 'push' && event == 'scheduled_hourly'`, sorted by priority descending. If none, exits without touching user docs.
3. **Load users** — only users with a non-null `expoPushToken` (users who never granted notification permission are never read).
4. **Per user:**
   - Compute their local hour and local date from their `timezone` field (default `America/New_York`), using the same `Intl`-based helpers as the legacy reminders.
   - Build the facts object from the user document (`buildUserFacts`) — one doc read, no subcollection queries.
   - Walk the rules in priority order. For the first rule whose conditions all match:
     - Read `users/{uid}/ruleState/{ruleId}` and check the frequency cap ("No cap" is coerced to once-per-day here).
     - Send the push via Expo (`data.rule_id` is attached for future deep-linking/analytics).
     - Write the updated `ruleState` (timestamp, local date, incremented `fire_count`).
     - **Stop** — at most one rules-engine push per user per run.
5. Errors on one user are caught and logged without aborting the run.

Facts **fail closed**: a condition referencing a fact that's missing from the user doc evaluates to false, so a malformed rule under-fires rather than spamming.

### How rule changes propagate

| Change | Takes effect |
|---|---|
| Edit/enable/disable a rule in the admin UI | Next hourly cron run (≤ 60 min) — **no deploy** |
| Add a new fact, operator, or event type | Code change: both `rulesEngine.ts` files + admin UI → `firebase deploy --only functions` + `eas update` |
| Change the security rules | `firebase deploy --only firestore:rules` |
| Flip the kill switch | `firebase deploy --only functions` |

### Relationship to the legacy notifications (Phase 2 — done)

All remaining server pushes are now rules-engine consumers. The Firestore
triggers and the micro-commitment cron in `functions/src/index.ts` are thin
**evaluation points**: they detect their event, but whether a push fires —
and its copy, conditions, and frequency cap — comes from the matching rule
document, with `{placeholder}` templating for the dynamic parts.

- **Deleted outright** (June 2026): the 8 AM `morningChallengeReminder` and
  8 PM `eveningChallengeReminder` functions, including their program-day and
  habit-count variants. If a morning/evening reminder is ever wanted again,
  create a scheduled push rule with an `Hour of day ==` condition.
- **Migrated to rules**: challenge-failure encouragement, team activity,
  buddy invite, buddy nudge, buddy both-complete, and the micro-commitment
  follow-up.

**Auto-seeding:** if an event fires and *no* rule document exists for it (as
opposed to existing but disabled), the evaluation point seeds the default
rule **enabled** with the original hardcoded copy, so the migration deploy
changed no user-visible behavior. Disabling a rule in the admin UI turns
that notification off; deleting it resurrects the default on the next event.

Per-member team notification settings (`notification_settings` on team
membership docs) still apply on top of the team-activity rule — a rule can't
override a user's own opt-out.

### Testing & troubleshooting

**Unit tests:** `npx jest src/services/__tests__/rulesEngine.test.ts`

**Force a test fire on yourself:** temporarily edit the rule to conditions you currently satisfy (e.g. `Days since last activity >= 0` and `Hour of day == <your current hour>`), set frequency to "Once per day", enable it, and wait for the top of the hour. Check Cloud Function logs in the Firebase console (`evaluatePushRules`) — it logs how many rules it evaluated and each fire by user ID. Reset the rule afterward and delete your `users/{you}/ruleState/{ruleId}` doc if you want it to fire again.

| Symptom | Likely cause |
|---|---|
| Saving a rule fails with "permission denied" | `firestore.rules` not deployed (`firebase deploy --only firestore:rules`), or your user doc lacks `is_admin: true` |
| Logs say "Push notifications disabled" | Kill switch is false in the deployed functions |
| Logs say "No enabled push rules" | Rule is disabled, or its surface/event isn't `push` + `Hourly schedule` |
| Rule matched but nothing arrived | User has no valid `expoPushToken` (simulators can't receive pushes — use a physical device), or the frequency cap blocked it (check the `ruleState` doc) |
| Fires at a weird time | Missing a `Hour of day ==` condition, or the user's `timezone` field is stale |

### Roadmap (where this goes next)

- **Phase 2 — DONE (June 2026)** — server pushes externalized into rules with content templating; the hardcoded 8 AM / 8 PM reminders were deleted rather than migrated. Remaining Phase 2 candidates: client-side thresholds like the challenges-unlock count (3 completions) and goal-prompt trigger (2nd app open) becoming rule conditions.
- **Phase 3 — partially DONE (June 2026)** — generic rule-driven modal (`RuleModal`) and banner (`RuleBanner`) ship on the Home screen, evaluated on App open via `useRuleSurfaces` → `evaluateRulesForUser`, with fires recorded to `ruleState`. The rule modal queues behind the bespoke modals rather than stacking. Remaining: migrate the hand-sequenced modals (Comeback, Story Reminder, Goal Prompt, Points Intro, …) onto rules so `ruleState` replaces the `has_seen_*` flags, wire the Habit completed / Reflection saved client events, and give modal CTAs deep-link targets.
- **Phase 4** — extensions: per-rule A/B variants (`variants: [{weight, content}]`), event-scoped facts (e.g. reflection grade), aggregate facts requiring subcollection reads (active goal count), and rule analytics from `fire_count`.
