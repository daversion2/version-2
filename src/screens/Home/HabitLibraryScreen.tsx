import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreenProps } from '../../types/navigation';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { HabitLibraryList } from '../../components/habits/HabitLibraryList';
import { HABIT_LIBRARY, HABIT_CATEGORIES } from '../../data/habitLibrary';

type Props = HomeScreenProps<'HabitLibrary'>;

export const HabitLibraryScreen: React.FC<Props> = ({ navigation }) => {
  const banner = (
    <TouchableOpacity
      style={styles.exploreCard}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('TraditionalHabits')}
    >
      <View style={styles.exploreIcon}>
        <Ionicons name="albums-outline" size={20} color={Colors.secondary} />
      </View>
      <View style={styles.exploreTextWrap}>
        <Text style={styles.exploreTitle}>Explore traditional practices</Text>
        <Text style={styles.exploreSubtitle}>
          The classic everyday staples — water, exercise, reading, and more.
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.secondary} />
    </TouchableOpacity>
  );

  return (
    <HabitLibraryList
      habits={HABIT_LIBRARY}
      categories={HABIT_CATEGORIES}
      listHeader={banner}
      onSelectHabit={(habitId) =>
        navigation.navigate('HabitLibraryDetail', { habitId })
      }
    />
  );
};

const styles = StyleSheet.create({
  exploreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  exploreIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary + '1A',
  },
  exploreTextWrap: {
    flex: 1,
    gap: 2,
  },
  exploreTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  exploreSubtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 18,
  },
});
