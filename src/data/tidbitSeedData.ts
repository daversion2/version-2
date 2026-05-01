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
];
