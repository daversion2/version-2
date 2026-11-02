import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Spacing, TextStyles } from '../../constants/theme';

// Today's and the app pages' "couldn't load" state: a plain line and a way to
// try again, in place of the raw error message. The error itself goes to the
// console where it's useful.

interface Props {
  onRetry: () => Promise<unknown> | void;
  message?: string;
}

export const LoadError: React.FC<Props> = ({
  onRetry,
  message = 'Couldn’t load your numbers. Check your connection and try again.',
}) => {
  const [busy, setBusy] = useState(false);
  const retry = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onRetry();
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>{message}</Text>
      <TouchableOpacity
        style={[styles.button, busy && styles.busy]}
        onPress={retry}
        disabled={busy}
        accessibilityRole="button"
        accessibilityState={{ busy }}
      >
        <Text style={styles.buttonText}>{busy ? 'Trying…' : 'Try again'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg },
  text: { ...TextStyles.subhead, color: Colors.gray, textAlign: 'center' },
  button: {
    minHeight: 44,
    paddingHorizontal: Spacing.lg,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  busy: { opacity: 0.6 },
  buttonText: { ...TextStyles.headline, color: Colors.white },
});
