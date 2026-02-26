import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Button } from '../../components/common/Button';
import {
  createFunFact,
  updateFunFact,
  getNextFunFactOrder,
} from '../../services/admin';
import { getAllFunFacts } from '../../services/funFacts';
import { FunFact } from '../../types';

type RouteParams = {
  AdminFunFactEdit: {
    mode: 'create' | 'edit';
    factId?: string;
  };
};

export const AdminFunFactEditScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'AdminFunFactEdit'>>();
  const { mode, factId } = route.params;
  const isEditing = mode === 'edit' && factId;

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  // Form state
  const [fact, setFact] = useState('');
  const [sourceTitle, setSourceTitle] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [order, setOrder] = useState(1);

  useEffect(() => {
    if (isEditing) {
      loadFact();
    } else {
      loadNextOrder();
    }
  }, [isEditing]);

  const loadFact = async () => {
    if (!factId) return;
    try {
      const facts = await getAllFunFacts();
      const existingFact = facts.find((f) => f.id === factId);
      if (existingFact) {
        setFact(existingFact.fact);
        setSourceTitle(existingFact.sourceTitle || '');
        setSourceUrl(existingFact.sourceUrl || '');
        setOrder(existingFact.order);
      }
    } catch (error) {
      console.error('Error loading fact:', error);
      Alert.alert('Error', 'Failed to load fun fact');
    } finally {
      setLoading(false);
    }
  };

  const loadNextOrder = async () => {
    try {
      const nextOrder = await getNextFunFactOrder();
      setOrder(nextOrder);
    } catch (error) {
      console.error('Error getting next order:', error);
    }
  };

  const handleSave = async () => {
    if (!fact.trim()) {
      Alert.alert('Error', 'Fun fact text is required');
      return;
    }

    setSaving(true);
    try {
      const factData: Omit<FunFact, 'id' | 'created_at'> = {
        fact: fact.trim(),
        sourceTitle: sourceTitle.trim() || undefined,
        sourceUrl: sourceUrl.trim() || undefined,
        order,
      };

      if (isEditing && factId) {
        await updateFunFact(factId, factData);
        Alert.alert('Success', 'Fun fact updated');
      } else {
        await createFunFact(factData);
        Alert.alert('Success', 'Fun fact created');
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
      {/* Fact Text */}
      <Text style={styles.label}>Fun Fact *</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={fact}
        onChangeText={setFact}
        placeholder="Enter the fun fact..."
        placeholderTextColor={Colors.gray}
        multiline
        numberOfLines={5}
      />
      <Text style={styles.hint}>
        This will be shown to users as their daily fun fact
      </Text>

      {/* Source Title */}
      <Text style={styles.label}>Source Title</Text>
      <TextInput
        style={styles.input}
        value={sourceTitle}
        onChangeText={setSourceTitle}
        placeholder="e.g., Nature Magazine, Psychology Today"
        placeholderTextColor={Colors.gray}
      />

      {/* Source URL */}
      <Text style={styles.label}>Source URL</Text>
      <TextInput
        style={styles.input}
        value={sourceUrl}
        onChangeText={setSourceUrl}
        placeholder="https://..."
        placeholderTextColor={Colors.gray}
        keyboardType="url"
        autoCapitalize="none"
      />

      {/* Order (Read-only for info) */}
      <Text style={styles.label}>Display Order</Text>
      <View style={styles.orderDisplay}>
        <Text style={styles.orderText}>#{order}</Text>
        <Text style={styles.orderHint}>
          (Reorder from the list screen)
        </Text>
      </View>

      {/* Save Button */}
      <Button
        title={isEditing ? 'Save Changes' : 'Create Fun Fact'}
        onPress={handleSave}
        loading={saving}
        disabled={saving}
        style={styles.saveButton}
      />
    </ScrollView>
  );
};

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
    minHeight: 120,
    textAlignVertical: 'top',
  },
  hint: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },
  orderDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  orderText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.primary,
  },
  orderHint: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  saveButton: {
    marginTop: Spacing.xl,
  },
});
