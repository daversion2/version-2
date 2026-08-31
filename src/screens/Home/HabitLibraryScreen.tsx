import React from 'react';
import { HomeScreenProps } from '../../types/navigation';
import { HabitLibraryList } from '../../components/habits/HabitLibraryList';
import { HABIT_CATEGORIES } from '../../data/habitLibrary';
import { getBrowsableHabits } from '../../data/practices';

type Props = HomeScreenProps<'HabitLibrary'>;

/**
 * THE library — one browse surface for every habit the app offers.
 *
 * Before the unification this screen showed only the curated library and linked
 * out to a separate "traditional habits" screen, while the curated practices
 * lived in a third screen of their own. All three were browsing the same kind of
 * thing. They are now one list: 45 habits across the five HabitCategory columns,
 * from "drink more water" to a cold plunge, sorted so the richer definitions
 * (science, a template, a session flow) surface first within each category.
 *
 * See docs/habit-template-unification.md.
 */
export const HabitLibraryScreen: React.FC<Props> = ({ navigation }) => (
  <HabitLibraryList
    habits={getBrowsableHabits()}
    categories={HABIT_CATEGORIES}
    onSelectHabit={(habitId) => navigation.navigate('HabitLibraryDetail', { habitId })}
  />
);
