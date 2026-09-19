import { TidbitContextType } from '../types';

export interface SeedTidbit {
  text: string;
  extended_text: string;
  context_type: TidbitContextType;
  context_value: string;
  tags: string[];
}

// =============================================================================
// NEUROSCIENCE TIDBITS — the card shown after a habit check-in.
//
// THE THESIS THESE ARE WRITTEN TO. The app measures resistance, and the chart
// it sells is that number falling. So the tidbits have to explain why it falls
// without promising the habit becomes free — otherwise the reward for sticking
// with something is being told it stopped mattering.
//
// The line that reconciles those, and the spine of the whole set: REPETITION
// AUTOMATES THE LAUNCH, NOT THE WORK. What the basal ganglia takes over is the
// decision to start — the cue-to-action link. The effort itself stays effortful,
// which is why a habit can feel easier to begin and just as hard to finish. That
// is what a falling resistance score is actually measuring.
//
// This replaces the 2026-07 set, which was written for the override thesis and
// treated any mention of automaticity as heresy. See docs/tidbit-audit.md.
//
// VOICE RULES (standing, see CLAUDE.md and the copy-voice notes):
// - Never "rep" or "log the rep". Say check-in, session, today, or the habit.
// - Never "practice" as a noun for the thing being tracked. It is a habit now.
// - Don't promise effortlessness, and don't call a demanding habit "quick".
//
// CITATION POLICY (carried over from the habit-science work): verified or
// absent. Every named study below was already cited in the previous set or its
// audit. Where a mechanism is established but no specific paper is named, the
// entry ships prose and no citation.
//
// BUCKETS — `context_value` when `context_type` is 'habit'. The selection
// cascade lives in services/neuroscienceTidbits.ts:
//   hardest     — rated 3, "took everything I had"
//   struggle    — returning after a missed day
//   easing      — rated 1 with a streak of 7+; the resistance curve bending
//   established — streak 30+
//   streak      — streak 7+
//   new_habit   — streak 14 or under
//   generic     — fallback
//
// `context_type: 'habit_type'` is matched off the habit's NAME by
// deriveHabitType(), and is the science of one kind of habit. Keep the
// context_value in step with HABIT_TYPE_PATTERNS in the service.
//
// RETIRED: the `challenge_type`, `state` and `generic` context types. They were
// only ever read by selectTidbitForCompletion, which is reachable from
// ChallengesHomeScreen alone — and Challenges came off the tab bar. The content
// worth keeping was rewritten into the buckets below; the rest is in git.
// =============================================================================

export const TIDBIT_SEED_DATA: SeedTidbit[] = [
  // ==========================================================================
  // HABIT TYPE — the science of this particular kind of habit.
  // Matched from the habit's name, so it lands as "here is what YOUR habit is
  // doing to you" rather than another round of general habit theory.
  // ==========================================================================

  {
    text: "Moving your body raises BDNF — a protein that helps neurons grow and survive. You didn't only train your legs just now. The same session measurably changes the tissue you think with.",
    extended_text:
      "BDNF (Brain-Derived Neurotrophic Factor) supports the growth, maintenance and survival of neurons, and underpins synaptic plasticity — the brain's capacity to reorganise itself. It has been nicknamed 'Miracle-Gro for the brain,' which oversells it slightly, but the direction is right.\n\nA single session of aerobic exercise measurably raises circulating BDNF, with effects lasting well past the end of the workout. Sustained over months, aerobic activity is associated with increased hippocampal volume — the region most involved in memory, and one of the first to shrink with age.\n\nThis is the part of a movement habit that no mirror will ever show you. The visible adaptations take months. The neurochemical one happened today.",
    context_type: 'habit_type',
    context_value: 'workout',
    tags: ['BDNF', 'exercise', 'neuroplasticity', 'hippocampus'],
  },
  {
    text: "Cold drives norepinephrine up to several times baseline — and unlike caffeine, nothing is being borrowed. That clear, switched-on feeling you have right now is the aftermath, and it outlasts the cold by hours.",
    extended_text:
      "Cold exposure triggers a large release of norepinephrine, a neurotransmitter that sharpens attention, lifts mood and raises arousal. Studies of cold-water immersion have recorded increases of two to three times baseline, sustained well beyond the exposure itself.\n\nThe mechanism is worth contrasting with stimulants. Caffeine works by blocking adenosine, the molecule that accumulates as you stay awake — it masks tiredness you will still have to pay for. Cold produces norepinephrine directly, so the alertness isn't drawn against later.\n\nThere is a second-order effect too. Deliberately entering something your body wants out of, and staying, is a repeatable lesson that the alarm is not the same thing as danger. The clarity is the obvious reward. The recalibration is the one that lasts.",
    context_type: 'habit_type',
    context_value: 'cold',
    tags: ['norepinephrine', 'cold exposure', 'alertness', 'stress response'],
  },
  {
    text: "Sitting still moves your nervous system out of fight-or-flight: heart rate drops, cortisol falls. Do it for weeks and the change stops being a mood and starts being structural — the threat detector itself gets quieter.",
    extended_text:
      "Meditation engages the parasympathetic nervous system — the 'rest and digest' side — which lowers heart rate and blood pressure and reduces circulating cortisol. That much is immediate, and it's most of what a single session gives you.\n\nThe durable change takes longer and shows up in tissue. Britta Hölzel's team found that an eight-week mindfulness-based stress reduction course produced measurable increases in grey matter density in the hippocampus, alongside decreased density in the amygdala that tracked participants' reported drops in stress. Sara Lazar's work at Harvard found greater cortical thickness in the prefrontal cortex and right anterior insula in long-term meditators.\n\nSo the restlessness in a session isn't an obstacle to the benefit — noticing that you've wandered and returning is the entire movement being trained. A session where your mind never strays gives you nothing to practise on.",
    context_type: 'habit_type',
    context_value: 'meditation',
    tags: ['meditation', 'amygdala', 'grey matter', 'parasympathetic'],
  },
  {
    text: "Slow breathing is the one lever on your autonomic nervous system you can pull directly. A long exhale stimulates the vagus nerve, and your heart rate drops within a breath or two — no belief required.",
    extended_text:
      "The vagus nerve runs from the brainstem down through the chest and abdomen, and carries most of the parasympathetic signalling in the body. Breathing is unusual in being both automatic and voluntary, which makes it the accessible handle on a system you otherwise cannot reach on purpose.\n\nThe exhale is where the effect lives. Heart rate rises slightly on the inhale and falls on the exhale, so lengthening the out-breath relative to the in-breath biases the whole cycle toward the parasympathetic. This is why the technique is always some version of 'out for longer than in' rather than simply 'breathe deeply.'\n\nRepeated over time this is described as building vagal tone — a nervous system that returns to baseline faster after being stirred up. That is the real deliverable. Not calm during the session, but a shorter distance back to calm the next time something knocks you out of it.",
    context_type: 'habit_type',
    context_value: 'breathwork',
    tags: ['vagus nerve', 'breathwork', 'heart rate variability', 'nervous system'],
  },
  {
    text: "Sleep isn't downtime for the brain — it's the shift when everything gets filed. Deep non-REM replays the day's patterns and consolidates them, which means protecting your sleep protects every other habit you're building.",
    extended_text:
      "During deep non-REM sleep the brain replays neural sequences from the day, at speed, transferring them from short-term storage into more durable form. This is memory consolidation, and it is one of the best-established findings in the field. What you did today is not fully yours until you have slept on it.\n\nSelf-regulation is subject to the same process, which is what makes this habit load-bearing for the others. Sleep restriction measurably degrades emotional regulation and impairs the prefrontal control you rely on to start anything you don't feel like starting. A short night doesn't just make you tired — it removes capacity from tomorrow's hardest decision.\n\nThere's a glymphatic angle too: clearance of metabolic waste from brain tissue rises substantially during sleep. Whatever else you're working on, this is the habit that makes the others cheaper.",
    context_type: 'habit_type',
    context_value: 'sleep',
    tags: ['sleep', 'memory consolidation', 'self-regulation', 'glymphatic'],
  },
  {
    text: "Putting a feeling into words turns the volume down on it. Naming what you're experiencing engages the prefrontal cortex and damps amygdala activity — the reason writing it out helps even when nothing about the situation changed.",
    extended_text:
      "Affect labelling is the finding that describing an emotional state in words reduces its intensity. Neuroimaging work associates it with increased activity in the right ventrolateral prefrontal cortex and decreased amygdala response — deliberate processing taking something back off the automatic circuitry.\n\nThis is part of why journaling does anything at all. The page isn't a record; it's a device for converting a vague, looping, bodily feeling into specific language. Specific things are far easier to reason about, and much harder to catastrophise.\n\nIt also creates evidence. Most people's sense of how a month went is reconstructed from its worst day and its last day. A written record is the only thing that reliably disagrees with that — and it's usually the written record that's right.",
    context_type: 'habit_type',
    context_value: 'journaling',
    tags: ['affect labelling', 'journaling', 'prefrontal cortex', 'amygdala'],
  },
  {
    text: "Every app you didn't open was a variable-reward slot machine you declined to pull. Unpredictable payoffs drive dopamine harder than reliable ones — which is exactly why the pull feels disproportionate to anything you'd actually find in there.",
    extended_text:
      "Dopamine responds most strongly to rewards that are uncertain. A payoff you can predict produces a modest signal; one that might or might not arrive produces a much larger one. This is the mechanism behind slot machines, and it is the mechanism behind a feed that refreshes into something unknown.\n\nThe design consequence is that the wanting and the liking come apart. Dopamine drives seeking, not satisfaction — so the pull to check can be intense while the result is reliably underwhelming. Almost everyone has noticed that they rarely enjoy the scroll and reach for it anyway. That gap is the system working as built.\n\nWhat weakens it is simple and unglamorous: distance. Out of reach, out of sight, logged out. You are not trying to out-argue the urge in the moment — you're trying to have fewer moments where the argument occurs.",
    context_type: 'habit_type',
    context_value: 'screen_limit',
    tags: ['dopamine', 'variable reward', 'screen time', 'attention'],
  },
  {
    text: "The choice you just made will be slightly easier next time, and it barely involves willpower. Repeated decisions reshape the circuit that produces them — you're not only changing what you eat, you're changing what gets suggested to you.",
    extended_text:
      "Neural pathways follow a use-it-or-lose-it economy. Circuits that fire together repeatedly get reinforced, while unused ones are gradually pruned. A food choice is never a single event in isolation — it is one more piece of evidence in a long-running process that determines which option turns up first next time.\n\nThere is a physiological layer under that. Repeated exposure shifts taste preference: reduce added sugar consistently and foods you used to find pleasantly sweet start reading as too sweet. The reference point moves. This is generally reported as one of the more surprising effects, because it arrives without effort after a period that required quite a lot.\n\nSo the early weeks are the expensive part by design. You are paying for a change in what feels normal, and once it lands, most of the deciding stops.",
    context_type: 'habit_type',
    context_value: 'diet',
    tags: ['neural pathways', 'diet', 'taste adaptation', 'preference'],
  },
  {
    text: "Concentration releases acetylcholine, which tags the synapses you're using to be strengthened later while you sleep. The strained feeling of hard focus is the tagging. It's supposed to be uncomfortable.",
    extended_text:
      "Acetylcholine is released during sustained, effortful attention and functions as a marker: it flags which circuits were active, so that the consolidation process during subsequent sleep knows what to reinforce. Focus is the tagging pass; sleep is the write.\n\nThis explains something most people misread. The discomfort of deep work is not a sign you are doing it badly or that you are unsuited to it — it is the sensation of the mechanism running. Attention that costs nothing is not marking anything for keeps.\n\nIt also explains why the session has to end. The system depends on a cycle of effortful engagement followed by genuine rest, and grinding past the point of diminishing returns degrades the consolidation the work was for. Stop while the session is still good.",
    context_type: 'habit_type',
    context_value: 'deep_work',
    tags: ['acetylcholine', 'focus', 'deep work', 'consolidation'],
  },

  // ==========================================================================
  // HARDEST — rated 3, "took everything I had". The day that most deserves a
  // response. These say: that was the valuable one, and here is why.
  // ==========================================================================

  {
    text: "The moment you wanted to stop and didn't, your anterior cingulate cortex lit up — the region that registers effort and recruits the machinery to push through. Nothing about an easy day trains that. Today did.",
    extended_text:
      "The anterior cingulate cortex (ACC) is a central hub for effortful control. It monitors the conflict between what you feel like doing and what you intended to do, and recruits the prefrontal cortex to resolve it. Imaging consistently shows ACC activity spiking precisely at the point of resistance — when quitting is available and you choose otherwise.\n\nWhat makes this worth telling you is that the system is trainable. Research on effort-based decision-making finds that repeatedly choosing the costly path recalibrates how the brain prices effort: the same demand registers as less aversive over time. The cost doesn't vanish, but the threshold at which you're willing to pay it moves.\n\nThe days that barely register are the habit staying alive. Days like this one are the days it makes you different.",
    context_type: 'habit',
    context_value: 'hardest',
    tags: ['anterior cingulate cortex', 'effort', 'self-control'],
  },
  {
    text: "Around now is when the old pattern pushes back hardest. Behavioural science calls it an extinction burst — resistance spiking right before it fades. It only happens because the change is landing.",
    extended_text:
      "When a reliably reinforced behaviour stops being reinforced, it does not fade smoothly. It first intensifies — more frequent, more insistent — before declining. This is an extinction burst, and it is one of the most consistently reproduced patterns in behavioural research.\n\nApplied here: the circuits that supported your old default are not gone, and they are effectively testing whether the old routine still works. That is what a day like this feels like from the inside. The surge is evidence of disruption, not of failure — an unchallenged pattern has no reason to protest.\n\nThe practical problem is the timing. The burst lands exactly when someone is most likely to conclude they aren't capable of this, and quitting during it is the single most common way a change dies. Reading the spike correctly is most of the work. You just did the hard version of that.",
    context_type: 'habit',
    context_value: 'hardest',
    tags: ['extinction burst', 'resistance', 'behavioural neuroscience'],
  },
  {
    text: "Choosing something hard when nothing forced you to is how you stay level when something does. Every voluntary hard thing is a controlled dose of stress — so when real pressure lands, your system has seen the shape of it before.",
    extended_text:
      "Stress inoculation is a well-supported principle: controlled, survivable exposure to a stressor builds tolerance for larger doses later. Difficulty you choose on purpose — effort, cold, hunger, stillness, boredom — is a dose you administer to yourself under conditions you control.\n\nThe adaptation is physiological. Repeated manageable stress improves regulation of the HPA axis, the body's stress-hormone system, and strengthens prefrontal control over the amygdala. The result isn't a smaller stress response; it's a better-calibrated one that fires when it should and returns to baseline faster.\n\nWhich is why the hard day matters more than the easy one, and why the day you nearly skipped matters most of all. You aren't only getting through today — you're widening the band of what you can stay steady inside.",
    context_type: 'habit',
    context_value: 'hardest',
    tags: ['stress inoculation', 'HPA axis', 'resilience'],
  },

  // ==========================================================================
  // STRUGGLE — returning after a missed day. The highest-stakes moment in the
  // whole product: the response to a lapse is what decides whether it ends.
  // ==========================================================================

  {
    text: "In Phillippa Lally's UCL study, missing a single day had no statistically significant effect on the curve. The danger was never the missed day — it's reading a miss as proof you're not someone who sticks at things. You came back. The curve is intact.",
    extended_text:
      "One of the more important findings from Lally's 2010 study at University College London was not the headline number about how long habits take to form, but what happened when participants skipped a day. Their trajectories showed no statistically significant deviation afterwards. The curve resumed roughly where it had been.\n\nThis contradicts the all-or-nothing model most people apply to themselves, where a gap voids the work behind it. Capacity accumulates across repetitions, and accumulated things are more durable than that. A missed day is a missing data point, not a reset.\n\nWhat does end a habit is the interpretation. Catastrophising the lapse, abandoning the effort, and shifting self-description toward 'I can't stick to anything' — that sequence does real damage, and it is entirely downstream of a day that on its own cost almost nothing. Returning is the whole intervention.",
    context_type: 'habit',
    context_value: 'struggle',
    tags: ['Lally study', 'comeback', 'perfectionism'],
  },
  {
    text: "Coming back after a gap engages the reward system much like starting does. Your brain isn't running a tally of the days you missed — it responds to the decision in front of it, and the decision in front of it was to return.",
    extended_text:
      "The brain's valuation machinery is oriented toward the choice currently on the table, not toward an audit of prior ones. Re-engaging after a break registers as a fresh start rather than a continuation of failure, which is why returning often feels better than people expect given how much dread preceded it.\n\nThere's a well-documented trap in the other direction. The abstinence violation effect describes what happens when someone treats a single lapse as evidence of total failure: the guilt itself becomes a reason to keep not doing the thing, and one missed day turns into a month. The lapse is small; the story told about it is not.\n\nThe practical upshot is unglamorous. The return is the skill worth having, and you can only train it on days like this — which means a run without a single gap never teaches it at all.",
    context_type: 'habit',
    context_value: 'struggle',
    tags: ['comeback', 'reward system', 'abstinence violation effect'],
  },
  {
    text: "Being hard on yourself after a slip feels like accountability. The research says the opposite — self-criticism predicts giving up, and self-compassion predicts starting again sooner.",
    extended_text:
      "The intuition that guilt drives improvement is widespread and largely unsupported. Work on self-compassion by Kristin Neff and others finds that people who respond to their own setbacks with some kindness recover faster, persist longer, and show more motivation to repair the lapse — not less. The harsh response is the one associated with disengagement.\n\nThe mechanism is not mysterious. Self-criticism is itself aversive, so it attaches a punishment to the act of looking at the thing you lapsed on — and the reliable way to stop feeling that is to stop looking. Avoidance is a very effective solution to guilt and a very poor one for the habit.\n\nNone of this means the standard drops. It means separating the assessment from the self-attack: the day went badly, you're back, that is the entire correct response. Anything more is a cost with no return.",
    context_type: 'habit',
    context_value: 'struggle',
    tags: ['self-compassion', 'persistence', 'lapse recovery'],
  },

  // ==========================================================================
  // EASING — rated 1 with a streak of 7+. The resistance curve bending, which
  // is the product's whole claim. These explain WHY it fell, and hold the line
  // that what got cheap is starting, not the work.
  // ==========================================================================

  {
    text: "That was easy today, and it's worth being precise about what changed. The work is the same size. What got cheaper is starting it — the part that used to need a decision is being handled further down.",
    extended_text:
      "Repetition doesn't reduce the effort a task takes. It reduces the cost of initiating it. Ann Graybiel's work on chunking describes how the basal ganglia compresses a repeated sequence into a single unit that can be triggered as a whole, so the prefrontal cortex stops having to assemble it from scratch each time.\n\nWhat that removes is the deliberation — the negotiation, the timing, the weighing-up that happens before anything begins. For most people, most days, that negotiation was the expensive part. Losing it is a substantial saving and it feels like the whole thing got easier, which is why the distinction is worth drawing carefully.\n\nSo a low resistance score is not the habit becoming trivial. It is the overhead being paid off, leaving the work itself — which is still the work, and still yours to do.",
    context_type: 'habit',
    context_value: 'easing',
    tags: ['chunking', 'basal ganglia', 'initiation cost', 'resistance curve'],
  },
  {
    text: "Some of the lifting has quietly moved out of your head and into your surroundings. Once a behaviour is tied to a reliable time, place or trigger, the context supplies the prompt — and you stop spending anything on remembering to want to.",
    extended_text:
      "Wendy Wood's research on habit is largely a correction to the assumption that consistent people have more willpower. What they reliably have is more stable context. A behaviour repeated in a dependable setting binds to the cues in that setting, and the cue begins doing the work that intention was doing.\n\nThis reframes what a strong habit actually is. Not a person gritting harder, but an arrangement where far less gritting is required — the environment carries part of the load, and the only decision left is whether to follow a prompt that has already arrived.\n\nIt also identifies the real threat, which is not motivation but disruption. Travel, a schedule change, a move — these break habits far more efficiently than any loss of resolve, because they remove the cues rather than the will. Worth knowing before the next disruption rather than after it.",
    context_type: 'habit',
    context_value: 'easing',
    tags: ['context', 'cues', 'Wendy Wood', 'environment'],
  },
  {
    text: "Dopamine has been shifting earlier. It used to arrive when you finished; with enough repetition it moves to the cue — so some of the pull toward this now shows up before you've started, where the resistance used to be.",
    extended_text:
      "Dopamine is a prediction signal more than a pleasure one. Wolfram Schultz's work showed that as an animal learns which cue reliably precedes a reward, the dopamine response migrates backwards from the reward itself to the cue that predicts it. The system stops responding to the payoff and starts responding to the signal.\n\nRun that on a habit and something useful happens. The moment that used to be pure cost — the approach, the getting ready, the bit where you'd normally talk yourself out of it — acquires some of the reward value of the outcome. The anticipation starts pulling in the same direction as the intention rather than against it.\n\nThis is the clearest neural account of why an established habit feels different from a new one, and it is measurable in exactly the number this app tracks. Nothing got easier. The pull reversed.",
    context_type: 'habit',
    context_value: 'easing',
    tags: ['dopamine', 'prediction', 'cue', 'anticipation'],
  },

  // ==========================================================================
  // ESTABLISHED — streak 30+. Structural change, stated plainly.
  // ==========================================================================

  {
    text: "Consistent training physically changes brain tissue. Eight weeks of daily mindfulness produced measurable grey matter increases in the hippocampus in a Harvard-affiliated trial. Your brain is not fixed hardware — it reshapes around whatever you repeat.",
    extended_text:
      "Britta Hölzel and colleagues ran structural MRI on participants before and after an eight-week mindfulness-based stress reduction course, and found increased grey matter density in the hippocampus, posterior cingulate cortex and cerebellum — alongside decreased density in the amygdala that correlated with participants' own reports of reduced stress. Sara Lazar's earlier work at Harvard found greater cortical thickness in the prefrontal cortex and right anterior insula in long-term meditators.\n\nExercise shows the same kind of result through a different route. Aerobic training is associated with increased hippocampal volume in older adults, running against the shrinkage that otherwise comes with age, with BDNF as the most likely mediator.\n\nThese are macroscopic, measurable changes in tissue, not metaphors for commitment. At a month of consistency you are past the point where this is theoretical. The brain you'll have after a year of this is a different organ from the one you started with.",
    context_type: 'habit',
    context_value: 'established',
    tags: ['grey matter', 'neuroplasticity', 'brain structure'],
  },
  {
    text: "Keep choosing discomfort and the alarm system turns its own volume down. Repeated voluntary stress is associated with an amygdala that fires less readily and settles faster. You're not numbing out — you're getting harder to startle.",
    extended_text:
      "The amygdala drives threat detection and the felt sense of needing to get out of a situation. Avoidance keeps it sensitised: every retreat confirms that the thing was worth retreating from. Controlled, repeated exposure does the reverse.\n\nStudies of experienced meditators and of sustained exposure protocols show reduced amygdala reactivity and stronger prefrontal regulation over it — and in some samples, reduced amygdala grey matter density. The signature isn't the absence of a stress response. It's a faster return to baseline once one has fired.\n\nThe alarm still works where it should. What changes is its threshold, so it stops going off over things that were never dangerous — cold water, a hard set, an uncomfortable conversation, the first five minutes of something you didn't feel like starting. At this length of consistency, that shift is well underway.",
    context_type: 'habit',
    context_value: 'established',
    tags: ['amygdala', 'threat reactivity', 'equanimity'],
  },
  {
    text: "Pathways you use repeatedly get wrapped in more myelin, which makes them faster and more efficient. That's the physical reason starting costs less than it did a month ago — better wiring on the route, not a smaller job at the end of it.",
    extended_text:
      "Myelin is the fatty sheath that insulates nerve fibres, and it substantially increases the speed and reliability of signal transmission along them. Oligodendrocytes produce more of it around circuits that are used consistently, which means a well-practised pathway is physically different from a neglected one — not merely more familiar.\n\nIt is worth being careful about what this buys you. Faster, cheaper signalling on the route from intention to action is exactly the thing that lowers the cost of beginning. It does not make the work smaller. A habit can be simultaneously easy to start and genuinely hard to complete, and at this point that is probably what yours is.\n\nThat combination is the goal, not a halfway state. The overhead is gone and the substance remains — which is the most efficient arrangement available to you.",
    context_type: 'habit',
    context_value: 'established',
    tags: ['myelin', 'efficiency', 'neuroplasticity'],
  },

  // ==========================================================================
  // STREAK — 7+. The arc is underway but not settled.
  // ==========================================================================

  {
    text: "Your self-concept is not fixed — it's an inference your brain keeps updating from what you actually do. Each completion is a piece of evidence, and enough of them move you from 'I'm trying to do this' to 'this is what I do.'",
    extended_text:
      "Cognitive neuroscience treats the self-concept as something continuously reconstructed rather than stored. The medial prefrontal cortex, heavily involved in self-referential processing, integrates behavioural history into how you represent yourself. Act a certain way consistently and the representation follows.\n\nThe consequence is motivational. Once a behaviour is identity-congruent — this is the sort of person I am — the calculation changes shape. It stops being a cost you're weighing against a future benefit and becomes an expression of something already settled, which is a much shorter argument to have with yourself at six in the morning.\n\nThe loop reinforces itself: each completion supplies evidence for the identity, and the firmer identity makes the next completion less negotiable. You're inside that loop now, which is why it's a bad week to test whether it holds without you.",
    context_type: 'habit',
    context_value: 'streak',
    tags: ['identity', 'self-concept', 'medial prefrontal cortex'],
  },
  {
    text: "If this is getting easier to start, that's the basal ganglia taking over the launch — the cue-to-action link, not the work. Watch for the difference. The beginning gets cheap; the finishing is still yours.",
    extended_text:
      "Habit formation is often described as the brain handing a behaviour off from the prefrontal cortex to the basal ganglia, and imaging supports the broad picture: as a sequence is repeated, prefrontal involvement drops while basal ganglia activity rises. What that handoff covers is the initiation — the cue arriving and the action following without deliberation in between.\n\nIt does not cover execution. A hard run does not become an easy run because you've run for three weeks. The demanding part stays demanding; what disappears is the thirty minutes of negotiation that used to precede it.\n\nThis is the most useful distinction in the whole subject, and the most commonly fumbled. People expecting the work to become effortless conclude they're doing it wrong when it doesn't. People who know to expect a cheaper start and an unchanged middle recognise progress when they see it — and what you're seeing this week is progress.",
    context_type: 'habit',
    context_value: 'streak',
    tags: ['basal ganglia', 'automaticity', 'initiation', 'prefrontal cortex'],
  },
  {
    text: "Do hard things on purpose often enough and your baseline moves. What felt brutal a fortnight ago now reads as merely uncomfortable — you're not just getting through it, you're raising what counts as tolerable.",
    extended_text:
      "Distress tolerance — the capacity to sit with an uncomfortable internal state instead of escaping it — behaves like a trainable trait rather than a fixed allocation. Repeated voluntary exposure to manageable discomfort recalibrates how the brain appraises that discomfort in the first place.\n\nThe general principle is hormesis: a controlled stressor that provokes an adaptation leaving the system more capable than before. The subjective read-out is a moving reference point. The same stimulus that once dominated your attention becomes ordinary, not because it changed, but because your scale did.\n\nThis is the quietest benefit of a consistent habit and probably the most transferable. Very little of it stays in the domain you trained it in.",
    context_type: 'habit',
    context_value: 'streak',
    tags: ['distress tolerance', 'hormesis', 'baseline'],
  },
  {
    text: "The urge to quit isn't an instruction — it's a wave. It builds, crests and passes whether or not you act on it. Every time you sit through one, you collect evidence that it was never able to make you do anything.",
    extended_text:
      "Urges to escape discomfort follow a predictable arc: they rise, peak and subside, often within minutes if nothing feeds them. The difficulty is that in the middle of one they feel permanent and non-negotiable. Learning experientially — not just being told — that they are temporary is what loosens their grip.\n\nThis is the principle behind urge surfing, developed by Alan Marlatt in relapse-prevention research. Rather than fighting an urge or obeying it, you observe it as a passing internal event with a shape and a duration. Functionally this strengthens prefrontal regulation of limbic reactivity and weakens the automatic link between feeling something and acting on it.\n\nEach time the pull arrives, you don't move, and it fades anyway, you gather first-hand proof that discomfort is survivable and urges aren't orders. That evidence is what makes the next one easier to hold — and it cannot be acquired any other way.",
    context_type: 'habit',
    context_value: 'streak',
    tags: ['urge surfing', 'Marlatt', 'impulse control'],
  },

  // ==========================================================================
  // NEW_HABIT — streak 14 or under. The expensive stretch. Set expectations
  // honestly so the early cost doesn't get misread as unsuitability.
  // ==========================================================================

  {
    text: "There's no magic number of days that flips a switch. The first real study put the average near 66 days, with a range from 18 to 254 — and found that missing a single day didn't measurably dent the curve. It accumulates. Today counted.",
    extended_text:
      "The '21 days to form a habit' figure has no research behind it; it comes from a plastic surgeon's observation about patients adjusting to their appearance, repeated until it sounded like a finding. The first rigorous real-world test was Phillippa Lally's 2010 study at University College London, which tracked 96 people for twelve weeks.\n\nTwo results matter more than the headline average of 66 days. First, the spread was enormous — 18 to 254 days — and it tracked difficulty, so a demanding habit taking months is the expected case, not evidence that something is wrong with you. Second, there was no threshold. Automaticity rose along a gradual curve rather than switching on.\n\nThird, and most usefully: participants who missed a single day showed no statistically significant deviation from their trajectory. Perfection is not the mechanism. Accumulation is.",
    context_type: 'habit',
    context_value: 'new_habit',
    tags: ['Lally study', 'training curve', '21-day myth'],
  },
  {
    text: "Right now your prefrontal cortex is doing all of this by hand — every decision, every time. That's why the early days cost the most. It's the most expensive way your brain can run a behaviour, and it's temporary.",
    extended_text:
      "A new behaviour has no dedicated circuitry, so it runs on the general-purpose system: the prefrontal cortex, deliberately, from scratch, each occasion. That system is metabolically costly and easily depleted, which is why a new habit is disproportionately vulnerable to a bad night's sleep, a stressful day, or anything else already drawing on the same resource.\n\nThis is worth knowing mostly because of how the early difficulty gets misread. People conclude they lack discipline, or that this particular habit isn't for them. What they're actually encountering is the known cost profile of the beginning — the part before any of the work has been handed off.\n\nThe cost curve bends. Not to zero, and not on a fixed date, but reliably. What you're paying now is setup, not the running price.",
    context_type: 'habit',
    context_value: 'new_habit',
    tags: ['prefrontal cortex', 'early habit', 'cognitive cost'],
  },
  {
    text: "Harvard's Teresa Amabile analysed 12,000 daily diary entries and found the strongest driver of motivation wasn't breakthroughs or recognition — it was small, visible progress. Your reward system responds to forward movement, not to the size of the step.",
    extended_text:
      "Amabile and Steven Kramer's research, published as 'The Progress Principle,' drew on more than 12,000 daily diary entries from 238 professionals across seven companies. Of everything they measured, making progress in meaningful work was the strongest driver of positive emotion and motivation — ahead of recognition, incentives and interpersonal support.\n\nThe neural account is straightforward. The dopamine system is sensitive to positive change rather than absolute state, so a completed step produces a reinforcement signal largely independent of how big the step was. Small and real beats large and hypothetical.\n\nThe compounding is the point: people who recorded incremental progress were markedly more likely to report elevated motivation the following day. Momentum is neurologically sticky, and today's entry is not a trivial event — it's mass on a flywheel that gets easier to turn as it gathers.",
    context_type: 'habit',
    context_value: 'new_habit',
    tags: ['progress principle', 'Amabile', 'small wins', 'dopamine'],
  },
  {
    text: "Effort isn't only a cost your brain pays — it's something it can learn to value. Pair difficulty with completion enough times and the difficulty itself starts carrying some of the reward. That's the opposite of the comfort spiral.",
    extended_text:
      "Dopamine functions as a motivation and learning signal rather than a pleasure chemical, and research on effort-based reward shows the brain computes an outcome's value relative to what it cost to obtain. That valuation is not fixed.\n\nRobert Eisenberger's work describes a phenomenon he called learned industriousness: when effort is reliably followed by reward, effort acquires reward value of its own, and subjects trained on high-effort tasks subsequently choose harder options even when easier ones are available. The evidence base leans heavily on animal work, so hold it loosely — but the direction is consistent with the human effort-valuation literature.\n\nWhat that would mean in practice is that each completion of something genuinely hard nudges your reward system away from treating difficulty as a thing to avoid, and toward treating it as a marker of something worth doing. Which is the mechanism this entire habit is trying to buy.",
    context_type: 'habit',
    context_value: 'new_habit',
    tags: ['learned industriousness', 'effort valuation', 'Eisenberger', 'dopamine'],
  },

  // ==========================================================================
  // GENERIC — the fallback. Must work on any habit, any day, any streak.
  // ==========================================================================

  {
    text: "Dopamine didn't wait for you to finish — it started releasing when you decided to start. That's the mechanical reason beginning is the worst part and everything after it runs downhill.",
    extended_text:
      "Contrary to its reputation, dopamine is not primarily about pleasure. It's a motivation and anticipation signal, and it begins releasing in expectation of a reward rather than on receipt of it. The decision to begin is itself the trigger.\n\nThat has a practical consequence worth internalising. The hardest moment in any session is the one immediately before it starts, because it's the only moment where you have all of the cost in view and none of the neurochemistry yet working in your favour. A few minutes in, the situation is materially different.\n\nWhich is why almost every technique that reliably helps — two minutes of it, just the setup, only the first set — is a way of getting past that specific moment rather than a way of doing less. Cross it and the system starts helping.",
    context_type: 'habit',
    context_value: 'generic',
    tags: ['dopamine', 'anticipation', 'starting'],
  },
  {
    text: "Finishing is stamped differently from abandoning. Your brain marks the end of a completed sequence, and that marker is part of what gets kept — which makes the last stretch, after you already wanted to stop, the part that counts most.",
    extended_text:
      "Ann Graybiel's work on task-bracketing describes neural activity in the basal ganglia that fires distinctly at the start and the end of a learned sequence, effectively bracketing it as a unit. Disrupting the end-of-sequence signal impairs how well the behaviour is consolidated. How something finishes shapes what the brain retains of it.\n\nThere's a self-signalling layer on top. Following through on something you wanted to abandon is direct behavioural evidence about what kind of person you are — evidence your brain uses to update its model of you, and which it weights more heavily than anything you say about yourself. Stopping partway files the opposite entry.\n\nSo the final stretch is disproportionately valuable, and it's the stretch most easily traded away. Today you didn't trade it.",
    context_type: 'habit',
    context_value: 'generic',
    tags: ['task bracketing', 'completion', 'self-signalling'],
  },
  {
    text: "Tonight, while you sleep, your brain replays today and decides what to keep. The work isn't finished when you finish — you did your part, and the filing happens in the dark. Protect your sleep and you protect what you just earned.",
    extended_text:
      "Memory consolidation during sleep is among the most robust findings in neuroscience. The brain doesn't store the day passively; during deep non-REM sleep it actively replays the neural patterns from waking hours and transfers them into more durable form.\n\nThis applies to self-regulation as much as to facts or movement sequences. The prefrontal and interoceptive circuits you engaged by starting something you didn't feel like starting get rehearsed offline, which is part of how the gain stabilises. Sleep deprivation measurably degrades both emotional regulation and the consolidation of effortful learning.\n\nIt's an unusually actionable piece of neuroscience. The most useful thing you can do for today's effort is now entirely unrelated to the habit itself — it's going to bed.",
    context_type: 'habit',
    context_value: 'generic',
    tags: ['sleep', 'memory consolidation', 'recovery'],
  },
];
