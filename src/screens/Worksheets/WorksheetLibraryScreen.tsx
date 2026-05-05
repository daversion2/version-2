import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { WorksheetTemplateCard } from '../../components/worksheets/WorksheetTemplateCard';
import { WORKSHEET_TEMPLATES } from '../../data/worksheetTemplates';
import { getDraftWorksheets } from '../../services/worksheets';
import { useAuth } from '../../context/AuthContext';
import { WorksheetCategory, WorksheetEntry } from '../../types';

const CATEGORIES: { label: string; value: WorksheetCategory | null }[] = [
  { label: 'All', value: null },
  { label: 'Thoughts', value: 'thoughts' },
  { label: 'Beliefs', value: 'beliefs' },
  { label: 'Behavior', value: 'behavior' },
];

export const WorksheetLibraryScreen: React.FC<{ navigation: any }> = ({
  navigation,
}) => {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<WorksheetCategory | null>(null);
  const [drafts, setDrafts] = useState<WorksheetEntry[]>([]);

  const loadDrafts = useCallback(async () => {
    if (!user) return;
    const d = await getDraftWorksheets(user.uid);
    setDrafts(d);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadDrafts();
    }, [loadDrafts])
  );

  const filteredTemplates = selectedCategory
    ? WORKSHEET_TEMPLATES.filter((t) => t.category === selectedCategory)
    : WORKSHEET_TEMPLATES;

  const renderHeader = () => (
    <View>
      {/* Drafts banner */}
      {drafts.length > 0 && (
        <TouchableOpacity
          style={styles.draftBanner}
          onPress={() => {
            const draft = drafts[0];
            navigation.navigate('WorksheetForm', {
              templateId: draft.template_id,
              entryId: draft.id,
              resumeDraft: true,
            });
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="pencil" size={18} color={Colors.secondary} />
          <Text style={styles.draftBannerText}>
            You have {drafts.length} draft{drafts.length > 1 ? 's' : ''} in
            progress
          </Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.secondary} />
        </TouchableOpacity>
      )}

      {/* Category filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterRowContent}
      >
        {CATEGORIES.map((cat) => {
          const active = selectedCategory === cat.value;
          return (
            <TouchableOpacity
              key={cat.label}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setSelectedCategory(cat.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterChipText,
                  active && styles.filterChipTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={filteredTemplates}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <WorksheetTemplateCard
            template={item}
            onPress={() =>
              navigation.navigate('WorksheetForm', { templateId: item.id })
            }
          />
        )}
      />
    </View>
  );
};

export default WorksheetLibraryScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  row: {
    justifyContent: 'space-between',
  },
  draftBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.secondary + '12',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.secondary + '30',
  },
  draftBannerText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.secondary,
    flex: 1,
  },
  filterRow: {
    marginBottom: Spacing.md,
  },
  filterRowContent: {
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  filterChipTextActive: {
    fontFamily: Fonts.secondaryBold,
    color: Colors.white,
  },
});
