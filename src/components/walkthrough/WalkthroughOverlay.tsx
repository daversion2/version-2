import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';

export interface SpotlightLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  visible: boolean;
  spotlightLayout?: SpotlightLayout | null;
  stepText: string;
  stepNumber: number;
  totalSteps: number;
  isLast: boolean;
  onNext: () => void;
  onSkip: () => void;
}

const PADDING = 8;
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export const WalkthroughOverlay: React.FC<Props> = ({
  visible,
  spotlightLayout,
  stepText,
  stepNumber,
  totalSteps,
  isLast,
  onNext,
  onSkip,
}) => {
  if (!visible) return null;

  // Full-screen mode (no spotlight)
  if (!spotlightLayout) {
    return (
      <Modal transparent visible animationType="fade" statusBarTranslucent>
        <View style={[StyleSheet.absoluteFill, styles.fullBackdrop]}>
          <View style={styles.centeredTooltip}>
            <Text style={styles.stepIndicator}>{stepNumber + 1} of {totalSteps}</Text>
            <Text style={styles.tooltipText}>{stepText}</Text>
            <View style={styles.tooltipActions}>
              <TouchableOpacity onPress={onSkip}>
                <Text style={styles.skipText}>Skip tour</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.nextBtn} onPress={onNext}>
                <Text style={styles.nextText}>{isLast ? 'Got it' : 'Next'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // Spotlight mode
  const cutout = {
    x: spotlightLayout.x - PADDING,
    y: spotlightLayout.y - PADDING,
    width: spotlightLayout.width + PADDING * 2,
    height: spotlightLayout.height + PADDING * 2,
  };

  const tooltipBelow = cutout.y + cutout.height + 12 + 180 < SCREEN_H;
  const tooltipTop = tooltipBelow
    ? cutout.y + cutout.height + 12
    : cutout.y - 12 - 180;

  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent>
      <View style={StyleSheet.absoluteFill}>
        {/* Top bar */}
        <View style={[styles.backdrop, { top: 0, left: 0, right: 0, height: cutout.y }]} />
        {/* Left bar */}
        <View
          style={[
            styles.backdrop,
            { top: cutout.y, left: 0, width: cutout.x, height: cutout.height },
          ]}
        />
        {/* Right bar */}
        <View
          style={[
            styles.backdrop,
            {
              top: cutout.y,
              left: cutout.x + cutout.width,
              right: 0,
              height: cutout.height,
            },
          ]}
        />
        {/* Bottom bar */}
        <View
          style={[
            styles.backdrop,
            { top: cutout.y + cutout.height, left: 0, right: 0, bottom: 0 },
          ]}
        />

        {/* Cutout border */}
        <View
          style={[
            styles.cutoutBorder,
            {
              top: cutout.y,
              left: cutout.x,
              width: cutout.width,
              height: cutout.height,
            },
          ]}
        />

        {/* Tooltip */}
        <View style={[styles.tooltip, { top: tooltipTop, left: Spacing.lg, right: Spacing.lg }]}>
          <Text style={styles.stepIndicator}>{stepNumber + 1} of {totalSteps}</Text>
          <Text style={styles.tooltipText}>{stepText}</Text>
          <View style={styles.tooltipActions}>
            <TouchableOpacity onPress={onSkip}>
              <Text style={styles.skipText}>Skip tour</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.nextBtn} onPress={onNext}>
              <Text style={styles.nextText}>{isLast ? 'Got it' : 'Next'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  fullBackdrop: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cutoutBorder: {
    position: 'absolute',
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.secondary,
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  centeredTooltip: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    maxWidth: 340,
    width: '100%',
  },
  stepIndicator: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  tooltipText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    marginBottom: Spacing.md,
    lineHeight: 22,
  },
  tooltipActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  nextBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  nextText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.white,
  },
});
