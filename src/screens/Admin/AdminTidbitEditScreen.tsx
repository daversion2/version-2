import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Button } from '../../components/common/Button';
import {
  getAllTidbits,
  createTidbit,
  updateTidbit,
} from '../../services/neuroscienceTidbits';
import { TidbitContextType } from '../../types';

type RouteParams = {
  AdminTidbitEdit: {
    mode: 'create' | 'edit';
    tidbitId?: string;
  };
};

const CONTEXT_TYPE_OPTIONS: { label: string; value: TidbitContextType }[] = [
  { label: 'Challenge Type', value: 'challenge_type' },
  { label: 'Category', value: 'category' },
  { label: 'State', value: 'state' },
  { label: 'Generic', value: 'generic' },
];

export const AdminTidbitEditScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'AdminTidbitEdit'>>();
  const { mode, tidbitId } = route.params;
  const isEditing = mode === 'edit' && tidbitId;

  const [loading, setLoading] = useState(!!isEditing);
  const [saving, setSaving] = useState(false);

  // Form state
  const [text, setText] = useState('');
  const [extendedText, setExtendedText] = useState('');
  const [contextType, setContextType] = useState<TidbitContextType>('generic');
  const [contextValue, setContextValue] = useState('generic');
  const [tagsInput, setTagsInput] = useState('');
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (isEditing) {
      loadTidbit();
    }
  }, [isEditing]);

  const loadTidbit = async () => {
    if (!tidbitId) return;
    try {
      const tidbits = await getAllTidbits();
      const existing = tidbits.find((t) => t.id === tidbitId);
      if (existing) {
        setText(existing.text);
        setExtendedText(existing.extended_text);
        setContextType(existing.context_type);
        setContextValue(existing.context_value);
        setTagsInput(existing.tags?.join(', ') || '');
        setActive(existing.active);
      }
    } catch (error) {
      console.error('Error loading tidbit:', error);
      Alert.alert('Error', 'Failed to load tidbit');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!text.trim()) {
      Alert.alert('Error', 'Tidbit text is required');
      return;
    }
    if (!extendedText.trim()) {
      Alert.alert('Error', 'Extended text is required');
      return;
    }

    setSaving(true);
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0);

      const tidbitData = {
        text: text.trim(),
        extended_text: extendedText.trim(),
        context_type: contextType,
        context_value: contextValue.trim() || 'generic',
        tags,
        active,
      };

      if (isEditing && tidbitId) {
        await updateTidbit(tidbitId, tidbitData);
        Alert.alert('Success', 'Tidbit updated');
      } else {
        await createTidbit(tidbitData);
        Alert.alert('Success', 'Tidbit created');
      }
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      {/* Tidbit Text */}
      <Text style={styles.label}>Tidbit Text *</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={text}
        onChangeText={setText}
        placeholder="2-3 sentences the user reads in ~8 seconds..."
        placeholderTextColor={Colors.gray}
        multiline
        numberOfLines={4}
      />
      <Text style={styles.hint}>
        Short, punchy neuroscience fact shown after challenge completion
      </Text>

      {/* Extended Text */}
      <Text style={styles.label}>Extended Text *</Text>
      <TextInput
        style={[styles.input, styles.textAreaLarge]}
        value={extendedText}
        onChangeText={setExtendedText}
        placeholder="2-3 paragraph deeper explanation for 'Learn more'..."
        placeholderTextColor={Colors.gray}
        multiline
        numberOfLines={8}
      />
      <Text style={styles.hint}>
        Shown when the user taps "Learn more" — deeper science explanation
      </Text>

      {/* Context Type */}
      <Text style={styles.label}>Context Type</Text>
      <View style={styles.contextTypeRow}>
        {CONTEXT_TYPE_OPTIONS.map((option) => (
          <Button
            key={option.value}
            title={option.label}
            onPress={() => {
              setContextType(option.value);
              if (option.value === 'generic') setContextValue('generic');
            }}
            variant={contextType === option.value ? 'primary' : 'outline'}
            style={styles.contextTypeBtn}
          />
        ))}
      </View>

      {/* Context Value */}
      {contextType !== 'generic' && (
        <>
          <Text style={styles.label}>Context Value</Text>
          <TextInput
            style={styles.input}
            value={contextValue}
            onChangeText={setContextValue}
            placeholder={getContextValuePlaceholder(contextType)}
            placeholderTextColor={Colors.gray}
            autoCapitalize="none"
          />
          <Text style={styles.hint}>
            {getContextValueHint(contextType)}
          </Text>
        </>
      )}

      {/* Tags */}
      <Text style={styles.label}>Tags</Text>
      <TextInput
        style={styles.input}
        value={tagsInput}
        onChangeText={setTagsInput}
        placeholder="dopamine, neuroplasticity, motivation"
        placeholderTextColor={Colors.gray}
        autoCapitalize="none"
      />
      <Text style={styles.hint}>Comma-separated. Used for organizing and future library.</Text>

      {/* Active Toggle */}
      <View style={styles.toggleRow}>
        <Text style={styles.label}>Active</Text>
        <Switch
          value={active}
          onValueChange={setActive}
          trackColor={{ false: Colors.border, true: Colors.primary + '60' }}
          thumbColor={active ? Colors.primary : Colors.gray}
        />
      </View>

      {/* Save Button */}
      <Button
        title={isEditing ? 'Save Changes' : 'Create Tidbit'}
        onPress={handleSave}
        loading={saving}
        disabled={saving}
        style={styles.saveButton}
      />
    </ScrollView>
  );
};

function getContextValuePlaceholder(contextType: TidbitContextType): string {
  switch (contextType) {
    case 'challenge_type':
      return 'e.g., workout, cold, meditation, diet, deep_work';
    case 'category':
      return 'e.g., physical, mental, social';
    case 'state':
      return 'e.g., comeback, rated_hard, streak_7, new_user';
    default:
      return 'generic';
  }
}

function getContextValueHint(contextType: TidbitContextType): string {
  switch (contextType) {
    case 'challenge_type':
      return 'Matched against challenge name keywords (workout, cold, meditation, breathwork, diet, deep_work, screen_limit, journaling)';
    case 'category':
      return 'Matched against challenge category (physical, mental, social)';
    case 'state':
      return 'Matched against user state (new_user, comeback, rated_hard, streak_3, streak_7, streak_30, repeat_milestone)';
    default:
      return '';
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
  },
  label: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  textAreaLarge: {
    minHeight: 180,
    textAlignVertical: 'top',
  },
  hint: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },
  contextTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  contextTypeBtn: {
    flex: 0,
    paddingHorizontal: Spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  saveButton: {
    marginTop: Spacing.xl,
  },
});
