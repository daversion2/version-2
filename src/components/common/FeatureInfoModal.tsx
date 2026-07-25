import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Button } from './Button';

export interface FeatureInfoPoint {
  /** Short bold lead-in, e.g. "Ride it out". */
  label: string;
  /** Explanatory sentence following the label. */
  text: string;
}

export interface FeatureInfoScience {
  /** The claim, e.g. "Naming it turns the volume down". */
  label: string;
  /** The mechanism / research behind the claim. */
  text: string;
}

interface Props {
  visible: boolean;
  onDismiss: () => void;
  icon: keyof typeof Ionicons.glyphMap;
  /** Accent color for the icon + accents. Defaults to the brand teal. */
  accent?: string;
  title: string;
  /** One or two sentences framing what the feature is. */
  intro: string;
  /** How-to steps, rendered as a numbered bold label + description list. */
  points: FeatureInfoPoint[];
  /** The neuroscience / research behind the feature, shown in a tinted card. */
  science?: FeatureInfoScience[];
  /** Optional closing line, shown italic. */
  footer?: string;
}

/** Hex accent → very light tint for the science card background. */
const tint = (hex: string, alpha: number) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * Reusable "what is this feature / how do I use it" popup, opened from a
 * small info (ⓘ) button. Matches the app's centered-card modal convention.
 *
 * Two-part structure: a numbered "How it works" list, then a "Why this works"
 * card carrying the neuroscience — the education is the point, not a footnote.
 */
export const FeatureInfoModal: React.FC<Props> = ({
  visible,
  onDismiss,
  icon,
  accent = Colors.primary,
  title,
  intro,
  points,
  science,
  footer,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        {/* Backdrop is a sibling *behind* the card, not an ancestor of it — a
            Pressable wrapping the ScrollView swallows the scroll gesture. */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
        <View style={styles.card}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator
          >
            <View style={[styles.iconWrap, { backgroundColor: accent }]}>
              <Ionicons name={icon} size={28} color={Colors.white} />
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.intro}>{intro}</Text>

            <Text style={[styles.sectionLabel, { color: accent }]}>HOW IT WORKS</Text>
            <View style={styles.points}>
              {points.map((p, i) => (
                <View key={i} style={styles.point}>
                  <View style={[styles.dot, { backgroundColor: accent }]}>
                    <Text style={styles.dotNum}>{i + 1}</Text>
                  </View>
                  <Text style={styles.pointText}>
                    <Text style={styles.pointLabel}>{p.label}</Text>
                    {`  ${p.text}`}
                  </Text>
                </View>
              ))}
            </View>

            {science?.length ? (
              <View style={[styles.scienceCard, { backgroundColor: tint(accent, 0.07) }]}>
                <View style={styles.scienceHeader}>
                  <Ionicons name="flask" size={14} color={accent} />
                  <Text style={[styles.sectionLabel, styles.scienceHeaderText, { color: accent }]}>
                    WHY THIS WORKS
                  </Text>
                </View>
                {science.map((sItem, i) => (
                  <Text key={i} style={[styles.scienceText, i > 0 && styles.scienceSpaced]}>
                    <Text style={styles.scienceLabel}>{sItem.label}</Text>
                    {`  ${sItem.text}`}
                  </Text>
                ))}
              </View>
            ) : null}

            {footer ? <Text style={styles.footer}>{footer}</Text> : null}
          </ScrollView>

          <Button title="Got it" onPress={onDismiss} style={styles.button} />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 360,
    maxHeight: '85%',
  },
  // flexShrink defaults to 0 in RN — without this the ScrollView grows past the
  // card's maxHeight and clips instead of scrolling.
  scroll: {
    flexShrink: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xs,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  intro: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  points: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  scienceCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  scienceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  scienceHeaderText: {
    marginBottom: 0,
  },
  scienceText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
    marginTop: Spacing.sm,
  },
  scienceSpaced: {
    marginTop: Spacing.md,
  },
  scienceLabel: {
    fontFamily: Fonts.secondaryBold,
    color: Colors.dark,
  },
  point: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  dotNum: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.white,
  },
  pointText: {
    flex: 1,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
  },
  pointLabel: {
    fontFamily: Fonts.secondaryBold,
    color: Colors.dark,
  },
  footer: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: Spacing.lg,
  },
  button: {
    width: '100%',
    marginTop: Spacing.xs,
  },
});
