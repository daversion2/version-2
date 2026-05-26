import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { HABIT_LIBRARY } from '../../data/habitLibrary';
import { LibraryHabit } from '../../types';

type Props = NativeStackScreenProps<any, 'HabitLibrary'>;

const CATEGORY_FILTERS = ['All', 'Physical', 'Mind'];

const CATEGORY_COLORS: Record<string, string> = {
  Physical: '#217180',
  Mind: '#7B1FA2',
};

const CATEGORY_ICONS: Record<string, string> = {
  Physical: 'fitness',
  Mind: 'bulb-outline',
};

export const HabitLibraryScreen: React.FC<Props> = ({ navigation }) => {
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered =
    activeCategory === 'All'
      ? HABIT_LIBRARY
      : HABIT_LIBRARY.filter((h) => h.category_id === activeCategory);

  const renderHabit = ({ item }: { item: LibraryHabit }) => {
    const color = CATEGORY_COLORS[item.category_id] ?? Colors.gray;
    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('HabitLibraryDetail', { habitId: item.id })}
        activeOpacity={0.8}
      >
        <Card style={styles.habitCard}>
          <View style={[styles.categoryAccent, { backgroundColor: color }]} />
          <View style={styles.habitContent}>
            <View style={styles.habitHeader}>
              <Text style={styles.habitName}>{item.name}</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
            </View>
            <Text style={styles.habitDescription} numberOfLines={2}>
              {item.description}
            </Text>
            <View style={styles.habitMeta}>
              <View style={[styles.catBadge, { backgroundColor: color + '18' }]}>
                <Text style={[styles.catBadgeText, { color }]}>{item.category_id}</Text>
              </View>
              <Text style={styles.freqText}>{item.suggested_target_per_week}×/week</Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Category filter tabs */}
      <View style={styles.filterRow}>
        {CATEGORY_FILTERS.map((cat) => {
          const isActive = activeCategory === cat;
          const color = cat === 'All' ? Colors.primary : (CATEGORY_COLORS[cat] ?? Colors.primary);
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => setActiveCategory(cat)}
              style={[
                styles.filterChip,
                { borderColor: color },
                isActive && { backgroundColor: color },
              ]}
            >
              {cat !== 'All' && (
                <Ionicons
                  name={CATEGORY_ICONS[cat] as any}
                  size={12}
                  color={isActive ? Colors.white : color}
                  style={{ marginRight: 4 }}
                />
              )}
              <Text style={[styles.filterChipText, { color: isActive ? Colors.white : color }]}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filtered}
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
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
  },
  filterChipText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
  },
  list: {
    paddingHorizontal: Spacing.lg,
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
  catBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  catBadgeText: {
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
