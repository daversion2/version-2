import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../constants/theme';
import { AppMessage } from '../../Tools/components/AppMessage';
import {
  MIND_REFLECTION_PROMPT,
  MIND_REFLECTION_HELPER,
  MIND_TAG_GROUPS,
} from '../../../data/mindTags';

interface MindReflectionStepProps {
  text: string;
  onChangeText: (value: string) => void;
  selectedTags: string[];
  onToggleTag: (id: string) => void;
  color: string;
  /** Optional block rendered above the question — e.g. the "Your pattern" recall. */
  header?: React.ReactNode;
}

/**
 * The single reflection step — "What did you notice your mind doing?" —
 * answered by tapping mind tags (grouped Struggle / Steady) and/or writing it
 * out. Shared verbatim by the post-challenge reflection and the practice
 * Capture flow.
 */
export const MindReflectionStep: React.FC<MindReflectionStepProps> = ({
  text,
  onChangeText,
  selectedTags,
  onToggleTag,
  color,
  header,
}) => (
  <KeyboardAvoidingView
    style={styles.flex}
    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    keyboardVerticalOffset={120}
  >
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {header}

      <AppMessage
        message={MIND_REFLECTION_PROMPT}
        subtitle={MIND_REFLECTION_HELPER}
        color={color}
        delay={400}
      />

      <Text style={styles.optionalBadge}>Optional — skip if it doesn't apply</Text>

      {MIND_TAG_GROUPS.map((group) => (
        <View key={group.id} style={styles.group}>
          <Text style={styles.groupTitle}>{group.title}</Text>
          {group.tags.map((tag) => {
            const active = selectedTags.includes(tag.id);
            return (
              <TouchableOpacity
                key={tag.id}
                style={[
                  styles.tagRow,
                  active && { borderColor: color, backgroundColor: color + '14' },
                ]}
                onPress={() => onToggleTag(tag.id)}
                activeOpacity={0.8}
              >
                <View style={styles.tagTextWrap}>
                  <Text style={[styles.tagLabel, active && { color }]}>{tag.label}</Text>
                  <Text style={styles.tagDescription}>{tag.description}</Text>
                </View>
                <View style={[styles.tagCheck, active && { borderColor: color, backgroundColor: color }]}>
                  {active && <Ionicons name="checkmark" size={14} color={Colors.white} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      <Text style={styles.writeLabel}>Write it out</Text>
      <TextInput
        style={styles.textInput}
        value={text}
        onChangeText={onChangeText}
        placeholder="My mind was…"
        placeholderTextColor={Colors.gray + '80'}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />
    </ScrollView>
  </KeyboardAvoidingView>
);

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  optionalBadge: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginBottom: Spacing.sm,
    fontStyle: 'italic',
  },

  group: {
    marginBottom: Spacing.md,
  },
  groupTitle: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    marginBottom: Spacing.sm,
  },
  tagTextWrap: {
    flex: 1,
  },
  tagLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  tagDescription: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 2,
    lineHeight: 16,
  },
  tagCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  writeLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  textInput: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.md,
    minHeight: 100,
    lineHeight: 22,
  },
});
