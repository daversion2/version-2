import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { HomeLayoutItem } from '../../types';
import { resolveLayout, saveHomeLayout } from '../../services/homeLayout';
import { DEFAULT_HOME_LAYOUT, SECTION_LABELS, SECTION_ICONS, HomeSectionId } from '../../constants/homeLayout';

export const CustomizeHomeScreen: React.FC = () => {
  const { user, userProfile, refreshProfile } = useAuth();

  const initialLayout = useMemo(
    () => resolveLayout(userProfile?.home_layout),
    [userProfile?.home_layout]
  );
  const [layout, setLayout] = useState<HomeLayoutItem[]>(initialLayout);
  const [saving, setSaving] = useState(false);

  const persist = async (newLayout: HomeLayoutItem[]) => {
    if (!user || saving) return;
    const prev = layout;
    setLayout(newLayout);
    setSaving(true);
    try {
      await saveHomeLayout(user.uid, newLayout);
      await refreshProfile();
    } catch (e) {
      console.error('Failed to save layout:', e);
      setLayout(prev);
    } finally {
      setSaving(false);
    }
  };

  const toggleVisibility = (index: number) => {
    const next = [...layout];
    next[index] = { ...next[index], visible: !next[index].visible };
    persist(next);
  };

  const moveUp = (index: number) => {
    if (index <= 0) return;
    const next = [...layout];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    persist(next);
  };

  const moveDown = (index: number) => {
    if (index >= layout.length - 1) return;
    const next = [...layout];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    persist(next);
  };

  const resetToDefault = () => {
    persist([...DEFAULT_HOME_LAYOUT]);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.subtitle}>
        Choose which sections appear on your Home screen and arrange them in the order you prefer.
      </Text>

      {layout.map((item, index) => {
        const id = item.id as HomeSectionId;
        const label = SECTION_LABELS[id] || item.id;
        const iconName = SECTION_ICONS[id] || 'square-outline';
        const isFirst = index === 0;
        const isLast = index === layout.length - 1;

        return (
          <View key={item.id} style={styles.row}>
            {/* Reorder arrows */}
            <View style={styles.arrowColumn}>
              <TouchableOpacity
                onPress={() => moveUp(index)}
                disabled={isFirst || saving}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name="chevron-up"
                  size={22}
                  color={isFirst ? Colors.lightGray : Colors.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => moveDown(index)}
                disabled={isLast || saving}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name="chevron-down"
                  size={22}
                  color={isLast ? Colors.lightGray : Colors.primary}
                />
              </TouchableOpacity>
            </View>

            {/* Section info */}
            <View style={styles.sectionInfo}>
              <Ionicons
                name={iconName as any}
                size={20}
                color={item.visible ? Colors.dark : Colors.gray}
              />
              <Text style={[styles.sectionLabel, !item.visible && styles.sectionLabelHidden]}>
                {label}
              </Text>
            </View>

            {/* Visibility toggle */}
            <TouchableOpacity
              onPress={() => toggleVisibility(index)}
              disabled={saving}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={item.visible ? 'eye' : 'eye-off'}
                size={22}
                color={item.visible ? Colors.primary : Colors.gray}
              />
            </TouchableOpacity>
          </View>
        );
      })}

      <TouchableOpacity
        style={styles.resetButton}
        onPress={resetToDefault}
        disabled={saving}
      >
        <Ionicons name="refresh" size={18} color={Colors.gray} />
        <Text style={styles.resetText}>Reset to Default</Text>
      </TouchableOpacity>
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
  subtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  arrowColumn: {
    alignItems: 'center',
    gap: 2,
  },
  sectionInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionLabel: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  sectionLabelHidden: {
    color: Colors.gray,
    fontFamily: Fonts.secondary,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  resetText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
});
