import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing } from '../../../../../constants/theme';
import { NsdrLink } from '../../../../../types/meditate';
import { normalizeLink } from '../../../../../services/meditateMath';
import { MEDITATE_ACCENT, ms } from './meditateStyle';

/** Title + link for a recording NSDR opens. Calls back with the new link; saving is the caller's. */
export const NsdrLinkForm: React.FC<{
  onAdd: (link: NsdrLink) => void;
  onCancel?: () => void;
}> = ({ onAdd, onCancel }) => {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const add = () => {
    const normalized = normalizeLink(url);
    if (!normalized) {
      setError('That doesn’t look like a link. Copy it from YouTube, Spotify or wherever it lives.');
      return;
    }
    onAdd({
      id: `link_${Date.now().toString(36)}`,
      title: title.trim() || 'My recording',
      url: normalized,
    });
    setTitle('');
    setUrl('');
    setError(null);
  };

  return (
    <View style={[ms.card, styles.wrap]}>
      <TextInput
        style={ms.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Name, e.g. Yoga nidra 20"
        placeholderTextColor={Colors.gray}
        accessibilityLabel="Recording name"
      />
      <TextInput
        style={ms.input}
        value={url}
        onChangeText={(t) => {
          setUrl(t);
          setError(null);
        }}
        placeholder="Paste the link"
        placeholderTextColor={Colors.gray}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        accessibilityLabel="Recording link"
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.row}>
        {onCancel && (
          <TouchableOpacity onPress={onCancel} style={styles.btn}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={add} style={styles.btn} disabled={!url.trim()}>
          <Text style={[styles.save, !url.trim() && ms.disabled]}>Save recording</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: Spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.md },
  btn: { paddingVertical: 4, paddingHorizontal: Spacing.xs },
  cancel: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray },
  save: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: MEDITATE_ACCENT },
  error: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.danger },
});
