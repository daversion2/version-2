import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { getActiveRewardMessages, RewardMessage } from '../../services/rewardMessages';
import {
  getUserRewardMessages,
  addUserRewardMessage,
  removeUserRewardMessage,
  toggleFavorite,
  UserRewardMessage,
} from '../../services/userRewardMessages';
import { showAlert, showConfirm } from '../../utils/alert';

const CATEGORY_OPTIONS: UserRewardMessage['category'][] = [
  'identity',
  'effort',
  'contrast',
  'general',
  'custom',
];

const CATEGORY_LABELS: Record<string, string> = {
  identity: 'Identity',
  effort: 'Effort',
  contrast: 'Contrast',
  general: 'General',
  custom: 'Custom',
};

const MAX_CUSTOM_MESSAGES = 30;

export const ManageRewardMessagesScreen: React.FC = () => {
  const { user } = useAuth();
  const [userMessages, setUserMessages] = useState<UserRewardMessage[]>([]);
  const [globalMessages, setGlobalMessages] = useState<RewardMessage[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newText, setNewText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<UserRewardMessage['category']>('custom');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!user) return;
    try {
      const [userMsgs, globalMsgs] = await Promise.all([
        getUserRewardMessages(user.uid),
        getActiveRewardMessages(),
      ]);
      setUserMessages(userMsgs);
      setGlobalMessages(globalMsgs);
    } catch (error) {
      console.error('Error loading reward messages:', error);
    }
  };

  useEffect(() => {
    load();
  }, [user]);

  const userSourceIds = new Set(userMessages.map((m) => m.source_id).filter(Boolean));

  const handleAddCustom = async () => {
    if (!newText.trim()) {
      showAlert('Required', 'Enter a message.');
      return;
    }
    if (!user) return;
    setLoading(true);
    try {
      await addUserRewardMessage(user.uid, {
        text: newText.trim(),
        category: selectedCategory,
        is_custom: true,
      });
      setNewText('');
      setShowForm(false);
      await load();
    } catch (e: any) {
      showAlert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (msg: UserRewardMessage) => {
    if (!user) return;
    try {
      await toggleFavorite(user.uid, msg.id, !msg.is_favorite);
      await load();
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleDelete = (msg: UserRewardMessage) => {
    showConfirm(
      'Remove Message',
      `Remove "${msg.text}" from your reward messages?`,
      async () => {
        if (!user) return;
        await removeUserRewardMessage(user.uid, msg.id);
        await load();
      },
      'Remove'
    );
  };

  const handleAddFromGlobal = async (globalMsg: RewardMessage) => {
    if (!user) return;
    try {
      await addUserRewardMessage(user.uid, {
        text: globalMsg.text,
        category: globalMsg.category,
        is_custom: false,
        source_id: globalMsg.id,
      });
      await load();
    } catch (e: any) {
      showAlert('Already Added', e.message);
    }
  };

  const handleRemoveGlobal = (globalMsg: RewardMessage) => {
    const userMsg = userMessages.find((m) => m.source_id === globalMsg.id);
    if (!userMsg) return;
    handleDelete(userMsg);
  };

  const customCount = userMessages.filter((m) => m.is_custom).length;
  const atMax = customCount >= MAX_CUSTOM_MESSAGES;

  const sections = [
    { title: 'Your Messages', data: ['user_section'] as const },
    { title: 'Browse Defaults', data: ['global_section'] as const },
  ];

  return (
    <SectionList
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      sections={sections}
      keyExtractor={(item, index) => `${item}-${index}`}
      stickySectionHeadersEnabled={false}
      renderSectionHeader={({ section }) => (
        <Text style={styles.sectionTitle}>{section.title}</Text>
      )}
      renderItem={({ item }) => {
        if (item === 'user_section') {
          return (
            <View>
              {/* Add custom form */}
              {showForm ? (
                <Card style={styles.formCard}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Write your own reward message..."
                    placeholderTextColor={Colors.gray}
                    value={newText}
                    onChangeText={setNewText}
                    multiline
                    maxLength={120}
                  />
                  <Text style={styles.charCount}>{newText.length}/120</Text>
                  <Text style={styles.fieldLabel}>Category</Text>
                  <View style={styles.categoryRow}>
                    {CATEGORY_OPTIONS.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.categoryChip,
                          selectedCategory === cat && styles.categoryChipSelected,
                        ]}
                        onPress={() => setSelectedCategory(cat)}
                      >
                        <Text
                          style={[
                            styles.categoryChipText,
                            selectedCategory === cat && styles.categoryChipTextSelected,
                          ]}
                        >
                          {CATEGORY_LABELS[cat]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.formButtons}>
                    <Button title="Add" onPress={handleAddCustom} loading={loading} style={{ flex: 1 }} />
                    <Button
                      title="Cancel"
                      onPress={() => { setShowForm(false); setNewText(''); }}
                      variant="outline"
                      style={{ flex: 1 }}
                    />
                  </View>
                </Card>
              ) : (
                <Button
                  title={atMax ? 'Maximum Reached' : 'Add Custom Message'}
                  onPress={() => setShowForm(true)}
                  disabled={atMax}
                  style={styles.addButton}
                />
              )}

              {/* User messages list */}
              {userMessages.length === 0 ? (
                <Text style={styles.emptyText}>
                  No messages yet. Add your own or pick from the defaults below.
                </Text>
              ) : (
                userMessages.map((msg) => (
                  <Card key={msg.id} style={styles.messageCard}>
                    <View style={styles.messageRow}>
                      <View style={styles.messageContent}>
                        <Text style={styles.messageText}>{msg.text}</Text>
                        <View style={styles.metaRow}>
                          <View style={styles.categoryBadge}>
                            <Text style={styles.categoryBadgeText}>
                              {CATEGORY_LABELS[msg.category] || msg.category}
                            </Text>
                          </View>
                          {msg.is_custom && (
                            <Text style={styles.customLabel}>Custom</Text>
                          )}
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleToggleFavorite(msg)}
                        style={styles.iconButton}
                      >
                        <Ionicons
                          name={msg.is_favorite ? 'star' : 'star-outline'}
                          size={22}
                          color={msg.is_favorite ? '#FFD700' : Colors.gray}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDelete(msg)}
                        style={styles.iconButton}
                      >
                        <Ionicons name="trash-outline" size={20} color={Colors.gray} />
                      </TouchableOpacity>
                    </View>
                  </Card>
                ))
              )}
            </View>
          );
        }

        // Global section
        return (
          <View>
            {globalMessages.map((msg) => {
              const isAdded = userSourceIds.has(msg.id);
              return (
                <Card key={msg.id} style={styles.messageCard}>
                  <TouchableOpacity
                    style={styles.messageRow}
                    onPress={() => isAdded ? handleRemoveGlobal(msg) : handleAddFromGlobal(msg)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.messageContent}>
                      <Text style={styles.messageText}>{msg.text}</Text>
                      <View style={styles.metaRow}>
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryBadgeText}>
                            {CATEGORY_LABELS[msg.category] || msg.category}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Ionicons
                      name={isAdded ? 'checkmark-circle' : 'add-circle-outline'}
                      size={24}
                      color={isAdded ? Colors.primary : Colors.gray}
                    />
                  </TouchableOpacity>
                </Card>
              );
            })}
          </View>
        );
      }}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  sectionTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
  },
  addButton: {
    marginBottom: Spacing.md,
  },
  formCard: {
    marginBottom: Spacing.md,
  },
  textInput: {
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: Spacing.xs,
  },
  charCount: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textAlign: 'right',
    marginBottom: Spacing.sm,
  },
  fieldLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.sm,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  categoryChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.lightGray,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipSelected: {
    backgroundColor: Colors.primary + '15',
    borderColor: Colors.primary,
  },
  categoryChipText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  categoryChipTextSelected: {
    color: Colors.primary,
    fontFamily: Fonts.secondaryBold,
  },
  formButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  emptyText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    textAlign: 'center',
    marginVertical: Spacing.xl,
    lineHeight: 22,
  },
  messageCard: {
    marginBottom: Spacing.sm,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageContent: {
    flex: 1,
  },
  messageText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    lineHeight: 22,
    marginBottom: Spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  categoryBadge: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  categoryBadgeText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.primary,
  },
  customLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  iconButton: {
    padding: Spacing.sm,
  },
});
