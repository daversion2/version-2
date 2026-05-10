import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Nudge, Category, TomorrowChallenge } from '../../types';

interface PlanTomorrowStepProps {
  habits: Nudge[];
  weeklyCounts: Record<string, number>;
  suggestedHabitIds: string[];
  selectedHabitIds: string[];
  onToggleHabit: (habitId: string) => void;
  plannedChallenges: TomorrowChallenge[];
  onAddChallenge: (challenge: TomorrowChallenge) => void;
  onRemoveChallenge: (index: number) => void;
  categories: Category[];
  getCatColor: (catId: string) => string;
  isReadOnly: boolean;
}

const DIFFICULTY_LABELS = ['Easy', 'Moderate', 'Hard', 'Very Hard', 'Extreme'];

export const PlanTomorrowStep: React.FC<PlanTomorrowStepProps> = ({
  habits,
  weeklyCounts,
  suggestedHabitIds,
  selectedHabitIds,
  onToggleHabit,
  plannedChallenges,
  onAddChallenge,
  onRemoveChallenge,
  categories,
  getCatColor,
  isReadOnly,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [challengeName, setChallengeName] = useState('');
  const [challengeDifficulty, setChallengeDifficulty] = useState(2);
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    categories.length > 0 ? categories[0].id : ''
  );

  const totalPlanned = selectedHabitIds.length + plannedChallenges.length;

  const handleAddChallenge = () => {
    const trimmed = challengeName.trim();
    if (!trimmed || !selectedCategoryId) return;

    onAddChallenge({
      name: trimmed,
      category_id: selectedCategoryId,
      difficulty_expected: challengeDifficulty,
      converted: false,
    });
    setChallengeName('');
    setChallengeDifficulty(2);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setCollapsed(!collapsed)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
          <Text style={styles.headerTitle}>Plan Tomorrow</Text>
          {totalPlanned > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{totalPlanned}</Text>
            </View>
          )}
        </View>
        <Ionicons
          name={collapsed ? 'chevron-down' : 'chevron-up'}
          size={16}
          color={Colors.gray}
        />
      </TouchableOpacity>

      {!collapsed && (
        <View style={styles.body}>
          {/* ── Habits Section ── */}
          {habits.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Habits</Text>
              {habits.map((habit) => {
                const isSelected = selectedHabitIds.includes(habit.id);
                const isSuggested = suggestedHabitIds.includes(habit.id);
                const done = weeklyCounts[habit.id] || 0;
                const target = habit.target_count_per_week;

                return (
                  <TouchableOpacity
                    key={habit.id}
                    style={[
                      styles.habitRow,
                      isSelected && styles.habitRowSelected,
                    ]}
                    onPress={() => !isReadOnly && onToggleHabit(habit.id)}
                    activeOpacity={isReadOnly ? 1 : 0.6}
                  >
                    <Ionicons
                      name={isSelected ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={isSelected ? Colors.primary : Colors.gray}
                    />
                    <View style={styles.habitInfo}>
                      <Text style={styles.habitName}>{habit.name}</Text>
                      <Text style={styles.habitProgress}>
                        {done}/{target} this week
                      </Text>
                    </View>
                    {isSuggested && (
                      <View style={styles.suggestedBadge}>
                        <Text style={styles.suggestedText}>Suggested</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* ── Challenges Section ── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Challenges</Text>

            {/* Planned challenges list */}
            {plannedChallenges.map((ch, index) => {
              const cat = categories.find((c) => c.id === ch.category_id);
              return (
                <View key={index} style={styles.challengeRow}>
                  <Ionicons
                    name="trophy-outline"
                    size={18}
                    color={cat ? cat.color : Colors.secondary}
                  />
                  <View style={styles.challengeInfo}>
                    <Text style={styles.challengeName}>{ch.name}</Text>
                    <View style={styles.challengeMeta}>
                      {cat && (
                        <Text
                          style={[
                            styles.challengeCategory,
                            { color: cat.color },
                          ]}
                        >
                          {cat.name}
                        </Text>
                      )}
                      <Text style={styles.challengeDiffText}>
                        {DIFFICULTY_LABELS[ch.difficulty_expected - 1]}
                      </Text>
                    </View>
                  </View>
                  {!isReadOnly && (
                    <TouchableOpacity
                      onPress={() => onRemoveChallenge(index)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name="close-circle-outline"
                        size={20}
                        color={Colors.gray}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}

            {/* Quick-add challenge form */}
            {!isReadOnly && (
              <View style={styles.addForm}>
                <TextInput
                  style={styles.input}
                  placeholder="Add a challenge for tomorrow..."
                  placeholderTextColor={Colors.gray}
                  value={challengeName}
                  onChangeText={setChallengeName}
                  maxLength={120}
                  returnKeyType="done"
                  onSubmitEditing={handleAddChallenge}
                />

                {/* Category picker */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.categoryRow}
                >
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryChip,
                        selectedCategoryId === cat.id &&
                          styles.categoryChipSelected,
                        selectedCategoryId === cat.id && {
                          borderColor: cat.color,
                          backgroundColor: cat.color + '15',
                        },
                      ]}
                      onPress={() => setSelectedCategoryId(cat.id)}
                    >
                      <Ionicons
                        name={cat.icon as any}
                        size={14}
                        color={
                          selectedCategoryId === cat.id
                            ? cat.color
                            : Colors.gray
                        }
                      />
                      <Text
                        style={[
                          styles.categoryChipText,
                          selectedCategoryId === cat.id && {
                            color: cat.color,
                          },
                        ]}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Difficulty selector + add button */}
                <View style={styles.difficultyRow}>
                  <Text style={styles.difficultyLabel}>Difficulty:</Text>
                  <View style={styles.difficultyDots}>
                    {[1, 2, 3, 4, 5].map((level) => (
                      <TouchableOpacity
                        key={level}
                        onPress={() => setChallengeDifficulty(level)}
                        hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
                      >
                        <Ionicons
                          name={
                            level <= challengeDifficulty
                              ? 'flame'
                              : 'flame-outline'
                          }
                          size={18}
                          color={
                            level <= challengeDifficulty
                              ? Colors.secondary
                              : Colors.gray + '60'
                          }
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.addBtn,
                      !challengeName.trim() && styles.addBtnDisabled,
                    ]}
                    onPress={handleAddChallenge}
                    disabled={!challengeName.trim()}
                  >
                    <Ionicons name="add" size={20} color={Colors.white} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primary + '08',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary + '20',
    marginBottom: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  countBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 1,
    borderRadius: BorderRadius.full,
  },
  countText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xs - 1,
    color: Colors.white,
  },
  body: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  section: {
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  // Habits
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: 2,
  },
  habitRowSelected: {
    backgroundColor: Colors.primary + '10',
  },
  habitInfo: {
    flex: 1,
  },
  habitName: {
    fontFamily: Fonts.primary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  habitProgress: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs - 1,
    color: Colors.gray,
    marginTop: 1,
  },
  suggestedBadge: {
    backgroundColor: Colors.secondary + '18',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  suggestedText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs - 2,
    color: Colors.secondary,
  },
  // Challenges
  challengeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  challengeInfo: {
    flex: 1,
    gap: 2,
  },
  challengeName: {
    fontFamily: Fonts.primary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  challengeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  challengeCategory: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs - 1,
  },
  challengeDiffText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs - 1,
    color: Colors.gray,
  },
  // Add form
  addForm: {
    marginTop: Spacing.xs,
  },
  input: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryRow: {
    marginTop: Spacing.sm,
    flexGrow: 0,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.xs,
  },
  categoryChipSelected: {
    borderWidth: 1.5,
  },
  categoryChipText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  difficultyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  difficultyLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  difficultyDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flex: 1,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: {
    backgroundColor: Colors.gray,
    opacity: 0.5,
  },
});
