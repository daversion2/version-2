import { AppColors } from '../constants/theme';
import type { TodayAppId } from '../services/appCheckins';

// =============================================================================
// THE APP CATALOG — what each app is, in the words the Apps screen shows.
//
// One entry per app a person can add or open. The Apps screen
// (screens/Apps/) lists them; the logic of who sees what where is
// services/appCatalog.ts. Built 2026-11-20 from the "Start with one app"
// mockup (https://claude.ai/artifact/UFiDq1rMPFQwzqzA4aKG5x). Open to everyone
// since 2026-11-20.
//
// Three kinds:
// - a TODAY app (`todayAppId` set): Meditate, Workouts, Meals. Adding one puts
//   it on Today: its ring, its page, its weekly goal, its ratings.
// - a TODAY ROW (`todayRow` set, plus `route`): Close out the day and Craving
//   Crusher (2026-11-20). Adding one puts a row under Your apps on Today, plus
//   a ring and a weekly goal like the others (services/rowRings.ts: nights
//   closed out, urges faced). They open their own app instead of an app page,
//   and stay out of what needs start/keep-going ratings (friction, the weekly
//   review, the combined streak). Close out the day and Craving Crusher are on
//   for every account until removed; Hot & Cold and Avoidance start off.
// - a STANDALONE app (`route` only): none since 2026-11-20, when Hot & Cold
//   and Avoidance Training became Today rows for everyone (off by default:
//   people add them from Apps). Kept for the next Lab app.
//
// Copy voice: the effort is the training (founder, 2026-11-20). Say where the
// override shows up in each app; never promise it gets easier. No "rep".
// =============================================================================

export type CatalogAppId = 'meditate' | 'workouts' | 'meals' | 'nightly' | 'craving' | 'hotcold' | 'avoidance';

/** An app that lives on Today as a row, not a ring. */
export type TodayRowId = 'nightly' | 'craving' | 'hotcold' | 'avoidance';

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
  /** Set for an app that lives on Today as a row. */
  todayRow?: TodayRowId;
  /** Set for an app that opens on its own route. */
  route?: 'HotColdApp' | 'AvoidanceApp' | 'NightlyApp' | 'CravingApp';
  /** False for an app with no 1–3 rating (its page leaves out the rating note). Default true. */
  rated?: boolean;
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
    id: 'nightly',
    name: 'Close out the day',
    icon: 'moon-outline',
    color: AppColors.nightly,
    tagline: 'A minute each evening, ending on a plan',
    description:
      'Three beats before bed: the day’s win, picked from your sessions; a grade for the effort; and one session planned for tomorrow, with when. The plan waits on Today until it’s done.',
    features: [
      { icon: 'trophy-outline', text: 'See the day’s win, already found' },
      { icon: 'school-outline', text: 'Grade the effort, A to F' },
      { icon: 'calendar-outline', text: 'Plan tomorrow’s session, and when' },
    ],
    override: [
      {
        label: 'Tomorrow’s start',
        text: 'Deciding tonight when tomorrow’s session happens means less to decide when the moment comes.',
      },
    ],
    goodFor: 'Plans with a when (“after coffee, I’ll…”) are some of the most reliable tools in behaviour change.',
    todayRow: 'nightly',
    route: 'NightlyApp',
    rated: false,
  },
  {
    id: 'craving',
    name: 'Craving Crusher',
    icon: 'water-outline',
    color: AppColors.craving,
    tagline: 'Ride out an urge instead of acting on it',
    description:
      'When an urge hits (food, your phone, a drink, a cigarette, a purchase), say how strong it is and a timer sized to it starts. Breathing, a walk or a message to someone fill the minutes while it peaks and passes.',
    features: [
      { icon: 'timer-outline', text: 'A timer sized to how strong the urge is' },
      { icon: 'walk-outline', text: 'Something to do while it peaks and passes' },
      { icon: 'stats-chart-outline', text: 'Your pattern: what pulls, when, what helps' },
    ],
    override: [
      {
        label: 'Not acting on it',
        text: 'Every urge you sit through is the override. Rode it out: 2 XP. Gave in and logged it anyway: 1 XP.',
      },
    ],
    goodFor: 'Anyone with a pull they’d rather not follow.',
    todayRow: 'craving',
    route: 'CravingApp',
    rated: false,
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
    todayRow: 'hotcold',
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
    todayRow: 'avoidance',
    route: 'AvoidanceApp',
    isNew: true,
  },
];
