import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';

const ICON_CATEGORIES: Record<string, string[]> = {
  'Popular': [
    'flash', 'star', 'heart', 'checkmark-circle', 'trophy',
    'flame', 'rocket', 'diamond', 'ribbon', 'medal',
  ],
  'Activity': [
    'fitness', 'bicycle', 'walk', 'barbell', 'football',
    'basketball', 'tennisball', 'golf', 'american-football', 'baseball',
  ],
  'Mind & Learning': [
    'bulb-outline', 'book', 'school', 'library', 'newspaper',
    'pencil', 'create', 'document-text', 'reader', 'glasses',
  ],
  'Social': [
    'chatbubbles', 'people', 'person', 'hand-left', 'happy',
    'heart-circle', 'call', 'mail', 'share-social', 'megaphone',
  ],
  'Work': [
    'briefcase', 'laptop', 'desktop', 'folder', 'clipboard',
    'calendar', 'time', 'alarm', 'stopwatch', 'calculator',
  ],
  'Creative': [
    'color-palette', 'brush', 'camera', 'film', 'musical-note',
    'mic', 'videocam', 'image', 'aperture', 'construct',
  ],
  'Nature': [
    'leaf', 'flower', 'rose', 'sunny', 'moon',
    'cloud', 'water', 'earth', 'planet', 'paw',
  ],
  'Travel': [
    'airplane', 'car', 'bus', 'train', 'boat',
    'navigate', 'compass', 'map', 'location', 'globe',
  ],
  'Home & Life': [
    'home', 'bed', 'cafe', 'restaurant', 'wine',
    'pizza', 'nutrition', 'medkit', 'bandage', 'thermometer',
  ],
  'Tech & Gaming': [
    'game-controller', 'logo-game-controller-b', 'extension-puzzle', 'dice', 'sparkles',
    'hardware-chip', 'phone-portrait', 'tv', 'headset', 'bluetooth',
  ],
  'Finance': [
    'cart', 'card', 'cash', 'wallet', 'pricetag',
    'gift', 'bag', 'storefront', 'trending-up', 'stats-chart',
  ],
  'Misc': [
    'flag', 'bookmark', 'key', 'lock-closed', 'shield-checkmark',
    'notifications', 'eye', 'search', 'settings', 'options',
  ],
};

interface Props {
  visible: boolean;
  selectedIcon: string;
  onSelect: (icon: string) => void;
  onClose: () => void;
}

export const IconPickerModal: React.FC<Props> = ({
  visible,
  selectedIcon,
  onSelect,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Popular');

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return ICON_CATEGORIES;
    }

    const query = searchQuery.toLowerCase();
    const filtered: Record<string, string[]> = {};

    Object.entries(ICON_CATEGORIES).forEach(([category, icons]) => {
      const matchingIcons = icons.filter(icon =>
        icon.toLowerCase().includes(query)
      );
      if (matchingIcons.length > 0) {
        filtered[category] = matchingIcons;
      }
    });

    return filtered;
  }, [searchQuery]);

  const handleSelect = (icon: string) => {
    onSelect(icon);
    onClose();
  };

  const allMatchingIcons = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return Object.values(filteredCategories).flat();
  }, [searchQuery, filteredCategories]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modal} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.title}>Choose Icon</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.dark} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={Colors.gray} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search icons..."
              placeholderTextColor={Colors.gray}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={Colors.gray} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {searchQuery.trim() ? (
              <View style={styles.searchResults}>
                <Text style={styles.searchResultsLabel}>
                  {allMatchingIcons?.length || 0} results
                </Text>
                <View style={styles.iconGrid}>
                  {allMatchingIcons?.map((icon) => (
                    <TouchableOpacity
                      key={icon}
                      onPress={() => handleSelect(icon)}
                      style={[
                        styles.iconButton,
                        selectedIcon === icon && styles.iconButtonSelected,
                      ]}
                    >
                      <Ionicons
                        name={icon as any}
                        size={24}
                        color={selectedIcon === icon ? Colors.white : Colors.dark}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : (
              Object.entries(filteredCategories).map(([category, icons]) => (
                <View key={category} style={styles.categorySection}>
                  <TouchableOpacity
                    style={styles.categoryHeader}
                    onPress={() => setExpandedCategory(
                      expandedCategory === category ? null : category
                    )}
                  >
                    <Text style={styles.categoryTitle}>{category}</Text>
                    <Ionicons
                      name={expandedCategory === category ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={Colors.gray}
                    />
                  </TouchableOpacity>

                  {expandedCategory === category && (
                    <View style={styles.iconGrid}>
                      {icons.map((icon) => (
                        <TouchableOpacity
                          key={icon}
                          onPress={() => handleSelect(icon)}
                          style={[
                            styles.iconButton,
                            selectedIcon === icon && styles.iconButtonSelected,
                          ]}
                        >
                          <Ionicons
                            name={icon as any}
                            size={24}
                            color={selectedIcon === icon ? Colors.white : Colors.dark}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              ))
            )}
            <View style={styles.bottomPadding} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '80%',
    paddingTop: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    paddingVertical: Spacing.sm,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  searchResults: {
    paddingTop: Spacing.sm,
  },
  searchResultsLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.md,
  },
  categorySection: {
    marginBottom: Spacing.sm,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  categoryTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonSelected: {
    backgroundColor: Colors.primary,
  },
  bottomPadding: {
    height: Spacing.xxl,
  },
});
