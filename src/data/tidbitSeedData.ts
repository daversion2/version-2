import { TidbitContextType } from '../types';

export interface SeedTidbit {
  text: string;
  extended_text: string;
  context_type: TidbitContextType;
  context_value: string;
  tags: string[];
}

export const TIDBIT_SEED_DATA: SeedTidbit[] = [
  // ============================================================================
  // CHALLENGE TYPE — specific to the kind of hard thing completed
  // ============================================================================

  {
    text: "Your brain just released BDNF — a protein that literally grows new neural connections. You didn't just train your body. You upgraded your brain.",
    extended_text: "BDNF (Brain-Derived Neurotrophic Factor) is sometimes called 'Miracle-Gro for the brain.' It promotes the growth and maintenance of neurons, improves synaptic plasticity, and has been shown to improve memory, mood, and cognitive function. Even a single session of physical exercise measurably increases BDNF levels — effects that last hours after the workout ends.",
    context_type: 'challenge_type',
    context_value: 'workout',
    tags: ['physical', 'BDNF', 'neuroplasticity'],
  },
  {
    text: "Norepinephrine just spiked up to 300% of baseline. That alert, focused feeling you have right now? You earned it.",
    extended_text: "Cold exposure triggers a massive release of norepinephrine, a neurotransmitter that enhances attention, focus, and mood. Unlike caffeine, which blocks adenosine receptors, cold exposure produces norepinephrine naturally — and its effects can last for hours. Regular cold exposure has been linked to improved resilience to stress and even reduced symptoms of depression.",
    context_type: 'challenge_type',
    context_value: 'cold',
    tags: ['physical', 'norepinephrine', 'cold exposure'],
  },
  {
    text: "Your parasympathetic nervous system just took the wheel. Cortisol is dropping. This is what real recovery feels like from the inside.",
    extended_text: "Meditation activates the parasympathetic nervous system — your body's 'rest and digest' mode. This reduces cortisol (the stress hormone), lowers heart rate, and decreases blood pressure. Over time, regular meditation practice physically changes the brain: the amygdala (your threat detector) shrinks, while the prefrontal cortex (responsible for decision-making and self-regulation) thickens.",
    context_type: 'challenge_type',
    context_value: 'meditation',
    tags: ['mental', 'parasympathetic', 'cortisol', 'meditation'],
  },
  {
    text: "Controlled breathing just activated your vagus nerve — the longest nerve in your body. You manually switched your nervous system from fight-or-flight to rest-and-recover.",
    extended_text: "The vagus nerve runs from your brainstem to your abdomen and controls the parasympathetic nervous system. Slow, deep breathing stimulates it directly, which reduces heart rate, lowers blood pressure, and calms the mind. This is why breathwork feels so powerful — you're literally using your breath as a remote control for your nervous system. Regular vagal stimulation through breathwork builds 'vagal tone,' making you more resilient to stress over time.",
    context_type: 'challenge_type',
    context_value: 'breathwork',
    tags: ['mental', 'vagus nerve', 'breathwork', 'nervous system'],
  },
  {
    text: "Every time you make a choice aligned with your goals, you strengthen the neural pathway that makes that choice easier next time. This one counts.",
    extended_text: "Your brain operates on a 'use it or lose it' principle called synaptic pruning. Neural pathways that fire frequently get reinforced with myelin (a fatty insulation that speeds signal transmission), while unused pathways weaken. Every time you choose the healthier option, you're not just making a single decision — you're physically strengthening the circuitry that makes that decision feel more natural next time.",
    context_type: 'challenge_type',
    context_value: 'diet',
    tags: ['physical', 'neural pathways', 'habit formation', 'diet'],
  },
  {
    text: "Sustained focus causes your brain to release acetylcholine — the neurochemical of learning. The discomfort you felt was your brain physically changing.",
    extended_text: "Acetylcholine is released when you concentrate intensely, marking the active synapses for strengthening during sleep. This is why deep work feels uncomfortable — your brain is literally reorganizing itself in real time. The 'strain' of sustained attention is the sensation of neuroplasticity happening. After a deep work session, your brain consolidates those changes during rest, which is why breaks and sleep are essential for learning.",
    context_type: 'challenge_type',
    context_value: 'deep_work',
    tags: ['mental', 'acetylcholine', 'focus', 'deep work', 'learning'],
  },

  // ============================================================================
  // STATE — specific to the user's current situation
  // ============================================================================

  {
    text: "Returning after a miss activates the same reward circuits as starting fresh. Your brain doesn't penalize the gap — it rewards the return.",
    extended_text: "Research in behavioral neuroscience shows that the brain's reward system responds strongly to re-engagement after a break. The anterior cingulate cortex, which monitors effort and conflict, signals a fresh start rather than a failure. This is why it often feels surprisingly good to come back after missing a day — your brain is celebrating the decision to return, not punishing the absence.",
    context_type: 'state',
    context_value: 'comeback',
    tags: ['motivation', 'reward circuits', 'comeback'],
  },
  {
    text: "The harder the thing, the larger the dopamine release on completion. Your brain just logged this as a significant win. It will remember.",
    extended_text: "Dopamine release is proportional to the perceived difficulty and unexpectedness of a reward. When you complete something you rated as very hard, the dopamine spike is significantly larger than for easy tasks. This creates a stronger memory trace, making your brain more likely to seek out similar challenges in the future. Essentially, by doing the hard thing, you're training your reward system to find satisfaction in difficulty.",
    context_type: 'state',
    context_value: 'rated_hard',
    tags: ['dopamine', 'difficulty', 'reward'],
  },
  {
    text: "Repeated behaviors physically thicken the myelin sheath around the neural pathways that drive them. Your discipline is becoming structural — literally wired in.",
    extended_text: "Myelin is a fatty substance that wraps around nerve fibers, dramatically increasing the speed and efficiency of electrical signals. When you repeat a behavior consistently, oligodendrocyte cells produce more myelin around the relevant neural pathways. A 7-day streak means those pathways are measurably stronger than they were a week ago. This is why habits feel easier over time — the neural infrastructure supporting them is physically more efficient.",
    context_type: 'state',
    context_value: 'streak_7',
    tags: ['myelin', 'neuroplasticity', 'streaks', 'habit formation'],
  },
  {
    text: "At 30 days, neuroscience research shows behavioral patterns begin transitioning from effortful to automatic. You're crossing the threshold from discipline to identity.",
    extended_text: "The basal ganglia — a brain region responsible for habit formation — gradually takes over behaviors that are repeated consistently. Around the 30-day mark, neuroimaging studies show reduced activity in the prefrontal cortex (the effortful decision-making area) and increased activity in the basal ganglia for repeated behaviors. This means the behavior is shifting from something you have to decide to do into something you just do. You're not just building a habit — you're rewiring your default mode.",
    context_type: 'state',
    context_value: 'streak_30',
    tags: ['basal ganglia', 'habit formation', 'identity', 'automaticity'],
  },
  {
    text: "Your first completion just created a new reference point in your brain. Every future challenge will be measured against this proof that you can do hard things.",
    extended_text: "The brain uses past experiences as anchoring points for future decision-making. Completing your first challenge creates what psychologists call a 'mastery experience' — the most powerful source of self-efficacy. Your brain now has concrete evidence that you can commit to and complete a difficult task. This reference point will subtly influence every future moment of doubt, making you more likely to push through resistance.",
    context_type: 'state',
    context_value: 'new_user',
    tags: ['self-efficacy', 'first completion', 'mastery experience'],
  },
  {
    text: "Around this point, your brain fights back. Old urges may feel stronger than before. This is called an extinction burst — it's actually a sign the new pattern is taking hold.",
    extended_text: "When you change a behavior, the neural circuits that supported the old pattern don't disappear immediately. Instead, they temporarily fire more intensely — a phenomenon called an 'extinction burst.' Your brain is essentially testing whether the old behavior still works. This spike in cravings or resistance typically peaks around days 5-10 of a new behavior and then subsides. Most people who quit during this window interpret the intensification as evidence they can't change. In reality, it's the opposite: the extinction burst only happens because the new pattern is genuinely disrupting the old one.",
    context_type: 'state',
    context_value: 'extinction_burst',
    tags: ['extinction burst', 'behavioral neuroscience', 'habit formation', 'resistance'],
  },
  {
    text: "The resistance you're feeling right now is your old neural pathways making their last stand. In behavioral science, this is the moment most people quit — and exactly the moment that matters most.",
    extended_text: "Extinction bursts are well-documented in behavioral neuroscience. When a reinforced behavior stops being rewarded, the behavior temporarily increases in frequency and intensity before fading. Your basal ganglia — the brain region responsible for automatic behaviors — is essentially 'protesting' the change. This is why days 5-10 often feel harder than day 1: you've disrupted the pattern enough for your brain to notice, but not long enough for the new pattern to feel natural. Push through this window, and the old pathway begins to weaken permanently.",
    context_type: 'state',
    context_value: 'extinction_burst',
    tags: ['extinction burst', 'basal ganglia', 'resistance', 'persistence'],
  },

  // ============================================================================
  // GENERIC — broadly relevant to completing hard things
  // ============================================================================

  {
    text: "Dopamine didn't release because you finished. It started building the moment you decided to start. That's why showing up is the hardest and most important part.",
    extended_text: "Contrary to popular belief, dopamine is not primarily a 'pleasure chemical' — it's a motivation chemical. Research shows that dopamine begins releasing in anticipation of a reward, not upon receiving it. The decision to start a challenge triggers dopamine release that sustains you through the effort. This is why the hardest part is always beginning — once you start, your neurochemistry is working with you, not against you.",
    context_type: 'generic',
    context_value: 'generic',
    tags: ['dopamine', 'motivation', 'starting'],
  },
  {
    text: "Your prefrontal cortex just won a battle against your limbic system. That's what discipline looks like at the neurological level.",
    extended_text: "Every act of self-discipline involves a real-time competition between two brain systems. The limbic system (especially the amygdala) drives comfort-seeking and immediate gratification. The prefrontal cortex enables long-term planning and impulse control. When you complete a challenge despite resistance, your prefrontal cortex literally overrides the limbic system's objections. Like a muscle, this capacity strengthens with use — each victory makes the next one slightly easier.",
    context_type: 'generic',
    context_value: 'generic',
    tags: ['prefrontal cortex', 'limbic system', 'discipline', 'self-control'],
  },
  {
    text: "Every completion reinforces the identity signal your brain sends itself. You're not just building a habit. You're rewriting who you are.",
    extended_text: "Identity formation in the brain involves the medial prefrontal cortex, which maintains your self-concept. Each time you act in alignment with a desired identity ('I am someone who does hard things'), you strengthen the neural representation of that identity. Over time, this creates a self-reinforcing loop: the stronger the identity, the less effort required to act consistently with it. You're not just completing challenges — you're sculpting your neurological self-image.",
    context_type: 'generic',
    context_value: 'generic',
    tags: ['identity', 'self-concept', 'habit formation', 'neuroplasticity'],
  },
  {
    text: "Your brain just released endorphins — natural painkillers 40x more powerful than morphine. The 'high' you feel right now is your body's way of saying 'do that again.'",
    extended_text: "Endorphins are opioid neuropeptides produced by the pituitary gland and hypothalamus during physical exertion, excitement, and pain. They bind to the same receptors as morphine, producing feelings of euphoria and well-being. This natural reward system evolved to encourage behaviors that promote survival. By completing a challenge, you've triggered a biochemical response that will make your brain associate effort with pleasure — a powerful driver of long-term behavior change.",
    context_type: 'generic',
    context_value: 'generic',
    tags: ['endorphins', 'reward', 'natural high'],
  },

  // ============================================================================
  // HABIT — shown after habit completions
  // context_value: 'generic' | 'new_habit' | 'streak' | 'established' | 'struggle'
  // ============================================================================

  {
    text: "Your basal ganglia just recorded that sequence. MIT neuroscientist Ann Graybiel found the brain bundles repeated behaviors into compressed neural 'chunks' — stored like a macro shortcut. The more you repeat this, the less brainpower it requires.",
    extended_text: "Ann Graybiel's lab at MIT has spent decades studying how the basal ganglia turns repeated actions into automatic programs. Specific neurons fire at the very start of a habit routine and again when it ends — 'task-bracketing' — while the brain goes quiet in between. This is the neural signature of a chunked habit.\n\nWhat makes this remarkable is the energy savings. Before chunking, a behavior requires constant prefrontal cortex involvement — planning, deciding, overriding inertia. After enough repetitions, the basal ganglia owns the routine entirely. Research estimates this shift can reduce the cognitive load of a behavior by as much as 90%.\n\nEvery time you complete this habit, you're deepening those chunk boundaries. The start-signal fires more reliably. The end-signal becomes cleaner. You're compressing it into a permanent, low-cost program.",
    context_type: 'habit',
    context_value: 'generic',
    tags: ['basal ganglia', 'automaticity', 'chunking', 'habit loop'],
  },
  {
    text: "Your basal ganglia neurons just fired a burst at the start of your habit, went quiet through the middle, and fired again at completion. MIT researchers call this 'task-bracketing' — your brain marking the chunk as done and storing it. That final signal is real. It matters.",
    extended_text: "Ann Graybiel's MIT lab discovered that as habits form, a specific population of striatal neurons develops task-bracketing activity: firing strongly at habit initiation, going quiet during execution, and firing again at completion. This pattern becomes more pronounced as habits become more automatic.\n\nThe completion burst is not incidental — it marks the boundary of the behavioral chunk and allows the brain to consolidate the sequence as a unified unit. A 2018 study from Graybiel's lab (published in Current Biology) found that disrupting this end-of-sequence signal interfered with habit consolidation.\n\nThe implication is direct: finishing the habit matters, not just starting it. The closing bell just fired. That chunk is slightly stronger than it was before you started.",
    context_type: 'habit',
    context_value: 'generic',
    tags: ['basal ganglia', 'chunking', 'completion', 'reinforcement'],
  },
  {
    text: "Tonight while you sleep, your brain will rehearse what you did today. Research shows behavioral memories are consolidated during slow-wave sleep — neural patterns from the day literally replaying. Tomorrow's habit will be easier not just because of repetition, but because your sleeping brain practiced it again.",
    extended_text: "Memory consolidation during sleep is one of the most robust findings in modern neuroscience. Research from Matthew Walker's lab at UC Berkeley shows the brain doesn't store memories passively during sleep — it actively replays the neural patterns activated during the day. In humans, fMRI studies show brain regions active during daytime skill learning reactivate during REM sleep.\n\nFor behavioral memories — the kind underlying habits — this consolidation appears particularly robust during deep non-REM sleep. Sleep spindles coordinate the transfer of behavioral patterns from the hippocampus into the cortex and striatum, stabilizing them for long-term storage.\n\nThe night after a habit completion is part of the formation process. Sleep deprivation doesn't just hurt mood — it directly disrupts habit consolidation. You've done your part today. Let your brain finish the job tonight.",
    context_type: 'habit',
    context_value: 'generic',
    tags: ['sleep', 'memory consolidation', 'procedural memory', 'overnight'],
  },
  {
    text: "Here's something counterintuitive: dopamine doesn't spike when you finish a habit — it spikes when you anticipate starting it. As this habit solidifies, your brain will release dopamine at the cue, not the completion. That's what creates the pull. Right now, you're teaching your brain to want this.",
    extended_text: "Wolfram Schultz's landmark research established the dopamine prediction error signal. Early in habit formation, dopamine releases when the reward arrives. But as the habit becomes established, the release migrates backward: from the reward to the cue that predicts it.\n\nThis is why experienced meditators feel drawn to their cushion before they sit down. Why runners feel the urge to lace up when they see their shoes by the door. The brain has learned the cue reliably predicts reward, so it front-loads the motivation signal.\n\nThis migration takes repetitions to complete. Every session you finish teaches your dopamine system to move that anticipatory release slightly earlier. You are training your brain to want this habit automatically — so that future-you doesn't have to fight for it.",
    context_type: 'habit',
    context_value: 'new_habit',
    tags: ['dopamine', 'anticipation', 'reward prediction', 'motivation'],
  },
  {
    text: "The '21 days to form a habit' is a myth. A UCL study by Phillippa Lally tracked 96 people and found it takes an average of 66 days for a behavior to feel truly automatic — and missing one day has no measurable effect on the curve. Every repetition moves you forward. You're in the building phase.",
    extended_text: "The '21 days' myth traces back to a 1960s observation by plastic surgeon Maxwell Maltz — never a scientific finding. In 2010, Phillippa Lally at University College London ran the first rigorous real-world study of habit automaticity, tracking 96 volunteers daily for 12 weeks.\n\nThe finding: automaticity followed an asymptotic curve. The average inflection point was 66 days — but the range was 18 to 254 days depending on habit complexity. Simple behaviors like 'drink water with lunch' formed fastest; physical behaviors took longest.\n\nCrucially, Lally's team found that missing a single day had no statistically significant effect on the automaticity trajectory. Perfection is not required. What drives the curve is accumulated repetitions. Each completion you rack up, including today's, moves the curve.",
    context_type: 'habit',
    context_value: 'new_habit',
    tags: ['automaticity', 'habit timeline', 'Lally study', 'consistency'],
  },
  {
    text: "Right now, your prefrontal cortex is doing the heavy lifting to execute this habit. But each repetition is training your basal ganglia to take over — and it runs habits for free, without touching your willpower. Future you will do this without thinking. Present you is making that possible.",
    extended_text: "The prefrontal cortex is the seat of executive function: deliberate attention, impulse inhibition, planning, and effortful decision-making. When you execute a new habit, the PFC does the heavy work: overriding inertia, selecting the behavior, monitoring execution. This is real cognitive effort.\n\nBut each time the PFC executes this sequence, it signals to the dorsolateral striatum that this sequence is worth automating. Over repetitions, the basal ganglia takes on progressively more of the execution load. Neuroimaging studies measure this as a literal decrease in PFC activation for the same task.\n\nThis transition is not just convenience — it's conservation. The PFC is freed for novel challenges, creativity, and decisions that actually require deliberation. You are building a future in which this habit costs you nothing. Every rep is a transfer payment to your future self.",
    context_type: 'habit',
    context_value: 'new_habit',
    tags: ['prefrontal cortex', 'basal ganglia', 'willpower', 'automaticity'],
  },
  {
    text: "Every time you complete this habit, you're casting a vote for a new identity. Neuroscience confirms that self-concept is a learned pattern stored in the brain — and it updates with evidence. Each completion shifts 'I'm trying to do this' toward 'this is who I am.'",
    extended_text: "Research in cognitive neuroscience shows the self-concept is not fixed — it's a continuously updated inference based on behavioral evidence. The medial prefrontal cortex, heavily implicated in self-referential processing, integrates behavioral history into self-representation. Repeated behaviors update this representation over time.\n\nWhen a behavior becomes identity-congruent ('I am someone who meditates'), the motivational calculus changes. The brain encodes it not just as a means to an end but as an expression of self. Research published in the Journal of Personality and Social Psychology found that identity framing increased adherence rates by approximately 32% compared to outcome framing.\n\nIdentity-consistent behaviors become self-reinforcing: each completion creates evidence for the identity, which makes the next completion feel mandatory rather than optional. The spiral works in your favor. You're mid-spiral right now.",
    context_type: 'habit',
    context_value: 'streak',
    tags: ['identity', 'self-concept', 'motivation', 'behavioral consistency'],
  },
  {
    text: "Every repetition wraps the relevant neural pathway in a little more myelin — a fatty insulating sheath that makes signals travel up to 100x faster. Think of it like upgrading from dial-up to fiber optic. Repetition is literally rewiring you.",
    extended_text: "Myelin is produced by oligodendrocyte cells and wraps around neuronal axons in concentric layers. Unmyelinated signals travel at roughly 1–2 meters per second. Heavily myelinated pathways carry signals at up to 120 meters per second — a 100-fold increase. This isn't metaphorical. This is the physical substrate of automaticity.\n\nMyelin production is activity-dependent. Pathways that fire together, wire together — and insulate together. The more a neural circuit is activated, the stronger the myelination signal. For habit formation, each repetition is a literal structural upgrade to the underlying brain circuit.\n\nThe pathway becomes faster, more reliable, and more resistant to interference. This is why established habits feel effortless compared to new ones — the hardware has physically improved. Today's session added another layer.",
    context_type: 'habit',
    context_value: 'streak',
    tags: ['myelin', 'neural pathways', 'repetition', 'speed', 'automaticity'],
  },
  {
    text: "Habits don't live in willpower — they live in context. Research shows behaviors performed in consistent environments become tightly linked to those cues through associative learning. Your brain doesn't decide to do the habit; it recognizes the setting and executes.",
    extended_text: "Wendy Wood at USC, one of the leading habit researchers globally, has shown that habits are fundamentally context-dependent: the basal ganglia encodes not just the behavioral sequence but the environmental cues that precede it, binding behavior to context through associative learning.\n\nA 2011 study by Wood found that students who transferred to new universities were significantly more likely to establish new habits and break old ones during the first weeks — before old cue-behavior associations could re-form.\n\nThe constructive implication: keeping your habit context consistent accelerates the cue-binding process. Same time, same place, same preceding action. Each repetition in consistent context tightens the associative link between that environment and behavioral execution. Eventually, walking into the space or starting the sequence becomes the trigger — not a decision. You're building that binding right now.",
    context_type: 'habit',
    context_value: 'streak',
    tags: ['context', 'cue', 'environmental design', 'associative learning'],
  },
  {
    text: "Regular behavioral habits physically change your brain's structure. A Harvard study found just 8 weeks of daily mindfulness practice measurably increased gray matter density in the prefrontal cortex and hippocampus. Your brain is not fixed hardware — it's living tissue that reshapes itself around what you practice.",
    extended_text: "Sara Lazar's landmark study at Harvard Medical School used structural MRI to compare long-term meditators with non-meditators and found significantly greater cortical thickness in the prefrontal cortex and right anterior insula in meditators. In an 8-week MBSR trial, Britta Hölzel's team found measurable increases in gray matter density in the hippocampus, posterior cingulate cortex, and cerebellum — alongside decreases in amygdala density associated with reduced stress reactivity.\n\nFor exercise habits, aerobic activity increases hippocampal volume by approximately 2% per year in older adults, directly countering typical age-related shrinkage. The mechanism involves BDNF (Brain-Derived Neurotrophic Factor), which exercise reliably upregulates.\n\nThese are not small effects and they are not metaphorical. Consistent behavioral habits produce macroscopic, measurable changes in brain tissue. The brain you have after a year of this habit will be structurally different from the one you have today — in demonstrably positive ways.",
    context_type: 'habit',
    context_value: 'established',
    tags: ['neuroplasticity', 'gray matter', 'brain structure', 'meditation', 'exercise'],
  },
  {
    text: "When a habit is new, your prefrontal cortex runs the show. With repetition, control transfers to the basal ganglia — which runs habits faster and at almost zero energy cost. That's why established habits don't feel like decisions. You're not choosing; your brain just executes.",
    extended_text: "Neuroimaging studies show an inverse relationship between habit strength and prefrontal cortex activation. When behaviors are new, the PFC is heavily engaged — planning, inhibitory control, deliberate decision-making. As repetition deepens, PFC activation decreases and control shifts to the dorsal striatum.\n\nThis handoff is the brain's efficiency mechanism. The PFC is metabolically expensive — it consumes glucose rapidly and is vulnerable to depletion. The basal ganglia runs patterns with minimal conscious overhead, like a master pianist playing a practiced piece without thought.\n\nHenry Yin and Barbara Knowlton's influential 2006 paper in Nature Reviews Neuroscience clarified this transition: the dorsomedial striatum governs goal-directed behavior; the dorsolateral striatum takes over in automaticity. The farther you push into repetition, the more the handoff completes. You're further along that transfer than you were yesterday.",
    context_type: 'habit',
    context_value: 'established',
    tags: ['prefrontal cortex', 'basal ganglia', 'automaticity', 'decision fatigue'],
  },
  {
    text: "When you're stressed, your brain defaults to the most deeply encoded habit it has. Stress hormones shift control toward the automatic basal ganglia. The more you practice this habit now, the more likely stress will trigger it — not derail it.",
    extended_text: "Research published in Neuron documents a striking phenomenon: acute stress shifts behavioral control from the hippocampus (flexible, goal-directed) toward the dorsal striatum and basal ganglia (automatic, stimulus-response). This is mediated by cortisol and catecholamines, which suppress hippocampal function and prime striatal circuits.\n\nThe effect is double-edged. For people with deeply encoded bad habits, stress increases relapse probability — those are the deepest neural grooves. But for people who have genuinely automatized healthy habits, the same stress-induced shift can work in their favor.\n\nResearch by Soares et al. suggests that thick, well-practiced habits become the brain's default under pressure. Completing this habit today, especially if it was hard, is directly building the depth of encoding in your basal ganglia. You're building armor into the system.",
    context_type: 'habit',
    context_value: 'struggle',
    tags: ['stress', 'habit relapse', 'resilience', 'basal ganglia'],
  },
  {
    text: "In Phillippa Lally's UCL study, missing a single day had no statistically significant effect on habit formation. The danger isn't missing a day — it's interpreting a miss as failure and quitting. You're back. That's what matters.",
    extended_text: "One of the most clinically significant findings from Lally's 2010 UCL study was not about average formation time, but about the effect of missed repetitions. When participants skipped a day and returned, their automaticity scores showed no statistically significant deviation from the predicted trajectory. The habit curve resumed from essentially where it had been.\n\nThis contradicts the all-or-nothing mental model many people apply to habits. The basal ganglia encodes habits through accumulated repetitions, and that encoding is not erased by gaps — it is more durable than that.\n\nWhat does derail habit formation is the cognitive response to a missed day: catastrophizing, abandoning the effort, or shifting identity toward 'I'm someone who can't stick to things.' The neurological harm of a lapse is minimal. The psychological response to the lapse is where the real risk lives. Returning — like right now — is the single most important thing. The curve is intact.",
    context_type: 'habit',
    context_value: 'struggle',
    tags: ['resilience', 'perfectionism', 'habit curve', 'self-compassion'],
  },
  {
    text: "Harvard researcher Teresa Amabile analyzed 12,000 daily work diary entries and found the single biggest driver of motivation isn't big breakthroughs — it's small, consistent progress. Your brain's reward system responds to forward momentum regardless of step size. Today counted.",
    extended_text: "Teresa Amabile and Steven Kramer's multi-year research project, published as 'The Progress Principle' (2011), analyzed over 12,000 daily diary entries from 238 professionals across 7 companies. Of all factors driving positive emotion and motivation, making progress in meaningful work was the most powerful — more than recognition, incentives, or interpersonal support.\n\nThe neurological mechanism: the dopamine system is sensitive to any positive delta — any forward movement. Each completed habit triggers a modest dopamine release that reinforces the behavior and signals to the prefrontal cortex that the action was worthwhile.\n\nThe compounding effect is real: people who made incremental progress were three times more likely to report elevated motivation the following day. Momentum is neurologically sticky. Today's completion is not a minor event — it's a brick in a motivational flywheel that gets heavier and easier to spin with each addition.",
    context_type: 'habit',
    context_value: 'new_habit',
    tags: ['small wins', 'dopamine', 'progress', 'momentum'],
  },
];
