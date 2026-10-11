import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { useCopyContext } from '../../context/CopyContext';
import { resolveCopy } from '../../services/appCopy';
import { CopyEditorModal } from '../../components/common/CopyEditorModal';

interface Row {
  key: string;
  defaultText: string;
  /** False for an edited key whose screen hasn't been opened this session. */
  seen: boolean;
}

/**
 * Every piece of editable wording the app has shown this session, plus every
 * key that carries an edit. The route for wording that can't be long-pressed —
 * alerts, placeholders, button and header titles.
 */
export const AdminCopyScreen: React.FC = () => {
  const { overrides, seen } = useCopyContext();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Row | null>(null);
  // `seen()` reads a ref, so re-read it whenever the screen comes back into focus.
  const [tick, setTick] = useState(0);
  useFocusEffect(React.useCallback(() => setTick((t) => t + 1), []));

  const rows = useMemo<Row[]>(() => {
    const list: Row[] = seen().map((r) => ({ ...r, seen: true }));
    const known = new Set(list.map((r) => r.key));
    for (const key of Object.keys(overrides)) {
      if (!known.has(key)) list.push({ key, defaultText: overrides[key], seen: false });
    }
    const q = search.trim().toLowerCase();
    return list
      .filter(
        (r) =>
          !q ||
          r.key.toLowerCase().includes(q) ||
          resolveCopy(r.key, r.defaultText, overrides).toLowerCase().includes(q)
      )
      .sort((a, b) => a.key.localeCompare(b.key));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overrides, search, tick]);

  return (
    <View style={styles.screen}>
      <TextInput
        style={styles.search}
        value={search}
        onChangeText={setSearch}
        placeholder="Search wording or keys"
        placeholderTextColor={Colors.gray}
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="while-editing"
      />
      <Text style={styles.note}>
        Shows wording from screens you've opened since the app started, plus everything you've
        edited. Open a screen to add its wording here.
      </Text>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Nothing yet. Open a few screens first.</Text>}
        renderItem={({ item }) => {
          const edited = item.key in overrides;
          return (
            <TouchableOpacity style={styles.row} onPress={() => setEditing(item)} activeOpacity={0.8}>
              <View style={styles.rowHead}>
                <Text style={styles.key} numberOfLines={1}>
                  {item.key}
                </Text>
                {edited && <Text style={styles.badge}>Edited</Text>}
              </View>
              <Text style={styles.text} numberOfLines={3}>
                {resolveCopy(item.key, item.defaultText, overrides)}
              </Text>
              {!item.seen && (
                <Text style={styles.unseen}>Not on screen yet this session — open it to see the default.</Text>
              )}
            </TouchableOpacity>
          );
        }}
      />
      {editing && (
        <CopyEditorModal
          visible
          copyKey={editing.key}
          defaultText={editing.defaultText}
          onClose={() => setEditing(null)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  search: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    margin: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  note: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    lineHeight: 16,
  },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.sm },
  row: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: 4,
  },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  key: { flex: 1, fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray },
  badge: {
    fontFamily: Fonts.secondaryBold,
    fontSize: 10,
    color: Colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  text: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark, lineHeight: 19 },
  unseen: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray, fontStyle: 'italic' },
  empty: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray, textAlign: 'center', marginTop: Spacing.xl },
});
