import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, TextStyles } from '../../constants/theme';

/**
 * A sheet that slides up over a dimmed screen, with a grabber on top: the
 * rating sheet, the rest timer. Tapping the dimmed area closes it unless
 * `dismissable` is false (for a sheet that needs an answer).
 */
export const BottomSheet: React.FC<{
  visible: boolean;
  onClose: () => void;
  title?: string;
  dismissable?: boolean;
  children: React.ReactNode;
}> = ({ visible, onClose, title, dismissable = true, children }) => {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={dismissable ? onClose : () => {}}>
      <View style={styles.root}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismissable ? onClose : undefined}
          accessibilityRole="button"
          accessibilityLabel="Close"
          accessible={dismissable}
        >
          <View style={styles.backdrop} />
        </Pressable>
        <View
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Spacing.md) + Spacing.md }]}
          accessibilityViewIsModal
        >
          <View style={styles.grabber} />
          {title ? (
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>
          ) : null}
          {children}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: Colors.overlay },
  sheet: {
    backgroundColor: Colors.cardBg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: Colors.separator },
  title: { ...TextStyles.title2, textAlign: 'center', color: Colors.dark },
});
