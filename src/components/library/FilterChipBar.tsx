import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import {
  TIME_CATEGORIES_LIST,
  LIFE_DOMAINS_LIST,
  LIBRARY_UI_TEXT,
  TimeCategoryConfig,
  LifeDomainConfig,
} from '../../constants/challengeLibrary';
import { TimeCategory } from '../../types';

interface FilterChipBarProps {
  selectedTimeCategory: TimeCategory | null;
  selectedLifeDomain: string | null;
  onTimeCategoryChange: (category: TimeCategory | null) => void;
  onLifeDomainChange: (domain: string | null) => void;
}

export const FilterChipBar: React.FC<FilterChipBarProps> = ({
  selectedTimeCategory,
  selectedLifeDomain,
  onTimeCategoryChange,
  onLifeDomainChange,
}) => {
  const renderTimeChip = (category: TimeCategoryConfig | null, isAll: boolean = false) => {
    const isSelected = isAll
      ? selectedTimeCategory === null
      : selectedTimeCategory === category?.id;

    return (
      <TouchableOpacity
        key={isAll ? 'all-time' : category?.id}
        style={[styles.chip, isSelected && styles.chipSelected]}
        onPress={() => onTimeCategoryChange(isAll ? null : (category?.id as TimeCategory))}
        activeOpacity={0.7}
      >
        <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
          {isAll ? LIBRARY_UI_TEXT.allTimeLabel : category?.shortLabel}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderDomainChip = (domain: LifeDomainConfig | null, isAll: boolean = false) => {
    const isSelected = isAll
      ? selectedLifeDomain === null
      : selectedLifeDomain === domain?.id;

    return (
      <TouchableOpacity
        key={isAll ? 'all-domain' : domain?.id}
        style={[styles.chip, isSelected && styles.chipSelected]}
        onPress={() => onLifeDomainChange(isAll ? null : domain?.id ?? null)}
        activeOpacity={0.7}
      >
        <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
          {isAll ? LIBRARY_UI_TEXT.allCategoryLabel : domain?.shortName}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Time Category Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {renderTimeChip(null, true)}
        {TIME_CATEGORIES_LIST.map((category) => renderTimeChip(category))}
      </ScrollView>

      {/* Life Domain Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {renderDomainChip(null, true)}
        {LIFE_DOMAINS_LIST.map((domain) => renderDomainChip(domain))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.lightGray,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  chipTextSelected: {
    color: Colors.white,
    fontFamily: Fonts.secondaryBold,
  },
});
