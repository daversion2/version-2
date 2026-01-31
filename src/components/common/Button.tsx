import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { Colors, Fonts, FontSizes, BorderRadius, Spacing } from '../../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}) => {
  const bgColor =
    variant === 'primary'
      ? Colors.secondary
      : variant === 'secondary'
      ? Colors.primary
      : 'transparent';

  const textColor =
    variant === 'outline' ? Colors.primary : Colors.white;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        { backgroundColor: bgColor },
        variant === 'outline' && styles.outline,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.text, { color: textColor }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outline: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    fontWeight: '700',
  },
});
