# Onboarding Split — Working Draft

The flow, cut in half: **6 screens before the app**, then a one-time **3-screen Debrief** delivered right after the user's first practice reflection. Same format as the onboarding doc: copy first, *Editor's note* after, so we can argue in the margins.

Design principle unchanged: every screen makes the user *feel* the thing before the copy names it. What changed is the job of each half —

- **Onboarding** = emotional arc only: get hooked → feel the mechanism → feel it in your body → here's the answer → commit → go.
- **Debrief** = the intellectual payoff, delivered when it validates a choice they already made instead of arguing with a skeptic.

---

# PART 1 — ONBOARDING (6 screens)

## Screen 1 — Hook

*Interaction: unchanged — fake notifications interrupt the headline, live counter.*

**Headline:**
> Every app, every product, every bite of hyperpalatable food is engineered to hook you.

**Subtext:**
> Not to help you. Not to make you better. To keep you coming back for more.
>
> This app is the opposite. It's designed to help you **take back control of your mind.**

**Counter line:** Notifications that interrupted this sentence: **N**

**CTA:** Learn more →

---

## Screen 2 — The Mechanism (Dopamine Graph)

*Interaction: unchanged — tap-to-scroll, likes burst while the chart flattens, unlocks at 4 taps.*

**Eyebrow:** THE MECHANISM
**Headline:** Here's how it works.

**Intro:**
> Your brain's drive system runs on dopamine. Every scroll delivers a hit — fast, easy, engineered. Try it:

**Flat message (after 4 taps):**
> Feel that? Each hit lands a little flatter. Your brain **downregulates** — fewer receptors, weaker response. This doesn't just make social media less fun, it rewires your brain and makes small tasks seem daunting.

**CTA:** Feel it for yourself →

---

## Screen 3 — The 60-Second Moment

*Interaction: unchanged — real timer, minimal UI, skip still shows the post-sit copy. "Just take me to the app" escape hatch stays here.*

**Pre-sit:** unchanged (headline, body, "Start 60 seconds", Skip).

**Post-sit:**
> That urge to grab your phone? That restlessness? That's a nervous system that's used to constant input. It's a sign that your brain has been primed for short term pleasure over long term rewards.
>
> Now here's the good news.

**CTA:** There's a way out →

---

## Screen 4 — The Override (dark pulse screen)

*Interaction: unchanged — dark screen, pulsing orange core.*

**Headline:** Practice **deliberate discomfort**

**Body:**
> The same brain that adapted to constant stimulation can adapt back. You train it by doing hard things — on purpose.
>
> We've selected 7 key practices designed to train you to **override** the moment your brain says stop. This is how you rebuild what overstimulation has eroded.
>
> You don't have to do all of them. We recommend a minimum of **one per day**. After each one, a quick reflection locks in what you noticed.

**CTA:** Pick your starting point →

---

## Screen 5 — Pick a Practice

*Interaction: unchanged — full practice catalog, doctor caution for cold/heat, hold-to-commit button.*

**Eyebrow:** YOUR STARTING POINT
**Headline:** Pick one. Just one.

**CTA:** This is my starting point → *(press and hold)*

---

## Screen 6 — Send-Off

*Interaction: unchanged — recap checkmarks stagger in.*

**Recap items:**
> ✓ You sat still for 60 seconds — *and felt what constant input has done*
> ✓ You learned what's happening in your brain — *dopamine, downregulation, and what it's costing you*
> ✓ You picked [Practice] — *your first practice is waiting*

**Go line:** Now go **do the thing.**

**Under the go line (small):**
> After your first practice, we'll show you exactly what it did to your brain.

**CTA:** Let's go →


---

# PART 2 — THE DEBRIEF (3 screens, one-time)

**Trigger:** fires immediately after the user saves their **first-ever** practice reflection. One-time — flagged on the user profile (`has_seen_debrief`).
**Fallback:** if they dismiss it or never hit the trigger, a home-screen card — **"See what just happened in your brain →"** — opens the same sequence, and clears once viewed. (Same pattern as the deferred-onboarding banner.)
**Tone shift:** onboarding argued with a skeptic; the Debrief validates someone who already acted. Every headline should say *you did it* before it says anything else.

## Debrief 1 — What You Just Did (recovery thread)

*Interaction: the two-node vertical timeline — teal science node, orange Stoics node, staggered reveal.*

**Eyebrow:** YOUR FIRST OVERRIDE
**Headline:**
> That pull to quit you just felt? That was the whole method.

**Node 1 — WHAT YOU JUST DID:**
> Feeling the pull to quit — and not quitting — is the entire method. The same dopamine driving that scroll also powers your **prefrontal cortex**: the part of your brain responsible for decisions, focus, and self-control. **Every rep like the one you just finished trains it.**

**Node 2 — OVER 2,000 YEARS AGO:**
> It's not a new idea. The Stoics practiced **voluntary hardship** on purpose — going without, sitting with discomfort, choosing the hard thing — so they'd never be at the mercy of either. Same principle. Distress tolerance builds. **Over time, your baseline shifts.**

**CTA:** What am I up against? →

> *Editor's note:* The old headline ("Dopamine doesn't just create craving…") was a lecture opener; the new one names what they just experienced, which is the entire reason this content moved here. Node 1 rewritten to close on "every rep like the one you just finished trains it" — the sentence that makes practice #2 feel like it's building something. Node 2 verbatim. CTA sets up the trap screen as opposition-scouting rather than more bad news.

---

## Debrief 2 — What You're Up Against (pleasure trap slider)

*Interaction: unchanged — Then/Now drag slider crossfading the two worlds, reveal at the "Now" end.*

**Eyebrow:** WHAT YOU'RE TRAINING AGAINST
**Headline:** Your reward system was built for a different world.

**Reveal (unchanged):**
> **Researchers call this the pleasure trap.**
> A world of abundant, effortless, engineered pleasure that your reward system was never built to handle. This isn't laziness. It's not a character flaw. Your brain adapted perfectly to the environment it evolved in — it's just not the one you're living in now.

**CTA:** Does this actually work? →

> *Editor's note:* Body and interaction untouched — the slider works anywhere. Only the frame changes: in onboarding this screen said "here's why you feel broken"; here it says "here's the opponent you just took a swing at." The eyebrow does most of that work. CTA is the skeptic's last question, which the research screen answers.

---

## Debrief 3 — The Receipts (research stats)

*Interaction: unchanged — stat cards stagger in, 250% counts up.*

**Eyebrow:** THE RESEARCH
**Headline:**
> What you just did, according to the science.

**Stat cards:** unchanged (cold-water dopamine +250%, two pathways, trainable connectivity, weeks-not-years).

**Closing line (under the cards):**
> One down. The research says the ones who keep going feel it in weeks. **Same time tomorrow.**

**CTA:** Back to the app →

> *Editor's note:* Old headline ("This isn't just a mindset thing…") was written to overcome doubt; post-practice, the stats are proof they bet right, so the headline claims the practice they already did. The closing line is the whole point of ending the Debrief here — it converts validation into an appointment ("same time tomorrow") right at the moment motivation peaks. If we ever add a day-2 reminder notification, this line is what it should echo.

---

## Implementation notes (for when the copy is settled)

- Onboarding: delete the flip-cards screen from `STEPS`, apply copy changes above. All OTA-able.
- Debrief: new self-contained component (reuses the thread/slider/stats screens), so it can also be re-linked later from the Learn more / research section.
- Trigger: after the first-ever practice reflection saves → navigate to Debrief; set `has_seen_debrief` on completion.
- Home card: shown when user has ≥1 completed practice and `has_seen_debrief` is false.
- The cut flip-cards screen doesn't die — its content (infinite scroll / variable rewards / bliss point) is good candidate material for the Learn more section.
