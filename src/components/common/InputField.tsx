import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';

interface InputFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export const InputField: React.FC<InputFieldProps> = ({ label, error, ...props }) => (
  <View style={styles.container}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={[styles.input, error ? styles.inputError : null]}
      placeholderTextColor={Colors.gray}
      {...props}
    />
    {error ? <Text style={styles.error}>{error}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.md },
  label: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.xs,
  },
  input: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    backgroundColor: Colors.white,
  },
  inputError: { borderColor: Colors.secondary },
  error: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.secondary,
    marginTop: Spacing.xs,
  },
});
