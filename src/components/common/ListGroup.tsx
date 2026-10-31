import React from 'react';
import { StyleSheet, Text, TouchableHighlight, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BorderRadius, Colors, Spacing, TextStyles } from '../../constants/theme';

// =============================================================================
// GROUPED LIST — the redesign's main building block (iOS Settings style): a
// white rounded panel of rows on the grey background, hairlines between rows
// starting where the text starts, an optional small header above and footer
// note below.
//
//   <ListGroup title="Weekly goals" footer="Change these any time.">
//     <ListRow title="Meditate" value="5 sessions" onPress={…} />
//     <ListRow title="Sign out" tint="accent" onPress={…} chevron={false} />
//   </ListGroup>
// =============================================================================

interface ListGroupProps {
  title?: string;
  footer?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export const ListGroup: React.FC<ListGroupProps> = ({ title, footer, children, style }) => {
  const rows = React.Children.toArray(children).filter(React.isValidElement);
  return (
    <View style={[styles.group, style]}>
      {title ? (
        <Text style={styles.header} accessibilityRole="header">
          {title}
        </Text>
      ) : null}
      <View style={styles.panel}>
        {rows.map((row, i) =>
          React.cloneElement(row as React.ReactElement<ListRowProps>, { separator: i < rows.length - 1 })
        )}
      </View>
      {footer ? <Text style={styles.footer}>{footer}</Text> : null}
    </View>
  );
};

interface ListRowProps {
  title: string;
  subtitle?: string;
  /** Grey text on the right, e.g. "5 sessions". */
  value?: string;
  /** A white glyph on a coloured rounded square, like iOS Settings. */
  icon?: { name: keyof typeof Ionicons.glyphMap; color: string };
  /** Anything else on the right (a Switch, a small chart). Shown before the chevron. */
  right?: React.ReactNode;
  onPress?: () => void;
  /** Defaults to on when the row is tappable. */
  chevron?: boolean;
  /** 'accent' and 'destructive' colour the title, for action rows like Sign out. */
  tint?: 'default' | 'accent' | 'destructive';
  accessibilityLabel?: string;
  /** Set by ListGroup: draw the hairline under this row. */
  separator?: boolean;
}

export const ListRow: React.FC<ListRowProps> = ({
  title,
  subtitle,
  value,
  icon,
  right,
  onPress,
  chevron,
  tint = 'default',
  accessibilityLabel,
  separator,
}) => {
  const showChevron = chevron ?? !!onPress;
  const titleColor =
    tint === 'accent' ? Colors.primary : tint === 'destructive' ? Colors.danger : Colors.dark;

  const content = (
    <View style={styles.row}>
      {icon ? (
        <View style={[styles.icon, { backgroundColor: icon.color }]}>
          <Ionicons name={icon.name} size={18} color={Colors.white} />
        </View>
      ) : null}
      <View style={[styles.main, separator && styles.separator]}>
        <View style={styles.text}>
          <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {value ? <Text style={styles.value}>{value}</Text> : null}
        {right}
        {showChevron ? <Ionicons name="chevron-forward" size={17} color={Colors.separator} /> : null}
      </View>
    </View>
  );

  if (!onPress) return content;
  return (
    <TouchableHighlight
      onPress={onPress}
      underlayColor={Colors.fill}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? [title, subtitle, value].filter(Boolean).join(', ')}
    >
      {content}
    </TouchableHighlight>
  );
};

const styles = StyleSheet.create({
  group: { gap: 6 },
  header: { ...TextStyles.footnote, color: Colors.gray, paddingHorizontal: Spacing.md },
  footer: { ...TextStyles.footnote, color: Colors.gray, paddingHorizontal: Spacing.md },
  panel: { backgroundColor: Colors.cardBg, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: Spacing.md, minHeight: 44, gap: 14 },
  icon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 11,
    paddingRight: Spacing.md,
    minHeight: 44,
  },
  separator: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.separator },
  text: { flex: 1, gap: 1 },
  title: { ...TextStyles.body },
  subtitle: { ...TextStyles.footnote, color: Colors.gray },
  value: { ...TextStyles.body, color: Colors.gray },
});
