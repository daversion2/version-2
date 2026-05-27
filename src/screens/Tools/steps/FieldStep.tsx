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
import { WorksheetField } from '../../../types';
import { ChecklistField } from '../../../components/worksheets/ChecklistField';
import { SingleSelectField } from '../../../components/worksheets/SingleSelectField';
import { AppMessage } from '../components/AppMessage';

interface FieldStepProps {
  field: WorksheetField;
  value: string | string[] | undefined;
  onChange: (value: string | string[]) => void;
  color: string;
}

export const FieldStep: React.FC<FieldStepProps> = ({
  field,
  value,
  onChange,
  color,
}) => {
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (field.field_type === 'text' || field.field_type === 'textarea') {
      const timer = setTimeout(() => inputRef.current?.focus(), 800);
      return () => clearTimeout(timer);
    }
  }, [field.id]);

  const renderInput = () => {
    switch (field.field_type) {
      case 'text':
        return (
          <TextInput
            ref={inputRef}
            style={styles.textInput}
            value={(value as string) || ''}
            onChangeText={(text) => onChange(text)}
            placeholder={field.placeholder}
            placeholderTextColor={Colors.gray + '80'}
            maxLength={field.max_length}
            returnKeyType="done"
          />
        );

      case 'textarea':
        return (
          <TextInput
            ref={inputRef}
            style={[styles.textInput, styles.textareaInput]}
            value={(value as string) || ''}
            onChangeText={(text) => onChange(text)}
            placeholder={field.placeholder}
            placeholderTextColor={Colors.gray + '80'}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            maxLength={field.max_length}
          />
        );

      case 'checklist':
        return (
          <ChecklistField
            label=""
            options={field.options || []}
            selectedOptions={(value as string[]) || []}
            onChange={(selected) => onChange(selected)}
            helperText={field.helper_text}
          />
        );

      case 'single_select':
        return (
          <SingleSelectField
            label=""
            options={field.options || []}
            selectedOption={(value as string) || null}
            onChange={(selected) => onChange(selected)}
            helperText={field.helper_text}
          />
        );

      default:
        return null;
    }
  };

  const isTextType = field.field_type === 'text' || field.field_type === 'textarea';

  const content = (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* App prompt message */}
      <AppMessage
        message={field.label}
        subtitle={field.helper_text}
        color={color}
        delay={400}
      />

      {/* Optional badge */}
      {!field.required && (
        <Text style={styles.optionalBadge}>Optional — skip if it doesn't apply</Text>
      )}

      {/* Input area */}
      <View style={styles.inputWrapper}>{renderInput()}</View>

      {/* Character count */}
      {field.max_length && isTextType && (
        <Text style={styles.charCount}>
          {((value as string) || '').length}/{field.max_length}
        </Text>
      )}
    </ScrollView>
  );

  if (isTextType) {
    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={120}
      >
        {content}
      </KeyboardAvoidingView>
    );
  }

  return <View style={styles.flex}>{content}</View>;
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
    lineHeight: 22,
  },
  textareaInput: {
    minHeight: 140,
  },
  charCount: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
});
