import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
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

/**
 * One reflection prompt per screen — a chat-style question bubble + a single
 * auto-focusing textarea. Adapted from the Tools FieldStep, minus the
 * worksheet-field coupling (only ever renders a textarea).
 */
export const ReflectionPromptStep: React.FC<ReflectionPromptStepProps> = ({
  prompt,
  value,
  onChange,
  color,
}) => {
  const inputRef = useRef<TextInput>(null);

  // Focus after the prompt bubble has animated in.
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 800);
    return () => clearTimeout(timer);
  }, [prompt.id]);

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

        <View style={styles.inputWrapper}>
          <TextInput
            ref={inputRef}
            style={styles.textInput}
            value={value}
            onChangeText={onChange}
            placeholder={prompt.placeholder}
            placeholderTextColor={Colors.gray + '80'}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            maxLength={prompt.max_length}
          />
        </View>

        {prompt.max_length ? (
          <Text style={styles.charCount}>
            {value.length}/{prompt.max_length}
          </Text>
        ) : null}
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
  charCount: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
});
