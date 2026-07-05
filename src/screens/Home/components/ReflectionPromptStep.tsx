import React, { useRef, useEffect } from 'react';
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
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../constants/theme';
import { AppMessage } from '../../Tools/components/AppMessage';
import { ReflectionPrompt } from '../../../services/challengeReflectionConfig';

interface ReflectionPromptStepProps {
  prompt: ReflectionPrompt;
  value: string;
  onChange: (value: string) => void;
  color: string;
}

// The choice input encodes its state into the plain answer string so the flow,
// note-building, and storage stay string-based:
//   yes            → the yes label verbatim
//   no             → the no label verbatim
//   no + follow-up → "<no label> — <follow-up answer>"
const CHOICE_JOIN = ' — ';

const parseChoice = (value: string, yesLabel: string, noLabel: string) => {
  if (value === yesLabel) return { selected: 'yes' as const, followup: '' };
  if (value === noLabel) return { selected: 'no' as const, followup: '' };
  if (value.startsWith(noLabel + CHOICE_JOIN)) {
    return { selected: 'no' as const, followup: value.slice(noLabel.length + CHOICE_JOIN.length) };
  }
  return { selected: null, followup: '' };
};

const buildChoice = (
  selected: 'yes' | 'no' | null,
  followup: string,
  yesLabel: string,
  noLabel: string
): string => {
  if (selected === 'yes') return yesLabel;
  if (selected === 'no') {
    const f = followup.trim();
    return f ? noLabel + CHOICE_JOIN + f : noLabel;
  }
  return '';
};

/**
 * One reflection prompt per screen — a chat-style question bubble + the
 * prompt's input: a textarea ('text'), a single takeaway line ('oneliner'),
 * or a yes/no tap with an optional follow-up line on "no" ('choice').
 * Shared verbatim by the post-challenge reflection and the practice Capture.
 */
export const ReflectionPromptStep: React.FC<ReflectionPromptStepProps> = ({
  prompt,
  value,
  onChange,
  color,
}) => {
  const inputRef = useRef<TextInput>(null);
  const input = prompt.input ?? 'text';

  // Focus after the prompt bubble has animated in (typed inputs only).
  useEffect(() => {
    if (input === 'choice') return;
    const timer = setTimeout(() => inputRef.current?.focus(), 800);
    return () => clearTimeout(timer);
  }, [prompt.id]);

  const yesLabel = prompt.yes_label?.trim() || 'Yes';
  const noLabel = prompt.no_label?.trim() || 'No';
  const choice = parseChoice(value, yesLabel, noLabel);

  const tapChoice = (side: 'yes' | 'no') => {
    // Tap again to clear; switching sides drops the follow-up.
    const next = choice.selected === side ? null : side;
    onChange(buildChoice(next, next === 'no' ? choice.followup : '', yesLabel, noLabel));
  };

  const renderInput = () => {
    if (input === 'choice') {
      return (
        <>
          <View style={styles.choiceRow}>
            <TouchableOpacity
              style={[
                styles.choiceBtn,
                choice.selected === 'yes' && { backgroundColor: Colors.gray, borderColor: Colors.gray },
              ]}
              onPress={() => tapChoice('yes')}
              activeOpacity={0.8}
            >
              <Text style={[styles.choiceText, choice.selected === 'yes' && styles.choiceTextActive]}>
                {yesLabel}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.choiceBtn,
                choice.selected === 'no' && { backgroundColor: color, borderColor: color },
              ]}
              onPress={() => tapChoice('no')}
              activeOpacity={0.8}
            >
              <Text style={[styles.choiceText, choice.selected === 'no' && styles.choiceTextActive]}>
                {noLabel}
              </Text>
            </TouchableOpacity>
          </View>

          {choice.selected === 'no' && !!prompt.followup_prompt && (
            <View style={styles.followup}>
              <Text style={styles.followupLabel}>{prompt.followup_prompt}</Text>
              <TextInput
                style={[styles.textInput, styles.onelinerInput]}
                value={choice.followup}
                onChangeText={(t) => onChange(buildChoice('no', t, yesLabel, noLabel))}
                placeholder={prompt.followup_placeholder}
                placeholderTextColor={Colors.gray + '80'}
              />
            </View>
          )}
        </>
      );
    }

    const oneliner = input === 'oneliner';
    return (
      <>
        <View style={styles.inputWrapper}>
          <TextInput
            ref={inputRef}
            style={[styles.textInput, oneliner && styles.onelinerInput]}
            value={value}
            onChangeText={onChange}
            placeholder={prompt.placeholder}
            placeholderTextColor={Colors.gray + '80'}
            multiline={!oneliner}
            numberOfLines={oneliner ? 1 : 5}
            textAlignVertical={oneliner ? 'center' : 'top'}
            maxLength={prompt.max_length}
          />
        </View>

        {prompt.max_length ? (
          <Text style={styles.charCount}>
            {value.length}/{prompt.max_length}
          </Text>
        ) : null}
      </>
    );
  };

  return (
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
        <AppMessage
          message={prompt.prompt}
          subtitle={prompt.helper_text}
          color={color}
          delay={400}
        />

        <Text style={styles.optionalBadge}>Optional — skip if it doesn't apply</Text>

        {renderInput()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

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
    marginBottom: Spacing.md,
    fontStyle: 'italic',
  },
  inputWrapper: {
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
    minHeight: 140,
    lineHeight: 22,
  },
  onelinerInput: {
    minHeight: 0,
    lineHeight: 20,
  },
  charCount: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },

  choiceRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  choiceBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: 'center',
  },
  choiceText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    textAlign: 'center',
  },
  choiceTextActive: { color: Colors.white },

  followup: {
    marginTop: Spacing.md,
  },
  followupLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
});
