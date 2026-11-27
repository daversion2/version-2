# Pods: a partner or small accountability group

*Planned 2026-11-27 in a founder conversation. Nothing built yet. When this doc
and the code disagree, the code wins.*

## The idea

A **pod** is 2–5 people who see that each other showed up today, and how hard
it was. A partner is a pod of 2: there is one structure, not a duo system and a
team system.

Why a pod first, not crowd features ("62% found starting hard today"):
the crowd features need volume to mean anything, and a pod is useful with two
people. Every invite is also a new user, so a pod doubles as the growth loop.

It fits the thesis: the effort is the reward. What a pod shares is the effort
("hard to start, did it anyway"), never the outcome (weights, meal scores).

## Founder decisions (2026-11-27)

| Question | Decision |
|---|---|
| Is friction shared? | **Yes, by default**, with a toggle to turn it off. |
| Pod streak | **Anyone showed up** keeps the day. Also **tell everyone when everyone showed up**. |
| Names | **First name.** |
| Size | **2 to 5. Never more.** |

### Correction to "first name from the profile"

The profile has no first name today. `User` (`src/types/index.ts`) has
`username` and `email`, and nothing reads Google's name. So creating or joining
a pod asks for a first name once, filled in from Google Sign-In's given name
when there is one, and saves it to a new `first_name` on the profile. Settings →
Edit profile gets the field too.

## What members see

- **Shared:** that you did a session, on which day, in which app (Meditate,
  Workouts, Meals, plus any later app on Today), and, unless you turned it off,
  the two ratings ("hard to start", "hard to keep going"). For Meals it's the day
  rating.
- **Never shared:** anything inside an app (meal plates and scores, weights and
  sets, guided recordings, notes), XP, your own streaks, your email or username.
- **No free text anywhere.** Reactions and nudges are preset. This keeps us out
  of Apple's user-generated-content rules (guideline 1.2: report, block,
  filtering) and means there is nothing to moderate. The first name is the only
  thing a member types; it's checked for length and shown only to their pod.

Friction off means members see "did Workouts" without how hard it was. The
toggle is per person and applies to what's shared from then on.

## How a pod works

**Creating:** Pod → Start a pod. It asks for your first name (pre-filled) and
gives you an invite code (6 characters, no look-alikes like O/0) plus a Share
button that sends a short message with the code and the App Store link.

**Joining:** Pod → Join with a code. A code works until the pod is full or 7
days pass; any member can make a new one. **One pod per person** in v1.

Codes, not tap-to-open links, because entering a code is JS-only and ships
over the air. A tappable link that opens the app needs associated domains,
which is native config, so it waits for the next store build.

**Leaving and removing:** anyone can leave. The person who started the pod can
remove a member (the safety valve when there's no report button). When someone
leaves, their shared days go with them. When the last person leaves, the pod
is deleted.

## Streaks and the week

All "today"s are **each member's own local day** (their `timezone`), so a
pod across time zones works.

- **Pod streak:** days in a row when **anyone** in the pod showed up. A today
  with nothing yet never breaks it, the same rule as every other streak.
- **Everyone showed up:** a day when every member showed up on their own day.
  When the last one lands, everyone in the pod gets one push: "Everyone showed
  up today." At most once per pod per day. The Pod screen shows the count of
  everyone days and the best run of them.
- **Everyone showed up, across time zones:** a calendar date on which every
  member has a session dated that day (each dated in their own zone). The push
  fires when the session that completes it is logged for the writer's own today.
- **This week:** the rolling last 7 days, as on Today. "Pod: 11 of 14" adds up
  each member's apps, each counted **up to that app's own goal** (so extra
  Workouts can't cover for no Meditate, as on Today's rings). Meals counts
  **days logged, not days on target**: on target is the plate score, an outcome,
  and the pod shares effort only. It never says who fell short.
- A session logged late with Done it counts on its own day, but sends no push.

## Reactions and nudges

- **Reactions:** tap a member's session to send one of a few presets (one per
  sender per session), written
  in the house voice and about effort, e.g. "Showed up anyway", "Hard one, done",
  "Proud of you". Final wording goes in `<Copy>` so it can be edited live.
- **Nudge:** for a member who hasn't shown up today, one preset nudge ("Your pod
  is with you today"). One per sender per member per day.
- **Pushes:** a member gets at most 3 pod pushes a day, nudge and reactions
  combined, plus the everyone-showed-up one. This is a **separate budget** from
  the rule pushes (`PUSH_BUDGET` = 1 a day, 3 a week in
  `services/rulesEngine.ts`): pod pushes come from a person, and sharing the
  rule budget would mean a reaction silently replaces the day's rule push or
  never arrives. Settings → Pod has "Mute pod notifications".

## Where it shows up

- **Today, Overview:** a Pod card. One row per member: initial, first name,
  and today's state (app icons, tinted by how hard, or "not yet"). Under it,
  "Pod: 11 of 14 this week · 6-day streak". Tap it to open the Pod screen.
- **Pod screen:** the week grid, member × day (the same look as Overview's
  week at a glance), reactions on each cell, the nudge button, everyone days,
  and Invite.
- **After a rating:** the toast gains a quiet "Shared with your pod" line.
- **Settings → Pod:** share friction (on), mute pod notifications, invite,
  leave, and remove (for the person who started it).

## Data model

Pods are inherently cross-user, so they need a **top-level collection** and a
rules deploy. (The Lab's rule of "own `users/{uid}/lab_*` only" can't apply:
a member can't read another user's subcollections, and profiles are owner-only
on purpose.) Nobody outside a pod can read anything in it.

```
pods/{podId}
  created_by: uid
  created_at: ISO
  member_ids: uid[]          // 1–5; what the rules check
  everyone_days: string[]    // pod-days when everyone showed up (last 60)
  invite: { code, expires_at } | null

pods/{podId}/members/{uid}
  first_name: string
  joined_at: ISO
  timezone: string
  goals: { [app]: number }   // weekly goal per app on their Today
  share_friction: boolean
  days: { 'YYYY-MM-DD': [{ app, start?, keep?, day? }] }   // last 14 days
  updated_at: ISO

pods/{podId}/reactions/{id}
  from: uid, to: uid, kind: 'reaction' | 'nudge', preset: string,
  session_id?: string,                          // reactions only
  for_day: 'YYYY-MM-DD', created_at: ISO        // last 14 days

podInvites/{code}            // server-only: code → podId
users/{uid}.pod_id, users/{uid}.first_name, users/{uid}.pod_muted,
users/{uid}.pod_push_history   // server-written, last 24 h of pod pushes
```

The member doc is a **summary**, not a copy of the logs. Ratings stay in
`users/{uid}/completionLogs` as now. Without friction sharing, `start`/`keep`/`day`
are simply left out.

### Who writes what

- **Callable functions** do everything that touches more than your own doc,
  so the rules stay simple and the size cap can't be raced:
  - `createPod` makes the pod, your member doc, and an invite.
  - `joinPod(code)` checks the code and that the pod has fewer than 5, then adds
    you, in a transaction.
  - `leavePod`, `removeFromPod(uid)` (creator only), `newPodInvite`.
  - `sendPodReaction(to, preset, forDay)` checks the per-day limits and the
    receiver's pod budget and mute, writes the reaction, and pushes.
- **The client** writes only its own member doc: after a rating
  (`handleAppRated` in `HomeScreen`), it calls a service that adds the session
  to `days`, prunes it to 14 days, and saves. When a rating or session is
  deleted, the same service removes it (the hook is
  `services/appRatingEdits.ts`, which already handles deletes).
- **A trigger** on member-doc writes works out whether everyone showed up
  today, records it in `everyone_days`, and sends the push once.

### Rules

```
match /pods/{podId} {
  allow read: if signedIn() && request.auth.uid in resource.data.member_ids;
  allow write: if false;                       // functions only
  match /members/{uid} {
    allow read: if isPodMember(podId);
    allow write: if request.auth.uid == uid && isPodMember(podId)
                 && onlyAllowedMemberFields();   // can't change joined_at etc.
  }
  match /reactions/{id} {
    allow read: if isPodMember(podId);
    allow write: if false;                     // sendPodReaction only
  }
}
// podInvites: no rule, so clients are denied.
```

### Account deletion

`deleteAccount` runs the `leavePod` logic first: out of `member_ids`, member doc
and the user's reactions deleted, pod deleted if empty. This is exactly the
gap the old social collections had (`teams` and `duoStreaks` have no single
owner field, so deletion can't sweep them; see `docs/launch-review.md`).
`hosting/privacy.html` gets a line on what pod members can see.

## Lessons from the old social features

The repo once had Teams, Buddy Challenges, Duo Streaks, an Inspiration Feed and
Fist Bumps (`APP_OVERVIEW.md`, which is historical). The clone's history is
shallow, so why they were dropped isn't on record. What is on record:
they went with the old Challenges/Programs app, the feed was never switched on,
their rules let any signed-in user read and write them, and account deletion
can't clean them up. Pods avoid each of those: members-only reads, server-only
writes for anything shared, an owner on every doc, and a delete path from day
one. **Founder: if you remember why Teams didn't stick, add it here.**

## Build order

Each step is its own commit, with jest green and tsc at the baseline.

1. ~~**Pure logic in services, tested.**~~ **Done 2026-11-27.**
   `services/podMath.ts` (54 tests in `__tests__/podMath.test.ts`): what a
   session shares with friction on or off, adding/removing/pruning `days`, the
   pod streak, everyone showed up and when to celebrate it, everyone-day runs,
   the week's "N of goal", reaction and nudge limits, the pod push budget,
   invite codes, the join check (cap of 5, one pod per person, expiry),
   leaving/removing (the longest-standing member takes over removing when the
   starter leaves), and first-name cleaning and pre-fill. It imports nothing,
   so step 2 can copy it into `functions/` like the meditation core.
2. **Functions and rules.** The callables, the trigger, the `deleteAccount`
   change, the pod push budget, rules for `pods`. Copy `podMath.ts` into
   `functions/src/pod-core/` in `sync-core`, with a drift test like
   `src/utils/meditation/__tests__/sync.test.ts`.
   **Deploying rules and functions needs the founder's go-ahead.** Until then,
   the app side can't be tried against production.
3. **App, in the Lab.** A Lab switch (`pods`) that adds the Pod card to Today
   and Settings → Pod. Screens: start, join, first name, Pod screen, the
   reaction sheet. The client service for the member doc, called from
   `handleAppRated` and from the delete path. Admin-only, so the first test
   needs **two admin accounts**; to try it with a real friend early, add an
   allowlist to the switch.
4. **Check it on screen** with two accounts (Maestro needs a yes first, and
   only one simulator exists, so the second account is a real phone).
5. **Open it to everyone:** privacy page and App Store privacy details,
   a terms line, then take it out of the Lab.

## Open questions

- **Pod name.** Optional, default "Your pod"? It would be free text, so it
  would follow the first name's rules.
- **More than one pod.** One per person in v1. A partner plus a group would
  need a pod switcher on Today.
- **Invite when you have no account.** The share message links the App Store;
  the code is typed in after sign-up. Onboarding could offer "Have a pod code?"
  at the end.
- **The Lab's own apps** (Hot & Cold, Avoidance) aren't on Today's rings. Share
  them only once they're on Today.
