import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { WorksheetTemplate } from '../../types';

interface WorksheetTemplateCardProps {
  template: WorksheetTemplate;
  onPress: () => void;
}

export const WorksheetTemplateCard: React.FC<WorksheetTemplateCardProps> = ({
  template,
  onPress,
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      friction: 8,
      tension: 300,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 8,
      tension: 300,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[styles.cardWrapper, { transform: [{ scale }] }]}>
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View style={styles.row}>
          <View style={[styles.iconContainer, { backgroundColor: template.color + '18' }]}>
            <Ionicons
              name={template.icon as keyof typeof Ionicons.glyphMap}
              size={24}
              color={template.color}
            />
          </View>
          <View style={styles.content}>
            <Text style={styles.name} numberOfLines={1}>
              {template.name}
            </Text>
            <Text style={styles.description} numberOfLines={3}>
              {template.short_description}
            </Text>
            <View style={styles.metaRow}>
              <View style={styles.difficultyDots}>
                {[1, 2, 3].map((d) => (
                  <View
                    key={d}
                    style={[
                      styles.dot,
                      d <= template.difficulty && { backgroundColor: template.color },
                    ]}
                  />
                ))}
              </View>
              <Text style={styles.time}>~{template.estimated_minutes} min</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.gray} style={styles.chevron} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    width: '100%',
    marginBottom: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  content: {
    flex: 1,
  },
  name: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    marginBottom: 2,
  },
  description: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  difficultyDots: {
    flexDirection: 'row',
    gap: 3,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  time: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  chevron: {
    marginLeft: Spacing.sm,
  },
});
