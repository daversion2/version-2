import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Button } from './Button';

interface Props {
  visible: boolean;
  /** Copy from the rule document, so it stays editable without a deploy. */
  title: string;
  body: string;
  ctaLabel?: string;
  /**
   * Runs the real permission request. Resolves true when a push token was
   * obtained — false covers both an OS denial and a simulator, which cannot
   * issue a token at all.
   */
  onEnable: () => Promise<boolean>;
  onDismiss: () => void;
}

/**
 * The push opt-in ask — a pre-permission explainer, not the OS prompt itself.
 *
 * Two reasons it exists rather than calling requestPermissionsAsync directly.
 * iOS grants exactly ONE permission prompt per install: once denied there is no
 * second ask, only a trip to system Settings that nobody makes. So the prompt
 * has to be spent on someone who has already decided yes.
 *
 * And the honest pitch is the ceiling. The reason to say yes here is not "we'll
 * keep you motivated", it's "this will cost you at most three interruptions a
 * week" — a promise the app can now actually keep (see PUSH_BUDGET). The copy
 * lives in the rule document; that number does not, so the default copy states
 * it and the modal states it again below the button where it cannot be edited
 * away by accident.
 *
 * Declining is a real answer. The rule is once_ever, so the app does not ask
 * twice; the dismissal copy points at Settings instead.
 */
export const PushOptInModal: React.FC<Props> = ({
  visible,
  title,
  body,
  ctaLabel,
  onEnable,
  onDismiss,
}) => {
  const [working, setWorking] = useState(false);
  const [denied, setDenied] = useState(false);

  const handleEnable = async () => {
    setWorking(true);
    try {
      const granted = await onEnable();
      if (granted) {
        onDismiss();
        return;
      }
      // Don't dismiss on failure — silently closing would look like it worked.
      setDenied(true);
    } finally {
      setWorking(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Ionicons
            name="notifications-outline"
            size={36}
            color={Colors.primary}
            style={styles.icon}
          />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>

          {denied ? (
            <>
              <Text style={styles.denied}>
                Your phone is blocking notifications for Neuro-Nudge. You can turn them on in
                your device Settings, under Notifications.
              </Text>
              <Button title="Close" onPress={onDismiss} style={styles.button} />
            </>
          ) : (
            <>
              <Button
                title={working ? 'Just a moment…' : ctaLabel?.trim() || 'Turn them on'}
                onPress={handleEnable}
                disabled={working}
                style={styles.button}
              />
              <Text style={styles.ceiling}>At most three a week. Never more than one a day.</Text>
              <Pressable onPress={onDismiss} disabled={working} hitSlop={8}>
                <Text style={styles.decline}>Not now</Text>
              </Pressable>
            </>
          )}
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
    maxWidth: 340,
  },
  icon: {
    alignSelf: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  body: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  button: {
    width: '100%',
  },
  ceiling: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  decline: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  denied: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
});
