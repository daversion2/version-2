// Type-only: practices.ts imports withScience() back from here as a value, so
// this side must stay erasable or the two modules would cycle at runtime.
import type { HabitDefinition } from './practices';

// =============================================================================
// HABIT SCIENCE — the "what this does to your brain" content (D4).
//
// Kept as an overlay keyed by habit id rather than inlined into the library
// entries, so content can be reviewed, edited and extended independently of the
// habit structure. Merged into the catalog in data/practices.ts.
//
// CITATION POLICY — read before adding an entry:
// A `research` entry means a real, checkable study. Every one below was looked
// up rather than recalled. Where a mechanism is well established but a specific
// study was NOT verified, the entry ships `science` prose and NO research array.
// An unsourced claim is acceptable; a fabricated citation in a health app is not.
//
// Deliberately omitted: the "brain drain" smartphone study (Ward et al. 2017) is
// widely quoted but FAILED TO REPLICATE (Ruiz Pardo & Minda 2022), so the
// phone-related habits below argue from attention residue and cue exposure
// instead of citing it.
// =============================================================================

/** The content fields a habit can carry. */
export type HabitScienceEntry = Pick<
  HabitDefinition,
  'whyItWorks' | 'science' | 'research' | 'tips' | 'minimumVersion'
>;

export const HABIT_SCIENCE: Record<string, HabitScienceEntry> = {
  // ─── Sleep & circadian ────────────────────────────────────────────────────
  'consistent-bedtime': {
    whyItWorks:
      'Regularity beats duration. The consistency of your sleep timing predicts health outcomes better than how many hours you get.',
    science:
      'Your circadian clock is entrained by repetition, not by intention. Going to bed at wildly different times each night keeps the clock permanently resetting, which degrades sleep quality even when total hours look fine on paper. Holding a consistent window lets melatonin onset stabilise, so you fall asleep faster and wake at a predictable point in the cycle rather than mid-deep-sleep.',
    research: [
      {
        finding:
          'Across 60,977 UK Biobank participants and 10 million hours of accelerometer data, sleep REGULARITY predicted all-cause mortality more strongly than sleep duration did — the most regular sleepers had 20–48% lower risk than the least regular.',
        source: 'Windred et al., 2023 — SLEEP (Oxford Academic)',
        url: 'https://academic.oup.com/sleep/article/47/1/zsad253/7280269',
      },
    ],
    tips: [
      'Pick the wake time first and work backward — it anchors more reliably than bedtime.',
      'A consistent window matters more than a perfect one. Same hour beats ideal hour.',
    ],
  },
  'wind-down': {
    whyItWorks:
      'Sleep onset is a descent, not a switch. A screen-free buffer gives the descent somewhere to start.',
    science:
      'Falling asleep requires sympathetic arousal to drop and core temperature to fall. Interactive, notification-bearing screens work against both: they hold attention actively rather than letting it drift, and each notification is a small arousal spike. The buffer matters less for the light than for the engagement — a book at the same brightness does not keep the mind in a responsive, anticipatory state the way a feed does.',
    tips: [
      'Charge the phone outside the bedroom — willpower at midnight is not a plan.',
      'Anything low-stakes works: reading, stretching, tidying. It only has to be non-interactive.',
    ],
  },
  'trad-wake-early': {
    whyItWorks:
      'An early, fixed wake time is the single strongest lever on the whole circadian system.',
    science:
      'Wake time anchors the clock more firmly than bedtime, because light exposure on waking is the dominant entrainment signal. Fixing the wake time drags sleep onset earlier within a week or two without needing to force it directly — which is why "just go to bed earlier" usually fails and "get up at the same time" usually works.',
    tips: ['Hold the wake time on weekends too — that is where most drift comes from.'],
  },
  'no-snooze': {
    whyItWorks:
      'Snoozing restarts a sleep cycle you do not have time to finish, which is why the second waking feels worse than the first.',
    science:
      'The alarm typically catches you in light sleep. Snoozing pushes you back toward a deeper stage, so the next alarm interrupts a descent rather than a natural surfacing — the grogginess of sleep inertia is stronger, not weaker. Standing up also breaks the state directly: upright posture and light exposure both suppress melatonin faster than lying still does.',
    tips: ['Put the alarm across the room. The decision then makes itself.'],
  },
  'morning-daylight': {
    whyItWorks:
      'Morning light is the timing signal your whole day runs on. It sets when you will get sleepy tonight.',
    science:
      'Specialised retinal cells (intrinsically photosensitive ganglion cells) report ambient light directly to the suprachiasmatic nucleus, the body\'s master clock. Bright light early advances the clock, pulling melatonin onset earlier that evening; the same light late does the opposite. Outdoor light is the point — an overcast morning still delivers many times the intensity of indoor lighting.',
    tips: [
      'Outside beats a window; glass cuts the intensity substantially.',
      'Ten minutes is plenty on a bright day. Longer on a grey one.',
    ],
  },

  // ─── Movement ─────────────────────────────────────────────────────────────
  'trad-10k-steps': {
    whyItWorks:
      'The benefit curve starts far below 10,000 and rises steeply at the bottom — the first few thousand steps do most of the work.',
    science:
      'Step count is a proxy for total daily movement, which drives cardiovascular fitness, glucose handling and cerebral blood flow. The dose-response curve is steepest at the low end and flattens well before 10,000, so moving from sedentary to modestly active buys far more than grinding from 8,000 to 10,000. The 10,000 figure itself is not a research finding — it came from a 1960s Japanese pedometer marketing campaign.',
    research: [
      {
        finding:
          'Meta-analysis of 15 international cohorts: risk of death fell progressively up to about 6,000–8,000 steps/day for adults over 60, and 8,000–10,000 for adults under 60 — then plateaued.',
        source: 'Paluch et al., 2022 — The Lancet Public Health',
        url: 'https://www.thelancet.com/journals/lanpub/article/PIIS2468-2667(21)00302-9/fulltext',
      },
      {
        finding:
          'A 2023 dose-response meta-analysis found a measurable mortality benefit beginning around 3,867 steps/day, with each additional 1,000 steps associated with a further 15% reduction in all-cause mortality.',
        source: 'Banach et al., 2023 — European Journal of Preventive Cardiology',
        url: 'https://academic.oup.com/eurjpc/article/30/18/1975/7226309',
      },
    ],
    tips: ['A target you hit most days beats a target you hit twice a month.'],
  },
  'trad-stretch': {
    whyItWorks:
      'Most of an early flexibility gain is nervous-system tolerance, not tissue length.',
    science:
      'Range of motion is limited as much by protective reflex as by tissue. Regular stretching raises the threshold at which the stretch reflex fires, so the same position stops registering as a threat — which is why gains appear faster than any structural change could explain, and why they fade when you stop.',
    tips: ['Frequency beats duration. Short and daily outperforms long and occasional.'],
  },

  // ─── Attention & focus ────────────────────────────────────────────────────
  'deep-focus-session': {
    whyItWorks:
      'Switching tasks leaves residue. A protected block is worth more than the sum of its interrupted minutes.',
    science:
      'When you switch away from a task, part of your attention stays with the previous one — attention residue — so the first minutes after every interruption run at reduced capacity. A single protected block avoids paying that cost repeatedly. The cost is not the interruption\'s duration; it is the re-entry.',
    tips: [
      'Remove the cue, not just the app. A visible phone is a recurring decision.',
      'One block done properly beats three blocks defended half-heartedly.',
    ],
  },
  'phone-free-first-hour': {
    whyItWorks:
      'What you do first sets the mode you spend the morning in — reactive or directed.',
    science:
      'Opening a feed first thing loads a queue of other people\'s priorities before you have set your own, and starts the day in a responsive posture. The habit is less about the hour than about the ordering: doing one self-directed thing before the first inbound demand changes which mode the rest of the morning inherits.',
    tips: ['Decide the night before what the first thing is, so the morning has no decision in it.'],
  },
  'protect-attention': {
    whyItWorks:
      'Variable rewards are the most habit-forming schedule there is, which is exactly what a feed delivers.',
    science:
      'Feeds are built on variable-ratio reinforcement — an unpredictable payoff per check. That schedule produces more persistent checking behaviour than a predictable reward would, because the uncertainty itself drives the dopaminergic anticipation. Removing the opportunity for a window is far more effective than trying to resist it in the moment, because the urge is cue-driven.',
    tips: ['Delete the app for the window rather than relying on resisting the icon.'],
  },
  'trad-limit-screens': {
    whyItWorks:
      'The number matters less than which hours you protect.',
    science:
      'Total screen time is a weak measure — an hour of video calls with family is not an hour of doomscrolling. What reliably matters is displacement: hours that would otherwise have gone to sleep, movement or in-person contact. Capping the total is a blunt proxy for protecting those three.',
    tips: ['Protect the hour before bed first. It buys the most for the least effort.'],
  },
  'inbox-after-focus': {
    whyItWorks:
      'Email is other people\'s agenda. Doing it first spends your sharpest hours on it.',
    science:
      'Cognitive performance for demanding, self-directed work is generally best earlier in the waking day, before decision load accumulates. Email is reactive and low-load by comparison — it is the work most tolerant of a tired brain, which makes it exactly the wrong thing to spend a fresh one on.',
    tips: ['Leave the client closed rather than open-but-ignored. The badge is the cue.'],
  },

  // ─── Mind ─────────────────────────────────────────────────────────────────
  'note-one-good-thing': {
    whyItWorks:
      'Attention is trainable. Deliberately looking for one good thing biases what you notice by default.',
    science:
      'The brain preferentially encodes threat and negative outcomes — useful for survival, costly for mood. Deliberately searching for something positive is a directed-attention exercise: it does not deny the negative, it competes for the same limited notice. Repeated, the search itself becomes more automatic.',
    research: [
      {
        finding:
          'In randomised studies, participants who kept a weekly gratitude list reported better wellbeing, fewer physical symptoms, more optimism about the coming week, and exercised more than those who listed hassles or neutral events.',
        source: 'Emmons & McCullough, 2003 — Journal of Personality and Social Psychology',
        url: 'https://pubmed.ncbi.nlm.nih.gov/12585811/',
      },
    ],
    tips: ['Specific beats general. "The coffee was good" outperforms "my health".'],
  },
  'trad-gratitude': {
    whyItWorks:
      'One of the most reliably replicated interventions in the wellbeing literature, and among the cheapest.',
    science:
      'Gratitude practice works by shifting the comparison point. Most dissatisfaction comes from measuring what you have against what you expected; naming what you already have moves the reference downward, which changes the felt gap without changing circumstances.',
    research: [
      {
        finding:
          'Across three experiments, gratitude-listing groups showed heightened wellbeing on multiple measures relative to hassle-listing and neutral-event controls.',
        source: 'Emmons & McCullough, 2003 — Journal of Personality and Social Psychology',
        url: 'https://pubmed.ncbi.nlm.nih.gov/12585811/',
      },
    ],
    tips: ['Weekly can outperform daily — done every day it habituates and stops landing.'],
  },
  'trad-journal': {
    whyItWorks:
      'Putting a feeling into words reduces its intensity. Naming is itself regulation.',
    science:
      'Translating an emotional state into language ("affect labelling") is associated with reduced amygdala reactivity and increased prefrontal engagement — the act of describing what you feel appears to partially regulate it. Writing also converts a looping, unstructured worry into a fixed, finite object, which is why the same problem often feels smaller on the page than in the head.',
    tips: ['Write badly and quickly. Editing turns regulation back into rumination.'],
  },
  'plan-tomorrow': {
    whyItWorks:
      'Deciding in advance is the difference between an intention and a plan that actually fires.',
    science:
      'Specifying when and where you will do something — an implementation intention — links the action to a concrete cue, so initiation stops depending on motivation at the moment of truth. This is one of the better-evidenced findings in behaviour change.',
    research: [
      {
        finding:
          'A meta-analysis of 94 independent tests covering more than 8,000 participants found implementation intentions had a medium-to-large effect on goal attainment (d = 0.65).',
        source: 'Gollwitzer & Sheeran, 2006 — Advances in Experimental Social Psychology',
        url: 'https://www.sciencedirect.com/science/chapter/bookseries/abs/pii/S0065260106380021',
      },
    ],
    tips: ['One priority, not a list. A list is a way of not choosing.'],
  },
  'trad-todo-list': {
    whyItWorks:
      'An unfinished task holds attention until it is written down somewhere trusted.',
    science:
      'Open loops occupy working memory — the mind keeps re-surfacing them precisely because they are unresolved. Externalising them into a system you trust releases that hold, which is why writing a list often reduces anxiety before any item is actually done.',
    tips: ['Capture everything, then pick three. Capture and prioritise are different jobs.'],
  },

  // ─── Food & drink ─────────────────────────────────────────────────────────
  'trad-drink-water': {
    whyItWorks:
      'Mild dehydration shows up as mood and concentration changes well before you feel thirsty.',
    science:
      'Losing even 1–2% of body water is associated with measurable declines in mood, alertness and sustained attention. Thirst lags behind that threshold, so the first signal most people notice is a headache or an afternoon slump rather than an urge to drink.',
    tips: ['Anchor it to something you already do — every coffee, every meal.'],
  },
  'water-only': {
    whyItWorks:
      'Liquid calories are the easiest ones to consume without noticing and the least satiating per calorie.',
    science:
      'Drinks high in sugar deliver a rapid glucose load with little of the satiety signalling that solid food produces, so they add intake without displacing it. Cutting to water removes the largest source of accidental calories for most people without requiring any judgement about food.',
    tips: ['Sparkling water covers the ritual, which is often what is actually missed.'],
  },
  'trad-eat-vegetables': {
    whyItWorks:
      'Fibre feeds the gut microbiome, which is in constant chemical conversation with the brain.',
    science:
      'Gut bacteria ferment dietary fibre into short-chain fatty acids that influence inflammation and gut barrier integrity, and the gut communicates with the brain via the vagus nerve and immune signalling. Diversity of plants matters more than quantity of any single one.',
    tips: ['Aim for variety across the week rather than volume in a day.'],
  },
  'trad-no-sugar': {
    whyItWorks:
      'The crash is the problem more than the spike. Sharp glucose swings drive the next craving.',
    science:
      'A rapid glucose rise triggers a large insulin response, which can overshoot and leave blood sugar lower than baseline. That trough is experienced as hunger, irritability and low energy — and it is most efficiently resolved by more sugar, which is the loop that makes the habit self-sustaining.',
    tips: ['Protein and fat alongside anything sweet blunts the swing considerably.'],
  },
  'cook-real-meal': {
    whyItWorks:
      'Cooking changes what you eat mostly by changing what is convenient.',
    science:
      'Food choice is dominated by availability and effort far more than by knowledge or intent. Cooking shifts the default: the low-effort option becomes the one you made rather than the one that was engineered to be maximally palatable. Ultra-processed foods are formulated to be easy to overconsume; home cooking is not.',
    tips: ['Cook once, eat twice. Leftovers are the whole point.'],
  },
  'trad-take-vitamins': {
    whyItWorks:
      'Useful for correcting an actual deficiency, and largely inert without one.',
    science:
      'Supplementation reliably helps where a genuine shortfall exists — vitamin D in low-sunlight latitudes and winters is the common case. Absent a deficiency, evidence for broad supplementation improving outcomes in otherwise healthy adults is weak. This is a habit worth basing on a blood test rather than a guess.',
    tips: ['Worth testing rather than assuming. Fat-soluble vitamins can accumulate.'],
  },

  // ─── Money ────────────────────────────────────────────────────────────────
  'check-the-numbers': {
    whyItWorks:
      'Avoidance is the expensive part. The looking is almost always less bad than the not-looking.',
    science:
      'Financial avoidance is a textbook anxiety loop: not looking reduces discomfort immediately, which reinforces not looking, while the underlying problem compounds. Deliberate, scheduled exposure breaks the reinforcement — the relief of having looked is what eventually replaces the dread.',
    tips: ['Schedule it. Deciding to look when you feel like it means never.'],
  },
  'log-the-spend': {
    whyItWorks:
      'Measuring a behaviour changes it, before you attempt any deliberate control.',
    science:
      'Self-monitoring is independently effective in behaviour change: the act of recording makes an automatic behaviour conscious at the moment it happens. For spending, most leakage is not decided so much as drifted into, and a log converts each drift into a decision.',
    tips: ['Log at the moment of spending. Reconstructing at week\'s end misses exactly what you want to see.'],
  },
  'pay-myself-first': {
    whyItWorks:
      'Automation beats discipline. The best financial habit is one that requires no ongoing decision.',
    science:
      'Saving what is left at month end fails because it competes with every spending impulse in between. Moving money first makes saving the default and spending the constrained choice — the same amount, but with the willpower requirement removed from the loop entirely.',
    tips: ['Automate the transfer for payday. A habit that runs itself cannot be skipped.'],
  },

  // ─── Connection ───────────────────────────────────────────────────────────
  'reach-out': {
    whyItWorks:
      'People consistently underestimate how much a small message is appreciated.',
    science:
      'Research on social connection finds a robust asymmetry: senders systematically underestimate how positively a check-in or note of appreciation lands. That misprediction is itself the barrier — the reason not to send is usually a wrong forecast about the reception.',
    tips: ['Short and specific. Length is not what makes it land.'],
  },
  'make-the-call': {
    whyItWorks:
      'Voice carries information text cannot, and predicts connection better than convenience does.',
    science:
      'Vocal tone conveys emotional state with a bandwidth plain text lacks, and synchronous conversation allows repair and responsiveness in real time. People routinely expect a call to be more awkward than it turns out to be, and underestimate how much more connected they will feel afterward.',
    tips: ['Call while walking or driving — it removes the sense of it being an event.'],
  },
  'phone-free-dinner': {
    whyItWorks:
      'A visible phone measurably reduces the perceived quality of a conversation, even unused.',
    science:
      'A phone on the table signals divided availability: it marks the possibility of interruption, which shapes how much either party invests in the exchange. The effect operates through what the object signals about attention, not through any active use of it.',
    tips: ['Face-down is not enough. Out of sight is the intervention.'],
  },

  // ─── Home & self-care ─────────────────────────────────────────────────────
  'trad-make-bed': {
    whyItWorks:
      'A small completed action early creates evidence that the day is being run rather than endured.',
    science:
      'The mechanism here is self-perception rather than anything neurochemical: you infer what kind of day you are having partly from your own behaviour. One finished thing before the day makes demands provides early evidence in the direction you want, and the environmental change is a persistent reminder of it.',
    tips: ['Thirty seconds is enough. Perfection defeats the purpose.'],
  },
  'trad-tidy': {
    whyItWorks:
      'Visual clutter competes for attention whether or not you are consciously attending to it.',
    science:
      'Competing visual stimuli in a workspace draw attentional resources, and unfinished physical tasks act as environmental reminders of open loops. Clearing the space reduces both, which is why a tidy desk often feels like it improves focus more than the time spent tidying should justify.',
    tips: ['Set a timer for ten minutes. Tidying expands to fill whatever it is given.'],
  },
  'trad-floss': {
    whyItWorks:
      'Oral inflammation does not stay in the mouth.',
    science:
      'Periodontal disease is a chronic inflammatory condition, and chronic inflammation is consistently associated with cardiovascular disease. The direction of causation is still debated — shared risk factors explain part of the association — so this is best understood as a well-supported correlation rather than a settled causal chain.',
    tips: ['Attach it to brushing. A habit with no anchor is a habit you will forget.'],
  },
  'trad-skincare': {
    whyItWorks:
      'Sunscreen is the part with the strongest evidence behind it, by a wide margin.',
    science:
      'UV exposure is the dominant driver of skin ageing and the principal modifiable risk factor for skin cancer. Daily broad-spectrum sunscreen has good trial evidence for reducing photoageing; most other steps in a routine have considerably weaker support.',
    tips: ['If only one step survives, make it sunscreen.'],
  },

  // ─── Learning ─────────────────────────────────────────────────────────────
  'trad-read': {
    whyItWorks:
      'Sustained reading trains a capacity for long-form attention that skimming actively erodes.',
    science:
      'Deep reading engages sustained attention and working memory in a way fragmented browsing does not. The relevant contrast is not reading versus nothing, but reading versus a mode of consumption that trains the opposite skill — rapid switching between short, novel stimuli.',
    tips: ['A physical book removes the device that interrupts you.'],
  },
  'trad-learn-language': {
    whyItWorks:
      'Spacing and retrieval matter far more than time spent. Short and daily beats long and weekly.',
    science:
      'Two of the most robust findings in learning research apply directly here: material reviewed at spaced intervals is retained substantially better than the same total time massed together, and actively retrieving something is far more effective than re-reading it. Fifteen daily minutes of recall outperforms two passive hours on a Sunday.',
    tips: ['Test yourself rather than review. Retrieval is where the learning happens.'],
  },
  'trad-learn-skill': {
    whyItWorks:
      'Repetition alone plateaus. Working at the edge of your ability is what keeps producing change.',
    science:
      'Deliberate practice targets the specific edge of current ability with immediate feedback, rather than comfortably rehearsing what is already fluent. Time spent inside your existing competence maintains it; time spent just beyond it is what extends it — which is also why productive practice feels harder than unproductive practice.',
    tips: ['Practise the part you are worst at. It is the least enjoyable and the most useful.'],
  },
};

/**
 * Habits with no entry above yet. Tracked explicitly so the gap is visible in
 * code review rather than discovered on a bare detail screen.
 */
export const HABITS_AWAITING_SCIENCE: string[] = [];

/** Merge the science overlay onto a definition. Overlay fields win where set. */
export const withScience = (def: HabitDefinition): HabitDefinition => {
  const entry = HABIT_SCIENCE[def.id];
  if (!entry) return def;
  return {
    ...def,
    ...(entry.whyItWorks ? { whyItWorks: entry.whyItWorks } : {}),
    ...(entry.science ? { science: entry.science } : {}),
    ...(entry.research ? { research: entry.research } : {}),
    ...(entry.tips ? { tips: entry.tips } : {}),
    ...(entry.minimumVersion ? { minimumVersion: entry.minimumVersion } : {}),
  };
};
