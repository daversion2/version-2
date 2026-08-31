import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreenProps } from '../../types/navigation';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
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
 * with the richer definitions (science, a template, a session flow) surfacing
 * first within each category.
 *
 * See docs/habit-template-unification.md.
 */
export const HabitLibraryScreen: React.FC<Props> = ({ navigation }) => {
  // Sits above the list rather than at the bottom: someone who searches for
  // their habit and doesn't find it needs this in view at that moment, not
  // after scrolling past 45 things that weren't what they wanted.
  const createOwn = (
    <TouchableOpacity
      style={styles.createCard}
      onPress={() => navigation.navigate('CreateHabit')}
      activeOpacity={0.85}
    >
      <View style={styles.createIcon}>
        <Ionicons name="add" size={20} color={Colors.primary} />
      </View>
      <View style={styles.createText}>
        <Text style={styles.createTitle}>Create your own</Text>
        <Text style={styles.createSubtitle}>
          Track anything. Pick what you measure alongside it.
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
    </TouchableOpacity>
  );

  return (
    <HabitLibraryList
      habits={getBrowsableHabits()}
      categories={HABIT_CATEGORIES}
      listHeader={createOwn}
      onSelectHabit={(habitId) => navigation.navigate('HabitLibraryDetail', { habitId })}
    />
  );
};

const styles = StyleSheet.create({
  createCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  createIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary + '1A',
  },
  createText: { flex: 1, gap: 2 },
  createTitle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.dark },
  createSubtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 18,
  },
});
