# Neuro-Nudge Onboarding — Content Spec

This document contains all copy and flow logic for the new onboarding experience. Implement as a 10-screen sequential flow. The tone throughout is direct, grounded, and neuroscience-forward — no fluff, no cheesiness.

---

## Screen 1 — Welcome / Hook

**Headline:**
> Your brain didn't get weak on its own.

**Subtext:**
> Something changed. And it wasn't you.

**CTA:** Let's talk about it →

---

## Screen 2 — Name the Enemy

**Body:**
> Every app, every feed, every notification was engineered with one goal: keep you coming back.
>
> Not to help you. Not to make you better. To hold your attention as long as possible — because your attention is worth money.

**CTA:** Keep going →

---

## Screen 3 — The Mechanism (Dopamine)

**Headline:**
> Here's what that does to your brain.

**Body:**
> Your brain runs on dopamine — the chemical behind motivation, focus, and reward. It evolved to fire when you did something hard or meaningful. Hunt, build, connect, create.
>
> Modern technology hijacks that system. Every scroll, every like, every notification delivers a small dopamine hit — fast, easy, and endless. Over time, your brain adapts. It downregulates. It produces fewer receptors. The same stimulation that used to feel rewarding starts to feel flat.

**CTA:** What does that mean? →

---

## Screen 4 — The Real Cost

**Headline:**
> It means sitting still starts to feel unbearable.

**Body:**
> Hard tasks feel impossible. Boredom feels like a crisis. The things that actually matter — the work, the relationships, the goals — start losing to whatever's easiest and most stimulating right now.
>
> This isn't laziness. It's not a character flaw. Your brain was optimized for the environment it was given. The problem is that environment was designed to make you dependent — not capable.

**CTA:** Feel it for yourself →

---

## Screen 5 — The 60-Second Moment

**Headline:**
> Don't take our word for it. Try this.

**Body:**
> Close your eyes. Don't check anything. Don't do anything. Just breathe for 60 seconds.
>
> Notice what happens.

**Primary CTA:** Start 60 seconds
- Minimal UI — no music, no animation, just a quiet countdown timer
- Small secondary "Skip" option beneath the button (low visual prominence)

**After timer completes — follow-up copy:**
> That urge to grab your phone? That restlessness? That's not weakness. That's your nervous system showing you exactly what we're talking about.
>
> Now here's the good news.

**CTA:** There's a way out →

> **Implementation note:** If user taps Skip, show the post-timer copy anyway and continue the flow. The insight lands whether they did it or not.

---

## Screen 6 — The Mechanism of Recovery

**Headline:**
> Your prefrontal cortex is the part of your brain responsible for decisions, focus, and self-control.

**Body:**
> Overstimulation weakens it — shifting control toward the reactive, impulsive part of your brain. But it's not permanent. The prefrontal cortex responds to training.
>
> The tool is deliberate discomfort. When you voluntarily do something hard — sit in silence, hold a cold plunge, go for a walk without your phone — and you don't quit, your brain registers that. The prefrontal cortex strengthens its grip. Distress tolerance builds. Over time, your baseline shifts.

**CTA:** This is what the research shows →

---

## Screen 7 — The Science, Straight

**Headline:**
> This isn't a productivity hack. It's neuroscience.

**Body:**
> Cold exposure increases dopamine by up to 250% — without dependence or crash.
>
> Meditation and cold exposure produce overlapping changes in brain activity. Both strengthen prefrontal control over the reactive brain. Different routes, same destination.
>
> People who regularly practice distress tolerance show measurably greater connectivity between the brain's decision-making and emotional regulation centers. That connectivity is trainable.
>
> Within two to four weeks of consistent practice, most people report improvements in mood stability, focus, and baseline motivation.

**CTA:** So what do you actually do? →

---

## Screen 8 — Introduce the Override

**Headline:**
> This app is built around one idea: the override.

**Body:**
> The moment your brain says stop — and you don't.
>
> Not because you forced it. Because you've trained for it. Seven practices, grounded in neuroscience, designed to rebuild what overstimulation eroded. You don't have to do all of them. You just have to start with one.

**CTA:** Pick your starting point →

---

## Screen 9 — Pick a Practice

**Headline:**
> Every practice here trains the same thing: your ability to act when your brain says stop.

**Subtext:**
> Pick one to start with.

**Practice cards — display as selectable cards, one tap to select:**

| Practice | One-line description |
|---|---|
| Meditation | Sit with your thoughts. Don't run from them. |
| Breathwork | Use your breath to regulate your nervous system. |
| Cold Exposure | Teach your brain that discomfort isn't danger. |
| Heat Exposure | Deliberate stress. Deliberate recovery. |
| Unstimulated Walking | Move without input. Let your mind wander. |
| Eat Something Healthy You Dislike | Override preference. Build the habit of doing what's good over what's easy. |

**CTA:** This is my starting point →

> **Implementation note:** The selected practice should be stored and surfaced prominently on the home screen after onboarding completes. No frequency goal is set here — that comes later organically.

---

## Screen 10 — Send Them In

**Headline:**
> You've already done more than most people will today.

**Body:**
> You sat still for 60 seconds. You learned what's actually happening in your brain. You picked a direction.
>
> Now go do the thing.

**CTA:** Let's go →

> **Implementation note:** CTA lands on the home screen with the selected practice surfaced front and center. This is their first target.

---

## Flow Summary

| Screen | Purpose |
|---|---|
| 1 | Hook — names the problem without blame |
| 2 | Villain — the attention economy |
| 3 | Mechanism — how dopamine gets hijacked |
| 4 | Real cost — what it feels like in daily life |
| 5 | Felt experience — 60-second meditation moment |
| 6 | Recovery mechanism — prefrontal cortex training |
| 7 | Science validation — data points, no hype |
| 8 | Philosophy — introduce "the override" |
| 9 | Commitment — pick one practice |
| 10 | Launch — send them into the app |

---

## Voice Notes for Claude Code

- Tone: direct, grounded, no motivational-poster energy
- No exclamation points
- Short paragraphs — two to three sentences max per block
- Headlines do the heavy lifting; body copy supports, doesn't repeat
- The word "override" is the core brand concept — use it deliberately, not casually
