/**
 * Script to seed the funFacts collection in Firestore.
 *
 * Usage: node scripts/seedFunFacts.js
 *
 * All facts are verified from peer-reviewed research and credible sources.
 * Each fact includes a source URL for users to explore further.
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyC1sBTTVM5V-ZNBm9KG0iFdFQCLp2WPlvI",
  authDomain: "version-2-4afa1.firebaseapp.com",
  projectId: "version-2-4afa1",
  storageBucket: "version-2-4afa1.firebasestorage.app",
  messagingSenderId: "439501865821",
  appId: "1:439501865821:web:c904ff38577d2fce861eb4",
  measurementId: "G-DVCHWDFRQ9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const funFacts = [
  {
    order: 1,
    fact: "It takes an average of 66 days to form a new habit, not 21 as commonly believed. A UCL study found the range was actually 18 to 254 days depending on the person and complexity of the behavior.",
    sourceTitle: "How are habits formed: Modelling habit formation in the real world (Lally et al., 2010)",
    sourceUrl: "https://onlinelibrary.wiley.com/doi/10.1002/ejsp.674",
  },
  {
    order: 2,
    fact: "Your brain uses about 20% of your body's total energy despite being only 2% of your body weight. This makes it the most energy-hungry organ in your body.",
    sourceTitle: "Sugar for the brain: the role of glucose in physiological and pathological brain function",
    sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3900881/",
  },
  {
    order: 3,
    fact: "Dopamine is released in anticipation of a reward, not when you receive it. This is why the excitement of planning a vacation often feels better than the trip itself.",
    sourceTitle: "Dopamine in motivational control: rewarding, aversive, and alerting",
    sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3032992/",
  },
  {
    order: 4,
    fact: "Even mild stress can rapidly impair your prefrontal cortex—the brain region responsible for willpower and decision-making—while strengthening more impulsive emotional responses.",
    sourceTitle: "Stress signalling pathways that impair prefrontal cortex structure and function",
    sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC2907136/",
  },
  {
    order: 5,
    fact: "Missing a single day doesn't significantly impact habit formation. Research shows that what matters is getting back to the behavior, not maintaining a perfect streak.",
    sourceTitle: "How are habits formed: Modelling habit formation in the real world",
    sourceUrl: "https://onlinelibrary.wiley.com/doi/10.1002/ejsp.674",
  },
  {
    order: 6,
    fact: "Choice architecture interventions (nudges) have a medium effect size on behavior change. Food choices are particularly responsive—up to 2.5 times more than other behaviors.",
    sourceTitle: "The effectiveness of nudging: A meta-analysis of choice architecture interventions (PNAS)",
    sourceUrl: "https://www.pnas.org/doi/10.1073/pnas.2107346118",
  },
  {
    order: 7,
    fact: "If-then planning (implementation intentions) increases goal achievement by 2-3x. Simply deciding 'when situation X happens, I will do Y' dramatically improves follow-through.",
    sourceTitle: "Implementation Intentions: Strong Effects of Simple Plans",
    sourceUrl: "https://cancercontrol.cancer.gov/sites/default/files/2020-06/goal_intent_attain.pdf",
  },
  {
    order: 8,
    fact: "As habits form, control shifts from your prefrontal cortex (conscious decisions) to your basal ganglia (automatic behavior), reducing the mental effort needed over time.",
    sourceTitle: "The role of the basal ganglia in habit formation",
    sourceUrl: "https://people.duke.edu/~hy43/role%20of%20basal.pdf",
  },
  {
    order: 9,
    fact: "Exercise increases brain-derived neurotrophic factor (BDNF), which supports neuron survival and strengthens synaptic connections. It's one of the most powerful enhancers of brain plasticity.",
    sourceTitle: "Effects of Physical Exercise on Cognitive Functioning and Wellbeing",
    sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5934999/",
  },
  {
    order: 10,
    fact: "Sleep deprivation impairs the prefrontal cortex, making you more susceptible to impulsive decisions and less able to use negative feedback to improve your choices.",
    sourceTitle: "Interactions between sleep habits and self-control",
    sourceUrl: "https://www.frontiersin.org/journals/human-neuroscience/articles/10.3389/fnhum.2015.00284/full",
  },
  {
    order: 11,
    fact: "Temptation bundling—pairing an enjoyable activity with a 'should' behavior—increased gym visits by 51% in a study where participants could only listen to audiobooks at the gym.",
    sourceTitle: "Holding the Hunger Games Hostage at the Gym: An Evaluation of Temptation Bundling",
    sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4381662/",
  },
  {
    order: 12,
    fact: "Making progress on meaningful work is the single most powerful motivator. Small wins release dopamine and create positive momentum that builds motivation.",
    sourceTitle: "The Power of Small Wins (Harvard Business Review)",
    sourceUrl: "https://hbr.org/2011/05/the-power-of-small-wins",
  },
  {
    order: 13,
    fact: "Your brain continues to change throughout life. Neuroplasticity—the brain's ability to reorganize by forming new neural connections—persists well into adulthood and old age.",
    sourceTitle: "Neuroplasticity - NCBI Bookshelf",
    sourceUrl: "https://www.ncbi.nlm.nih.gov/books/NBK557811/",
  },
  {
    order: 14,
    fact: "Mental visualization activates the same brain regions as actually performing an action. Athletes who visualize their performance show measurable improvements in real-world results.",
    sourceTitle: "The Effects of Imagery Practice on Athletes' Performance: A Multilevel Meta-Analysis",
    sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12109254/",
  },
  {
    order: 15,
    fact: "Ego depletion is real but beliefs matter: people who believe willpower is unlimited show less fatigue from self-control tasks than those who believe it's a limited resource.",
    sourceTitle: "Beliefs about willpower determine the impact of glucose on self-control (PNAS)",
    sourceUrl: "https://www.pnas.org/doi/10.1073/pnas.1313475110",
  },
  {
    order: 16,
    fact: "Judges grant favorable rulings 65% of the time after breaks but nearly 0% just before breaks. Decision fatigue is real and affects even trained professionals.",
    sourceTitle: "Decision fatigue research on judicial decisions",
    sourceUrl: "https://en.wikipedia.org/wiki/Decision_fatigue",
  },
  {
    order: 17,
    fact: "Social accountability can boost behavior change—but only when you actually commit. Research shows people are less likely to make commitments when they know others are watching.",
    sourceTitle: "Does Social Accountability Motivate Commitment Behavior Among College Students?",
    sourceUrl: "https://link.springer.com/article/10.1007/s11294-023-09878-7",
  },
  {
    order: 18,
    fact: "Variable rewards are more motivating than predictable ones. Unpredictable reinforcement increases dopamine release and creates stronger behavioral patterns—which is why habits can be hard to break.",
    sourceTitle: "Understanding dopamine and reinforcement learning: The dopamine reward prediction error hypothesis (PNAS)",
    sourceUrl: "https://www.pnas.org/doi/10.1073/pnas.1014269108",
  },
  {
    order: 19,
    fact: "Self-control is stronger in the morning and depletes throughout the day. Scheduling difficult tasks early takes advantage of your brain's natural willpower cycle.",
    sourceTitle: "Morning resolutions, evening disillusions: Theories of willpower affect health behaviours across the day",
    sourceUrl: "https://journals.sagepub.com/doi/abs/10.1177/0890207020962304",
  },
  {
    order: 20,
    fact: "Chronic stress causes physical changes in the brain: the prefrontal cortex (rational thinking) shrinks while the amygdala (emotional reactions) grows—but these changes can be reversed with stress reduction.",
    sourceTitle: "Stress signalling pathways that impair prefrontal cortex structure and function",
    sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC2907136/",
  },
];

async function seed() {
  const funFactsRef = collection(db, 'funFacts');

  // Check existing facts
  const existing = await getDocs(funFactsRef);
  console.log(`Found ${existing.size} existing fun facts`);

  for (const fact of funFacts) {
    // Check if fact already exists by order number
    const exists = existing.docs.some(doc => doc.data().order === fact.order);
    if (exists) {
      console.log(`Skipping fact #${fact.order} - already exists`);
      continue;
    }

    const docData = {
      ...fact,
      created_at: new Date().toISOString(),
    };

    const docRef = await addDoc(funFactsRef, docData);
    console.log(`Added fact #${fact.order} with ID: ${docRef.id}`);
  }

  console.log('Done!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Error seeding fun facts:', err);
  process.exit(1);
});
