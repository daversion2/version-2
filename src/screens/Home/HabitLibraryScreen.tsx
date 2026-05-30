import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreenProps } from '../../types/navigation';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { HABIT_LIBRARY } from '../../data/habitLibrary';
import { LibraryHabit } from '../../types';

type Props = HomeScreenProps<'HabitLibrary'>;

export const HabitLibraryScreen: React.FC<Props> = ({ navigation }) => {
  const renderHabit = ({ item }: { item: LibraryHabit }) => {
    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('HabitLibraryDetail', { habitId: item.id })}
        activeOpacity={0.8}
      >
        <Card style={styles.habitCard}>
          <View style={[styles.categoryAccent, { backgroundColor: Colors.primary }]} />
          <View style={styles.habitContent}>
            <View style={styles.habitHeader}>
              <Text style={styles.habitName}>{item.name}</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
            </View>
            <Text style={styles.habitDescription} numberOfLines={2}>
              {item.description}
            </Text>
            <View style={styles.habitMeta}>
              <Text style={styles.freqText}>{item.suggested_target_per_week}×/week</Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={HABIT_LIBRARY}
        keyExtractor={(item) => item.id}
        renderItem={renderHabit}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.empty}>No habits found.</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  habitCard: {
    marginBottom: Spacing.sm,
    padding: 0,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  categoryAccent: {
    width: 5,
    borderTopLeftRadius: BorderRadius.md,
    borderBottomLeftRadius: BorderRadius.md,
  },
  habitContent: {
    flex: 1,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  habitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  habitName: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    flex: 1,
    marginRight: Spacing.sm,
  },
  habitDescription: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
  },
  habitMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  freqText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  empty: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
});
