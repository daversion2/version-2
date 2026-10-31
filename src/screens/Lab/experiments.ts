import type React from 'react';
import { CommonActions, NavigationProp, ParamListBase } from '@react-navigation/native';

/**
 * The Lab's registry: every experiment, admin-only, listed in Admin → Lab.
 *
 * Three kinds:
 *
 * 1. SWITCH (no `screen` or `open`): changes an existing screen. The Lab shows
 *    a switch; the screen branches on it:
 *
 *      const newCard = useLab('todayCardV2');
 *      return newCard ? <TodayCardV2 /> : <TodayCard />;
 *
 *    Everyone without is_admin always gets false, so they keep the current
 *    version. Keep the experimental branch in its own component file so
 *    removing it later is a delete, not an untangle.
 *
 * 2. SCREEN (`screen` set): a standalone thing opened from the Lab. Put it in
 *    screens/Lab/experiments/ and load it with require() INSIDE the function,
 *    so its module only runs when opened. An import here would run it at app
 *    start for every user.
 *
 * 3. ROUTE (`open` set): something that lives on its own route — e.g. a
 *    full-screen mini-app registered in RootNavigator with getComponent. The
 *    Lab row calls `open` instead of hosting it. Only dispatch an action here;
 *    the route itself does the lazy loading.
 *
 * Data: an experiment's writes go in their own user subcollection
 * (users/{uid}/lab_<name>). That needs no rules change and keeps real habit
 * data clean. Don't write global collections from an experiment: there is no
 * staging project, so every user would see it.
 *
 * Ids are stored on the user doc (User.lab_flags): never rename or reuse one.
 * Retiring an experiment = delete its entry here, then fix what tsc flags.
 */
export interface LabExperiment {
  id: string;
  title: string;
  /** One line on what it changes or does. Shown under the title in the Lab. */
  description: string;
  screen?: () => React.ComponentType;
  open?: (navigation: Pick<NavigationProp<ParamListBase>, 'dispatch'>) => void;
}

export const LAB_EXPERIMENTS = [
  // { id: 'todayCardV2', title: 'New Today card', description: 'Swaps the plan card on Today.' },
  // {
  //   id: 'breathPacer',
  //   title: 'Breath pacer',
  //   description: 'A guided 4-7-8 breathing screen.',
  //   screen: () => require('./experiments/BreathPacerScreen').BreathPacerScreen,
  // },
  // The whole-app restyle, built phase by phase behind one switch; see the
  // REDESIGN block in constants/theme.ts. Applies at launch, not live.
  {
    id: 'redesign',
    title: 'Apple-style redesign',
    description:
      'The simpler look: iOS greys, rounder corners, grouped lists. Takes effect the next time you open the app.',
  },
  // Workouts, Meditate and Meals went live for everyone on 2026-10-18 (their
  // habits open them from Today). These rows stay so an admin can open one
  // without a linked habit; the "Start on Today" switches are retired.
  {
    id: 'workouts',
    title: 'Workouts',
    description: 'The workouts mini-app: build workouts and circuits, log sets with a rest timer, records.',
    open: (navigation: Pick<NavigationProp<ParamListBase>, 'dispatch'>) =>
      navigation.dispatch(CommonActions.navigate({ name: 'WorkoutsApp' })),
  },
  {
    id: 'meditate',
    title: 'Meditate',
    description: 'The calm mini-app: sit, breathe or NSDR — lock your phone, a bell rings at the end. History and records.',
    open: (navigation: Pick<NavigationProp<ParamListBase>, 'dispatch'>) =>
      navigation.dispatch(CommonActions.navigate({ name: 'MeditateApp' })),
  },
  {
    id: 'compose',
    title: 'Compose',
    description:
      'Describe a meditation or guided-imagery session; it gets written, voiced and mixed for you. Save the ones you like.',
    open: (navigation: Pick<NavigationProp<ParamListBase>, 'dispatch'>) =>
      navigation.dispatch(CommonActions.navigate({ name: 'ComposeApp' })),
  },
  {
    id: 'meals',
    title: 'Meals',
    description:
      'Rate each meal by tapping the food groups on the plate; it works out pass or fail against your own daily goal.',
    open: (navigation: Pick<NavigationProp<ParamListBase>, 'dispatch'>) =>
      navigation.dispatch(CommonActions.navigate({ name: 'MealsApp' })),
  },
] as const satisfies readonly LabExperiment[];

/** Typed against the registry, so useLab('typo') fails tsc. */
export type LabExperimentId = (typeof LAB_EXPERIMENTS)[number]['id'];

/** The registry widened to the interface, for code that lists or looks up. */
export const ALL_LAB_EXPERIMENTS: readonly LabExperiment[] = LAB_EXPERIMENTS;

export const findLabExperiment = (id: string): LabExperiment | undefined =>
  ALL_LAB_EXPERIMENTS.find((e) => e.id === id);
