import { Alert, Platform } from 'react-native';

export const showAlert = (
  title: string,
  message?: string,
  onOk?: () => void
) => {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    onOk?.();
  } else {
    Alert.alert(title, message, [{ text: 'OK', onPress: onOk }]);
  }
};

export const showConfirm = (
  title: string,
  message: string,
  onConfirm: () => void,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel'
) => {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: cancelLabel, style: 'cancel' },
      { text: confirmLabel, onPress: onConfirm },
    ]);
  }
};

export const showChoice = (
  title: string,
  message: string,
  choices: { label: string; onPress: () => void }[]
) => {
  if (Platform.OS === 'web') {
    const choiceStr = choices.map((c, i) => `${i + 1}. ${c.label}`).join('\n');
    const input = window.prompt(`${title}\n\n${message}\n\n${choiceStr}\n\nEnter number:`);
    if (input) {
      const idx = parseInt(input, 10) - 1;
      if (idx >= 0 && idx < choices.length) {
        choices[idx].onPress();
      }
    }
  } else {
    Alert.alert(
      title,
      message,
      [
        ...choices.map((c) => ({ text: c.label, onPress: c.onPress })),
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
  }
};
