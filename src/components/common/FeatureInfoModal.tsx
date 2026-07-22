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

interface Props {
  visible: boolean;
  onDismiss: () => void;
  icon: keyof typeof Ionicons.glyphMap;
  /** Accent color for the icon + accents. Defaults to the brand teal. */
  accent?: string;
  title: string;
  /** One or two sentences framing what the feature is. */
  intro: string;
  /** How-to steps, rendered as a bold label + description list. */
  points: FeatureInfoPoint[];
  /** Optional closing line, shown italic. */
  footer?: string;
}

/**
 * Reusable "what is this feature / how do I use it" popup, opened from a
 * small info (ⓘ) button. Matches the app's centered-card modal convention.
 */
export const FeatureInfoModal: React.FC<Props> = ({
  visible,
  onDismiss,
  icon,
  accent = Colors.primary,
  title,
  intro,
  points,
  footer,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable style={styles.card} onPress={() => {}}>
          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            <View style={[styles.iconWrap, { backgroundColor: accent }]}>
              <Ionicons name={icon} size={28} color={Colors.white} />
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.intro}>{intro}</Text>

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

            {footer ? <Text style={styles.footer}>{footer}</Text> : null}
          </ScrollView>

          <Button title="Got it" onPress={onDismiss} style={styles.button} />
        </Pressable>
      </Pressable>
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
  points: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
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
