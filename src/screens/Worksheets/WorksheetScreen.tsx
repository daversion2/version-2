import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { MoodSelector } from '../../components/worksheets/MoodSelector';
import { SectionRenderer } from '../../components/worksheets/SectionRenderer';
import { GoalTagPicker } from '../../components/goals/GoalTagPicker';
import { Button } from '../../components/common/Button';
import { WORKSHEET_TEMPLATES } from '../../data/worksheetTemplates';
import {
  saveWorksheetEntry,
  updateWorksheetEntry,
  getWorksheetEntryById,
} from '../../services/worksheets';
import { useAuth } from '../../context/AuthContext';
import { showAlert } from '../../utils/alert';
import { WorksheetTemplate } from '../../types';
import { WorksheetsScreenProps } from '../../types/navigation';

type Props = WorksheetsScreenProps<'WorksheetForm'>;

export const WorksheetScreen: React.FC<Props> = ({
  navigation,
  route,
}) => {
  const { templateId, entryId, resumeDraft } = route.params || {};
  const { user } = useAuth();

  const template = WORKSHEET_TEMPLATES.find(
    (t) => t.id === templateId
  ) as WorksheetTemplate;

  const [responses, setResponses] = useState<Record<string, string | string[]>>({});
  const [moodBefore, setMoodBefore] = useState<number | undefined>();
  const [moodAfter, setMoodAfter] = useState<number | undefined>();
  const [goalIds, setGoalIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [tipsExpanded, setTipsExpanded] = useState(false);

  useEffect(() => {
    if (resumeDraft && entryId && user) {
      getWorksheetEntryById(user.uid, entryId).then((entry) => {
        if (entry) {
          setResponses(entry.responses || {});
          setMoodBefore(entry.mood_before);
          setMoodAfter(entry.mood_after);
          setGoalIds(entry.goal_ids || []);
        }
      });
    }
  }, [resumeDraft, entryId, user]);

  useEffect(() => {
    if (template) {
      navigation.setOptions({ title: template.name });
    }
  }, [template, navigation]);

  const handleResponseChange = (fieldId: string, value: string | string[]) => {
    setResponses((prev) => ({ ...prev, [fieldId]: value }));
  };

  const validateRequired = (): boolean => {
    for (const section of template.sections) {
      for (const field of section.fields) {
        if (!field.required) continue;
        const val = responses[field.id];
        if (!val || (Array.isArray(val) && val.length === 0) || val === '') {
          return false;
        }
      }
    }
    return true;
  };

  const handleSave = async (asDraft: boolean) => {
    if (!user) return;

    if (!asDraft && !validateRequired()) {
      showAlert(
        'Missing Fields',
        'Please fill in all required fields before completing.'
      );
      return;
    }

    setSaving(true);
    try {
      if (resumeDraft && entryId) {
        const result = await updateWorksheetEntry(user.uid, entryId, {
          responses,
          mood_after: moodAfter,
          is_draft: asDraft,
          goal_ids: goalIds,
        });
        if (!asDraft && result.pointsAwarded > 0) {
          showAlert(
            'Worksheet Complete',
            `+${result.pointsAwarded} XP earned!`
          );
        } else if (asDraft) {
          showAlert('Draft Saved', 'You can resume this worksheet anytime.');
        }
      } else {
        const result = await saveWorksheetEntry(user.uid, {
          template_id: template.id,
          template_name: template.name,
          responses,
          mood_before: moodBefore,
          mood_after: moodAfter,
          goal_ids: goalIds.length > 0 ? goalIds : undefined,
          is_draft: asDraft,
        });
        if (!asDraft && result.pointsAwarded > 0) {
          showAlert(
            'Worksheet Complete',
            `+${result.pointsAwarded} XP earned!`
          );
        } else if (asDraft) {
          showAlert('Draft Saved', 'You can resume this worksheet anytime.');
        }
      }
      navigation.goBack();
    } catch (e: any) {
      showAlert('Error', e.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  if (!template) {
    return (
      <View style={styles.centered}>
        <Text>Template not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.whenToUse}>{template.when_to_use}</Text>

        {/* Collapsible tips */}
        {template.tips && template.tips.length > 0 && (
          <View style={styles.tipsContainer}>
            <TouchableOpacity
              style={styles.tipsToggle}
              onPress={() => setTipsExpanded(!tipsExpanded)}
              activeOpacity={0.7}
            >
              <Ionicons
                name="bulb-outline"
                size={16}
                color={Colors.primary}
              />
              <Text style={styles.tipsToggleText}>Tips</Text>
              <Ionicons
                name={tipsExpanded ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={Colors.primary}
              />
            </TouchableOpacity>
            {tipsExpanded && (
              <View style={styles.tipsList}>
                {template.tips.map((tip, i) => (
                  <Text key={i} style={styles.tipText}>
                    {'\u2022'} {tip}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}
      </View>

      {/* Mood Before */}
      <MoodSelector
        label="How are you feeling right now?"
        value={moodBefore}
        onChange={setMoodBefore}
      />

      {/* Sections */}
      {template.sections.map((section) => (
        <SectionRenderer
          key={section.id}
          section={section}
          responses={responses}
          onResponseChange={handleResponseChange}
        />
      ))}

      {/* Goal Linking */}
      <GoalTagPicker selectedGoalIds={goalIds} onChange={setGoalIds} />

      {/* Mood After */}
      <View style={styles.moodAfterContainer}>
        <MoodSelector
          label="How are you feeling now?"
          value={moodAfter}
          onChange={setMoodAfter}
        />
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="Save Draft"
          onPress={() => handleSave(true)}
          variant="outline"
          loading={saving}
          style={styles.draftButton}
        />
        <Button
          title="Complete"
          onPress={() => handleSave(false)}
          variant="primary"
          loading={saving}
        />
      </View>
    </ScrollView>
  );
};

export default WorksheetScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl + Spacing.xl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    marginBottom: Spacing.lg,
  },
  whenToUse: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    fontStyle: 'italic',
    marginBottom: Spacing.sm,
  },
  tipsContainer: {
    marginTop: Spacing.sm,
  },
  tipsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  tipsToggleText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  tipsList: {
    marginTop: Spacing.sm,
    paddingLeft: Spacing.sm,
  },
  tipText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginBottom: Spacing.xs,
    lineHeight: 20,
  },
  moodAfterContainer: {
    marginTop: Spacing.lg,
  },
  actions: {
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
  draftButton: {
    marginBottom: 0,
  },
});
