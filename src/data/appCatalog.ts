import { AppColors } from '../constants/theme';
import type { TodayAppId } from '../services/appCheckins';

// =============================================================================
// THE APP CATALOG — what each app is, in the words the Apps screen shows.
//
// One entry per app a person can add or open. The Apps screen
// (screens/Apps/) lists them; the logic of who sees what where is
// services/appCatalog.ts. Built 2026-11-20 from the "Start with one app"
// mockup (https://claude.ai/artifact/UFiDq1rMPFQwzqzA4aKG5x), admin-only for
// now.
//
// Two kinds:
// - a TODAY app (`todayAppId` set): Meditate, Workouts, Meals. Adding one puts
//   it on Today: its ring, its page, its weekly goal, its ratings.
// - a STANDALONE app (`route` set): Hot & Cold and Avoidance Training, built in
//   the Lab. They open on their own for now; joining Today's rings and ratings
//   is the next build (docs/backlog.md).
//
// Copy voice: the effort is the training (founder, 2026-11-20). Say where the
// override shows up in each app; never promise it gets easier. No "rep".
// =============================================================================

export type CatalogAppId = 'meditate' | 'workouts' | 'meals' | 'hotcold' | 'avoidance';

export interface CatalogApp {
  id: CatalogAppId;
  name: string;
  /** Ionicons name. */
  icon: string;
  /** Six-digit hex: the screen appends an alpha suffix for tints. */
  color: string;
  /** One line under the name. */
  tagline: string;
  /** Two or three sentences for the app's own page. */
  description: string;
  /** What you do in it, three at most. */
  features: { icon: string; text: string }[];
  /** Where the override shows up: the moments it asks how hard it was. */
  override: { label: string; text: string }[];
  /** Who it's for, in one line. */
  goodFor: string;
  /** Set for an app that lives on Today. */
  todayAppId?: TodayAppId;
  /** Set for an app that opens on its own (a root route). */
  route?: 'HotColdApp' | 'AvoidanceApp';
  /** Shown with a "New" badge and featured at the top. */
  isNew?: boolean;
}

export const APP_CATALOG: CatalogApp[] = [
  {
    id: 'meditate',
    name: 'Meditate',
    icon: 'flower-outline',
    color: AppColors.meditate,
    tagline: 'Sits, breathing and deep rest',
    description:
      'Sit, follow a breathing pattern, or lie down for deep rest, from 5 to 20 minutes. Lock your phone and a bell rings at the end. Guided recordings if you want a voice, silence if you don’t.',
    features: [
      { icon: 'timer-outline', text: 'Unguided sits with an end bell, phone locked' },
      { icon: 'pulse-outline', text: 'Breathing patterns with a pacer to follow' },
      { icon: 'headset-outline', text: 'Guided focus and deep-rest recordings' },
    ],
    override: [
      { label: 'Getting started', text: 'How hard is it to sit down? Asked as you start.' },
      { label: 'Staying with it', text: 'How hard was it not to stop early? Asked at the bell.' },
    ],
    goodFor: 'The easiest way in. Ten minutes is plenty.',
    todayAppId: 'meditate',
  },
  {
    id: 'workouts',
    name: 'Workouts',
    icon: 'barbell-outline',
    color: AppColors.workouts,
    tagline: 'Lifting and cardio, set by set',
    description:
      'Run a workout set by set with rest timers, or log one you’ve already done in a few taps. Train in phases, test an exercise, then retest. Cardio counts too, by zone.',
    features: [
      { icon: 'barbell-outline', text: 'Live workouts with rest timers and records' },
      { icon: 'trending-up-outline', text: 'Phases with a test at the start and a retest' },
      { icon: 'heart-outline', text: 'Cardio by zone, toward 150 minutes a week' },
    ],
    override: [
      { label: 'Getting started', text: 'How hard is it to start? Asked when you tap Start.' },
      { label: 'Staying with it', text: 'How hard was it to keep going? Asked at Finish.' },
    ],
    goodFor: 'Anyone who trains, or wants to.',
    todayAppId: 'workouts',
  },
  {
    id: 'meals',
    name: 'Meals',
    icon: 'nutrition-outline',
    color: AppColors.meals,
    tagline: 'For tracking food, plate by plate',
    description:
      'Log a meal by tapping the food groups on the plate. Each plate gets a score from 0 to 100 for your goal, and a day is on target when your plates average your own line. No calories, no weighing.',
    features: [
      { icon: 'restaurant-outline', text: 'Tap the food groups, get a plate score' },
      { icon: 'options-outline', text: 'Scored for your goal: balanced, muscle or plant-forward' },
      { icon: 'grid-outline', text: 'A week view of what you actually ate' },
    ],
    override: [
      {
        label: 'Once a day',
        text: 'Eating has no single start, so Meals asks once: how hard was it to eat this way today?',
      },
    ],
    goodFor: 'People who want to track food without counting calories.',
    todayAppId: 'meals',
  },
  {
    id: 'hotcold',
    name: 'Hot & Cold',
    icon: 'snow-outline',
    color: AppColors.hotcold,
    tagline: 'Cold plunges and sauna',
    description:
      'Log a cold plunge or a sauna in two taps, with the time and temperature filled in from last time. At a home plunge, start the clock and a bell rings at your target.',
    features: [
      { icon: 'snow-outline', text: 'Cold or heat, how long and how cold or hot' },
      { icon: 'alarm-outline', text: 'A plunge timer with a bell, no need to watch' },
      { icon: 'ribbon-outline', text: 'Your week’s minutes and your longest and coldest' },
    ],
    override: [
      { label: 'Getting started', text: 'How hard was it to get in? Asked when you log it.' },
    ],
    goodFor: 'Anyone with a plunge, a cold shower or a gym sauna.',
    route: 'HotColdApp',
    isNew: true,
  },
  {
    id: 'avoidance',
    name: 'Avoidance Training',
    icon: 'flash-outline',
    color: AppColors.avoidance,
    tagline: 'The things you keep putting off',
    description:
      'Write down what you’ve been dodging in one line. Each day it puts the one you’ve avoided longest in front of you. Say how hard you expect it to be, do it, then see how it actually went.',
    features: [
      { icon: 'create-outline', text: 'One line to write down what you’re dodging' },
      { icon: 'arrow-forward-circle-outline', text: 'One picked for you each day: the oldest' },
      { icon: 'git-compare-outline', text: 'What you expected next to how it went' },
    ],
    override: [
      { label: 'The forecast', text: 'How hard do you expect starting to be? Asked when you add it.' },
      { label: 'Getting started', text: 'How hard was it really? Asked when you tap Did it.' },
    ],
    goodFor: 'Anyone with a list in their head that never gets done.',
    route: 'AvoidanceApp',
    isNew: true,
  },
];
