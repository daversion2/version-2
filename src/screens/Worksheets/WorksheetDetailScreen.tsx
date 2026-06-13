import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { SectionRenderer } from '../../components/worksheets/SectionRenderer';
import { Button } from '../../components/common/Button';
import {
  getWorksheetEntryById,
  deleteWorksheetEntry,
} from '../../services/worksheets';
import { getGoalById } from '../../services/goals';
import { useAuth } from '../../context/AuthContext';
import { useTools } from '../../context/ToolsContext';
import { showAlert, showConfirm } from '../../utils/alert';
import { WorksheetEntry, WorksheetTemplate } from '../../types';
import { WorksheetsScreenProps } from '../../types/navigation';

type Props = WorksheetsScreenProps<'WorksheetDetail'>;

export const WorksheetDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { entryId } = route.params;
  const { user } = useAuth();
  const { getToolById } = useTools();
  const [entry, setEntry] = useState<WorksheetEntry | null>(null);
  const [template, setTemplate] = useState<WorksheetTemplate | null>(null);
  const [goalNames, setGoalNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !entryId) return;
    getWorksheetEntryById(user.uid, entryId)
      .then(async (e) => {
        setEntry(e);
        if (e) {
          const t = getToolById(e.template_id);
          setTemplate(t || null);
          navigation.setOptions({ title: e.template_name });

          // Look up goal names from IDs
          if (e.goal_ids && e.goal_ids.length > 0) {
            const names: Record<string, string> = {};
            await Promise.all(
              e.goal_ids.map(async (goalId) => {
                try {
                  const goal = await getGoalById(user.uid, goalId);
                  names[goalId] = goal?.name || goalId;
                } catch {
                  names[goalId] = goalId;
                }
              })
            );
            setGoalNames(names);
          }
        }
      })
      .catch((error) => {
        console.error('Failed to load worksheet entry:', error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user, entryId, navigation]);

  const handleDelete = () => {
    if (!user || !entry) return;
    showConfirm(
      'Delete Entry',
      'This worksheet entry will be permanently deleted.',
      async () => {
        await deleteWorksheetEntry(user.uid, entry.id);
        navigation.goBack();
      },
      'Delete'
    );
  };

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!entry || !template) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Entry not found.</Text>
      </View>
    );
  }

  const moodDelta =
    entry.mood_before && entry.mood_after
      ? entry.mood_after - entry.mood_before
      : null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Meta header */}
      <View style={styles.metaCard}>
        <Text style={styles.dateText}>{formatDate(entry.completed_at)}</Text>

        {/* Mood indicators */}
        {(entry.mood_before || entry.mood_after) && (
          <View style={styles.moodRow}>
            {entry.mood_before && (
              <View style={styles.moodItem}>
                <Text style={styles.moodLabel}>Before</Text>
                <Text style={styles.moodValue}>{entry.mood_before}/10</Text>
              </View>
            )}
            {moodDelta !== null && (
              <View style={styles.moodArrow}>
                <Ionicons
                  name={
                    moodDelta > 0
                      ? 'arrow-forward'
                      : moodDelta < 0
                      ? 'arrow-forward'
                      : 'remove'
                  }
                  size={20}
                  color={
                    moodDelta > 0
                      ? '#2E7D32'
                      : moodDelta < 0
                      ? '#D32F2F'
                      : Colors.gray
                  }
                />
              </View>
            )}
            {entry.mood_after && (
              <View style={styles.moodItem}>
                <Text style={styles.moodLabel}>After</Text>
                <Text style={styles.moodValue}>{entry.mood_after}/10</Text>
              </View>
            )}
            {moodDelta !== null && moodDelta !== 0 && (
              <View
                style={[
                  styles.deltaBadge,
                  {
                    backgroundColor:
                      moodDelta > 0 ? '#2E7D32' + '15' : '#D32F2F' + '15',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.deltaText,
                    { color: moodDelta > 0 ? '#2E7D32' : '#D32F2F' },
                  ]}
                >
                  {moodDelta > 0 ? '+' : ''}
                  {moodDelta}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Points */}
        {entry.points_awarded ? (
          <View style={styles.pointsRow}>
            <Ionicons name="flash" size={14} color={Colors.secondary} />
            <Text style={styles.pointsText}>
              +{entry.points_awarded} XP
            </Text>
          </View>
        ) : null}
      </View>

      {/* Sections (read-only) */}
      {template.sections.map((section) => (
        <SectionRenderer
          key={section.id}
          section={section}
          responses={entry.responses}
          onResponseChange={() => {}}
          readOnly
        />
      ))}

      {/* Goal tags */}
      {entry.goal_ids && entry.goal_ids.length > 0 && (
        <View style={styles.goalTagsContainer}>
          <Text style={styles.goalTagsLabel}>Linked Goals</Text>
          <View style={styles.goalTags}>
            {entry.goal_ids.map((id) => (
              <View key={id} style={styles.goalTag}>
                <Ionicons name="flag" size={12} color={Colors.primary} />
                <Text style={styles.goalTagText}>{goalNames[id] || id}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Delete */}
      <Button
        title="Delete Entry"
        onPress={handleDelete}
        variant="outline"
        style={styles.deleteButton}
      />
    </ScrollView>
  );
};

export default WorksheetDetailScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
  },
  metaCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  dateText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.sm,
  },
  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  moodItem: {
    alignItems: 'center',
  },
  moodLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  moodValue: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
  },
  moodArrow: {
    paddingTop: Spacing.sm,
  },
  deltaBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginLeft: 'auto',
  },
  deltaText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  pointsText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.secondary,
  },
  goalTagsContainer: {
    marginBottom: Spacing.lg,
  },
  goalTagsLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  goalTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  goalTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary + '15',
  },
  goalTagText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.primary,
  },
  deleteButton: {
    marginTop: Spacing.lg,
    borderColor: '#D32F2F',
  },
});
