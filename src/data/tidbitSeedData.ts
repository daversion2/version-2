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
  // HABIT — shown after PRACTICE completions (the override / discomfort frame).
  // These celebrate strengthening the override, not making the practice
  // automatic. context_value: 'generic' | 'new_habit' | 'streak' | 'established' | 'struggle'
  // ============================================================================

  // --- generic ---
  {
    text: "The moment you wanted to stop and didn't, your anterior cingulate cortex lit up — the brain region that tracks effort and drives you through resistance. That's the rep that counts. Not the doing. The overriding.",
    extended_text: "The anterior cingulate cortex (ACC) is one of the brain's core hubs for effortful self-control. It monitors the conflict between what you feel like doing and what you intend to do, and recruits the prefrontal cortex to push through. Neuroimaging consistently shows ACC activation spiking precisely at the moment of resistance — when quitting is the easy option and you choose otherwise.\n\nWhat matters is that this is trainable. Studies of effort-based decision-making find that repeatedly choosing the harder path recalibrates how the brain weighs effort: the same challenge registers as less aversive over time. You're not building something that runs itself — you're building the capacity to override, on demand.\n\nThe discomfort you pushed through wasn't a side effect. It was the training stimulus.",
    context_type: 'habit',
    context_value: 'generic',
    tags: ['anterior cingulate cortex', 'effort', 'override', 'self-control'],
  },
  {
    text: "Finishing matters more than starting. Your brain stamps a completed effort differently than an abandoned one — the follow-through is what tells it 'we do hard things and we see them through.' You just cast that vote the right way.",
    extended_text: "Behavioral neuroscience shows the brain marks the boundaries of a completed action — firing distinctly at initiation and again at completion — and that disrupting the end-of-sequence signal impairs how well the experience is consolidated. In plain terms: how you finish shapes what your brain keeps.\n\nThere's a self-signaling dimension too. Following through on something you wanted to quit provides direct behavioral evidence about the kind of person you are — evidence your brain uses to update its model of you. Bailing partway sends the opposite signal.\n\nThis is why the last, hardest stretch — the part after you already wanted to stop — counts most. You didn't just do the practice. You proved you finish.",
    context_type: 'habit',
    context_value: 'generic',
    tags: ['completion', 'follow-through', 'self-signaling', 'consolidation'],
  },
  {
    text: "Tonight, while you sleep, your brain replays what you did today and locks it in. You didn't just get through a hard practice — you gave your sleeping brain something worth keeping. Rest is where today's effort becomes tomorrow's capacity.",
    extended_text: "Memory consolidation during sleep is one of the most robust findings in neuroscience. The brain doesn't store the day passively — during deep non-REM sleep it actively replays the neural patterns from your waking hours, transferring them into more durable storage.\n\nThis applies to the skills of self-regulation as much as to facts or motor sequences. The prefrontal and interoceptive circuits you engaged by pushing through discomfort get rehearsed offline, stabilizing the gains. Sleep deprivation measurably degrades both emotional regulation and the consolidation of effortful learning.\n\nSo the work isn't finished when you finish. You did the hard part today; your brain does the filing tonight. Protect your sleep and you protect the adaptation you just earned.",
    context_type: 'habit',
    context_value: 'generic',
    tags: ['sleep', 'memory consolidation', 'recovery', 'self-regulation'],
  },

  // --- new_habit (early reps) ---
  {
    text: "Dopamine doesn't just reward the finish — it tracks the effort it took to get there. Push through hard things enough times and your brain starts assigning value to the difficulty itself. You're teaching yourself to find the hard thing worth doing.",
    extended_text: "Dopamine is a motivation and learning signal, not simply a pleasure chemical. Research on effort-based reward shows the brain computes the value of an outcome relative to the effort spent — and that this valuation is plastic.\n\nThere's a phenomenon called 'learned industriousness': when effort is reliably paired with reward, effort itself begins to acquire reward value. Animals and people trained on high-effort tasks will subsequently choose harder options even when easier ones are available.\n\nThis is the opposite of the comfort spiral. Every time you complete something you found genuinely hard, you nudge your reward system to stop treating difficulty as something to avoid — and start treating it as a signal of something worth doing.",
    context_type: 'habit',
    context_value: 'new_habit',
    tags: ['dopamine', 'effort', 'reward valuation', 'learned industriousness'],
  },
  {
    text: "Every time you override the pull to quit, your prefrontal cortex — the brain's command center for self-control — does a real rep. Like a muscle, it doesn't get to coast; it gets stronger under load. Today you added load.",
    extended_text: "The prefrontal cortex (PFC) governs impulse control, planning, and the ability to act against immediate urges. Unlike habits, which the brain tries to offload to automatic circuitry, deliberate self-control keeps the PFC actively engaged — and that engagement is what builds it.\n\nStudies on self-control training show that repeatedly exercising restraint can improve regulatory capacity more broadly, with the effect tracking changes in prefrontal function. The PFC is metabolically expensive precisely because it's doing hard work — and hard work, applied consistently, is what strengthens neural systems.\n\nThe goal isn't to make the practice effortless. It's to make you stronger than the resistance. Each override is a rep for the part of your brain that chooses the hard right over the easy wrong.",
    context_type: 'habit',
    context_value: 'new_habit',
    tags: ['prefrontal cortex', 'self-control', 'override', 'training'],
  },
  {
    text: "There's no magic number of reps that flips a switch. Building a harder version of yourself follows a curve, not a finish line — and research shows missing a single day doesn't set you back. What moves the curve is accumulated reps. You just added one.",
    extended_text: "The '21 days to a habit' figure is a myth with no scientific basis. The first rigorous real-world study, by Phillippa Lally at University College London, tracked 96 people for 12 weeks and found capacity built along a gradual curve averaging 66 days — with a huge range (18 to 254) depending on difficulty. Harder behaviors took longer.\n\nTwo findings matter here. First, there's no threshold you cross into 'done' — capacity accrues continuously with reps. Second, missing a single day produced no statistically significant dip in the trajectory. Perfection isn't the mechanism; accumulation is.\n\nWhat actually derails people isn't the missed day — it's quitting after it. Treat this as a training curve you're steadily climbing, and every rep, including today's, counts toward the total.",
    context_type: 'habit',
    context_value: 'new_habit',
    tags: ['consistency', 'training curve', 'Lally study', 'anti-perfectionism'],
  },
  {
    text: "Harvard researcher Teresa Amabile analyzed 12,000 daily work diary entries and found the single biggest driver of motivation isn't big breakthroughs — it's small, consistent progress. Your brain's reward system responds to forward momentum regardless of step size. Today counted.",
    extended_text: "Teresa Amabile and Steven Kramer's multi-year research project, published as 'The Progress Principle' (2011), analyzed over 12,000 daily diary entries from 238 professionals across 7 companies. Of all factors driving positive emotion and motivation, making progress in meaningful work was the most powerful — more than recognition, incentives, or interpersonal support.\n\nThe neurological mechanism: the dopamine system is sensitive to any positive delta — any forward movement. Each completed rep triggers a modest dopamine release that reinforces the behavior and signals to the prefrontal cortex that the action was worthwhile.\n\nThe compounding effect is real: people who made incremental progress were three times more likely to report elevated motivation the following day. Momentum is neurologically sticky. Today's completion is not a minor event — it's a brick in a motivational flywheel that gets heavier and easier to spin with each addition.",
    context_type: 'habit',
    context_value: 'new_habit',
    tags: ['small wins', 'dopamine', 'progress', 'momentum'],
  },

  // --- streak ---
  {
    text: "Every time you complete this practice, you're casting a vote for a new identity. Neuroscience confirms that self-concept is a learned pattern stored in the brain — and it updates with evidence. Each completion shifts 'I'm trying to do this' toward 'this is who I am.'",
    extended_text: "Research in cognitive neuroscience shows the self-concept is not fixed — it's a continuously updated inference based on behavioral evidence. The medial prefrontal cortex, heavily implicated in self-referential processing, integrates behavioral history into self-representation. Repeated behaviors update this representation over time.\n\nWhen a behavior becomes identity-congruent ('I am someone who does hard things'), the motivational calculus changes. The brain encodes it not just as a means to an end but as an expression of self. Research published in the Journal of Personality and Social Psychology found that identity framing increased adherence rates by approximately 32% compared to outcome framing.\n\nIdentity-consistent behaviors become self-reinforcing: each completion creates evidence for the identity, which makes the next completion feel mandatory rather than optional. The spiral works in your favor. You're mid-spiral right now.",
    context_type: 'habit',
    context_value: 'streak',
    tags: ['identity', 'self-concept', 'motivation', 'behavioral consistency'],
  },
  {
    text: "Do hard things on purpose often enough and your baseline moves. What felt brutal a week ago starts to register as merely uncomfortable. You're not just getting through it — you're raising your tolerance for discomfort itself.",
    extended_text: "Distress tolerance — the capacity to withstand uncomfortable internal states without escaping them — behaves like a trainable trait. Repeated, voluntary exposure to manageable discomfort (cold, effort, hunger, stillness, boredom) recalibrates how the brain appraises that discomfort.\n\nThis is hormesis: a controlled stressor that triggers adaptation, leaving the system more resilient than before. The subjective read-out is a shifting baseline — the same stimulus that once felt overwhelming feels ordinary, because your reference point has moved.\n\nThe Stoics called it voluntary hardship; modern research calls it stress inoculation. The mechanism is the same: you expand your range by repeatedly, deliberately operating near its edge. This streak isn't making the practice automatic — it's making you harder to rattle.",
    context_type: 'habit',
    context_value: 'streak',
    tags: ['distress tolerance', 'hormesis', 'baseline shift', 'resilience'],
  },
  {
    text: "The urge to quit isn't a command — it's a wave. It rises, peaks, and passes whether or not you act on it. Every time you ride one out instead of obeying it, you prove to your brain the wave can't actually make you do anything.",
    extended_text: "Urges to escape discomfort follow a predictable arc: they build, crest, and subside, often within minutes if not fed. The trouble is that in the moment they feel permanent and coercive. Learning — experientially, not just intellectually — that they're temporary is what breaks their grip.\n\nThis is the principle behind 'urge surfing,' developed in addiction research by Alan Marlatt: rather than fighting or obeying an urge, you observe it as a passing internal event. Functionally, this strengthens the prefrontal regions that regulate limbic reactivity and weakens the automatic link between feeling an urge and acting on it.\n\nEach time you sit through the pull to stop and it passes anyway, you collect first-hand evidence that discomfort is survivable and urges are not orders. That evidence is what makes the next one easier to hold.",
    context_type: 'habit',
    context_value: 'streak',
    tags: ['urge surfing', 'impulse control', 'discomfort', 'limbic regulation'],
  },

  // --- established ---
  {
    text: "Regular practice physically changes your brain's structure. A Harvard study found just 8 weeks of daily mindfulness practice measurably increased gray matter density in the prefrontal cortex and hippocampus. Your brain is not fixed hardware — it's living tissue that reshapes itself around what you practice.",
    extended_text: "Sara Lazar's landmark study at Harvard Medical School used structural MRI to compare long-term meditators with non-meditators and found significantly greater cortical thickness in the prefrontal cortex and right anterior insula in meditators. In an 8-week MBSR trial, Britta Hölzel's team found measurable increases in gray matter density in the hippocampus, posterior cingulate cortex, and cerebellum — alongside decreases in amygdala density associated with reduced stress reactivity.\n\nFor exercise, aerobic activity increases hippocampal volume by approximately 2% per year in older adults, directly countering typical age-related shrinkage. The mechanism involves BDNF (Brain-Derived Neurotrophic Factor), which exercise reliably upregulates.\n\nThese are not small effects and they are not metaphorical. Consistent practice produces macroscopic, measurable changes in brain tissue. The brain you have after a year of this will be structurally different from the one you have today — in demonstrably positive ways.",
    context_type: 'habit',
    context_value: 'established',
    tags: ['neuroplasticity', 'gray matter', 'brain structure', 'meditation', 'exercise'],
  },
  {
    text: "Keep choosing discomfort and your amygdala — the brain's alarm system — turns down its own volume. People who practice voluntary hardship show a threat detector that fires less and recovers faster. You're not numbing out. You're becoming harder to alarm.",
    extended_text: "The amygdala drives the fight-or-flight response and the felt sense of 'get me out of here.' Chronic avoidance keeps it sensitized; controlled, repeated exposure to manageable stress does the opposite. Studies of experienced meditators and long-term stress-exposure protocols show reduced amygdala reactivity — and in some cases reduced amygdala gray-matter density — alongside stronger prefrontal regulation of it.\n\nThis is the neural signature of equanimity: not the absence of stress, but a faster return to baseline after it. The alarm still works when it needs to — it just stops firing over things that aren't actually threats, like cold water, a hard set, or an uncomfortable silence.\n\nAt this point in your practice, the change is structural. You've done enough reps teaching your brain that discomfort isn't danger that it's started to believe you.",
    context_type: 'habit',
    context_value: 'established',
    tags: ['amygdala', 'threat reactivity', 'equanimity', 'neuroplasticity'],
  },

  // --- struggle (returning / rated hard) ---
  {
    text: "Practicing discomfort when you don't have to is how you stay steady when you do. Every voluntary hard thing is a controlled dose of stress your brain learns to handle — so when real pressure hits, it's familiar territory, not a threat.",
    extended_text: "Stress inoculation is a well-supported principle: controlled, manageable exposure to a stressor builds tolerance to larger doses later, much as a vaccine primes the immune system. Voluntarily chosen hardship — cold, effort, hunger, discomfort you could have avoided — is a dose you administer to yourself on purpose.\n\nThe adaptation is physiological. Repeated controlled stress improves regulation of the HPA axis (the body's stress-hormone system) and strengthens prefrontal control over the amygdala, so the stress response fires more appropriately and recovers faster. People with a history of manageable, self-directed challenge tend to show steadier responses to novel stress.\n\nThis is why the hard practice you almost skipped matters most on the hard days. You're not just getting through today — you're widening the band of what you can stay calm inside of.",
    context_type: 'habit',
    context_value: 'struggle',
    tags: ['stress inoculation', 'resilience', 'HPA axis', 'voluntary hardship'],
  },
  {
    text: "In Phillippa Lally's UCL study, missing a single day had no statistically significant effect on the curve. The danger isn't missing a day — it's interpreting a miss as failure and quitting. You're back. That's what matters.",
    extended_text: "One of the most significant findings from Lally's 2010 UCL study was not about average formation time, but about the effect of missed repetitions. When participants skipped a day and returned, their scores showed no statistically significant deviation from the predicted trajectory. The curve resumed from essentially where it had been.\n\nThis contradicts the all-or-nothing mental model many people apply to themselves. Capacity is built through accumulated repetitions, and that accumulation is not erased by gaps — it is more durable than that.\n\nWhat does derail progress is the cognitive response to a missed day: catastrophizing, abandoning the effort, or shifting identity toward 'I'm someone who can't stick to things.' The harm of a lapse is minimal. The psychological response to the lapse is where the real risk lives. Returning — like right now — is the single most important thing. The curve is intact.",
    context_type: 'habit',
    context_value: 'struggle',
    tags: ['resilience', 'perfectionism', 'comeback', 'self-compassion'],
  },
];
