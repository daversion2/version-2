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
import {
  getAllTidbits,
  deleteTidbit,
  setAllTidbitsActive,
} from '../../services/neuroscienceTidbits';
import { NeuroscienceTidbit } from '../../types';
import { AdminNavigation } from '../../types/navigation';

export const AdminTidbitsScreen: React.FC = () => {
  const navigation = useNavigation<AdminNavigation>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tidbits, setTidbits] = useState<NeuroscienceTidbit[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);

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

  /**
   * Retire or restore the whole pool in one action. This is the reseed path:
   * the seeder only ever appends, so rewritten copy has to be preceded by
   * clearing what's live or both sets compete in the same buckets.
   *
   * Deactivating is not destructive — users only ever see `active` tidbits, and
   * the opposite button puts them back.
   */
  const handleBulkActive = (active: boolean) => {
    const count = active
      ? tidbits.filter((t) => !t.active).length
      : tidbits.filter((t) => t.active).length;

    if (count === 0) return;

    Alert.alert(
      active ? 'Reactivate all tidbits' : 'Deactivate all tidbits',
      active
        ? `Make all ${count} inactive tidbit${count !== 1 ? 's' : ''} visible to users again?`
        : `Hide all ${count} active tidbit${count !== 1 ? 's' : ''} from users?\n\n` +
          'Nothing is deleted — you can reactivate them from this screen. ' +
          'Do this before seeding a rewritten set.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: active ? 'Reactivate all' : 'Deactivate all',
          style: active ? 'default' : 'destructive',
          onPress: async () => {
            setBulkBusy(true);
            try {
              const changed = await setAllTidbitsActive(active);
              await loadData();
              Alert.alert(
                'Done',
                `${changed} tidbit${changed !== 1 ? 's' : ''} ${
                  active ? 'reactivated' : 'deactivated'
                }.`
              );
            } catch (error: any) {
              Alert.alert('Error', error.message);
            } finally {
              setBulkBusy(false);
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
  const inactiveCount = tidbits.length - activeCount;

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

        {/* Bulk actions — the reseed path. Only offered when they'd do
            something, so the row disappears once the pool is all one way. */}
        {tidbits.length > 0 && (
          <View style={styles.bulkRow}>
            {bulkBusy ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <>
                {activeCount > 0 && (
                  <TouchableOpacity
                    style={styles.bulkButton}
                    onPress={() => handleBulkActive(false)}
                  >
                    <Ionicons name="eye-off-outline" size={16} color={Colors.secondary} />
                    <Text style={styles.bulkTextDestructive}>
                      Deactivate all ({activeCount})
                    </Text>
                  </TouchableOpacity>
                )}
                {inactiveCount > 0 && (
                  <TouchableOpacity
                    style={styles.bulkButton}
                    onPress={() => handleBulkActive(true)}
                  >
                    <Ionicons name="eye-outline" size={16} color={Colors.primary} />
                    <Text style={styles.bulkText}>Reactivate all ({inactiveCount})</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}

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
  bulkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    minHeight: 24,
  },
  bulkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  bulkText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  bulkTextDestructive: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.secondary,
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
