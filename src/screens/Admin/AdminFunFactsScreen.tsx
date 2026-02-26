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
import { getAllFunFacts } from '../../services/funFacts';
import { deleteFunFact, reorderFunFacts } from '../../services/admin';
import { FunFact } from '../../types';

export const AdminFunFactsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [facts, setFacts] = useState<FunFact[]>([]);

  const loadData = useCallback(async () => {
    try {
      const data = await getAllFunFacts();
      setFacts(data);
    } catch (error) {
      console.error('Error loading fun facts:', error);
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

  const handleDelete = (fact: FunFact) => {
    Alert.alert(
      'Delete Fun Fact',
      'Are you sure you want to delete this fun fact?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFunFact(fact.id);
              setFacts((prev) => prev.filter((f) => f.id !== fact.id));
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const newFacts = [...facts];
    [newFacts[index - 1], newFacts[index]] = [newFacts[index], newFacts[index - 1]];
    setFacts(newFacts);
    try {
      await reorderFunFacts(newFacts.map((f) => f.id));
    } catch (error: any) {
      Alert.alert('Error', 'Failed to reorder');
      loadData(); // Reload on error
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === facts.length - 1) return;
    const newFacts = [...facts];
    [newFacts[index], newFacts[index + 1]] = [newFacts[index + 1], newFacts[index]];
    setFacts(newFacts);
    try {
      await reorderFunFacts(newFacts.map((f) => f.id));
    } catch (error: any) {
      Alert.alert('Error', 'Failed to reorder');
      loadData(); // Reload on error
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
    <View style={styles.screen}>
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Text style={styles.countText}>
          {facts.length} fun fact{facts.length !== 1 ? 's' : ''}
        </Text>

        {facts.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="bulb-outline" size={48} color={Colors.gray} />
            <Text style={styles.emptyText}>No fun facts yet</Text>
          </Card>
        ) : (
          facts.map((fact, index) => (
            <Card
              key={fact.id}
              style={styles.factCard}
              onPress={() =>
                navigation.navigate('AdminFunFactEdit', {
                  mode: 'edit',
                  factId: fact.id,
                })
              }
            >
              <View style={styles.factHeader}>
                <View style={styles.orderBadge}>
                  <Text style={styles.orderText}>{index + 1}</Text>
                </View>
                <View style={styles.reorderButtons}>
                  <TouchableOpacity
                    onPress={() => handleMoveUp(index)}
                    disabled={index === 0}
                    style={[styles.arrowButton, index === 0 && styles.arrowDisabled]}
                  >
                    <Ionicons
                      name="chevron-up"
                      size={20}
                      color={index === 0 ? Colors.lightGray : Colors.gray}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleMoveDown(index)}
                    disabled={index === facts.length - 1}
                    style={[
                      styles.arrowButton,
                      index === facts.length - 1 && styles.arrowDisabled,
                    ]}
                  >
                    <Ionicons
                      name="chevron-down"
                      size={20}
                      color={index === facts.length - 1 ? Colors.lightGray : Colors.gray}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.factText} numberOfLines={3}>
                {fact.fact}
              </Text>

              {fact.sourceTitle && (
                <Text style={styles.sourceText}>Source: {fact.sourceTitle}</Text>
              )}

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() =>
                    navigation.navigate('AdminFunFactEdit', {
                      mode: 'edit',
                      factId: fact.id,
                    })
                  }
                >
                  <Ionicons name="pencil" size={16} color={Colors.primary} />
                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(fact)}
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
        onPress={() => navigation.navigate('AdminFunFactEdit', { mode: 'create' })}
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
  factCard: {
    marginBottom: Spacing.md,
  },
  factHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  orderBadge: {
    backgroundColor: Colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.white,
  },
  reorderButtons: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  arrowButton: {
    padding: Spacing.xs,
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.sm,
  },
  arrowDisabled: {
    opacity: 0.5,
  },
  factText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  sourceText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    fontStyle: 'italic',
    marginBottom: Spacing.sm,
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
