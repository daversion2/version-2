import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { InputField } from './InputField';
import { Dropdown } from './Dropdown';
import { TextStyleOverride, TextSizeToken } from '../../services/onboardingConfig';

/**
 * A copy field with an inline-formatting toolbar. The text itself carries
 * **bold** / *italic* / _underline_ markers (wrapped around the current
 * selection, or the whole field when nothing is selected); font size and
 * alignment are stored as a separate TextStyleOverride.
 */
interface FormattedFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  override: TextStyleOverride;
  onChangeOverride: (override: TextStyleOverride) => void;
  multiline?: boolean;
  numberOfLines?: number;
}

const SIZE_OPTIONS: { value: string; label: string }[] = [
  { value: 'default', label: 'Default size' },
  { value: 'xs', label: 'Extra small' },
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
  { value: 'xl', label: 'Extra large' },
  { value: 'xxl', label: 'Huge' },
  { value: 'hero', label: 'Hero' },
];

const ALIGNS: { value: 'left' | 'center' | 'right'; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'left', icon: 'menu-outline' },
  { value: 'center', icon: 'reorder-three-outline' },
  { value: 'right', icon: 'menu-outline' },
];

const MARKERS: { delim: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { delim: '**', icon: 'text' },
  { delim: '*', icon: 'text-outline' },
  { delim: '_', icon: 'remove-outline' },
];

export const FormattedField: React.FC<FormattedFieldProps> = ({
  label,
  value,
  onChangeText,
  override,
  onChangeOverride,
  multiline,
  numberOfLines,
}) => {
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  // Wrap the current selection (or the whole field, if none) in `delim`.
  const wrap = (delim: string) => {
    let { start, end } = selection;
    if (start === end) {
      start = 0;
      end = value.length;
    }
    const next =
      value.slice(0, start) + delim + value.slice(start, end) + delim + value.slice(end);
    onChangeText(next);
  };

  const setSize = (size?: TextSizeToken) => {
    const next: TextStyleOverride = { ...override };
    if (size) next.size = size;
    else delete next.size;
    onChangeOverride(next);
  };

  const setAlign = (align: 'left' | 'center' | 'right') => {
    const next: TextStyleOverride = { ...override };
    if (override.align === align) delete next.align; // toggle off → inherit base
    else next.align = align;
    onChangeOverride(next);
  };

  return (
    <View style={styles.container}>
      <InputField
        label={label}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        numberOfLines={numberOfLines}
        onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
      />
      <View style={styles.toolbar}>
        {MARKERS.map((m) => (
          <TouchableOpacity key={m.delim} style={styles.markerBtn} onPress={() => wrap(m.delim)} hitSlop={6}>
            <Text
              style={[
                styles.markerLabel,
                m.delim === '**' && styles.markerBold,
                m.delim === '*' && styles.markerItalic,
                m.delim === '_' && styles.markerUnderline,
              ]}
            >
              {m.delim === '**' ? 'B' : m.delim === '*' ? 'I' : 'U'}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={styles.divider} />
        {ALIGNS.map((a) => {
          const active = override.align === a.value;
          return (
            <TouchableOpacity
              key={a.value}
              style={[styles.alignBtn, active && styles.alignBtnActive]}
              onPress={() => setAlign(a.value)}
              hitSlop={6}
            >
              <Ionicons
                name={a.icon}
                size={16}
                color={active ? Colors.primary : Colors.gray}
                style={a.value === 'right' ? styles.flipX : undefined}
              />
            </TouchableOpacity>
          );
        })}
        <View style={styles.sizeWrap}>
          <Dropdown
            options={SIZE_OPTIONS}
            selected={override.size ?? 'default'}
            onSelect={(v) => setSize(v === 'default' ? undefined : (v as TextSizeToken))}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.sm },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.sm,
  },
  markerBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  markerBold: { fontFamily: Fonts.secondaryBold },
  markerItalic: { fontStyle: 'italic' },
  markerUnderline: { textDecorationLine: 'underline' },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.xs,
  },
  alignBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alignBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '12',
  },
  flipX: { transform: [{ scaleX: -1 }] },
  sizeWrap: {
    flex: 1,
    minWidth: 140,
  },
});
