import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { getProofPoints, deleteProofPoint } from '../../services/proofPoints';
import { ProofPoint } from '../../types';
import { WorksheetsScreenProps } from '../../types/navigation';

const ACCENT = '#8B6F47';

type Props = WorksheetsScreenProps<'ProofPointLibrary'>;

export const ProofPointLibraryScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const [proofPoints, setProofPoints] = useState<ProofPoint[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    const points = await getProofPoints(user.uid);
    setProofPoints(points);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleDelete = (proofPoint: ProofPoint) => {
    Alert.alert(
      'Delete Proof Point',
      'Are you sure you want to remove this proof point?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            try {
              await deleteProofPoint(user.uid, proofPoint.id);
              setProofPoints((prev) => prev.filter((p) => p.id !== proofPoint.id));
            } catch (err) {
              console.warn('Failed to delete proof point:', err);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: ProofPoint }) => {
    const expanded = expandedId === item.id;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => setExpandedId(expanded ? null : item.id)}
        onLongPress={() => handleDelete(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardColumns}>
          {/* Hard moment column */}
          <View style={styles.column}>
            <Text style={styles.columnLabel}>hard moment</Text>
            <Text
              style={styles.columnText}
              numberOfLines={expanded ? undefined : 3}
            >
              {item.hard_moment}
            </Text>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* What I did column */}
          <View style={styles.column}>
            <Text style={[styles.columnLabel, { color: ACCENT }]}>what I did anyway</Text>
            <Text
              style={styles.columnText}
              numberOfLines={expanded ? undefined : 3}
            >
              {item.what_you_did}
            </Text>
          </View>
        </View>

        {/* Date */}
        <Text style={styles.dateText}>
          {new Date(item.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerSection}>
      <View style={styles.counterRow}>
        <View style={styles.counterBadge}>
          <Text style={styles.counterNumber}>{proofPoints.length}</Text>
        </View>
        <Text style={styles.counterText}>
          proof point{proofPoints.length !== 1 ? 's' : ''} logged
        </Text>
      </View>

      <Text style={styles.headerHint}>
        Tap to expand. Long-press to delete.
      </Text>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="book-outline" size={48} color={Colors.border} />
      <Text style={styles.emptyTitle}>No proof points yet</Text>
      <Text style={styles.emptySubtitle}>
        Start building your story by adding your first proof point.
      </Text>
    </View>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={proofPoints}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />

      {/* Add button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddProofPoint')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color={Colors.white} />
          <Text style={styles.addButtonText}>add proof point</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
  headerSection: {
    marginBottom: Spacing.lg,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  counterBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: ACCENT + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterNumber: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: ACCENT,
  },
  counterText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
  },
  headerHint: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardColumns: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  column: {
    flex: 1,
  },
  columnLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textTransform: 'lowercase',
    marginBottom: Spacing.xs,
  },
  columnText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    lineHeight: 20,
  },
  divider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  dateText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: Spacing.md,
    textAlign: 'right',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: Spacing.xxl * 2,
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    backgroundColor: Colors.lightGray,
  },
  addButton: {
    backgroundColor: Colors.secondary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  addButtonText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
});
