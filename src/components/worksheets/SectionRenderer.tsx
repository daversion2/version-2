import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { WorksheetSection } from '../../types';
import { InputField } from '../common/InputField';
import { ChecklistField } from './ChecklistField';
import { SingleSelectField } from './SingleSelectField';

interface SectionRendererProps {
  section: WorksheetSection;
  responses: Record<string, string | string[]>;
  onResponseChange: (fieldId: string, value: string | string[]) => void;
  readOnly?: boolean;
}

export const SectionRenderer: React.FC<SectionRendererProps> = ({
  section,
  responses,
  onResponseChange,
  readOnly = false,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      {section.description && (
        <Text style={styles.sectionDescription}>{section.description}</Text>
      )}
      <View style={styles.fieldsContainer}>
        {section.fields.map((field) => {
          const value = responses[field.id];

          if (readOnly) {
            return (
              <View key={field.id} style={styles.readOnlyField}>
                <Text style={styles.readOnlyLabel}>{field.label}</Text>
                <Text style={styles.readOnlyValue}>
                  {Array.isArray(value) ? value.join(', ') : value || '—'}
                </Text>
              </View>
            );
          }

          const fieldLabel = field.required ? `${field.label} *` : field.label;

          switch (field.field_type) {
            case 'text':
              return (
                <View key={field.id}>
                  <InputField
                    label={fieldLabel}
                    value={(value as string) || ''}
                    onChangeText={(text) => onResponseChange(field.id, text)}
                    placeholder={field.placeholder}
                    maxLength={field.max_length}
                  />
                  {field.helper_text && (
                    <Text style={styles.helperText}>{field.helper_text}</Text>
                  )}
                </View>
              );

            case 'textarea':
              return (
                <View key={field.id}>
                  <InputField
                    label={fieldLabel}
                    value={(value as string) || ''}
                    onChangeText={(text) => onResponseChange(field.id, text)}
                    placeholder={field.placeholder}
                    maxLength={field.max_length}
                    multiline
                    numberOfLines={4}
                    style={styles.textareaInput}
                  />
                  {field.helper_text && (
                    <Text style={styles.helperText}>{field.helper_text}</Text>
                  )}
                </View>
              );

            case 'checklist':
              return (
                <ChecklistField
                  key={field.id}
                  label={fieldLabel}
                  options={field.options || []}
                  selectedOptions={(value as string[]) || []}
                  onChange={(selected) => onResponseChange(field.id, selected)}
                  helperText={field.helper_text}
                />
              );

            case 'single_select':
              return (
                <SingleSelectField
                  key={field.id}
                  label={fieldLabel}
                  options={field.options || []}
                  selectedOption={(value as string) || null}
                  onChange={(selected) => onResponseChange(field.id, selected)}
                  helperText={field.helper_text}
                />
              );

            default:
              return null;
          }
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    marginBottom: Spacing.xs,
  },
  sectionDescription: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.md,
    fontStyle: 'italic',
  },
  fieldsContainer: {
    gap: Spacing.xs,
  },
  textareaInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  helperText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    fontStyle: 'italic',
    marginTop: -Spacing.sm,
    marginBottom: Spacing.sm,
  },
  readOnlyField: {
    marginBottom: Spacing.md,
  },
  readOnlyLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.xs,
  },
  readOnlyValue: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    lineHeight: 22,
  },
});
