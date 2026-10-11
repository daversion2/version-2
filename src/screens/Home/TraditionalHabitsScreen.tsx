import React from 'react';
import { HomeScreenProps } from '../../types/navigation';
import { HabitLibraryList } from '../../components/habits/HabitLibraryList';
import {
  TRADITIONAL_HABIT_LIBRARY,
  TRADITIONAL_HABIT_CATEGORIES,
} from '../../data/traditionalHabits';

type Props = HomeScreenProps<'TraditionalHabits'>;

export const TraditionalHabitsScreen: React.FC<Props> = ({ navigation }) => (
  <HabitLibraryList
    habits={TRADITIONAL_HABIT_LIBRARY}
    categories={TRADITIONAL_HABIT_CATEGORIES}
    searchPlaceholder="Search traditional habits"
    onSelectHabit={(habitId) =>
      navigation.navigate('HabitLibraryDetail', { habitId })
    }
  />
);
