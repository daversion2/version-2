import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { showAlert, showConfirm } from '../../utils/alert';
import { getAllRules, updateRule, deleteRule, seedDefaultRules } from '../../services/rules';
import { Rule, RULE_FACTS } from '../../types/rules';
import { AdminNavigation } from '../../types/navigation';

const SURFACE_ICONS: Record<Rule['surface'], keyof typeof Ionicons.glyphMap> = {
  push: 'notifications',
  modal: 'albums',
  banner: 'megaphone',
};

const describeFrequency = (rule: Rule): string => {
  switch (rule.frequency.type) {
    case 'once_ever':
      return 'once ever';
    case 'once_per_day':
      return 'once per day';
    case 'cooldown_hours':
      return `every ${rule.frequency.hours ?? 24}h max`;
    case 'always':
      return 'no cap';
    default:
      return '';
  }
};

const describeConditions = (rule: Rule): string => {
  if (rule.conditions.length === 0) return 'Always matches';
  return rule.conditions
    .map((c) => `${RULE_FACTS[c.fact] ?? c.fact} ${c.op} ${c.value}`)
    .join('  ·  ');
};

export const AdminRulesScreen: React.FC = () => {
  const navigation = useNavigation<AdminNavigation>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [rules, setRules] = useState<Rule[]>([]);

  const loadData = useCallback(async () => {
    try {
      const data = await getAllRules();
      setRules(data);
    } catch (error) {
      console.error('Error loading rules:', error);
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

  const handleToggle = async (rule: Rule, enabled: boolean) => {
    setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, enabled } : r)));
    try {
      await updateRule(rule.id, { enabled });
    } catch (error: any) {
      setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, enabled: !enabled } : r)));
      showAlert('Error', error.message);
    }
  };

  const handleDelete = (rule: Rule) => {
    showConfirm(
      'Delete Rule',
      `Delete "${rule.name}"? Users will no longer receive this ${rule.surface}.`,
      async () => {
        try {
          await deleteRule(rule.id);
          setRules((prev) => prev.filter((r) => r.id !== rule.id));
        } catch (error: any) {
          showAlert('Error', error.message);
        }
      },
      'Delete'
    );
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const created = await seedDefaultRules();
      showAlert(
        'Defaults Seeded',
        created > 0
          ? `${created} default rule${created === 1 ? '' : 's'} created (disabled). Enable them when ready.`
          : 'All default rules already exist.'
      );
      loadData();
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const enabledCount = rules.filter((r) => r.enabled).length;

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <View style={styles.content}>
          <Text style={styles.countText}>
            {rules.length} rule{rules.length !== 1 ? 's' : ''} ({enabledCount} enabled)
          </Text>

          {rules.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="options-outline" size={48} color={Colors.gray} />
              <Text style={styles.emptyText}>No rules yet</Text>
              <Text style={styles.emptyHint}>
                Rules control when push notifications and popups fire and what they say — no app
                update needed.
              </Text>
              <Button
                title="Seed Default Rules"
                onPress={handleSeed}
                loading={seeding}
                style={{ marginTop: Spacing.md, alignSelf: 'stretch' }}
              />
            </Card>
          ) : (
            rules.map((rule) => (
              <Card
                key={rule.id}
                style={StyleSheet.flatten([styles.ruleCard, !rule.enabled ? styles.disabledCard : {}])}
                onPress={() => navigation.navigate('AdminRuleEdit', { mode: 'edit', ruleId: rule.id })}
              >
                <View style={styles.headerRow}>
                  <View style={styles.surfaceBadge}>
                    <Ionicons name={SURFACE_ICONS[rule.surface]} size={14} color={Colors.primary} />
                    <Text style={styles.surfaceBadgeText}>{rule.surface}</Text>
                  </View>
                  <Text style={styles.ruleName} numberOfLines={1}>
                    {rule.name}
                  </Text>
                  <Switch
                    value={rule.enabled}
                    onValueChange={(v) => handleToggle(rule, v)}
                    trackColor={{ true: Colors.primary, false: Colors.border }}
                  />
                </View>

                <Text style={styles.conditionsText} numberOfLines={2}>
                  {describeConditions(rule)}
                </Text>
                <Text style={styles.metaText}>
                  Fires {describeFrequency(rule)} · priority {rule.priority}
                </Text>

                <View style={styles.contentPreview}>
                  <Text style={styles.previewTitle} numberOfLines={1}>
                    {rule.content.title}
                  </Text>
                  <Text style={styles.previewBody} numberOfLines={2}>
                    {rule.content.body}
                  </Text>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() =>
                      navigation.navigate('AdminRuleEdit', { mode: 'edit', ruleId: rule.id })
                    }
                  >
                    <Ionicons name="pencil" size={16} color={Colors.primary} />
                    <Text style={styles.editText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(rule)}>
                    <Ionicons name="trash-outline" size={16} color={Colors.secondary} />
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AdminRuleEdit', { mode: 'create' })}
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
  // Keeps the list readable when running in a desktop browser
  content: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
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
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    marginTop: Spacing.sm,
  },
  emptyHint: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.lg,
  },
  ruleCard: {
    marginBottom: Spacing.md,
  },
  disabledCard: {
    opacity: 0.6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  surfaceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  surfaceBadgeText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.primary,
  },
  ruleName: {
    flex: 1,
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  conditionsText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginBottom: Spacing.xs,
  },
  metaText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginBottom: Spacing.sm,
  },
  contentPreview: {
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  previewTitle: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  previewBody: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
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
