import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BorderRadius, Colors, Spacing, TextStyles } from '../../constants/theme';
import { Copy } from '../../components/common/Copy';
import type { CatalogApp } from '../../data/appCatalog';

// =============================================================================
// Pieces shared by the Apps screen and an app's own page: the icon tile, the
// pill button (App Store style "Add" / "Open"), the featured card and a row.
// Contrast: app colours are fills behind white icons (3:1 for icons), never
// text colours; all text is dark or grey on white or a light tint.
// =============================================================================

type IconName = keyof typeof Ionicons.glyphMap;

/** The app's icon on its colour, iOS-style rounded square. */
export const AppIcon: React.FC<{ app: CatalogApp; size?: number }> = ({ app, size = 52 }) => (
  <View
    style={[styles.icon, { width: size, height: size, borderRadius: size * 0.27, backgroundColor: app.color }]}
    accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
  >
    <Ionicons name={app.icon as IconName} size={size * 0.54} color={Colors.white} />
  </View>
);

/** "Add", "Open", "On Today": the small rounded button on the right of a row. */
export const PillButton: React.FC<{
  label: string;
  onPress?: () => void;
  kind: 'filled' | 'outline' | 'done';
  busy?: boolean;
  accessibilityLabel: string;
}> = ({ label, onPress, kind, busy, accessibilityLabel }) => {
  if (kind === 'done') {
    return (
      <View style={[styles.pill, styles.pillDone]} accessibilityLabel={accessibilityLabel}>
        <Ionicons name="checkmark" size={15} color={Colors.primary} />
        <Text style={[styles.pillText, styles.pillTextDone]}>{label}</Text>
      </View>
    );
  }
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={busy}
      style={[styles.pill, kind === 'filled' ? styles.pillFilled : styles.pillOutline]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
    >
      {busy ? (
        <ActivityIndicator size="small" color={kind === 'filled' ? Colors.white : Colors.primary} />
      ) : (
        <Text style={[styles.pillText, kind === 'filled' ? styles.pillTextFilled : styles.pillTextOutline]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

/** A coloured dot and a word: "New", "On Today". Dark text, so it reads on any tint. */
export const Badge: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <View style={styles.badge}>
    <View style={[styles.badgeDot, { backgroundColor: color }]} />
    <Text style={styles.badgeText}>{label}</Text>
  </View>
);

/** A big card for the top of the Apps screen: tinted band, icon, name, tagline, one action. */
export const FeaturedCard: React.FC<{
  app: CatalogApp;
  width: number;
  badge: string;
  action: React.ReactNode;
  onPress: () => void;
}> = ({ app, width, badge, action, onPress }) => (
  <TouchableOpacity
    activeOpacity={0.85}
    onPress={onPress}
    style={[styles.featured, { width }]}
    accessibilityRole="button"
    accessibilityLabel={`${app.name}. ${app.tagline}. ${badge}`}
  >
    <View style={[styles.featuredBand, { backgroundColor: app.color + '1F' }]}>
      <Ionicons
        name={app.icon as IconName}
        size={132}
        color={app.color + '33'}
        style={styles.featuredWatermark}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <AppIcon app={app} size={64} />
      <Badge color={app.color} label={badge} />
    </View>
    <View style={styles.featuredBody}>
      <View style={styles.featuredText}>
        <Copy id={`apps.catalog.${app.id}.name`} style={styles.featuredName} numberOfLines={1}>
          {app.name}
        </Copy>
        <Copy id={`apps.catalog.${app.id}.tagline`} style={styles.featuredTagline} numberOfLines={2}>
          {app.tagline}
        </Copy>
      </View>
      {action}
    </View>
  </TouchableOpacity>
);

/** One app in a white panel: icon, name, tagline, an action on the right. */
export const AppRow: React.FC<{
  app: CatalogApp;
  subtitle?: string;
  action: React.ReactNode;
  onPress: () => void;
  separator?: boolean;
}> = ({ app, subtitle, action, onPress, separator }) => (
  <TouchableOpacity
    activeOpacity={0.7}
    onPress={onPress}
    style={styles.row}
    accessibilityRole="button"
    accessibilityLabel={`${app.name}. ${subtitle ?? app.tagline}`}
  >
    <AppIcon app={app} />
    <View style={[styles.rowMain, separator && styles.rowSeparator]}>
      <View style={styles.rowText}>
        <Copy id={`apps.catalog.${app.id}.name`} style={styles.rowName} numberOfLines={1}>
          {app.name}
        </Copy>
        {subtitle ? (
          <Text style={styles.rowSubtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : (
          <Copy id={`apps.catalog.${app.id}.tagline`} style={styles.rowSubtitle} numberOfLines={2}>
            {app.tagline}
          </Copy>
        )}
      </View>
      {action}
    </View>
  </TouchableOpacity>
);

/** A white rounded panel with an optional small header above it. */
export const Panel: React.FC<{ title?: string; footer?: string; children: React.ReactNode; style?: ViewStyle }> = ({
  title,
  footer,
  children,
  style,
}) => (
  <View style={[styles.group, style]}>
    {title ? (
      <Text style={styles.groupTitle} accessibilityRole="header">
        {title}
      </Text>
    ) : null}
    <View style={styles.panel}>{children}</View>
    {footer ? <Text style={styles.groupFooter}>{footer}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  icon: { alignItems: 'center', justifyContent: 'center' },

  pill: {
    minWidth: 76,
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  pillFilled: { backgroundColor: Colors.primary },
  pillOutline: { backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.primary },
  pillDone: { backgroundColor: 'transparent', paddingHorizontal: 4, minWidth: 0 },
  pillText: { ...TextStyles.subhead, fontWeight: '700' },
  pillTextFilled: { color: Colors.white },
  pillTextOutline: { color: Colors.primary },
  pillTextDone: { color: Colors.primary },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeDot: { width: 8, height: 8, borderRadius: 4 },
  badgeText: { ...TextStyles.caption, fontWeight: '700', color: Colors.dark, letterSpacing: 0.3 },

  featured: { backgroundColor: Colors.cardBg, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  featuredBand: {
    height: 132,
    padding: Spacing.md,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  featuredWatermark: { position: 'absolute', right: -18, top: -8 },
  featuredBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  featuredText: { flex: 1, gap: 2 },
  featuredName: { ...TextStyles.title3, color: Colors.dark },
  featuredTagline: { ...TextStyles.subhead, color: Colors.gray },

  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: Spacing.md, gap: 14 },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 12,
    paddingRight: Spacing.md,
    minHeight: 76,
  },
  rowSeparator: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.separator },
  rowText: { flex: 1, gap: 2 },
  rowName: { ...TextStyles.headline, color: Colors.dark },
  rowSubtitle: { ...TextStyles.footnote, color: Colors.gray },

  group: { gap: 6 },
  groupTitle: { ...TextStyles.title3, color: Colors.dark, paddingHorizontal: 4, marginBottom: 2 },
  groupFooter: { ...TextStyles.footnote, color: Colors.gray, paddingHorizontal: Spacing.md },
  panel: { backgroundColor: Colors.cardBg, borderRadius: BorderRadius.lg, overflow: 'hidden' },
});
