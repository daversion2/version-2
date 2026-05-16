import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { getWorksheetHistory } from '../../services/worksheets';
import { WORKSHEET_TEMPLATES } from '../../data/worksheetTemplates';
import { useAuth } from '../../context/AuthContext';
import { WorksheetEntry } from '../../types';

export const WorksheetHistoryScreen: React.FC<{ navigation: any }> = ({
  navigation,
}) => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<WorksheetEntry[]>([]);
  const [filterTemplateId, setFilterTemplateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const data = await getWorksheetHistory(
      user.uid,
      filterTemplateId || undefined
    );
    setEntries(data);
    setLoading(false);
  }, [user, filterTemplateId]);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const getMoodDelta = (entry: WorksheetEntry): string | null => {
    if (entry.mood_before && entry.mood_after) {
      const delta = entry.mood_after - entry.mood_before;
      if (delta > 0) return `+${delta}`;
      if (delta < 0) return `${delta}`;
      return '0';
    }
    return null;
  };

  const getMoodColor = (entry: WorksheetEntry): string => {
    if (entry.mood_before && entry.mood_after) {
      if (entry.mood_after > entry.mood_before) return '#2E7D32';
      if (entry.mood_after < entry.mood_before) return '#D32F2F';
    }
    return Colors.gray;
  };

  const getFirstResponse = (entry: WorksheetEntry): string => {
    const template = WORKSHEET_TEMPLATES.find(
      (t) => t.id === entry.template_id
    );
    if (!template) return '';
    const firstField = template.sections[0]?.fields[0];
    if (!firstField) return '';
    const val = entry.responses[firstField.id];
    if (typeof val === 'string') return val;
    if (Array.isArray(val)) return val.join(', ');
    return '';
  };

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderEntry = ({ item }: { item: WorksheetEntry }) => {
    const moodDelta = getMoodDelta(item);
    const moodColor = getMoodColor(item);
    const snippet = getFirstResponse(item);

    return (
      <TouchableOpacity
        style={styles.entryCard}
        onPress={() =>
          navigation.navigate('WorksheetDetail', { entryId: item.id })
        }
        activeOpacity={0.7}
      >
        <View style={styles.entryHeader}>
          <Text style={styles.entryTemplateName}>{item.template_name}</Text>
          {moodDelta && (
            <View style={[styles.moodBadge, { backgroundColor: moodColor + '15' }]}>
              <Ionicons
                name={
                  item.mood_after! > item.mood_before!
                    ? 'arrow-up'
                    : item.mood_after! < item.mood_before!
                    ? 'arrow-down'
                    : 'remove'
                }
                size={12}
                color={moodColor}
              />
              <Text style={[styles.moodBadgeText, { color: moodColor }]}>
                {moodDelta}
              </Text>
            </View>
          )}
        </View>
        {snippet ? (
          <Text style={styles.entrySnippet} numberOfLines={2}>
            {snippet}
          </Text>
        ) : null}
        <Text style={styles.entryDate}>{formatDate(item.completed_at)}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterRowContent}
      >
        <TouchableOpacity
          style={[
            styles.filterChip,
            !filterTemplateId && styles.filterChipActive,
          ]}
          onPress={() => setFilterTemplateId(null)}
        >
          <Text
            style={[
              styles.filterChipText,
              !filterTemplateId && styles.filterChipTextActive,
            ]}
            numberOfLines={1}
          >
            All
          </Text>
        </TouchableOpacity>
        {WORKSHEET_TEMPLATES.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[
              styles.filterChip,
              filterTemplateId === t.id && styles.filterChipActive,
            ]}
            onPress={() => setFilterTemplateId(t.id)}
          >
            <Text
              style={[
                styles.filterChipText,
                filterTemplateId === t.id && styles.filterChipTextActive,
              ]}
              numberOfLines={1}
            >
              {t.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Entry list */}
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={renderEntry}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name="document-text-outline"
              size={48}
              color={Colors.border}
            />
            <Text style={styles.emptyText}>
              No completed worksheets yet.{'\n'}Start one from the library!
            </Text>
          </View>
        }
      />
    </View>
  );
};

export default WorksheetHistoryScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  filterRow: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    maxHeight: 64,
  },
  filterRowContent: {
    gap: Spacing.sm,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
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
  listContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  entryCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  entryTemplateName: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  moodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  moodBadgeText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
  },
  entrySnippet: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.xs,
  },
  entryDate: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.md,
  },
  emptyText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
});
