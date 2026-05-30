import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { getAllTidbits, deleteTidbit } from '../../services/neuroscienceTidbits';
import { NeuroscienceTidbit } from '../../types';
import { AdminNavigation } from '../../types/navigation';

export const AdminTidbitsScreen: React.FC = () => {
  const navigation = useNavigation<AdminNavigation>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tidbits, setTidbits] = useState<NeuroscienceTidbit[]>([]);

  const loadData = useCallback(async () => {
    try {
      const data = await getAllTidbits();
      setTidbits(data);
    } catch (error) {
      console.error('Error loading tidbits:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleDelete = (tidbit: NeuroscienceTidbit) => {
    Alert.alert(
      'Delete Tidbit',
      'Are you sure you want to delete this neuroscience tidbit?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTidbit(tidbit.id);
              setTidbits((prev) => prev.filter((t) => t.id !== tidbit.id));
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const activeCount = tidbits.filter((t) => t.active).length;

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Text style={styles.countText}>
          {tidbits.length} tidbit{tidbits.length !== 1 ? 's' : ''} ({activeCount} active)
        </Text>

        {tidbits.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="flash-outline" size={48} color={Colors.gray} />
            <Text style={styles.emptyText}>No neuroscience tidbits yet</Text>
          </Card>
        ) : (
          tidbits.map((tidbit) => (
            <Card
              key={tidbit.id}
              style={StyleSheet.flatten([styles.tidbitCard, !tidbit.active ? styles.inactiveCard : {}])}
              onPress={() =>
                navigation.navigate('AdminTidbitEdit', {
                  mode: 'edit',
                  tidbitId: tidbit.id,
                })
              }
            >
              {/* Context badges */}
              <View style={styles.badgeRow}>
                <View style={styles.contextBadge}>
                  <Text style={styles.contextBadgeText}>
                    {tidbit.context_type}
                  </Text>
                </View>
                <View style={styles.valueBadge}>
                  <Text style={styles.valueBadgeText}>
                    {tidbit.context_value}
                  </Text>
                </View>
                {!tidbit.active && (
                  <View style={styles.inactiveBadge}>
                    <Text style={styles.inactiveBadgeText}>Inactive</Text>
                  </View>
                )}
              </View>

              {/* Tidbit text */}
              <Text style={styles.tidbitText} numberOfLines={3}>
                {tidbit.text}
              </Text>

              {/* Tags */}
              {tidbit.tags && tidbit.tags.length > 0 && (
                <View style={styles.tagsRow}>
                  {tidbit.tags.slice(0, 3).map((tag) => (
                    <Text key={tag} style={styles.tagText}>#{tag}</Text>
                  ))}
                  {tidbit.tags.length > 3 && (
                    <Text style={styles.tagText}>+{tidbit.tags.length - 3}</Text>
                  )}
                </View>
              )}

              {/* Actions */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() =>
                    navigation.navigate('AdminTidbitEdit', {
                      mode: 'edit',
                      tidbitId: tidbit.id,
                    })
                  }
                >
                  <Ionicons name="pencil" size={16} color={Colors.primary} />
                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(tidbit)}
                >
                  <Ionicons name="trash-outline" size={16} color={Colors.secondary} />
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AdminTidbitEdit', { mode: 'create' })}
      >
        <Ionicons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  countText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    marginTop: Spacing.sm,
  },
  tidbitCard: {
    marginBottom: Spacing.md,
  },
  inactiveCard: {
    opacity: 0.6,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    flexWrap: 'wrap',
  },
  contextBadge: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  contextBadgeText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.primary,
  },
  valueBadge: {
    backgroundColor: Colors.lightGray,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  valueBadgeText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.dark,
  },
  inactiveBadge: {
    backgroundColor: Colors.secondary + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  inactiveBadgeText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.secondary,
  },
  tidbitText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  tagText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  editText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  deleteText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.secondary,
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});
