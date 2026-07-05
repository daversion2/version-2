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
import { Practice, PRACTICE_GROUPS, getIntensityTier } from '../../data/practices';
import {
  getAllPracticeCatalogItems,
  setPracticeActive,
  seedPracticeCatalogFromBundled,
} from '../../services/practiceCatalog';
import { AdminNavigation } from '../../types/navigation';

export const AdminPracticesScreen: React.FC = () => {
  const navigation = useNavigation<AdminNavigation>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [practices, setPractices] = useState<Practice[]>([]);

  const loadData = useCallback(async () => {
    try {
      const data = await getAllPracticeCatalogItems();
      setPractices(data);
    } catch (error) {
      console.error('Error loading practice catalog:', error);
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

  const handleToggleActive = (p: Practice) => {
    const next = p.active === false; // currently retired → restore
    setPracticeActive(p.id, next)
      .then(loadData)
      .catch((e: any) => Alert.alert('Error', e.message));
  };

  const handleSeed = () => {
    Alert.alert(
      'Write defaults to Firestore',
      'This writes every bundled practice into the catalog, overwriting any edits to those ids. Use it once to populate, or to reset. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Write defaults',
          style: 'destructive',
          onPress: async () => {
            setSeeding(true);
            try {
              const n = await seedPracticeCatalogFromBundled();
              Alert.alert('Done', `Wrote ${n} practices to the catalog.`);
              await loadData();
            } catch (e: any) {
              Alert.alert('Error', e.message);
            } finally {
              setSeeding(false);
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

  const activeCount = practices.filter((p) => p.active !== false).length;
  const groupName = (id: string) => PRACTICE_GROUPS.find((g) => g.id === id)?.name ?? id;
  const groupColor = (id: string) => PRACTICE_GROUPS.find((g) => g.id === id)?.color ?? Colors.primary;

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <Text style={styles.countText}>
          {practices.length} practice{practices.length !== 1 ? 's' : ''} ({activeCount} active)
        </Text>

        <TouchableOpacity style={styles.seedBtn} onPress={handleSeed} disabled={seeding}>
          {seeding ? (
            <ActivityIndicator size="small" color={Colors.secondary} />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={16} color={Colors.secondary} />
              <Text style={styles.seedText}>Write defaults to Firestore</Text>
            </>
          )}
        </TouchableOpacity>

        {practices.map((p) => {
          const retired = p.active === false;
          return (
            <Card
              key={p.id}
              style={StyleSheet.flatten([styles.itemCard, retired ? styles.inactiveCard : {}])}
              onPress={() => navigation.navigate('AdminPracticeEdit', { mode: 'edit', practiceId: p.id })}
            >
              <View style={styles.badgeRow}>
                <View style={[styles.badge, { backgroundColor: groupColor(p.group) + '20' }]}>
                  <Text style={[styles.badgeText, { color: groupColor(p.group) }]}>{groupName(p.group)}</Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeTextMuted}>{p.flow}</Text>
                </View>
                {!!p.intensity && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeTextMuted}>
                      {'🔥'.repeat(getIntensityTier(p.intensity)?.flames ?? 1)}
                    </Text>
                  </View>
                )}
                {retired && (
                  <View style={[styles.badge, { backgroundColor: Colors.secondary + '20' }]}>
                    <Text style={[styles.badgeText, { color: Colors.secondary }]}>Retired</Text>
                  </View>
                )}
              </View>

              <Text style={styles.itemName}>{p.name}</Text>
              <Text style={styles.itemDesc} numberOfLines={2}>{p.description}</Text>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.action}
                  onPress={() => navigation.navigate('AdminPracticeEdit', { mode: 'edit', practiceId: p.id })}
                >
                  <Ionicons name="pencil" size={16} color={Colors.primary} />
                  <Text style={styles.actionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.action} onPress={() => handleToggleActive(p)}>
                  <Ionicons
                    name={retired ? 'refresh-outline' : 'eye-off-outline'}
                    size={16}
                    color={Colors.secondary}
                  />
                  <Text style={[styles.actionText, { color: Colors.secondary }]}>
                    {retired ? 'Restore' : 'Retire'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>
          );
        })}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AdminPracticeEdit', { mode: 'create' })}
      >
        <Ionicons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.lightGray },
  list: { flex: 1 },
  listContent: { padding: Spacing.lg, paddingBottom: 100 },
  countText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray, marginBottom: Spacing.sm },
  seedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.secondary,
    backgroundColor: Colors.secondary + '08',
    marginBottom: Spacing.md,
  },
  seedText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.secondary },
  itemCard: { marginBottom: Spacing.md },
  inactiveCard: { opacity: 0.6 },
  badgeRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm, flexWrap: 'wrap' },
  badge: {
    backgroundColor: Colors.lightGray,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  badgeText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs },
  badgeTextMuted: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.dark },
  itemName: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.dark },
  itemDesc: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray, marginTop: 2 },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  action: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  actionText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.primary },
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
