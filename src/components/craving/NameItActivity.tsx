import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { NAME_IT_PROMPTS } from '../../data/cravings';

interface Props {
  /** Existing draft (so re-entering the activity doesn't lose text). */
  initialText: string;
  /** Called on save — the text pre-fills the end-of-ride reflection note. */
  onSave: (text: string) => void;
}

/**
 * Trigger journaling mid-ride. Writing the trigger down is a defusion move —
 * and whatever's written here pre-fills the reflection at the end, so the
 * work isn't asked for twice.
 */
export const NameItActivity: React.FC<Props> = ({ initialText, onSave }) => {
  const [text, setText] = useState(initialText);
  const [promptIndex, setPromptIndex] = useState(0);
  const [saved, setSaved] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>NAME IT TO TAME IT</Text>
      <Text style={styles.prompt}>{NAME_IT_PROMPTS[promptIndex]}</Text>
      <TouchableOpacity
        onPress={() => setPromptIndex((promptIndex + 1) % NAME_IT_PROMPTS.length)}
      >
        <Text style={styles.shuffle}>↻ Different question</Text>
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Write it out — nobody sees this but you…"
        placeholderTextColor="rgba(255,255,255,0.35)"
        value={text}
        onChangeText={(t) => {
          setText(t);
          setSaved(false);
        }}
        multiline
        autoFocus
      />

      <TouchableOpacity
        style={[styles.saveButton, (!text.trim() || saved) && styles.saveDisabled]}
        onPress={() => {
          onSave(text);
          setSaved(true);
        }}
        disabled={!text.trim() || saved}
      >
        <Text style={styles.saveText}>{saved ? 'Saved to your log ✓' : 'Save to your log'}</Text>
      </TouchableOpacity>
      <Text style={styles.hint}>
        This carries into your end-of-ride reflection — it won’t ask you twice.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: Spacing.md },
  kicker: {
    fontFamily: Fonts.secondaryBold,
    fontSize: 10,
    color: '#7AB8C0',
    letterSpacing: 1.5,
    marginBottom: Spacing.sm,
  },
  prompt: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.white,
    lineHeight: 25,
  },
  shuffle: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: '#7AB8C0',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.white,
    minHeight: 120,
    textAlignVertical: 'top',
    lineHeight: 21,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md - 2,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  saveDisabled: { opacity: 0.5 },
  saveText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.white,
  },
  hint: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
