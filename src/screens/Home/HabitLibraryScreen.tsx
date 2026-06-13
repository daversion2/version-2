import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreenProps } from '../../types/navigation';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { HABIT_LIBRARY, HABIT_CATEGORIES, getHabitCategory } from '../../data/habitLibrary';
import { LibraryHabit } from '../../types';

type Props = HomeScreenProps<'HabitLibrary'>;

const ALL = 'All';

export const HabitLibraryScreen: React.FC<Props> = ({ navigation }) => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>(ALL);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return HABIT_LIBRARY.filter((h) => {
      const matchesCategory = activeCategory === ALL || h.category_id === activeCategory;
      if (!matchesCategory) return false;
      if (!q) return true;
      return (
        h.name.toLowerCase().includes(q) ||
        h.description.toLowerCase().includes(q)
      );
    });
  }, [query, activeCategory]);

  const renderHabit = ({ item }: { item: LibraryHabit }) => {
    const category = getHabitCategory(item.category_id);
    const accent = category?.color ?? Colors.primary;
    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('HabitLibraryDetail', { habitId: item.id })}
        activeOpacity={0.8}
      >
        <Card style={styles.habitCard}>
          <View style={[styles.categoryAccent, { backgroundColor: accent }]} />
          <View style={styles.habitContent}>
            <View style={styles.habitHeader}>
              <Text style={styles.habitName}>{item.name}</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
            </View>
            <Text style={styles.habitDescription} numberOfLines={2}>
              {item.description}
            </Text>
            <View style={styles.habitMeta}>
              {category && (
                <View style={[styles.categoryTag, { backgroundColor: accent + '1A' }]}>
                  <Ionicons name={category.icon as any} size={12} color={accent} />
                  <Text style={[styles.categoryTagText, { color: accent }]}>{category.name}</Text>
                </View>
              )}
              <Text style={styles.freqText}>{item.suggested_target_per_week}×/week</Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const chips = [ALL, ...HABIT_CATEGORIES.map((c) => c.id)];

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={Colors.gray} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search habits"
            placeholderTextColor={Colors.gray}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={Colors.gray} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category filter chips */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {chips.map((id) => {
            const category = id === ALL ? undefined : getHabitCategory(id);
            const label = id === ALL ? 'All' : category?.name ?? id;
            const isActive = activeCategory === id;
            const accent = category?.color ?? Colors.primary;
            return (
              <TouchableOpacity
                key={id}
                onPress={() => setActiveCategory(id)}
                activeOpacity={0.8}
                style={[
                  styles.chip,
                  isActive && { backgroundColor: accent, borderColor: accent },
                ]}
              >
                {category && (
                  <Ionicons
                    name={category.icon as any}
                    size={13}
                    color={isActive ? Colors.white : accent}
                  />
                )}
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderHabit}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text style={styles.empty}>No habits match your search.</Text>
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
  searchWrap: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    padding: 0,
  },
  chipRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  chipText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  chipTextActive: {
    color: Colors.white,
    fontFamily: Fonts.primaryBold,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
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
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  categoryTagText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
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
