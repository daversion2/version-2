import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Button } from './Button';
import { useCopyContext } from '../../context/CopyContext';
import { missingPlaceholders, placeholdersIn, resolveCopy } from '../../services/appCopy';
import { showAlert } from '../../utils/alert';

interface Props {
  visible: boolean;
  copyKey: string;
  defaultText: string;
  onClose: () => void;
}

/** Admin editor for one piece of app copy. Wording only — styling stays in the screen. */
export const CopyEditorModal: React.FC<Props> = ({ visible, copyKey, defaultText, onClose }) => {
  const { overrides, save, reset } = useCopyContext();
  const current = resolveCopy(copyKey, defaultText, overrides);
  const isEdited = copyKey in overrides;
  const [text, setText] = useState(current);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) setText(current);
    // Re-seed only when the editor opens, not on every keystroke-driven render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const placeholders = placeholdersIn(defaultText);
  const dropped = missingPlaceholders(defaultText, text);
  const usesEmphasis = defaultText.includes('**');

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
      onClose();
    } catch (e: any) {
      showAlert('Could not save', e?.message ?? 'Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleSave = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      showAlert('Nothing to save', 'Type some wording, or use Reset to default.');
      return;
    }
    run(() => (trimmed === defaultText ? reset(copyKey) : save(copyKey, trimmed)));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <Text style={styles.title}>Edit wording</Text>
            <Text style={styles.key}>{copyKey}</Text>

            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              multiline
              autoFocus
              textAlignVertical="top"
              placeholder="Wording"
              placeholderTextColor={Colors.gray}
            />

            {usesEmphasis && (
              <Text style={styles.hint}>
                Words between **double asterisks** keep this spot’s emphasis style.
              </Text>
            )}
            {placeholders.length > 0 && (
              <Text style={styles.hint}>
                The app fills in {placeholders.map((p) => `{${p}}`).join(', ')}. Keep{' '}
                {placeholders.length === 1 ? 'it' : 'them'} in your wording.
              </Text>
            )}
            {dropped.length > 0 && (
              <Text style={styles.warning}>
                Missing {dropped.map((p) => `{${p}}`).join(', ')}: that value won’t appear.
              </Text>
            )}

            <Text style={styles.defaultLabel}>Default</Text>
            <Text style={styles.defaultText}>{defaultText}</Text>

            <Text style={styles.liveNote}>
              Saving changes this for everyone on their next app open.
            </Text>

            <Button title="Save" onPress={handleSave} loading={busy} disabled={busy} />
            {isEdited && (
              <Button
                title="Reset to default"
                variant="outline"
                onPress={() => run(() => reset(copyKey))}
                disabled={busy}
                style={styles.secondaryBtn}
              />
            )}
            <Text style={styles.cancel} onPress={onClose}>
              Cancel
            </Text>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  sheet: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    maxHeight: '85%',
  },
  content: { padding: Spacing.lg, gap: Spacing.sm },
  title: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg, color: Colors.dark },
  key: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray },
  input: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    minHeight: 110,
    marginTop: Spacing.xs,
  },
  hint: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray, lineHeight: 17 },
  warning: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.secondary },
  defaultLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: Spacing.sm,
  },
  defaultText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark, lineHeight: 20 },
  liveNote: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.secondary,
    marginVertical: Spacing.sm,
  },
  secondaryBtn: { marginTop: Spacing.xs },
  cancel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
    textDecorationLine: 'underline',
  },
});
