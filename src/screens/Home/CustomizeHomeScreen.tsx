import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { HomeLayoutItem } from '../../types';
import { resolveLayout, saveHomeLayout } from '../../services/homeLayout';
import { DEFAULT_HOME_LAYOUT, SECTION_LABELS, SECTION_ICONS, ZONE_CONFIG, SECTION_TO_ZONE, HomeSectionId } from '../../constants/homeLayout';

export const CustomizeHomeScreen: React.FC = () => {
  const { user, userProfile, refreshProfile } = useAuth();

  const initialLayout = useMemo(
    () => resolveLayout(userProfile?.home_layout),
    [userProfile?.home_layout]
  );
  const [layout, setLayout] = useState<HomeLayoutItem[]>(initialLayout);
  const [saving, setSaving] = useState(false);

  const zonedLayout = useMemo(() => {
    return ZONE_CONFIG.map(zone => ({
      zone,
      items: layout.filter(item =>
        SECTION_TO_ZONE[item.id as HomeSectionId] === zone.id
      ),
    }));
  }, [layout]);

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

  const toggleVisibility = (globalIndex: number) => {
    const next = [...layout];
    next[globalIndex] = { ...next[globalIndex], visible: !next[globalIndex].visible };
    persist(next);
  };

  const moveUp = (globalIndex: number) => {
    const item = layout[globalIndex];
    const zoneId = SECTION_TO_ZONE[item.id as HomeSectionId];

    // Find the previous item in the same zone
    let prevIndex = -1;
    for (let i = globalIndex - 1; i >= 0; i--) {
      if (SECTION_TO_ZONE[layout[i].id as HomeSectionId] === zoneId) {
        prevIndex = i;
        break;
      }
    }
    if (prevIndex === -1) return;

    const next = [...layout];
    [next[prevIndex], next[globalIndex]] = [next[globalIndex], next[prevIndex]];
    persist(next);
  };

  const moveDown = (globalIndex: number) => {
    const item = layout[globalIndex];
    const zoneId = SECTION_TO_ZONE[item.id as HomeSectionId];

    // Find the next item in the same zone
    let nextIndex = -1;
    for (let i = globalIndex + 1; i < layout.length; i++) {
      if (SECTION_TO_ZONE[layout[i].id as HomeSectionId] === zoneId) {
        nextIndex = i;
        break;
      }
    }
    if (nextIndex === -1) return;

    const next = [...layout];
    [next[globalIndex], next[nextIndex]] = [next[nextIndex], next[globalIndex]];
    persist(next);
  };

  const resetToDefault = () => {
    persist([...DEFAULT_HOME_LAYOUT]);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.subtitle}>
        Toggle sections on or off and reorder them within each zone.
      </Text>

      {zonedLayout.map(({ zone, items }) => (
        <View key={zone.id}>
          {/* Zone header */}
          <View style={styles.zoneHeader}>
            <Ionicons name={zone.icon as any} size={18} color={Colors.primary} />
            <Text style={styles.zoneLabel}>{zone.label}</Text>
          </View>

          {items.map((item, zoneIndex) => {
            const globalIndex = layout.findIndex(l => l.id === item.id);
            const id = item.id as HomeSectionId;
            const label = SECTION_LABELS[id] || item.id;
            const iconName = SECTION_ICONS[id] || 'square-outline';
            const isFirstInZone = zoneIndex === 0;
            const isLastInZone = zoneIndex === items.length - 1;

            return (
              <View key={item.id} style={styles.row}>
                {/* Reorder arrows */}
                <View style={styles.arrowColumn}>
                  <TouchableOpacity
                    onPress={() => moveUp(globalIndex)}
                    disabled={isFirstInZone || saving}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name="chevron-up"
                      size={22}
                      color={isFirstInZone ? Colors.lightGray : Colors.primary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => moveDown(globalIndex)}
                    disabled={isLastInZone || saving}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name="chevron-down"
                      size={22}
                      color={isLastInZone ? Colors.lightGray : Colors.primary}
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
                  onPress={() => toggleVisibility(globalIndex)}
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
        </View>
      ))}

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
  zoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  zoneLabel: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.primary,
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
