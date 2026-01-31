import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { InputField } from '../../components/common/InputField';
import { useAuth } from '../../context/AuthContext';
import { getUserCategories, addCategory, deleteCategory } from '../../services/categories';
import { Category } from '../../types';
import { showAlert, showConfirm } from '../../utils/alert';

const COLOR_OPTIONS = [
  '#217180', '#FF5B02', '#2B2B2B', '#656565',
  '#4A90D9', '#7B61FF', '#E85D75', '#2ECC71',
];

const MAX_CATEGORIES = 8;

export const ManageCategoriesScreen: React.FC = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!user) return;
    const cats = await getUserCategories(user.uid);
    setCategories(cats);
  };

  useEffect(() => {
    load();
  }, [user]);

  const handleAdd = async () => {
    if (!newName.trim()) {
      showAlert('Required', 'Enter a category name.');
      return;
    }
    if (!user) return;
    setLoading(true);
    try {
      await addCategory(user.uid, { name: newName.trim(), color: selectedColor });
      setNewName('');
      setShowForm(false);
      await load();
    } catch (e: any) {
      showAlert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (cat: Category) => {
    showConfirm(
      'Delete Category',
      `Remove "${cat.name}"? Existing challenges and habits using this category won't be affected.`,
      async () => {
        if (!user) return;
        await deleteCategory(user.uid, cat.id);
        await load();
      },
      'Delete'
    );
  };

  const atMax = categories.length >= MAX_CATEGORIES;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Categories</Text>
      <Text style={styles.subtitle}>{categories.length} / {MAX_CATEGORIES} used</Text>

      {showForm ? (
        <Card style={styles.formCard}>
          <InputField
            label="Category Name"
            value={newName}
            onChangeText={setNewName}
            placeholder="e.g. Spiritual"
          />
          <Text style={styles.colorLabel}>Color</Text>
          <View style={styles.colorRow}>
            {COLOR_OPTIONS.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setSelectedColor(c)}
                style={[
                  styles.colorCircle,
                  { backgroundColor: c },
                  selectedColor === c && styles.colorSelected,
                ]}
              />
            ))}
          </View>
          <View style={styles.formButtons}>
            <Button title="Add" onPress={handleAdd} loading={loading} style={{ flex: 1 }} />
            <Button
              title="Cancel"
              onPress={() => { setShowForm(false); setNewName(''); }}
              variant="outline"
              style={{ flex: 1 }}
            />
          </View>
        </Card>
      ) : (
        <Button
          title={atMax ? 'Maximum Reached' : 'Add Category'}
          onPress={() => setShowForm(true)}
          disabled={atMax}
          style={{ marginHorizontal: Spacing.lg, marginBottom: Spacing.md }}
        />
      )}

      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card style={styles.catCard}>
            <View style={styles.catRow}>
              <View style={[styles.catDot, { backgroundColor: item.color }]} />
              <Text style={styles.catName}>{item.name}</Text>
              <TouchableOpacity onPress={() => handleDelete(item)}>
                <Ionicons name="trash-outline" size={20} color={Colors.gray} />
              </TouchableOpacity>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No categories.</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.lightGray, paddingTop: Spacing.lg },
  heading: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    paddingHorizontal: Spacing.lg,
  },
  subtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  formCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  colorLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.sm,
  },
  colorRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    flexWrap: 'wrap',
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: Colors.dark,
  },
  formButtons: { flexDirection: 'row', gap: Spacing.sm },
  list: { paddingHorizontal: Spacing.lg },
  catCard: { marginBottom: Spacing.sm },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  catDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  catName: {
    fontFamily: Fonts.primary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    flex: 1,
  },
  empty: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
});
